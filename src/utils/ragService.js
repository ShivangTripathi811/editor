const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const { LocalIndex } = require('vectra');

class RagService {
    constructor() {
        this.index = null;
        this.model = null;
        this.context = null;
        this.modelPath = null;
        this.statePath = null;
        this.indexedFiles = new Set();
        this.isProcessing = false; // Simple lock
    }

    async init(userDataPath, modelPath) {
        this.modelPath = modelPath;
        const indexPath = path.join(userDataPath, 'vectra_index');
        this.statePath = path.join(userDataPath, 'rag_state.json');
        
        // Load indexed files state
        this._loadState();
        
        if (!fs.existsSync(indexPath)) {
            fs.mkdirSync(indexPath, { recursive: true });
        }

        try {
            this.index = new LocalIndex(indexPath);
            // Check if index is valid by calling a method that reads it
            const exists = await this.index.isIndexCreated();
            if (!exists) {
                await this.index.createIndex();
            }
        } catch (error) {
            console.error("RAG: Index corrupted or failed to load. Resetting index...", error);
            try {
                fs.rmSync(indexPath, { recursive: true, force: true });
                fs.mkdirSync(indexPath, { recursive: true });
                this.index = new LocalIndex(indexPath);
                await this.index.createIndex();
                this.indexedFiles.clear();
                this._saveState();
                console.log("RAG: Index successfully reset after corruption.");
            } catch (resetErr) {
                console.error("RAG: Critical failure resetting index:", resetErr);
                this.index = null;
            }
        }

        // Initialize embedding model
        await this._initModel();
        console.log("RAG Service Initialized");
    }

    _loadState() {
        try {
            if (fs.existsSync(this.statePath)) {
                const data = fs.readFileSync(this.statePath, 'utf-8');
                const state = JSON.parse(data);
                if (Array.isArray(state.indexedFiles)) {
                    this.indexedFiles = new Set(state.indexedFiles);
                    console.log(`RAG: Loaded state with ${this.indexedFiles.size} indexed files.`);
                }
            }
        } catch (e) {
            console.error("RAG: Failed to load state:", e);
        }
    }

