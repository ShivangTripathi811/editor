const { app, BrowserWindow, ipcMain, dialog, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const pty = require('node-pty');
const axios = require('axios');
const crypto = require('crypto');

// ✅ FIX: Proper path resolution for both dev and production
const isDev = !app.isPackaged;
const ragService = require(isDev ? './src/utils/ragService' : path.join(__dirname, 'src/utils/ragService'));
const codeModel = require(isDev ? './src/utils/codeModel' : path.join(__dirname, 'src/utils/codeModel'));
const { LucideEthernetPort } = require('lucide-react');

let mainWindow;
let ptyProcess = null;

// Global AI state
let llama = null;
let model = null;
let context = null;
let activeModelId = 'deepseek'; // Default model
const sessions = new Map(); // Map of sessionId -> LlamaChatSession
const initializingSessions = new Set(); // To prevent race conditions in init

const AI_MODELS = {
    'deepseek': {
        id: 'deepseek',
        name: 'DeepSeek Coder 1.3B',
        url: 'https://huggingface.co/TheBloke/deepseek-coder-1.3b-instruct-GGUF/resolve/main/deepseek-coder-1.3b-instruct.Q4_K_M.gguf',
        filename: 'deepseek-1.3b.gguf',
        expectedSize: 873582624
    },
    'qwen': {
        id: 'qwen',
        name: 'Qwen2.5 Coder 1.5B',
        url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
        filename: 'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
        expectedSize: null // Size can vary or be unknown
    }
};

const NOMIC_MODEL_URL = "https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q4_K_M.gguf";
const NOMIC_FILENAME = "nomic-embed-text-v1.5.Q4_K_M.gguf";

// ... existing code ...  

ipcMain.handle('ai:delete-model', async () => {
    const deepseekPath = path.join(app.getPath('userData'), 'deepseek-1.3b.gguf');
    const nomicPath = path.join(app.getPath('userData'), NOMIC_FILENAME);
    let success = true;
    
    try {
        if (fs.existsSync(deepseekPath)) {
            fs.unlinkSync(deepseekPath);
        }
    } catch (e) {
        console.error('Error deleting deepseek model:', e);
        success = false;
    }

    try {
        if (fs.existsSync(nomicPath)) {
            fs.unlinkSync(nomicPath);
        }
    } catch (e) {
        console.error('Error deleting nomic model:', e);
        success = false;
    }

  if (success) {
    model = null; // Reset global model reference
    context = null; // Reset global context reference
    sessions.clear(); // Clear all sessions
    globalAIInitPromise = null; // Allow re-init
    return true;
  }
  return false;
});

function createWindow() {
  const isMac = process.platform === 'darwin';

  const windowOptions = {
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Code Editor',
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true, // Enable <webview> tag
    },
  };

  if (isMac) {
    windowOptions.titleBarStyle = 'hiddenInset';
    windowOptions.trafficLightPosition = { x: 12, y: 10 };
  }

  mainWindow = new BrowserWindow(windowOptions);

  // In dev mode, load from Vite dev server; in production load the built output
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (ptyProcess) {
      ptyProcess.kill();
      ptyProcess = null;
    }
  });

  // Build a custom menu to override Cmd+W / Ctrl+W
  const menuTemplate = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('close-active-tab');
            }
          },
        },
        {
          label: 'Codeforces Settings',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('codeforces:open-settings');
            }
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  // Context Menu Implementation
  mainWindow.webContents.on('context-menu', (event, params) => {
    const menu = Menu.buildFromTemplate([
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { type: 'separator' },
      { role: 'selectAll' },
    ]);
    menu.popup({ window: mainWindow });
  });

  // ─── Bypass X-Frame-Options for In-App Browser ───
  // ─── Bypass X-Frame-Options for In-App Browser ───
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    { urls: ['*://*/*'] }, // Apply to all URLs
    (details, callback) => {
      const responseHeaders = Object.assign({}, details.responseHeaders);

      const keysToRemove = [
        'x-frame-options',
        'content-security-policy',
        'frame-options',
        'x-content-type-options' // Sometimes causes issues with MIME types in iframes
      ];

      Object.keys(responseHeaders).forEach(key => {
        if (keysToRemove.includes(key.toLowerCase())) {
          delete responseHeaders[key];
        }
      });

      callback({ cancel: false, responseHeaders });
    }
  );
}

