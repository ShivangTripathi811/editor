/* ═══════════════════════════════════════════════════
   Renderer – Code Editor
   ═══════════════════════════════════════════════════ */

// ─── State ──────────────────────────────────────────
let editor = null;
let currentFolderPath = null;
let openTabs = []; // { filePath, model, isDirty }
let activeTab = null;
let terminalInitialized = false;
let panelVisible = false;
let panelHeight = 250;
let term = null;
let fitAddon = null;

// ─── Extension → Language Map ───────────────────────
const EXT_LANG_MAP = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.rb': 'ruby',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.cs': 'csharp',
    '.go': 'go',
    '.rs': 'rust',
    '.php': 'php',
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.less': 'less',
    '.json': 'json',
    '.xml': 'xml',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.md': 'markdown',
    '.sh': 'shell',
    '.bash': 'shell',
    '.zsh': 'shell',
    '.sql': 'sql',
    '.r': 'r',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.lua': 'lua',
    '.dart': 'dart',
    '.vue': 'html',
    '.svelte': 'html',
    '.toml': 'ini',
    '.ini': 'ini',
    '.env': 'ini',
    '.dockerfile': 'dockerfile',
    '.graphql': 'graphql',
    '.proto': 'protobuf',
};

// ─── Extension → Icon/Color Map ────────────────────
const FILE_ICONS = {
  '.js': { icon: 'symbol-method', color: '#f7df1e' },
  '.jsx': { icon: 'symbol-structure', color: '#61dafb' },
  '.ts': { icon: 'symbol-type-parameter', color: '#3178c6' },
  '.tsx': { icon: 'symbol-structure', color: '#3178c6' },
  '.py': { icon: 'symbol-variable', color: '#3776ab' },
  '.html': { icon: 'code', color: '#e34c26' },
  '.css': { icon: 'symbol-color', color: '#264de4' },
  '.json': { icon: 'symbol-constant', color: '#f1c40f' },
  '.md': { icon: 'book', color: '#083fa1' },
  '.yml': { icon: 'gear', color: '#cb171e' },
  '.yaml': { icon: 'gear', color: '#cb171e' },
  '.xml': { icon: 'code', color: '#ff6600' },
  '.sh': { icon: 'terminal', color: '#4eaa25' },
  '.go': { icon: 'symbol-namespace', color: '#00add8' },
  '.rs': { icon: 'symbol-interface', color: '#dea584' },
  '.java': { icon: 'symbol-class', color: '#b07219' },
  '.c': { icon: 'symbol-field', color: '#555555' },
  '.cpp': { icon: 'symbol-field', color: '#f34b7d' },
  '.rb': { icon: 'symbol-keyword', color: '#cc342d' },
  '.php': { icon: 'symbol-method', color: '#777bb4' },
  '.swift': { icon: 'symbol-property', color: '#f05138' },
  '.kt': { icon: 'symbol-keyword', color: '#a97bff' },
  '.dart': { icon: 'symbol-event', color: '#0175c2' },
  '.vue': { icon: 'symbol-snippet', color: '#41b883' },
  '.svg': { icon: 'image', color: '#ffb13b' },
  '.gitignore': { icon: 'source-control', color: '#f05032' },
  '.env': { icon: 'settings-gear', color: '#ecd53f' },
  '.lock': { icon: 'lock', color: '#888888' },
};

const DEFAULT_ICON = { icon: 'file', color: '#cccccc' };
const FOLDER_ICON = { icon: 'folder', color: '#cccccc' };
const FOLDER_OPEN_ICON = { icon: 'folder-opened', color: '#cccccc' };

function getFileIcon(filename) {
    const lower = filename.toLowerCase();
    // Check full filename first (e.g. .gitignore)
    if (FILE_ICONS[lower]) return FILE_ICONS[lower];
    // Check extension
    const dotIdx = lower.lastIndexOf('.');
    if (dotIdx >= 0) {
        const ext = lower.substring(dotIdx);
        if (FILE_ICONS[ext]) return FILE_ICONS[ext];
    }
    return DEFAULT_ICON;
}

function getLanguage(filePath) {
    const dotIdx = filePath.lastIndexOf('.');
    if (dotIdx >= 0) {
        const ext = filePath.substring(dotIdx).toLowerCase();
        return EXT_LANG_MAP[ext] || 'plaintext';
    }
    return 'plaintext';
}

