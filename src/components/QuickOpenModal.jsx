import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, X } from 'lucide-react';

export default function QuickOpenModal({ isOpen, onClose, files, onFileSelect }) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    const filteredFiles = files.filter(file => 
        file.name.toLowerCase().includes(query.toLowerCase()) || 
        file.relativePath.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10); // Limit to top 10 results for speed

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredFiles.length);
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredFiles.length) % filteredFiles.length);
        }
        if (e.key === 'Enter' && filteredFiles[selectedIndex]) {
            const file = filteredFiles[selectedIndex];
            onFileSelect(file.path, file.name);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50">
            <div className="w-[600px] bg-[#252526] border border-[#454545] shadow-2xl rounded-lg overflow-hidden flex flex-col">
                <div className="flex items-center p-3 border-b border-[#454545] bg-[#323233]">
                    <Search size={16} className="text-gray-400 mr-2" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search files by name..."
                        className="bg-transparent text-white text-sm w-full outline-none"
                    />
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={16} />
                    </button>
                </div>
                <div ref={listRef} className="max-h-[400px] overflow-y-auto p-1 bg-[#252526]">
                    {filteredFiles.length > 0 ? (
                        filteredFiles.map((file, idx) => (
                            <div
                                key={file.path}
                                onClick={() => {
                                    onFileSelect(file.path, file.name);
                                    onClose();
                                }}
                                className={`flex flex-col px-3 py-2 cursor-pointer rounded ${
                                    idx === selectedIndex ? 'bg-[#094771] text-white' : 'text-gray-300 hover:bg-[#2a2d2e]'
                                }`}
                            >
                                <div className="flex items-center">
                                    <FileText size={14} className="mr-2 opacity-70" />
                                    <span className="text-sm font-medium">{file.name}</span>
                                </div>
                                <span className="text-[11px] opacity-50 ml-6 truncate">{file.relativePath}</span>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">No files found</div>
                    )}
                </div>
                <div className="p-2 bg-[#1e1e1e] text-[10px] text-gray-500 flex justify-between border-t border-[#454545]">
                    <span>↑↓ to navigate • enter to select • esc to close</span>
                    <span>{filteredFiles.length} results</span>
                </div>
            </div>
        </div>
    );
}