function ParseCode(code) {
  const lines = code.split('\n')
  const results = []

  for (const line of lines) {
    let i = 0
    while (i < line.length) {
      if (
        line[i] === '!' &&
        line[i + 1] === '@' &&
        line[i + 2] === '#' &&
        line[i + 3] === '$'
      ) {
        i += 4
        if (line[i] !== '(') {
          return 'Invalid Syntax'
        }
        i++
        let temp = ''
        while (i < line.length && line[i] !== ')') {
          temp += line[i]
          i++
        }
        if (i >= line.length) {
          return 'Invalid Syntax'
        }
        results.push(temp)
      }
      i++
    }
  }
  return results
}

// Global tracker for autocomplete specific sequence (to allow killing it for higher priority tasks)
let globalAutocompleteSequence = null;

// Helper: get sequence with retry and aggressive recycling
async function getSequenceWithRetry(context, retryCount = 0) {
    try {
        return context.getSequence();
    } catch (err) {
        if (err.message.includes("No sequences left") && retryCount < 3) {
             console.warn(`AI: No sequences left (Attempt ${retryCount + 1}). Recycling...`);
             
             // 0. Kill Autocomplete FIRST (Lowest priority)
             if (globalAutocompleteSequence && !globalAutocompleteSequence.disposed) {
                 try {
                     globalAutocompleteSequence.dispose();
                     globalAutocompleteSequence = null;
                     console.log("AI: Force-killed autocomplete sequence to free resources.");
                 } catch (e) {
                     console.error("AI: Error force-killing autocomplete sequence:", e);
                 }
             }
             
             // 1. Recycle and retry
             context.recycle();
             await new Promise(resolve => setTimeout(resolve, 200 + retryCount * 100)); // Backoff
             return getSequenceWithRetry(context, retryCount + 1);
        }
        throw err;
    }
}

let globalAIInitPromise = null;

// Initialize AI model (async)
async function initAIModel(modelPath, sessionId = 'default', download = true) {
    // If already initializing, wait for that initialization
    if (globalAIInitPromise) {
        console.log("AI: Initialization already in progress. Waiting...");
        return globalAIInitPromise;
    }
    
    // If already initialized, just reuse it
    if (model && context) {
        console.log("AI: Model already initialized. Reusing...");
        const { LlamaChatSession } = await import("node-llama-cpp");
        
        if (sessions.has(sessionId)) {
            console.log(`AI: Reusing existing session for ${sessionId}`);
            return sessions.get(sessionId);
        }
        
        const sequence = await getSequenceWithRetry(context);
        const session = new LlamaChatSession({
            contextSequence: sequence
        });
        sessions.set(sessionId, session);
        console.log(`AI: New session created for ${sessionId}`);
        return session;
    }
    
    // Start new initialization
    globalAIInitPromise = (async () => {
        try {
            const { fileURLToPath } = await import('url');
            const { dirname } = await import('path');
            const { getLlama, LlamaChatSession } = await import("node-llama-cpp");

            console.log("AI: Initializing model...");

            if (!fs.existsSync(modelPath)) {
                if (download) {
                    console.log("AI: Model not found. Downloading...");
                    await downloadModel(modelPath);
                } else {
                    throw new Error("AI: Model file not found.");
                }
            }

            llama = await getLlama();
            model = await llama.loadModel({
                modelPath,
            });
            
            // Adjust contextSize and sequences intelligently
            const contextSize = 4096; 
            const sequences = 5; // Increased from 2 for handling multiple concurrent tasks
            
            context = await model.createContext({
                contextSize,
                sequences
            });
            
            console.log(`AI: Model loaded and context created (contextSize=${contextSize}, sequences=${sequences})`);

            // Create initial session for the first sessionId
            const sequence = await getSequenceWithRetry(context);
            const session = new LlamaChatSession({
                contextSequence: sequence
            });
            sessions.set(sessionId, session);
            console.log(`AI: Session initialized for ${sessionId}`);
            
            return session;
        } catch (error) {
            console.error("AI Initialization error:", error);
            throw error;
        } finally {
            // Clear the promise after initialization (success or failure)
            globalAIInitPromise = null;
        }
    })();
    
    return globalAIInitPromise;
}