function getLanguageLabel(lang) {
    const labels = {
        javascript: 'JavaScript',
        typescript: 'TypeScript',
        python: 'Python',
        html: 'HTML',
        css: 'CSS',
        json: 'JSON',
        markdown: 'Markdown',
        shell: 'Shell Script',
        yaml: 'YAML',
        go: 'Go',
        rust: 'Rust',
        java: 'Java',
        c: 'C',
        cpp: 'C++',
        csharp: 'C#',
        ruby: 'Ruby',
        php: 'PHP',
        swift: 'Swift',
        kotlin: 'Kotlin',
        dart: 'Dart',
        sql: 'SQL',
        plaintext: 'Plain Text',
    };
    return labels[lang] || lang;
}

// ─── DOM Refs ───────────────────────────────────────
const fileTree = document.getElementById('file-tree');
const folderHeader = document.getElementById('folder-header');
const folderNameEl = document.getElementById('folder-name');
const openFolderPrompt = document.getElementById('open-folder-prompt');
const tabsContainer = document.getElementById('tabs-container');
const tabsBar = document.getElementById('tabs-bar');
const monacoContainer = document.getElementById('monaco-container');
const welcomeView = document.getElementById('welcome-view');
const panel = document.getElementById('panel');
const panelResize = document.getElementById('panel-resize');
const terminalContainer = document.getElementById('terminal-container');
const statusPosition = document.getElementById('status-position');
const statusLanguage = document.getElementById('status-language');

// ─── Buttons ────────────────────────────────────────
document.getElementById('btn-open-folder').addEventListener('click', openFolder);
document.getElementById('btn-welcome-open').addEventListener('click', openFolder);
document.getElementById('btn-panel-close').addEventListener('click', togglePanel);

// ─── Tab Bar Visibility ─────────────────────────────
function updateTabBarVisibility() {
    if (openTabs.length > 0) {
        tabsBar.classList.add('has-tabs');
    } else {
        tabsBar.classList.remove('has-tabs');
    }
}

// ─── Activity Bar ───────────────────────────────────
document.querySelectorAll('.activity-icon[data-panel]').forEach((icon) => {
    icon.addEventListener('click', () => {
        document.querySelectorAll('.activity-icon').forEach((i) => i.classList.remove('active'));
        icon.classList.add('active');
    });
});

// ─── Theme Toggle ───────────────────────────────────
let isDarkTheme = true;
document.getElementById('theme-toggle').addEventListener('click', () => {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('light', !isDarkTheme);
    // Sync Monaco editor theme
    if (typeof monaco !== 'undefined') {
        monaco.editor.setTheme(isDarkTheme ? 'codeEditorDark' : 'codeEditorLight');
    }
});

// ─── IPC: Close Tab from Main Process (Cmd+W) ──────
window.electronAPI.onCloseTab(() => {
    if (activeTab) {
        closeTab(activeTab);
    }
});

// ─── Monaco Editor Init ─────────────────────────────
require(['vs/editor/editor.main'], function () {
    // Define dark theme matching VS Code
    monaco.editor.defineTheme('codeEditorDark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
            'editor.background': '#1e1e1e',
            'editor.foreground': '#d4d4d4',
            'editorCursor.foreground': '#aeafad',
            'editor.lineHighlightBackground': '#2a2d2e',
            'editorLineNumber.foreground': '#858585',
            'editor.selectionBackground': '#264f78',
            'editor.inactiveSelectionBackground': '#3a3d41',
            'editorWidget.background': '#252526',
            'editorWidget.border': '#454545',
            'editorSuggestWidget.background': '#252526',
            'editorSuggestWidget.border': '#454545',
            'editorSuggestWidget.selectedBackground': '#04395e',
        },
    });

    // Define light theme
    monaco.editor.defineTheme('codeEditorLight', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
            'editor.background': '#ffffff',
            'editor.foreground': '#333333',
            'editorCursor.foreground': '#333333',
            'editor.lineHighlightBackground': '#f0f0f0',
            'editorLineNumber.foreground': '#999999',
            'editor.selectionBackground': '#add6ff',
            'editor.inactiveSelectionBackground': '#e5ebf1',
            'editorWidget.background': '#f3f3f3',
            'editorWidget.border': '#c8c8c8',
            'editorSuggestWidget.background': '#f3f3f3',
            'editorSuggestWidget.border': '#c8c8c8',
            'editorSuggestWidget.selectedBackground': '#d6ebff',
        },
    });

    editor = monaco.editor.create(monacoContainer, {
        value: '',
        language: 'plaintext',
        theme: 'codeEditorDark',
        automaticLayout: true,
        fontSize: 14,
        fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        renderWhitespace: 'selection',
        lineNumbers: 'on',
        glyphMargin: false,
        folding: true,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 3,
        bracketPairColorization: { enabled: true },
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        padding: { top: 8 },
        wordWrap: 'off',
        tabSize: 2,
        insertSpaces: true,
        renderLineHighlight: 'all',
        matchBrackets: 'always',
        suggest: { showWords: true },
    });

    // Cursor position tracking
    editor.onDidChangeCursorPosition((e) => {
        statusPosition.textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
    });

    // Dirty state tracking
    editor.onDidChangeModelContent(() => {
        if (activeTab) {
            const tab = openTabs.find((t) => t.filePath === activeTab);
            if (tab && !tab.isDirty) {
                tab.isDirty = true;
                updateTabUI(tab.filePath);
            }
        }
    });

    // Ctrl/Cmd + S to save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        saveActiveFile();
    });
});

