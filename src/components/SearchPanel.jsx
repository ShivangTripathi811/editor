import React, { useState, useEffect } from 'react';
import { Search, Loader, Code } from 'lucide-react';

export default function SearchPanel({ folderPath, onFileClick }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const debounce = setTimeout(async () => {
            if (!query || !folderPath) {
                setResults([]);
                return;
            }

            if (query.length < 2) return; // Wait for at least 2 chars

            setLoading(true);
            setError('');

            try {
                // Expanded extensions
                const options = { extensions: ['.cpp', '.h', '.hpp', '.c'] }; 
                const searchResults = await window.electronAPI.searchFiles(folderPath, query, options);
                setResults(searchResults);
            } catch (err) {
                console.error("Search failed:", err);
                setError("Search failed.");
            } finally {
                setLoading(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(debounce);
    }, [query, folderPath]);

    if (!folderPath) {
        return (
            <div className="flex flex-col h-full bg-[#1e1e1e] text-white p-4 text-center items-center justify-center">
                 <Search size={48} className="text-[#3c3c3c] mb-4" />
                 <h2 className="text-gray-400 font-medium">No Folder Open</h2>
                 <p className="text-gray-500 text-sm mt-2">Open a folder to search files.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-white">
             <div className="p-4 border-b border-[#3c3c3c]">
                <h2 className="text-sm font-bold mb-2 uppercase tracking-wide text-gray-400">SEARCH</h2>
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search in C++ files"
                        className="w-full bg-[#3c3c3c] text-white border border-transparent focus:border-blue-500 rounded p-1.5 pl-8 text-sm outline-none placeholder-gray-500"
                        autoFocus
                    />
                    <Search size={14} className="absolute left-2.5 top-2 text-gray-400" />
                </div>
                 <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                    <span className="bg-[#2b2b2b] px-1 rounded border border-[#3c3c3c]">.cpp, .h</span> files
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading && (
                    <div className="flex justify-center p-4 text-gray-400">
                        <Loader size={20} className="animate-spin" />
                    </div>
                )}
                
                {!loading && query && results.length === 0 && (
                    <div className="p-4 text-gray-500 text-center text-sm">
                        No results found.
                    </div>
                )}

                {!loading && results.length > 0 && (
                    <div className="divide-y divide-[#2b2b2b]">
                        <div className="px-4 py-2 bg-[#252526] text-xs text-gray-400 font-medium">
                            {results.length} result{results.length !== 1 ? 's' : ''} in {new Set(results.map(r => r.filePath)).size} files
                        </div>
                        {results.map((result, idx) => (
                            <div 
                                key={idx} 
                                className="group hover:bg-[#2a2d2e] cursor-pointer"
                                onClick={() => onFileClick(result.filePath)}
                            >
                                <div className="px-4 py-2">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <Code size={12} className="text-blue-400" />
                                        <span className="text-xs font-semibold text-gray-300 truncate" title={result.filePath}>
                                            {result.fileName}
                                        </span>
                                        <span className="text-xs text-gray-500 ml-auto">:{result.line}</span>
                                    </div>
                                    <div className="text-xs font-mono text-gray-400 pl-5 truncate bg-black/10 p-0.5 rounded">
                                        {result.text}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
