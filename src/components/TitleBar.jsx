import React from 'react';

export default function TitleBar({ folderName }) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    if (!isMac) return null;

    const title = folderName ? `${folderName} — Code Editor` : 'Code Editor';

    return (
        <div id="titlebar">
            <div className="titlebar-drag"></div>
            <span className="titlebar-title">{title}</span>
        </div>
    );
}
