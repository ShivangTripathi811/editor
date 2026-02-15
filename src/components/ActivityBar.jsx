import React from 'react';

const icons = [
    {
        id: 'explorer',
        title: 'Explorer',
        svg: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V9C21 7.9 20.1 7 19 7H11L9 5H5C3.9 5 3 5.9 3 7Z" />
            </svg>
        ),
    },
    {
        id: 'test-generator',
        title: 'Test Case Generator',
        svg: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 2h10v2h-2v17c0 1.1-.9 2-2 2h-2c-1.1 0-2-.9-2-2V4H7V2z" />
                <path d="M10 12h4" />
                <path d="M10 16h4" />
            </svg>
        ),
    },
    {
        id: 'search',
        title: 'Search',
        svg: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="7" />
                <path d="M16 16L21 21" />
            </svg>
        ),
    },
    {
        id: 'run',
        title: 'Run and Debug',
        svg: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
        ),
    },
    {
        id: 'codeforces',
        title: 'Codeforces Explorer',
        svg: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
        ),
    },
];

export default function ActivityBar({ activePanel, onPanelChange, isDark, onToggleTheme }) {
    return (
        <div id="activity-bar">
            {icons.map((item) => (
                <div
                    key={item.id}
                    className={`activity-icon${activePanel === item.id ? ' active' : ''}`}
                    data-panel={item.id}
                    title={item.title}
                    onClick={() => onPanelChange(item.id)}
                >
                    {item.svg}
                </div>
            ))}
            <div className="activity-spacer"></div>
            <button id="theme-toggle" className="theme-toggle" title="Toggle Theme" onClick={onToggleTheme}>
                {/* Moon icon (visible in dark mode) */}
                <svg className="icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                {/* Sun icon (visible in light mode) */}
                <svg className="icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
            </button>
        </div>
    );
}
