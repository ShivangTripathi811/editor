// ─── Extension → Language Map ───────────────────────
export const EXT_LANG_MAP = {
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
export const FILE_ICONS = {
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

export const DEFAULT_ICON = { icon: 'file', color: '#cccccc' };
export const FOLDER_ICON = { icon: 'folder', color: '#cccccc' };
export const FOLDER_OPEN_ICON = { icon: 'folder-opened', color: '#cccccc' };

export function getFileIcon(filename) {
    if (!filename) return DEFAULT_ICON;
    const lower = filename.toLowerCase();
    if (FILE_ICONS[lower]) return FILE_ICONS[lower];
    const dotIdx = lower.lastIndexOf('.');
    if (dotIdx >= 0) {
        const ext = lower.substring(dotIdx);
        if (FILE_ICONS[ext]) return FILE_ICONS[ext];
    }
    return DEFAULT_ICON;
}

export function getLanguage(filePath) {
    const dotIdx = filePath.lastIndexOf('.');
    if (dotIdx >= 0) {
        const ext = filePath.substring(dotIdx).toLowerCase();
        return EXT_LANG_MAP[ext] || 'plaintext';
    }
    return 'plaintext';
}

export function getLanguageLabel(lang) {
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