async function downloadModel(modelPath) {
    const activeModel = AI_MODELS[activeModelId];
    if (!activeModel) {
        throw new Error(`Unknown model: ${activeModelId}`);
    }

    const { url, expectedSize } = activeModel;

    console.log(`Downloading ${activeModelId} model from ${url}...`);
    
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
    });

    const writer = fs.createWriteStream(modelPath);
    const totalSize = parseInt(response.headers['content-length'], 10) || expectedSize;
    let downloadedSize = 0;

    response.data.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const progress = totalSize ? Math.round((downloadedSize / totalSize) * 100) : 0;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', { 
                model: activeModelId,
                progress, 
                downloaded: downloadedSize, 
                total: totalSize 
            });
        }
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => {
            console.log(`${activeModelId} model downloaded successfully.`);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('download-complete', { model: activeModelId });
            }
            resolve();
        });
        writer.on('error', (err) => {
            console.error(`Error downloading ${activeModelId} model:`, err);
            reject(err);
        });
    });
}

// Terminal handling
ipcMain.on('terminal:input', (event, data) => {
    if (ptyProcess) {
        ptyProcess.write(data);
    }
});

ipcMain.on('terminal:create', (event, { cwd }) => {
    if (ptyProcess) {
        ptyProcess.kill();
        ptyProcess = null;
    }

    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';

    ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: cwd || os.homedir(),
        env: process.env,
    });

    ptyProcess.onData((data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('terminal:output', data);
        }
    });

    ptyProcess.onExit(({ exitCode }) => {
        console.log(`Terminal exited with code: ${exitCode}`);
        ptyProcess = null;
    });
});

ipcMain.on('terminal:resize', (event, { cols, rows }) => {
    if (ptyProcess) {
        ptyProcess.resize(cols, rows);
    }
});

// AI Chat Handler
ipcMain.handle('ai:chat', async (event, message, sessionId = 'default') => {
    const activeModel = AI_MODELS[activeModelId];
    if (!activeModel) {
        return { error: "No active model selected" };
    }

    const modelPath = path.join(app.getPath('userData'), activeModel.filename);

    try {
        // Auto-initialize if not already done or session doesn't exist
        if (!sessions.has(sessionId)) {
            console.log(`AI: Session ${sessionId} not found. Initializing...`);
            // If model and context exist, we just need to create a new session
            if (context && model) {
                const { LlamaChatSession } = await import("node-llama-cpp");
                const sequence = await getSequenceWithRetry(context);
                const session = new LlamaChatSession({
                    contextSequence: sequence
                });
                sessions.set(sessionId, session);
                console.log(`AI: New session created for ${sessionId}`);
            } else {
                // Needs full init
                await initAIModel(modelPath, sessionId);
            }
        }

        const session = sessions.get(sessionId);
        if (!session) {
            throw new Error("Failed to create or retrieve session");
        }

        console.log(`AI: Processing message for session ${sessionId}: "${message.substring(0, 30)}..."`);
        
        // Add retry logic for chat
        let attempts = 0;
        const maxAttempts = 3;
        let lastError = null;
        
        while (attempts < maxAttempts) {
            try {
                const response = await session.prompt(message, {
                    maxTokens: 2048,
                    temperature: 0.7,
                });
                
                console.log(`AI: Response generated for session ${sessionId} (${response.length} chars)`);
                return { response };
            } catch (err) {
                lastError = err;
                attempts++;
                console.warn(`AI: Chat attempt ${attempts} failed:`, err.message);
                
                if (err.message.includes("No sequences left") && attempts < maxAttempts) {
                    // Context is full, try recreating the session
                    console.log("AI: Context full, recycling and recreating session...");
                    context.recycle();
                    
                    const { LlamaChatSession } = await import("node-llama-cpp");
                    const newSequence = await getSequenceWithRetry(context);
                    const newSession = new LlamaChatSession({
                        contextSequence: newSequence
                    });
                    sessions.set(sessionId, newSession);
                    
                    await new Promise(resolve => setTimeout(resolve, 300));
                    // Retry with new session
                    continue;
                }
                throw err;
            }
        }
        
        throw lastError || new Error("Failed after retries");
        
    } catch (error) {
        console.error("AI Chat error:", error);
        return { error: error.message };
    }
});

// ─── IPC: File Operations ────────────────────────────────────────
ipcMain.handle('file:open', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Text Files', extensions: ['txt', 'md', 'js', 'json', 'html', 'css', 'cpp', 'c', 'py', 'java'] },
            { name: 'All Files', extensions: ['*'] },
        ],
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf8');
    return { path: filePath, content };
});

ipcMain.handle('file:save', async (_, { path, content }) => {
    fs.writeFileSync(path, content, 'utf8');
    return true;
});

