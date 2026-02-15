import React, { useState, useEffect } from 'react';
import { Globe, ArrowLeft, ArrowRight, RotateCw, ExternalLink, X, Shield } from 'lucide-react';

export default function BrowserLayout({ onClose, initialUrl = 'https://codeforces.com' }) {
    const [url, setUrl] = useState(initialUrl);
    const [inputUrl, setInputUrl] = useState(initialUrl);

    useEffect(() => {
        setUrl(initialUrl);
        setInputUrl(initialUrl);
    }, [initialUrl]);

    const handleNavigate = (e) => {
        e.preventDefault();
        let target = inputUrl;
        if (!target.startsWith('http')) {
            target = 'https://' + target;
        }
        setUrl(target);
        setInputUrl(target);
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#2b2b2b]">
            {/* Browser Header */}
            <div className="flex items-center space-x-2 p-2 bg-[#252526] border-b border-[#3c3c3c]">
                <div className="flex items-center space-x-1 pr-2 border-r border-[#3c3c3c]">
                    <button className="p-1 hover:bg-white/10 rounded disabled:opacity-30">
                        <ArrowLeft size={14} />
                    </button>
                    <button className="p-1 hover:bg-white/10 rounded disabled:opacity-30">
                        <ArrowRight size={14} />
                    </button>
                    <button className="p-1 hover:bg-white/10 rounded">
                        <RotateCw size={14} />
                    </button>
                </div>

                <form onSubmit={handleNavigate} className="flex-1 flex items-center bg-[#1e1e1e] border border-[#3c3c3c] rounded px-2 py-1 space-x-2">
                    <Globe size={12} className="text-[#858585]" />
                    <input
                        type="text"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        className="bg-transparent text-[11px] text-[#cccccc] focus:outline-none w-full"
                        placeholder="Enter URL or search..."
                    />
                </form>

                <div className="flex items-center space-x-1 pl-2 border-l border-[#3c3c3c]">
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-white/10 rounded text-[#858585] hover:text-[#cccccc]"
                    >
                        <ExternalLink size={14} />
                    </a>
                    <button onClick={onClose} className="p-1 hover:bg-red-500/20 hover:text-red-500 rounded text-[#858585]">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Browser Content */}
            <div className="flex-1 bg-white relative flex flex-col">
                <webview
                    src={url}
                    className="flex-1 w-full h-full border-none"
                    allowpopups="true"
                    webpreferences="contextIsolation=true"
                />
            </div>
        </div>
    );
}
