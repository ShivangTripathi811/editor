import React, { useState, useCallback } from 'react';
import { FilePlus, FolderPlus, RefreshCw } from 'lucide-react';
import { getFileIcon, FOLDER_ICON, FOLDER_OPEN_ICON } from '../utils/fileUtils';

function TreeItem({ entry, depth, onFileClick, activeFile }) {
    const [isOpen, setIsOpen] = useState(false);
    const [children, setChildren] = useState(null);

    const handleClick = useCallback(async (e) => {
        e.stopPropagation();
        if (entry.isDirectory) {
            if (!isOpen && children === null) {
                const entries = await window.electronAPI.readDir(entry.path);
                setChildren(entries);
            }
            setIsOpen((prev) => !prev);
        } else {
            onFileClick(entry.path, entry.name);
        }
    }, [entry, isOpen, children, onFileClick]);

    const isSelected = !entry.isDirectory && entry.path === activeFile;

    return (
        <>
            <div
                className={`tree-item${isSelected ? ' selected' : ''}`}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
                data-path={entry.path}
                onClick={handleClick}
            >
                {entry.isDirectory ? (
                    <>
                        <span className={`chevron${isOpen ? ' open' : ''}`}>
                            <svg viewBox="0 0 16 16" fill="currentColor">
                                <path d="M6 4l4 4-4 4z" />
                            </svg>
                        </span>
                        <span className="file-icon">
                            <span className={`codicon codicon-${isOpen ? FOLDER_OPEN_ICON.icon : FOLDER_ICON.icon}`} style={{ color: FOLDER_ICON.color }}></span>
                        </span>
                    </>
                ) : (
                    <>
                        <span className="chevron" style={{ visibility: 'hidden' }}>
                            <svg viewBox="0 0 16 16"><path /></svg>
                        </span>
                        <span className="file-icon">
                            <span className={`codicon codicon-${getFileIcon(entry.name).icon}`} style={{ color: getFileIcon(entry.name).color }}></span>
                        </span>
                    </>
                )}
                <span className="file-label">{entry.name}</span>
            </div>
            {entry.isDirectory && isOpen && children && (
                <div className="tree-children open">
                    {children.map((child) => (
                        <TreeItem
                            key={child.path}
                            entry={child}
                            depth={depth + 1}
                            onFileClick={onFileClick}
                            activeFile={activeFile}
                        />
                    ))}
                </div>
            )}
        </>
    );
}

import CodeforcesExplorer from './CodeforcesExplorer';
import CodeforcesProblemFilter from './CodeforcesProblemFilter';
import CodeRunner from './CodeRunner';
import TestCaseGenerator from './TestCaseGenerator';
import SearchPanel from './SearchPanel';

export default function Sidebar({
    folderName,
    folderPath,
    entries,
    onOpenFolder,
    onFileClick,
    onCreateFile,
    onCreateFolder,
    activeFile,
    activePanel,
    onCfSettingsClick,
    onOpenProblem,
    onViewProblem,
    style,
    code,
    onShowTerminal,
    onFocusTerminal,
    onRefresh
}) {
    if (activePanel === 'codeforces') {
        return (
            <div className="flex flex-col h-full overflow-hidden" style={style}>
                <div className="flex-1 overflow-hidden" style={{ height: '45%' }}>
                    <CodeforcesExplorer onOpenSettings={onCfSettingsClick} onOpenProblem={onOpenProblem} />
                </div>
                <div className="flex-1 overflow-hidden border-t border-[#3c3c3c]" style={{ height: '55%' }}>
                    <CodeforcesProblemFilter onOpenProblemFile={onViewProblem} />
                </div>
            </div>
        );
    }
    if (activePanel === 'run') {
        return <CodeRunner activeFile={activeFile} code={code} onShowTerminal={onShowTerminal} onFocusTerminal={onFocusTerminal} onRefresh={onRefresh} />;
    }
    if (activePanel === 'test-generator') {
        return <TestCaseGenerator activeFile={activeFile} code={code} onRefresh={onRefresh} />;
    }
    if (activePanel === 'search') {
        return <SearchPanel folderPath={folderPath} onFileClick={onFileClick} />;
    }

    return (
        <div id="sidebar" style={style}>
            <div className="sidebar-header flex justify-between items-center pr-2">
                <span className="sidebar-title">EXPLORER</span>
                {folderPath && (
                    <div className="flex space-x-1">
                        <button onClick={onRefresh} title="Refresh" className="p-1 hover:bg-white/10 rounded">
                            <RefreshCw size={14} className="opacity-70 hover:opacity-100" />
                        </button>
                        <button onClick={onCreateFile} title="New File" className="p-1 hover:bg-white/10 rounded">
                            <FilePlus size={14} className="opacity-70 hover:opacity-100" />
                        </button>
                        <button onClick={onCreateFolder} title="New Folder" className="p-1 hover:bg-white/10 rounded">
                            <FolderPlus size={14} className="opacity-70 hover:opacity-100" />
                        </button>
                    </div>
                )}
            </div>
            {folderPath ? (
                <>
                    <div id="folder-header" style={{ display: 'block' }}>
                        <span id="folder-name" className="folder-name">{folderName}</span>
                    </div>
                    <div id="file-tree">
                        {entries.map((entry) => (
                            <TreeItem
                                key={entry.path}
                                entry={entry}
                                depth={0}
                                onFileClick={onFileClick}
                                activeFile={activeFile}
                            />
                        ))}
                    </div>
                </>
            ) : (
                <div id="open-folder-prompt">
                    <p>No folder opened</p>
                    <button className="btn-primary" onClick={onOpenFolder}>
                        Open Folder
                    </button>
                </div>
            )}
        </div>
    );
}