    _saveState() {
        try {
            if (this.statePath) {
                const state = {
                    indexedFiles: Array.from(this.indexedFiles)
                };
                fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2), 'utf-8');
            }
        } catch (e) {
            console.error("RAG: Failed to save state:", e);
        }
    }

    async _initModel() {
        if (this.model) return;
        if (!this.modelPath) {
             console.error("RAG: Model path not set. Call init() first.");
             return;
        }

        try {
            const { getLlama } = await import("node-llama-cpp");
            // Disable GPU explicitly to prevent Vulkan/CUDA compatibility crashes
            const llama = await getLlama({ gpu: false }); 
            
            this.model = await llama.loadModel({
                modelPath: this.modelPath,
                // gpuLayers: 0 is correct for model load, but we also ensure backend is CPU
            });

            this.context = await this.model.createEmbeddingContext();
            console.log("RAG: Nomic Embedding Model Loaded (CPU Mode)");
        } catch (error) {
            console.error("RAG: Failed to load embedding model:", error);
        }
    }

    async getEmbeddings(text) {
        if (!this.context) await this._initModel();
        if (!this.context) throw new Error("Embedding context not initialized");
        
        // Nomic specific prefix for queries/documents if needed, 
        // strictly speaking v1.5 might handle it, but adding "search_document: " is often recommended for docs
        // and "search_query: " for queries.
        // For simplicity, we'll try raw text first or standard prefix if we see quality issues.
        // Nomic v1.5 usually expects "search_document: " for indexing.
        const embedding = await this.context.getEmbeddingFor(text);
        return embedding.vector;
    }

    async addDocument(filePath) {
        try {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer).catch(e => {
                console.error(`RAG: PDF parsing failed for ${filePath}:`, e);
                return null;
            });
            
            if (!data || !data.text) {
                 console.warn(`RAG: No text extracted from PDF: ${filePath}`);
                 return;
            }
            const text = data.text;
            
            // Simple chunking
            const chunks = this._chunkText(text, 1000); // ~1000 chars per chunk
            
            for (const chunk of chunks) {
                const vector = await this.getEmbeddings("search_document: " + chunk);
                await this.index.insertItem({
                    vector,
                    metadata: {
                        text: chunk,
                        source: path.basename(filePath)
                    }
                });
            }
            console.log(`RAG: Added ${path.basename(filePath)} to index`);
        } catch (error) {
            console.error(`RAG: Failed to add document ${filePath}:`, error);
        }
    }

    _chunkText(text, maxLength) {
        const chunks = [];
        let currentChunk = "";
        const sentences = text.split(/[.!?]+/);

        for (const sentence of sentences) {
            if ((currentChunk + sentence).length > maxLength) {
                chunks.push(currentChunk.trim());
                currentChunk = "";
            }
            currentChunk += sentence + ". ";
        }
        if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
        }
        return chunks;
    }

    async query(text, limit = 3) {
        if (!this.index) return [];
        try {
            const vector = await this.getEmbeddings("search_query: " + text);
            const results = await this.index.queryItems(vector, limit);
            // HARD ENFORCE the limit - sometimes vectra returns more than requested
            return (results || []).slice(0, limit).map(item => ({
                text: item.item.metadata.text,
                source: item.item.metadata.source,
                score: item.score
            }));
        } catch (error) {
            console.error("RAG: Query failed:", error);
            return [];
        }
    }
    
    async indexProject(files, onProgress) {
        if (this.isProcessing) {
             console.warn("RAG: Already processing an index request.");
             return;
        }
        this.isProcessing = true;
        let consecutiveErrors = 0;
        
        try {
            if (!files || !Array.isArray(files)) return;
            // Filter out already indexed files
            const filesToIndex = files.filter(f => !this.indexedFiles.has(f.path));
            console.log(`RAG: Indexing ${filesToIndex.length} new project files (skipped ${files.length - filesToIndex.length})...`);
            
            let processed = 0;
            const total = filesToIndex.length;

            for (const file of filesToIndex) {
                // Ignore node_modules, .git, and other common noise
                if (file.path.includes('node_modules') || file.path.includes('.git') || file.path.includes('.vscode')) continue;
                
                // Skip files that are likely binary or too large for useful RAG context
                try {
                    const stats = fs.statSync(file.path);
                    if (stats.size > 50000) continue; // Skip files > 50KB
                } catch (e) { continue; }

                if (consecutiveErrors >= 3) {
                    console.error("RAG: Too many consecutive errors. Aborting indexing to prevent crash.");
                    break;
                }

                try {
                    if (onProgress) onProgress(processed, total, path.basename(file.path));
                    
                    if (file.path.endsWith('.pdf')) {
                        await this.addDocument(file.path);
                    } else if (['.js', '.ts', '.jsx', '.tsx', '.py', '.cpp', '.hpp', '.h', '.c', '.java', '.md', '.txt', '.json', '.css', '.html'].some(ext => file.path.endsWith(ext))) {
                        await this.addCodeDocument(file.path);
                    }
                    
                    // Mark as indexed
                    this.indexedFiles.add(file.path);
                    processed++;
                    consecutiveErrors = 0; // Reset on success
                    
                    // Periodically save state (every 10 files)
                    if (processed % 10 === 0) this._saveState();
                    
                    // Prevent UI freeze / heavy load
                    await new Promise(resolve => setTimeout(resolve, 250));
                } catch (err) {
                    consecutiveErrors++;
                    console.warn(`RAG: Failed to index file ${file.path}`, err);
                    
                    // Critical failure: Index corruption
                    if (err.message && err.message.includes("Unexpected end of JSON input")) {
                        console.error("RAG: CRITICAL - Index corrupted during operation. Aborting.");
                        // Force reset state so next run attempts recovery
                        this.index = null; 
                        break;
                    }
                }
            }
            this._saveState(); // Final save
            console.log("RAG: Project indexing complete.");
        } finally {
            this.isProcessing = false;
        }
    }

    async addCodeDocument(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const chunks = this._chunkText(content, 1500); 
            
            for (const chunk of chunks) {
                const vector = await this.getEmbeddings("search_document: " + chunk);
                await this.index.insertItem({
                    vector,
                    metadata: {
                        text: chunk,
                        source: path.basename(filePath),
                        type: 'code'
                    }
                });
            }
            console.log(`RAG: Added code doc ${path.basename(filePath)}`);
        } catch (error) {
           throw error; // Let caller handle/log
        }
    }

    async indexDirectory(dirPath, onProgress) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        let consecutiveErrors = 0;

        try {
            const allFiles = fs.readdirSync(dirPath).filter(file => file.toLowerCase().endsWith('.pdf'));
            const filesToIndex = allFiles.filter(file => !this.indexedFiles.has(path.join(dirPath, file)));
            
            console.log(`RAG: Found ${filesToIndex.length} new PDFs to index in ${dirPath} (skipped ${allFiles.length - filesToIndex.length})`);
            
            let processed = 0;
            const total = filesToIndex.length;

            for (const file of filesToIndex) {
               if (consecutiveErrors >= 3) {
                   console.error("RAG: Too many consecutive errors. Aborting directory indexing.");
                   break;
               }

               const fullPath = path.join(dirPath, file);
               try {
                   if (onProgress) onProgress(processed, total, file);
                   
                   await this.addDocument(fullPath);
                   
                   this.indexedFiles.add(fullPath);
                   processed++;
                   consecutiveErrors = 0;
                   
                   if (processed % 5 === 0) this._saveState();

                   // Small delay to prevent event loop starvation or native thread issues
                   await new Promise(resolve => setTimeout(resolve, 250));
               } catch (err) {
                   consecutiveErrors++;
                   console.warn(`RAG: Failed to index ${file}`, err);
                   if (err.message && err.message.includes("Unexpected end of JSON input")) {
                       console.error("RAG: CRITICAL - Index corrupted. Aborting.");
                       break;
                   }
               }
            }
            this._saveState();
        } finally {
            this.isProcessing = false;
        }
    }
}

module.exports = new RagService();
