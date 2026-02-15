const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Shell execution
    runCommand: (command, cwd) => ipcRenderer.invoke('shell:run', command, cwd),

    // RAG Agent
    rag: {
        index: (files) => ipcRenderer.invoke('rag:index', files),
        query: (text) => ipcRenderer.invoke('rag:query', text),
        indexKB: () => ipcRenderer.invoke('rag:index-kb'),
    },

    // Workspace state
    saveState: (state) => ipcRenderer.invoke('editor:save-state', state),
    getState: () => ipcRenderer.invoke('editor:get-state'),

    // Dialog
    openFolder: () => ipcRenderer.invoke('dialog:openFolder'),

    // File system
    readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
    readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),

    // Terminal
    createTerminal: (cols, rows) => ipcRenderer.invoke('terminal:create', cols, rows),
    writeTerminal: (data) => ipcRenderer.send('terminal:write', data),
    resizeTerminal: (cols, rows) => ipcRenderer.send('terminal:resize', cols, rows),
    onTerminalData: (callback) => ipcRenderer.on('terminal:data', (_, data) => callback(data)),
    setTerminalCwd: (cwd) => ipcRenderer.send('terminal:cwd', cwd),

    // Tab management
    onCloseTab: (callback) => ipcRenderer.on('close-active-tab', () => callback()),

    // Codeforces
    codeforces: {
        saveCreds: (creds) => ipcRenderer.invoke('codeforces:save-creds', creds),
        getCreds: () => ipcRenderer.invoke('codeforces:get-creds'),
        getSubmissions: (handle) => ipcRenderer.invoke('codeforces:get-submissions', handle),
        getUserInfo: (handle) => ipcRenderer.invoke('codeforces:get-user-info', handle),
        onOpenSettings: (callback) => ipcRenderer.on('codeforces:open-settings', () => callback()),
        getDatasetMetadata: () => ipcRenderer.invoke('codeforces:get-dataset-metadata'),
        getFilteredProblems: (filters) => ipcRenderer.invoke('codeforces:get-filtered-problems', filters),
    },

    onRagProgress: (callback) => ipcRenderer.on('rag:progress', (_, data) => callback(data)),

    // AI
  // AI
  initAI: (sessionId) => ipcRenderer.invoke('ai:init', sessionId),
  checkModel: () => ipcRenderer.invoke('ai:check-model'),
  askAI: (prompt, sessionId) => ipcRenderer.invoke('ai:ask', prompt, sessionId),
  completeAI: (codeContext) => ipcRenderer.invoke('ai:complete', codeContext),
  inlinePrompt: (code, prompt, lineNumber) => ipcRenderer.invoke('ai:inline-prompt', code, prompt, lineNumber),
  setModel: (modelId) => ipcRenderer.invoke('ai:set-model', modelId),
  getActiveModel: () => ipcRenderer.invoke('ai:get-active-model'),
  getModels: () => ipcRenderer.invoke('ai:get-models'),
  onAIDownloadProgress: (callback) => ipcRenderer.on('ai:download-progress', (_, progress, message) => callback(progress, message)),

    // Zoom
    setZoom: (level) => ipcRenderer.invoke('app:set-zoom', level),
    getZoom: () => ipcRenderer.invoke('app:get-zoom'),
    indexProject: (dirPath) => ipcRenderer.invoke('fs:indexProject', dirPath),
    searchFiles: (rootPath, query, options) => ipcRenderer.invoke('fs:search', rootPath, query, options),
    createFile: (filePath) => ipcRenderer.invoke('fs:createFile', filePath),
    createFolder: (folderPath) => ipcRenderer.invoke('fs:createFolder', folderPath),
    destroySession: (sessionId) => ipcRenderer.invoke('ai:destroy-session', sessionId),
    deleteModel: () => ipcRenderer.invoke('ai:delete-model'),
});
contextBridge.exposeInMainWorld('run', {
    submit: (a) => ipcRenderer.invoke('submit-code', a)
})