ipcMain.handle('file:save-as', async (_, content) => {
    const result = await dialog.showSaveDialog({
        filters: [
            { name: 'Text Files', extensions: ['txt', 'md', 'js', 'json', 'html', 'css', 'cpp', 'c', 'py', 'java'] },
            { name: 'All Files', extensions: ['*'] },
        ],
    });

    if (result.canceled || !result.filePath) {
        return null;
    }

    fs.writeFileSync(result.filePath, content, 'utf8');
    return result.filePath;
});

// IPC: Execute code
ipcMain.handle('code:execute', async (event, { code, language }) => {
    const command = getExecutionCommand(code, language);
    if (!command) {
        return { success: false, error: 'Unsupported language' };
    }

    try {
        const { execSync } = require('child_process');
        const output = execSync(command, {
            encoding: 'utf8',
            timeout: 10000,
        });
        return { success: true, output };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

function getExecutionCommand(code, language) {
    const tempFile = path.join(os.tmpdir(), `temp_${Date.now()}`);
    fs.writeFileSync(tempFile, code);

    switch (language) {
        case 'javascript':
            return `node ${tempFile}`;
        case 'python':
            return `python ${tempFile}`;
        case 'cpp':
            const exeFile = tempFile + '.exe';
            return `g++ ${tempFile} -o ${exeFile} && ${exeFile}`;
        default:
            return null;
    }
}

// IPC Handlers for AI Model Management
ipcMain.handle('ai:get-model-status', async () => {
    const activeModel = AI_MODELS[activeModelId];
    if (!activeModel) {
        return { downloaded: false, active: false, model: null };
    }
    
    const modelPath = path.join(app.getPath('userData'), activeModel.filename);
    const downloaded = fs.existsSync(modelPath);
    const active = downloaded && model !== null;
    
    return {
        downloaded,
        active,
        model: activeModel
    };
});

ipcMain.handle('ai:download-model', async () => {
    const activeModel = AI_MODELS[activeModelId];
    if (!activeModel) {
        throw new Error("No active model selected");
    }
    
    const modelPath = path.join(app.getPath('userData'), activeModel.filename);
    
    if (fs.existsSync(modelPath)) {
        return { success: true, message: 'Model already downloaded' };
    }

    try {
        await downloadModel(modelPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('ai:get-models', () => {
    return Object.values(AI_MODELS).map(model => ({
        ...model,
        downloaded: fs.existsSync(path.join(app.getPath('userData'), model.filename)),
        active: model.id === activeModelId
    }));
});

ipcMain.handle('ai:set-active-model', async (_, modelId) => {
    if (!AI_MODELS[modelId]) {
        throw new Error(`Unknown model: ${modelId}`);
    }
    
    // Clean up existing model if loaded
    if (model) {
        sessions.clear();
        context = null;
        model = null;
        llama = null;
        globalAIInitPromise = null;
        console.log("AI: Previous model cleaned up");
    }
    
    activeModelId = modelId;
    console.log(`AI: Active model set to ${modelId}`);
    
    return { success: true, activeModel: AI_MODELS[modelId] };
});

// Knowledge Base IPC Handlers
const DATASET_PATH = path.join(app.getPath('userData'), 'codeforces_dataset');

ipcMain.handle('kb:add-problem', async (event, { content, metadata }) => {
  const { title, contestId, index, rating, tags, topic } = metadata;

  const topicPath = path.join(DATASET_PATH, topic);
  const ratingPath = path.join(topicPath, rating.toString());

  // Ensure directories exist
  if (!fs.existsSync(ratingPath)) {
    fs.mkdirSync(ratingPath, { recursive: true });
  }

  const filename = `${contestId}${index}.json`;
  const filePath = path.join(ratingPath, filename);

  const data = {
    title,
    contestId,
    index,
    rating,
    tags,
    content
  };

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Problem saved: ${filePath}`);
    return { success: true, path: filePath };
  } catch (e) {
    console.error('Error saving problem:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('kb:get-problem', async (event, problemPath) => {
  try {
    if (!fs.existsSync(problemPath)) {
      return { success: false, error: 'Problem not found' };
    }
    const data = JSON.parse(fs.readFileSync(problemPath, 'utf-8'));
    return { success: true, data };
  } catch (e) {
    console.error('Error reading problem:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('kb:delete-problem', async (event, problemPath) => {
  try {
    if (fs.existsSync(problemPath)) {
      fs.unlinkSync(problemPath);
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  } catch (e) {
    console.error('Error deleting problem:', e);
    return { success: false, error: e.message };
  }
});

// Fetch CF metadata (topics, ratings, tags)
ipcMain.handle('codeforces:get-metadata', async () => {
  try {
    if (!fs.existsSync(DATASET_PATH)) {
      return { topics: [], ratings: [], tags: [] };
    }

    const topics = fs.readdirSync(DATASET_PATH).filter(f => fs.statSync(path.join(DATASET_PATH, f)).isDirectory());
    const ratingsSet = new Set();
    const tagsSet = new Set();

    for (const topic of topics) {
      const topicPath = path.join(DATASET_PATH, topic);
      const ratings = fs.readdirSync(topicPath).filter(f => fs.statSync(path.join(topicPath, f)).isDirectory());
      ratings.forEach(r => ratingsSet.add(r));

      for (const rating of ratings) {
        const ratingPath = path.join(topicPath, rating);
        const files = fs.readdirSync(ratingPath).filter(f => f.endsWith('.json'));

        // Sample some files to get tags (scanning all might be slow, but let's try for now if dataset is medium)
        for (const file of files) {
          try {
            const content = JSON.parse(fs.readFileSync(path.join(ratingPath, file), 'utf-8'));
            if (content.tags) content.tags.forEach(t => tagsSet.add(t));
          } catch (e) { /* ignore corrupt files */ }
        }
      }
    }

    return {
      topics: topics.sort(),
      ratings: Array.from(ratingsSet).sort((a, b) => parseInt(a) - parseInt(b)),
      tags: Array.from(tagsSet).sort()
    };
  } catch (e) {
    console.error('Error getting CF dataset metadata:', e);
    return { topics: [], ratings: [], tags: [] };
  }
});

ipcMain.handle('codeforces:get-filtered-problems', async (_, filters) => {
  const { topic, rating, tag, search } = filters;
  const problems = [];

  try {
    if (!fs.existsSync(DATASET_PATH)) return [];

    const scanTopics = topic ? [topic] : fs.readdirSync(DATASET_PATH).filter(f => fs.statSync(path.join(DATASET_PATH, f)).isDirectory());

    for (const t of scanTopics) {
      const topicPath = path.join(DATASET_PATH, t);
      const scanRatings = rating ? [rating] : fs.readdirSync(topicPath).filter(f => fs.statSync(path.join(topicPath, f)).isDirectory());

      for (const r of scanRatings) {
        const ratingPath = path.join(topicPath, r);
        if (!fs.existsSync(ratingPath)) continue;

        const files = fs.readdirSync(ratingPath).filter(f => f.endsWith('.json'));
        for (const file of files) {
          try {
            const filePath = path.join(ratingPath, file);
            const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

            // Apply filters
            if (tag && (!content.tags || !content.tags.includes(tag))) continue;
            if (search && !content.title.toLowerCase().includes(search.toLowerCase())) continue;

            problems.push({
              title: content.title,
              contestId: content.contestId,
              index: content.index,
              rating: content.rating,
              tags: content.tags,
              path: filePath,
              topic: t
            });
          } catch (e) { /* ignore */ }
        }
      }
    }
    return problems;
  } catch (e) {
    console.error('Error filtering problems:', e);
    return [];
  }
});

// ─── IPC: Editor State ────────────────────────────────────────
ipcMain.handle('editor:save-state', async (_, state) => {
  const statePath = path.join(os.homedir(), '.geeks_editor_state.json');
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  return true;
});

ipcMain.handle('editor:get-state', async () => {
  const statePath = path.join(os.homedir(), '.geeks_editor_state.json');
  if (fs.existsSync(statePath)) {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch (e) {
      return null;
    }
  }
  return null;
});

// Autocomplete handler
ipcMain.handle('ai:complete', async (event, codeContext) => {
    if (!context) return null;
    let tempSession = null;
    let sequence = null;
    try {
        const { LlamaChatSession } = await import("node-llama-cpp");
        // For autocomplete, we try to get a sequence. If context is full, this might fail unless we recycle.
        // But autocomplete is ephemeral.
        sequence = await getSequenceWithRetry(context);
        globalAutocompleteSequence = sequence;
        
        tempSession = new LlamaChatSession({ 
            contextSequence: sequence 
        });

        const [prefix, suffix] = codeContext.split('<CURSOR>');
        const prompt = `<｜fim_begin｜>${prefix}<｜fim_hole｜>${suffix}<｜fim_end｜>`;
        
        const response = await tempSession.prompt(prompt, {
            maxTokens: 50,
            temperature: 0.1,
            stopOnTokens: ["\n", "}", ";", "<｜fim_end｜>"] 
        });
        
        return response.trim();
    } catch (error) {
        console.error("AI Autocomplete failed:", error);
        return null;
    } finally {
        if (sequence && !sequence.disposed) {
            try {
                sequence.dispose();
            } catch (e) {
                console.error("Error disposing autocomplete sequence:", e);
            }
        }
        if (globalAutocompleteSequence === sequence) {
             globalAutocompleteSequence = null;
        }
    }
});

// Inline Prompt Handler (~("prompt"))
ipcMain.handle('ai:inline-prompt', async (event, code, prompt, lineNumber) => {
    if (!context) {
        console.log("AI: Context not initialized for inline prompt. Auto-initializing...");
        const activeModel = AI_MODELS[activeModelId];
        if (activeModel) {
            try {
                await initAIModel(path.join(app.getPath('userData'), activeModel.filename), 'inline-session', false);
            } catch (e) {
                console.error("AI: Auto-init failed:", e);
                return `// Error: AI initialization failed: ${e.message}`;
            }
        } else {
             return `// Error: No active model selected`;
        }
    }
    
    if (!context) {
         return `// Error: AI failed to initialize`;
    }

    let tempSession = null;
    let sequence = null;

    try {
        const { LlamaChatSession } = await import("node-llama-cpp");
        
        // 1. Context Truncation
        const lines = code.split('\n');
        const startLine = Math.max(0, lineNumber - 50); // 50 lines before
        const endLine = Math.min(lines.length, lineNumber + 20); // 20 lines after
        
        // Add line numbers to context for the model
        const contextLines = lines
            .slice(startLine, endLine)
            .map((line, idx) => `${startLine + idx + 1}: ${line}`);
            
        const contextBlock = contextLines.join('\n');
        
        // 2. Construct Prompt
        const systemInstruction = `You are an expert coding assistant.
User Request: "${prompt}"
Task: Write valid C++ code to fulfill the User Request.
Output ONLY the requested code. Do NOT output explanations or markdown backticks.`;

        const userMsg = `Request: "${prompt}"
Context:
${contextBlock}

Write the code for "${prompt}". Only return the code.`;

        // 3. Execution
        sequence = await getSequenceWithRetry(context);
        tempSession = new LlamaChatSession({ 
            contextSequence: sequence 
        });

        console.log(`AI: Inline prompt processing for line ${lineNumber}: "${prompt}"`);
        
        const response = await tempSession.prompt(userMsg, {
            systemPrompt: systemInstruction,
            temperature: 0.2, // Low temperature for deterministic code
            maxTokens: 1024
        });
        
        console.log("AI: Inline response generated.");
        
        // Cleanup response (robust extraction)
        let cleanResponse = response.trim();
        
        // Regex to find first code block ```...```
        const codeBlockMatch = cleanResponse.match(/```(?:[a-zA-Z]*)\n([\s\S]*?)```/);
        
        if (codeBlockMatch) {
            cleanResponse = codeBlockMatch[1].trim();
        } else {
             // Fallback: If no code block, try to strip potential "Sure..." text if it appears to be a mixed response
             // But valid code might not be in a block. 
             // Let's remove lines that don't look like code if they are at the start? 
             // For now, simpler is creating a heuristic: 
             // If response starts with text and then has code, the prompt instructions should have prevented this, 
             // but 'deepseek' can be chatty.
             
             // Simple heuristic: remove lines starting with "Sure", "Here", "Okay"
             const lines = cleanResponse.split('\n');
             if (lines.length > 0 && /^(sure|here|okay|certainly|i can|below is)/i.test(lines[0])) {
                 cleanResponse = lines.slice(1).join('\n').trim();
             }
        }
        
        return cleanResponse;

    } catch (error) {
        console.error("AI Inline Prompt failed:", error);
        return `// Error generating code: ${error.message}`;
    } finally {
        if (sequence && !sequence.disposed) {
            try {
                sequence.dispose();
                console.log("AI: Inline prompt sequence disposed.");
            } catch (e) {
                console.error("Error disposing inline prompt sequence:", e);
            }
        }
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
