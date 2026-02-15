import React from 'react';

export default function WelcomeView({ onOpenFolder }) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? '⌘' : 'Ctrl';

    return (
        <div id="welcome-view">
            <div className="welcome-content">
                <h1>Code Editor</h1>
                <p className="welcome-subtitle">Start by opening a folder</p>
                <div className="welcome-actions">
                    <button className="btn-primary" onClick={onOpenFolder}>
                        Open Folder
                    </button>
                </div>
                <div className="welcome-shortcuts">
                    <div className="shortcut-item">
                        <kbd>{modKey}</kbd> + <kbd>S</kbd> <span>Save File</span>
                    </div>
                    <div className="shortcut-item">
                        <kbd>Ctrl</kbd> + <kbd>`</kbd> <span>Toggle Terminal</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