// ─── Keyboard Shortcuts ─────────────────────────────
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + ` → toggle terminal
    if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        togglePanel();
    }
    // Ctrl/Cmd + S → save (fallback if Monaco doesn't capture)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveActiveFile();
    }
    // Ctrl/Cmd + W → close active tab (prevent window close)
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTab) {
            closeTab(activeTab);
        }
    }
});

// ─── Open Folder ────────────────────────────────────
async function openFolder() {
    const folderPath = await window.electronAPI.openFolder();
    if (!folderPath) return;

    currentFolderPath = folderPath;
    const folderName = folderPath.split('/').pop() || folderPath.split('\\').pop();
    folderNameEl.textContent = folderName;
    folderHeader.style.display = 'block';
    openFolderPrompt.style.display = 'none';
    fileTree.innerHTML = '';

    // Update titlebar
    document.querySelector('.titlebar-title').textContent = `${folderName} — Code Editor`;

    // Update terminal cwd
    window.electronAPI.setTerminalCwd(folderPath);

    // Load file tree
    await loadDirectory(folderPath, fileTree, 0);
}

async function loadDirectory(dirPath, parentEl, depth) {
    const entries = await window.electronAPI.readDir(dirPath);
    for (const entry of entries) {
        const itemEl = createTreeItem(entry, depth);
        parentEl.appendChild(itemEl);

        if (entry.isDirectory) {
            const childrenEl = document.createElement('div');
            childrenEl.className = 'tree-children';
            parentEl.appendChild(childrenEl);

            // Lazy load children on expand
            itemEl.addEventListener('click', async (e) => {
                e.stopPropagation();
                const chevron = itemEl.querySelector('.chevron');
                const isOpen = childrenEl.classList.contains('open');

                if (isOpen) {
                    childrenEl.classList.remove('open');
                    chevron.classList.remove('open');
                    const iconInfo = FOLDER_ICON;
                    itemEl.querySelector('.file-icon').innerHTML = `<span class="codicon codicon-${iconInfo.icon}" style="color: ${iconInfo.color}"></span>`;
                } else {
                    if (childrenEl.children.length === 0) {
                        await loadDirectory(entry.path, childrenEl, depth + 1);
                    }
                    childrenEl.classList.add('open');
                    chevron.classList.add('open');
                    const iconInfo = FOLDER_OPEN_ICON;
                    itemEl.querySelector('.file-icon').innerHTML = `<span class="codicon codicon-${iconInfo.icon}" style="color: ${iconInfo.color}"></span>`;
                }
            });
        } else {
            itemEl.addEventListener('click', (e) => {
                e.stopPropagation();
                openFile(entry.path, entry.name);
            });
        }
    }
}

function createTreeItem(entry, depth) {
    const item = document.createElement('div');
    item.className = 'tree-item';
    item.style.paddingLeft = `${12 + depth * 16}px`;
    item.dataset.path = entry.path;

    if (entry.isDirectory) {
        item.innerHTML = `
      <span class="chevron">
        <svg viewBox="0 0 16 16" fill="currentColor">
          <path d="M6 4l4 4-4 4z"/>
        </svg>
      </span>
      <span class="file-icon"><span class="codicon codicon-${FOLDER_ICON.icon}" style="color: ${FOLDER_ICON.color}"></span></span>
      <span class="file-label">${entry.name}</span>
    `;
    } else {
        const iconInfo = getFileIcon(entry.name);
        item.innerHTML = `
      <span class="chevron" style="visibility:hidden">
        <svg viewBox="0 0 16 16"><path/></svg>
      </span>
      <span class="file-icon"><span class="codicon codicon-${iconInfo.icon}" style="color: ${iconInfo.color}"></span></span>
      <span class="file-label">${entry.name}</span>
    `;
    }

    return item;
}

// ─── File Opening ───────────────────────────────────
async function openFile(filePath, fileName) {
    // Check if already open
    const existing = openTabs.find((t) => t.filePath === filePath);
    if (existing) {
        switchToTab(filePath);
        return;
    }

    const content = await window.electronAPI.readFile(filePath);
    if (content === null) return;

    const lang = getLanguage(filePath);
    const model = monaco.editor.createModel(content, lang);

    openTabs.push({ filePath, fileName, model, isDirty: false, language: lang });

    // Track dirty
    model.onDidChangeContent(() => {
        const tab = openTabs.find((t) => t.filePath === filePath);
        if (tab && !tab.isDirty) {
            tab.isDirty = true;
            updateTabUI(filePath);
        }
    });

    addTabElement(filePath, fileName, lang);
    switchToTab(filePath);
}

function addTabElement(filePath, fileName, lang) {
    const iconInfo = getFileIcon(fileName);
    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.dataset.path = filePath;
    tabEl.innerHTML = `
    <span class="tab-icon"><span class="codicon codicon-${iconInfo.icon}" style="color: ${iconInfo.color}"></span></span>
    <span class="tab-label">${fileName}</span>
    <span class="tab-dirty"></span>
    <span class="tab-close">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M2 2L10 10M10 2L2 10"/>
      </svg>
    </span>
  `;

    tabEl.addEventListener('click', (e) => {
        if (!e.target.closest('.tab-close')) {
            switchToTab(filePath);
        }
    });

    tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(filePath);
    });

    tabsContainer.appendChild(tabEl);
    updateTabBarVisibility();
}

function switchToTab(filePath) {
    activeTab = filePath;
    const tab = openTabs.find((t) => t.filePath === filePath);
    if (!tab) return;

    // Show editor, hide welcome
    welcomeView.style.display = 'none';
    monacoContainer.style.display = 'block';

    editor.setModel(tab.model);

    // Update tab UI
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    const tabEl = document.querySelector(`.tab[data-path="${CSS.escape(filePath)}"]`);
    if (tabEl) tabEl.classList.add('active');

    // Highlight in tree
    document.querySelectorAll('.tree-item').forEach((t) => t.classList.remove('selected'));
    const treeItem = document.querySelector(`.tree-item[data-path="${CSS.escape(filePath)}"]`);
    if (treeItem) treeItem.classList.add('selected');

    // Update status bar
    statusLanguage.textContent = getLanguageLabel(tab.language);
    const pos = editor.getPosition();
    if (pos) {
        statusPosition.textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
    }

    editor.focus();
}

function closeTab(filePath) {
    const idx = openTabs.findIndex((t) => t.filePath === filePath);
    if (idx === -1) return;

    // Dispose model
    openTabs[idx].model.dispose();
    openTabs.splice(idx, 1);

    // Remove tab element
    const tabEl = document.querySelector(`.tab[data-path="${CSS.escape(filePath)}"]`);
    if (tabEl) tabEl.remove();

    // Switch to another tab or show welcome
    if (openTabs.length > 0) {
        const newIdx = Math.min(idx, openTabs.length - 1);
        switchToTab(openTabs[newIdx].filePath);
    } else {
        activeTab = null;
        welcomeView.style.display = 'flex';
        monacoContainer.style.display = 'none';
        statusLanguage.textContent = 'Plain Text';
        statusPosition.textContent = 'Ln 1, Col 1';
    }
    updateTabBarVisibility();
}

function updateTabUI(filePath) {
    const tab = openTabs.find((t) => t.filePath === filePath);
    if (!tab) return;
    const tabEl = document.querySelector(`.tab[data-path="${CSS.escape(filePath)}"]`);
    if (!tabEl) return;

    if (tab.isDirty) {
        tabEl.classList.add('dirty');
    } else {
        tabEl.classList.remove('dirty');
    }
}

// ─── Save ───────────────────────────────────────────
async function saveActiveFile() {
    if (!activeTab) return;
    const tab = openTabs.find((t) => t.filePath === activeTab);
    if (!tab) return;

    const content = tab.model.getValue();
    const ok = await window.electronAPI.writeFile(tab.filePath, content);
    if (ok) {
        tab.isDirty = false;
        updateTabUI(tab.filePath);
    }
}

// ─── Terminal ───────────────────────────────────────
function togglePanel() {
    panelVisible = !panelVisible;
    panel.style.display = panelVisible ? 'flex' : 'none';
    panel.style.flexDirection = 'column';
    panel.style.height = panelHeight + 'px';
    panelResize.style.display = panelVisible ? 'block' : 'none';

    if (panelVisible && !terminalInitialized) {
        initTerminal();
    }

    if (panelVisible && fitAddon) {
        setTimeout(() => {
            fitAddon.fit();
        }, 50);
    }

    // Re-layout Monaco
    if (editor) {
        setTimeout(() => editor.layout(), 50);
    }
}

function initTerminal() {
    const TerminalCtor = window.Terminal;
    const FitAddonCtor = window.FitAddon.FitAddon;

    term = new TerminalCtor({
        fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
        fontSize: 13,
        theme: {
            background: '#1e1e1e',
            foreground: '#cccccc',
            cursor: '#aeafad',
            selectionBackground: '#264f78',
            black: '#000000',
            red: '#cd3131',
            green: '#0dbc79',
            yellow: '#e5e510',
            blue: '#2472c8',
            magenta: '#bc3fbc',
            cyan: '#11a8cd',
            white: '#e5e5e5',
            brightBlack: '#666666',
            brightRed: '#f14c4c',
            brightGreen: '#23d18b',
            brightYellow: '#f5f543',
            brightBlue: '#3b8eea',
            brightMagenta: '#d670d6',
            brightCyan: '#29b8db',
            brightWhite: '#e5e5e5',
        },
        cursorBlink: true,
        allowTransparency: true,
    });

    fitAddon = new FitAddonCtor();
    term.loadAddon(fitAddon);
    term.open(terminalContainer);

    setTimeout(() => {
        fitAddon.fit();
        const dims = fitAddon.proposeDimensions();
        if (dims) {
            window.electronAPI.createTerminal(dims.cols, dims.rows);
        } else {
            window.electronAPI.createTerminal(80, 24);
        }
    }, 100);

    // Terminal data flow
    term.onData((data) => {
        window.electronAPI.writeTerminal(data);
    });

    window.electronAPI.onTerminalData((data) => {
        term.write(data);
    });

    terminalInitialized = true;
}

// ─── Panel Resize ───────────────────────────────────
let isResizingPanel = false;

panelResize.addEventListener('mousedown', (e) => {
    isResizingPanel = true;
    panelResize.classList.add('active');
    document.body.style.cursor = 'row-resize';
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isResizingPanel) return;
    const editorPanelArea = document.getElementById('editor-panel-area');
    const rect = editorPanelArea.getBoundingClientRect();
    const newHeight = rect.bottom - e.clientY;
    if (newHeight >= 100 && newHeight <= rect.height - 100) {
        panelHeight = newHeight;
        panel.style.height = panelHeight + 'px';
        if (fitAddon) fitAddon.fit();
        if (editor) editor.layout();
    }
});

document.addEventListener('mouseup', () => {
    if (isResizingPanel) {
        isResizingPanel = false;
        panelResize.classList.remove('active');
        document.body.style.cursor = '';
        if (fitAddon) {
            fitAddon.fit();
            const dims = fitAddon.proposeDimensions();
            if (dims) {
                window.electronAPI.resizeTerminal(dims.cols, dims.rows);
            }
        }
    }
});

// ─── Sidebar Resize ─────────────────────────────────
const sidebarResize = document.getElementById('sidebar-resize');
const sidebar = document.getElementById('sidebar');
let isResizingSidebar = false;

sidebarResize.addEventListener('mousedown', (e) => {
    isResizingSidebar = true;
    sidebarResize.classList.add('active');
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isResizingSidebar) return;
    const activityBarWidth = 48;
    const newWidth = e.clientX - activityBarWidth;
    if (newWidth >= 150 && newWidth <= 600) {
        sidebar.style.width = newWidth + 'px';
        if (editor) editor.layout();
    }
});

document.addEventListener('mouseup', () => {
    if (isResizingSidebar) {
        isResizingSidebar = false;
        sidebarResize.classList.remove('active');
        document.body.style.cursor = '';
    }
});

// ─── Window Resize ──────────────────────────────────
window.addEventListener('resize', () => {
    if (editor) editor.layout();
    if (fitAddon && panelVisible) fitAddon.fit();
});
