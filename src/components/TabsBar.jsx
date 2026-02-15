import React, { useState } from 'react';
import { Zap, Globe, FileDown, Loader2 } from 'lucide-react';
import { getFileIcon } from '../utils/fileUtils';

export default function TabsBar({ tabs, activeTab, onSwitchTab, onCloseTab, onAnalyzeComplexity, onOpenBrowser, onShowTerminal, onFocusTerminal, code, onRefresh }) {
    const hasTabs = tabs.length > 0;
    const [loadingAnalyze, setLoadingAnalyze] = useState(false);
    const [loadingGetCode, setLoadingGetCode] = useState(false);
    const [loadingRun, setLoadingRun] = useState(false);

    const anyLoading = loadingAnalyze || loadingGetCode || loadingRun;

    const Run_code = async (file_code) => {
        setLoadingRun(true);
        try {
            const result = await window.run.submit(file_code.content);
            if (result.success) {
                if (onShowTerminal) onShowTerminal();
                const isWin = navigator.platform.startsWith('Win');
                const origPath = activeTab;
                const origExePath = isWin
                    ? origPath.replace('.cpp', '.exe')
                    : origPath.replace('.cpp', '');
                let cmd;
                if (isWin) {
                    cmd = `g++ "${result.cppPath}" -o "${origExePath}" && "${origExePath}" & del "${result.cppPath}"\n`;
                } else {
                    cmd = `g++ "${result.cppPath}" -o "${origExePath}" && "${origExePath}"; rm "${result.cppPath}"\n`;
                }
                if (onRefresh) onRefresh();
                setTimeout(() => {
                    window.electronAPI.writeTerminal(cmd);
                    if (onFocusTerminal) onFocusTerminal();
                }, 300);
            }
        } finally {
            setLoadingRun(false);
        }
    }

    const handleAnalyze = async () => {
        setLoadingAnalyze(true);
        try {
            await onAnalyzeComplexity();
        } finally {
            setLoadingAnalyze(false);
        }
    }

    const handleGetCodeFile = async () => {
        if (!activeTab || !code || !code.content) return;
        setLoadingGetCode(true);
        try {
            const result = await window.run.submit(code.content);
            if (result && result.success && result.cppPath) {
                const dir = activeTab.substring(0, activeTab.lastIndexOf('/'));
                const baseName = activeTab.split('/').pop().replace(/\.[^.]+$/, '');
                const cppFilePath = `${dir}/${baseName}_generated.cpp`;
                const generatedCode = await window.electronAPI.readFile(result.cppPath);
                if (generatedCode) {
                    await window.electronAPI.writeFile(cppFilePath, generatedCode);
                    await window.electronAPI.runCommand(`rm -f "${result.cppPath}"`, dir);
                    if (onRefresh) onRefresh();
                }
            }
        } catch (e) {
            console.error('Get Code File failed:', e);
        } finally {
            setLoadingGetCode(false);
        }
    }

    const LoadingDots = () => (
        <span className="inline-flex items-center space-x-0.5">
            <span className="animate-bounce" style={{ animationDelay: '0ms', animationDuration: '600ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '150ms', animationDuration: '600ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '300ms', animationDuration: '600ms' }}>.</span>
        </span>
    );

    return (
        <div id="tabs-bar" className={hasTabs ? 'has-tabs' : ''}>
            <div id="tabs-container">
                {tabs.map((tab) => {
                    const iconInfo = getFileIcon(tab.fileName);
                    const isActive = tab.filePath === activeTab;
                    let className = 'tab';
                    if (isActive) className += ' active';
                    if (tab.isDirty) className += ' dirty';

                    return (
                        <div
                            key={tab.filePath}
                            className={className}
                            data-path={tab.filePath}
                            onClick={() => onSwitchTab(tab.filePath)}
                        >
                            <span className="tab-icon">
                                <span className={`codicon codicon-${iconInfo.icon}`} style={{ color: iconInfo.color }}></span>
                            </span>
                            <span className="tab-label">{tab.fileName}</span>
                            <span className="tab-dirty"></span>
                            <span
                                className="tab-close"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCloseTab(tab.filePath);
                                }}
                            >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M2 2L10 10M10 2L2 10" />
                                </svg>
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center px-4 space-x-2 border-l border-[#2b2b2b]">
                <button
                    onClick={onOpenBrowser}
                    className="flex items-center space-x-1 px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-[11px] transition-colors border border-blue-500/30"
                    title="Open Browser"
                >
                    <Globe size={12} />
                    <span>Browser</span>
                </button>
                <button
                    onClick={handleAnalyze}
                    disabled={anyLoading}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] transition-colors border ${anyLoading
                        ? 'bg-purple-600/10 text-purple-400/50 border-purple-500/15 cursor-not-allowed'
                        : 'bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 border-purple-500/30'
                        }`}
                    title="Analyze Time & Space Complexity"
                >
                    {loadingAnalyze ? (
                        <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Analyzing<LoadingDots /></span>
                        </>
                    ) : (
                        <>
                            <Zap size={12} fill="currentColor" />
                            <span>Analyze Complexity</span>
                        </>
                    )}
                </button>
                <button
                    onClick={handleGetCodeFile}
                    disabled={anyLoading}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] transition-colors border ${anyLoading
                        ? 'bg-cyan-600/10 text-cyan-400/50 border-cyan-500/15 cursor-not-allowed'
                        : 'bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border-cyan-500/30'
                        }`}
                    title="Generate code via AI and save as .cpp file"
                >
                    {loadingGetCode ? (
                        <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Generating<LoadingDots /></span>
                        </>
                    ) : (
                        <>
                            <FileDown size={12} />
                            <span>Get Code File</span>
                        </>
                    )}
                </button>
                <button
                    onClick={() => Run_code(code)}
                    disabled={anyLoading}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] transition-colors border ${anyLoading
                        ? 'bg-green-600/10 text-green-400/50 border-green-500/15 cursor-not-allowed'
                        : 'bg-green-600/20 hover:bg-green-600/40 text-green-400 border-green-500/30'
                        }`}
                    title="Run Code"
                >
                    {loadingRun ? (
                        <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Running<LoadingDots /></span>
                        </>
                    ) : (
                        <>
                            <Zap size={12} fill="currentColor" />
                            <span>Run Code</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
