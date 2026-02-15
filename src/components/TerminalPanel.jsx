import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

export default function TerminalPanel({ visible, onClose, panelHeight, onResize, theme }) {
    const containerRef = useRef(null);
    const termRef = useRef(null);
    const fitAddonRef = useRef(null);
    const initializedRef = useRef(false);

    const getXTermTheme = (themeName) => {
        const isDark = themeName.includes('dark');
        const isMonokai = themeName === 'monokai-dark';
        return {
            background: isMonokai ? '#272822' : (isDark ? '#1e1e1e' : '#ffffff'),
            foreground: isDark ? '#cccccc' : '#333333',
            cursor: isDark ? '#aeafad' : '#333333',
            selectionBackground: isDark ? '#264f78' : '#add6ff',
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
        };
    };

    useEffect(() => {
        if (!visible || !containerRef.current) return;

        const term = new Terminal({
            fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
            fontSize: 13,
            theme: getXTermTheme(theme),
            cursorBlink: true,
            allowTransparency: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(containerRef.current);

        termRef.current = term;
        fitAddonRef.current = fitAddon;
        initializedRef.current = true;

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
    }, [visible]);

    // Sync theme
    useEffect(() => {
        if (termRef.current) {
            termRef.current.options.theme = getXTermTheme(theme);
        }
    }, [theme]);

    // Fit on visibility changes
    useEffect(() => {
        if (visible && fitAddonRef.current) {
            setTimeout(() => fitAddonRef.current.fit(), 50);
        }
    }, [visible, panelHeight]);

    // Resize drag
    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = panelHeight;

        const handleMouseMove = (moveE) => {
            const delta = startY - moveE.clientY;
            const newHeight = Math.max(100, Math.min(startHeight + delta, window.innerHeight - 200));
            onResize(newHeight);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            const resizer = document.getElementById('panel-resize');
            if (resizer) resizer.classList.remove('active');
            if (fitAddonRef.current) {
                fitAddonRef.current.fit();
                const dims = fitAddonRef.current.proposeDimensions();
                if (dims) {
                    window.electronAPI.resizeTerminal(dims.cols, dims.rows);
                }
            }
        };

        const resizer = document.getElementById('panel-resize');
        if (resizer) resizer.classList.add('active');
        document.body.style.cursor = 'row-resize';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [panelHeight, onResize]);

    if (!visible) return null;

    return (
        <>
            <div id="panel-resize" style={{ display: 'block' }} onMouseDown={handleMouseDown}></div>
            <div id="panel" style={{ display: 'flex', flexDirection: 'column', height: `${panelHeight}px` }}>
                <div className="panel-header">
                    <div className="panel-tabs">
                        <span className="panel-tab active">TERMINAL</span>
                    </div>
                    <div className="panel-actions">
                        <button className="icon-btn" title="Close Panel" onClick={onClose}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M1 1L13 13M13 1L1 13" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div id="terminal-container" ref={containerRef}></div>
            </div>
        </>
    );
}
