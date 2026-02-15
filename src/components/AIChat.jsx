import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Download, Loader, Trash2, Plus, MessageSquare, X, Database, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { Play, Bug, Terminal as TerminalIcon } from 'lucide-react';

const AIChat = ({ sessions, setSessions, activeSessionId, setActiveSessionId, theme, projectFiles }) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(false);
    const [agentStatus, setAgentStatus] = useState(null);
    const [mentionSearch, setMentionSearch] = useState(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const messagesEndRef = useRef(null);

    const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
    const isDark = theme.includes('dark');

    useEffect(() => {
        const indexProject = async () => {
             if (window.electronAPI && projectFiles && projectFiles.length > 0) {
                 await window.electronAPI.rag.index(projectFiles);
             }
        };
        indexProject();
    }, [projectFiles]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [activeSession.messages, loading]);

    const handleMentionSelect = (file) => {
        if (mentionSearch === null) return;
        const textBefore = input.substring(0, mentionSearch);
        const textAfter = input.substring(input.length); // usually just empty if at end
        setInput(textBefore + `@${file.name} `);
        setMentionSearch(null);
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        
        let userPrompt = input;
        const userMsg = input;
        setInput('');

        // RAG Agent trigger: ~("request") or ~('request')
        const ragMatch = userMsg.match(/~[\s]*\(['"]([^'"]+)['"]\)/);
        if (ragMatch && window.electronAPI.rag) {
            const query = ragMatch[1];
            setSessions(prev => prev.map(s => 
                s.id === activeSessionId 
                    ? { ...s, messages: [...s.messages, { role: 'user', content: userMsg }, { role: 'ai', content: `🔍 **Editor Agent**: Searching for relevant code patterns for "${query}"...` }] }
                    : s
            ));
            
            setLoading(true);
            const searchResults = await window.electronAPI.rag.query(query);
            let contextText = "🤖 **Editor Agent Context (RAG)**:\n";
            if (searchResults.length > 0) {
                searchResults.forEach(res => {
                    contextText += `\n--- Relevant File: ${res.name} ---\n${res.content}\n`;
                });
            } else {
                contextText += "\nNo highly relevant patterns found, but I will try to help based on the general request.\n";
            }
            
            userPrompt = `${contextText}\n**User specialized request**: ${query}\n\nPlease perform the requested code changes or explanation based on the retrieved context above.`;
        } else {
            // Context injection for @mentions
            const mentions = userMsg.match(/@([\w\.\-]+)/g);
            if (mentions && projectFiles) {
                const fileName = mentions[0].substring(1);
                const file = projectFiles.find(f => f.name === fileName);
                if (file && (userMsg.toLowerCase().includes('test') || userMsg.toLowerCase().includes('error') || userMsg.toLowerCase().includes('why'))) {
                    handleAgenticFlow(file, userMsg);
                    return;
                }
                
                // Standard mention handling
                let contextText = "Context from mentioned files:\n";
                for (const mention of mentions) {
                    const fName = mention.substring(1);
                    const f = projectFiles.find(file => file.name === fName);
                    if (f) {
                        try {
                            const content = await window.electronAPI.readFile(f.path);
                            contextText += `\n--- File: ${f.name} ---\n${content}\n`;
                        } catch (e) {
                            console.error(`Failed to read mentioned file: ${f.name}`, e);
                        }
                    }
                }
                userPrompt = `🤖 **Context Agent**: Reading mentioned files...\n${contextText}\n\n**User request**: ${userMsg}`;
            }
            
            // Update local session messages for normal requests
            setSessions(prev => prev.map(s => 
                s.id === activeSessionId 
                    ? { ...s, messages: [...s.messages, { role: 'user', content: userMsg }] }
                    : s
            ));
        }

        setLoading(true);

        if (window.electronAPI) {
            try {
                // Ensure AI is initialized before asking (Lazy Init)
                if (!ready) {
                    await window.electronAPI.initAI(activeSessionId);
                    setReady(true);
                }
                const response = await window.electronAPI.askAI(userPrompt, activeSessionId);
                setSessions(prev => prev.map(s => 
                    s.id === activeSessionId 
                        ? { ...s, messages: [...s.messages, { role: 'ai', content: response }] }
                        : s
                ));
            } catch (e) {
                setSessions(prev => prev.map(s => 
                    s.id === activeSessionId 
                        ? { ...s, messages: [...s.messages, { role: 'ai', content: "Error communicating with AI." }] }
                        : s
                ));
            }
        }
        setLoading(false);
    };

    const handleRunCode = async (code, language) => {
        if (language !== 'cpp') {
            alert("Execution is only supported for C++ at the moment.");
            return;
        }

        let inputData = "";
        const choice = prompt("Run Options:\n1. Enter input manually\n2. GeeksAI Generate Input\n3. No input", "1");
        
        if (choice === "1") {
            inputData = prompt("Enter input:") || "";
        } else if (choice === "2") {
            setSessions(prev => prev.map(s => 
                s.id === activeSessionId 
                    ? { ...s, messages: [...s.messages, { role: 'ai', content: `🧠 **Input Agent**: Analyzing code to generate relevant test cases...` }] }
                    : s
            ));
            const genPrompt = `Generate a sample input for the following C++ code. Provide ONLY the input values, nothing else:\n\n${code}`;
            inputData = await window.electronAPI.askAI(genPrompt, activeSessionId);
            // Clean up AI response to get just the input (often it adds backticks)
            inputData = inputData.replace(/```\w*/g, '').replace(/```/g, '').trim();
        }
        
        setSessions(prev => prev.map(s => 
            s.id === activeSessionId 
                ? { ...s, messages: [...s.messages, { role: 'ai', content: `⚙️ **Agent Executor**: Compiling and running...\n${inputData ? `*Using ${choice === "2" ? "generated" : "provided"} input:*\n\`\`\`\n${inputData}\n\`\`\`` : '*No input provided*'}` }] }
                : s
        ));

        setLoading(true);

        try {
            // 1. Create a temp file for the code
            const tempFile = `temp_agent_${Date.now()}.cpp`;
            const tempPath = await window.electronAPI.runCommand('pwd').then(r => r.stdout.trim() + '/' + tempFile);
            await window.electronAPI.writeFile(tempPath, code);

            // 2. Compile
            const compileResult = await window.electronAPI.runCommand(`g++ ${tempFile} -o a.out`, await window.electronAPI.runCommand('pwd').then(r => r.stdout.trim()));
            
            if (!compileResult.success) {
                // FEED BACK TO AI
                const errorMsg = `Compilation failed:\n${compileResult.stderr}`;
                setSessions(prev => prev.map(s => 
                    s.id === activeSessionId 
                        ? { ...s, messages: [...s.messages, { role: 'ai', content: `❌ **Compilation Error**:\n\`\`\`\n${compileResult.stderr}\n\`\`\`\n\nAttempting to fix...` }] }
                        : s
                ));

                const fixPrompt = `The code I just generated failed to compile. Here is the error:\n\n${compileResult.stderr}\n\nPlease provide a corrected version of the code.`;
                const fixedResponse = await window.electronAPI.askAI(fixPrompt, activeSessionId);
                
                setSessions(prev => prev.map(s => 
                    s.id === activeSessionId 
                        ? { ...s, messages: [...s.messages, { role: 'ai', content: fixedResponse }] }
                        : s
                ));
            } else {
                // 3. Run
                // We use a small hack to echo input into the program
                const runCmd = `echo "${inputData.replace(/"/g, '\\"')}" | ./a.out`;
                const runResult = await window.electronAPI.runCommand(runCmd, await window.electronAPI.runCommand('pwd').then(r => r.stdout.trim()));
                
                let output = `✅ **Execution Success**:\n**Output:**\n\`\`\`\n${runResult.stdout || '(No output)'}\n\`\`\``;
                if (runResult.stderr) {
                    output += `\n**Errors/Stderr:**\n\`\`\`\n${runResult.stderr}\n\`\`\``;
                }
                
                setSessions(prev => prev.map(s => 
                    s.id === activeSessionId 
                        ? { ...s, messages: [...s.messages, { role: 'ai', content: output }] }
                        : s
                ));
            }
        } catch (e) {
            console.error("Execution Agent failed:", e);
        } finally {
            setLoading(false);
            setAgentStatus(null);
        }
    };

    const updateAgentMessage = (content, keepPrevious = true) => {
        setSessions(prev => prev.map(s => {
            if (s.id !== activeSessionId) return s;
            const messages = [...s.messages];
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.role === 'ai' && lastMsg.isAgent) {
                lastMsg.content = keepPrevious ? `${lastMsg.content}\n${content}` : content;
            } else {
                messages.push({ role: 'ai', content, isAgent: true });
            }
            return { ...s, messages };
        }));
    };

    const handleAgenticFlow = async (file, promptText) => {
        setLoading(true);
        setAgentStatus("Initializing...");
        
        const isTestRequest = promptText.toLowerCase().includes('test');
        const isErrorReport = promptText.toLowerCase().includes('error') || promptText.toLowerCase().includes('why');

        updateAgentMessage(`🤖 **Geeks Agent**: Starting agentic flow for \`${file.name}\`...`);

        try {
            const content = await window.electronAPI.readFile(file.path);
            const fileName = file.name;
            const dirPath = file.path.substring(0, file.path.lastIndexOf('/'));

            if (isTestRequest || isErrorReport) {
                // Step 1: Compile
                setAgentStatus("Compiling...");
                updateAgentMessage(`[1/3] ⚙️ Compiling \`${fileName}\`...`);
                const compileResult = await window.electronAPI.runCommand(`g++ ${fileName} -o a.out`, dirPath);
                
                if (!compileResult.success) {
                    updateAgentMessage(`❌ Compilation failed!\n\`\`\`\n${compileResult.stderr}\n\`\`\`\n\nAnalyzing error...`);
                    const debugPrompt = `The user is asking about an error in this file: ${fileName}.\n\nFile Content:\n\`\`\`cpp\n${content}\n\`\`\`\n\nCompilation Error:\n\`\`\`\n${compileResult.stderr}\n\`\`\`\n\nPlease explain why this error is happening and provide the fix.`;
                    const response = await window.electronAPI.askAI(debugPrompt, activeSessionId);
                    updateAgentMessage(`✅ **Analysis Complete**:\n${response}`);
                    return;
                }

                updateAgentMessage(`✅ Compiled successfully.`);

                // Step 2: Test/Run
                setAgentStatus("Running...");
                let inputData = "";
                if (isTestRequest) {
                    updateAgentMessage(`[2/3] 🧠 Generating test input...`);
                    const genPrompt = `Generate a sample input for this C++ code. Provide ONLY the raw input values:\n\n${content}`;
                    inputData = await window.electronAPI.askAI(genPrompt, activeSessionId);
                    inputData = inputData.replace(/```\w*/g, '').replace(/```/g, '').trim();
                    updateAgentMessage(`*Using generated input:*\n\`\`\`\n${inputData}\n\`\`\``);
                }

                updateAgentMessage(`[3/3] 🚀 Running with input...`);
                const runCmd = `echo "${inputData.replace(/"/g, '\\"')}" | ./a.out`;
                const runResult = await window.electronAPI.runCommand(runCmd, dirPath);
                
                let output = `✅ **Execution Finished**:\n**Output:**\n\`\`\`\n${runResult.stdout || '(No output)'}\n\`\`\``;
                if (runResult.stderr) output += `\n**Stderr:**\n\`\`\`\n${runResult.stderr}\n\`\`\``;
                updateAgentMessage(output);
            } else {
                // Normal context request
                const response = await window.electronAPI.askAI(`Context: ${content}\n\nUser request: ${promptText}`, activeSessionId);
                updateAgentMessage(response, false);
            }
        } catch (e) {
            updateAgentMessage(`❌ Unexpected error: ${e.message}`);
        } finally {
            setLoading(false);
            setAgentStatus(null);
        }
    };

    const createNewSession = () => {
        const newId = `session-${Date.now()}`;
        const newSession = {
            id: newId,
            name: `Chat ${sessions.length + 1}`,
            messages: [{ role: 'ai', content: "New session started. How can I help?" }]
        };
        setSessions(prev => [...prev, newSession]);
        setActiveSessionId(newId);
    };

    const closeSession = async (e, sessionId) => {
        e.stopPropagation();
        if (sessionId === 'default') return;
        
        if (window.electronAPI) {
            await window.electronAPI.destroySession(sessionId);
        }
        
        setSessions(prev => {
            const newSessions = prev.filter(s => s.id !== sessionId);
            if (activeSessionId === sessionId) {
                setActiveSessionId('default');
            }
            return newSessions;
        });
    };

    const handleKeyDown = (e) => {
        if (mentionSearch !== null) {
            const filtered = getFilteredMentions();
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex(prev => (prev + 1) % filtered.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex(prev => (prev - 1 + filtered.length) % filtered.length);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                if (filtered[mentionIndex]) handleMentionSelect(filtered[mentionIndex]);
                return;
            }
            if (e.key === 'Escape') {
                setMentionSearch(null);
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;
        setInput(value);

        const lastAtPos = value.lastIndexOf('@', cursorPosition - 1);
        if (lastAtPos !== -1) {
            const query = value.substring(lastAtPos + 1, cursorPosition);
            if (!query.includes(' ')) {
                setMentionSearch(lastAtPos);
                setMentionIndex(0);
                return;
            }
        }
        setMentionSearch(null);
    };

    const getFilteredMentions = () => {
        if (mentionSearch === null) return [];
        const query = input.substring(mentionSearch + 1).toLowerCase();
        return (projectFiles || [])
            .filter(f => f.name.toLowerCase().includes(query))
            .slice(0, 5);
    };

    const clearChat = () => {
        setSessions(prev => prev.map(s => 
            s.id === activeSessionId 
                ? { ...s, messages: [{ role: 'ai', content: "Chat cleared." }] }
                : s
        ));
    };

    const handleIndexKB = async () => {
        if (window.electronAPI && window.electronAPI.rag) {
            setLoading(true);
            updateAgentMessage("📚 **RAG**: Indexing Knowledge Base...");
            try {
                const success = await window.electronAPI.rag.indexKB();
                if (success) {
                    updateAgentMessage("✅ **RAG**: Knowledge Base Indexed Successfully.");
                } else {
                    updateAgentMessage("❌ **RAG**: Failed to index Knowledge Base (Check if folder exists).");
                }
            } catch (e) {
                updateAgentMessage(`❌ **RAG**: Error indexing: ${e.message}`);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className={`flex flex-col h-full ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'} text-vscode-text font-sans border-l border-[#2b2b2b]`}>
            {/* Header & Session Switcher */}
            <div className={`px-2 flex flex-col ${isDark ? 'bg-[#252526]' : 'bg-[#f3f3f3]'} border-b border-[#2b2b2b] select-none`}>
                <div className="h-9 flex items-center justify-between px-2">
                    <span className="font-bold text-[10px] uppercase tracking-wide opacity-70">AI Sessions</span>
                    <div className="flex space-x-1">
                        <button onClick={handleIndexKB} className="p-1 hover:bg-white/10 rounded" title="Index RAG Knowledge Base">
                            <Database size={14} />
                        </button>
                        <button onClick={createNewSession} className="p-1 hover:bg-white/10 rounded" title="New Chat">
                            <Plus size={14} />
                        </button>
                    </div>
                </div>
                <div className="flex space-x-1 overflow-x-auto pb-1 no-scrollbar">
                    {sessions.map(s => (
                        <div 
                            key={s.id}
                            onClick={() => setActiveSessionId(s.id)}
                            className={`group flex items-center px-3 py-1 text-[11px] rounded-t-sm transition-colors whitespace-nowrap cursor-pointer ${
                                activeSessionId === s.id 
                                ? (isDark ? 'bg-[#1e1e1e] text-white' : 'bg-white text-black border-t border-x border-[#ddd]') 
                                : 'opacity-60 hover:opacity-100'
                            }`}
                        >
                            <span>{s.name}</span>
                            {s.id !== 'default' && (
                                <button 
                                    onClick={(e) => closeSession(e, s.id)}
                                    className="ml-2 p-0.5 rounded-full hover:bg-white/20 transition-opacity flex items-center justify-center"
                                    title="Close Session"
                                >
                                    <X size={10} className="opacity-60 hover:opacity-100" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {activeSession.messages.map((msg, index) => (
                    <div key={index} className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2 mb-1">
                             <div className={`w-4 h-4 rounded-sm flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                                {msg.role === 'user' ? <User size={10} className="text-white" /> : <Bot size={10} className="text-white" />}
                            </div>
                            <span className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                {msg.role === 'user' ? 'You' : 'GeeksAI'}
                            </span>
                        </div>
                            <div className={`pl-6 text-[13px] leading-relaxed allow-select ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                                 {msg.role === 'ai' ? (
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            code({node, inline, className, children, ...props}) {
                                                const match = /language-(\w+)/.exec(className || '')
                                                const codeContent = String(children).replace(/\n$/, '');
                                                return !inline && match ? (
                                                    <div className="group relative">
                                                        <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                            <button 
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(codeContent);
                                                                }}
                                                                className="p-1 px-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-[10px] flex items-center space-x-1 shadow-lg border border-gray-600"
                                                                title="Copy Code"
                                                            >
                                                                <Copy size={10} />
                                                                <span>Copy</span>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleRunCode(codeContent, match[1])}
                                                                className="p-1 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] flex items-center space-x-1 shadow-lg"
                                                                title="Run Code"
                                                            >
                                                                <Play size={10} />
                                                                <span>Run</span>
                                                            </button>
                                                        </div>
                                                        <SyntaxHighlighter
                                                            style={isDark ? vscDarkPlus : vs}
                                                            language={match[1]}
                                                            PreTag="div"
                                                            {...props}
                                                        >
                                                            {codeContent}
                                                        </SyntaxHighlighter>
                                                    </div>
                                                ) : (
                                                    <code className={`${className} ${isDark ? 'bg-white/10' : 'bg-black/5'} px-1 rounded`} {...props}>
                                                        {children}
                                                    </code>
                                                )
                                            }
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                ) : (
                                    msg.content
                                )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex flex-col space-y-1">
                         <div className="flex items-center space-x-2 mb-1">
                             <div className="w-4 h-4 rounded-sm flex items-center justify-center bg-purple-600">
                                <Bot size={10} className="text-white" />
                            </div>
                            <span className="text-xs font-bold text-gray-400">assistant</span>
                        </div>
                        <div className="pl-6 flex space-x-1 items-center h-4">
                            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            {agentStatus && <span className="ml-2 text-[10px] text-gray-500 font-medium animate-pulse uppercase tracking-tighter">{agentStatus}</span>}
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={`p-4 ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'} border-t border-[#2b2b2b]`}>
                <div className={`relative flex items-center ${isDark ? 'bg-[#3c3c3c]' : 'bg-[#f3f3f3]'} border ${isDark ? 'border-[#3c3c3c]' : 'border-[#ccc]'} focus-within:ring-1 focus-within:ring-[#007acc] focus-within:border-[#007acc] rounded-[2px]`}>
                    <textarea
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={ready ? "Ask GeeksAI... (@ to mention files)" : "Type to start chat (AI will initialize)..."}
                        disabled={loading}
                        rows={1}
                        className={`w-full bg-transparent ${isDark ? 'text-white' : 'text-black'} text-[13px] py-2 pl-2 pr-8 focus:outline-none placeholder-gray-400 resize-none font-sans`}
                        style={{ minHeight: '32px' }}
                    />
                    {mentionSearch !== null && getFilteredMentions().length > 0 && (
                        <div className="absolute bottom-full left-0 w-full bg-[#252526] border border-[#454545] rounded-t-lg shadow-xl mb-1 overflow-hidden z-20">
                            {getFilteredMentions().map((file, idx) => (
                                <div
                                    key={file.path}
                                    onClick={() => handleMentionSelect(file)}
                                    className={`px-3 py-2 text-xs flex items-center cursor-pointer ${
                                        idx === mentionIndex ? 'bg-[#094771] text-white' : 'text-gray-300 hover:bg-[#2a2d2e]'
                                    }`}
                                >
                                    <MessageSquare size={12} className="mr-2 opacity-50" />
                                    <span className="font-medium">{file.name}</span>
                                    <span className="ml-2 opacity-40 text-[10px] truncate">{file.relativePath}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || loading || !ready}
                        className="absolute right-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={14} />
                    </button>
                </div>
                <div className="mt-2 flex justify-end">
                     <button onClick={clearChat} className="text-[10px] text-gray-400 hover:text-white flex items-center space-x-1">
                        <Trash2 size={10} />
                        <span>Clear chat</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIChat;
