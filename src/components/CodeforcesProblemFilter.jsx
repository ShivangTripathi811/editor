import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Hash, Star, LayoutGrid, ChevronRight, FileJson, Target } from 'lucide-react';

export default function CodeforcesProblemFilter({ onOpenProblemFile }) {
    const [metadata, setMetadata] = useState({ topics: [], ratings: [], tags: [] });
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [topic, setTopic] = useState('');
    const [rating, setRating] = useState('');
    const [tag, setTag] = useState('');
    const [search, setSearch] = useState('');

    const fetchMetadata = async () => {
        const data = await window.electronAPI.codeforces.getDatasetMetadata();
        setMetadata(data);
    };

    const fetchProblems = useCallback(async () => {
        setLoading(true);
        const data = await window.electronAPI.codeforces.getFilteredProblems({ topic, rating, tag, search });
        setProblems(data);
        setLoading(false);
    }, [topic, rating, tag, search]);

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        fetchProblems();
    }, [fetchProblems]);

    const handleClearFilters = () => {
        setTopic('');
        setRating('');
        setTag('');
        setSearch('');
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] border-t border-[#3c3c3c]">
            <div className="p-3 bg-[#252526] border-b border-[#3c3c3c]">
                <div className="flex items-center space-x-2 mb-3">
                    <Filter size={14} className="text-[#858585]" />
                    <span className="text-[11px] font-bold text-[#cccccc] tracking-wider uppercase">Problem Filter</span>
                    {(topic || rating || tag || search) && (
                        <button 
                            onClick={handleClearFilters}
                            className="ml-auto text-[10px] text-[#3794ef] hover:underline"
                        >
                            Reset
                        </button>
                    )}
                </div>

                <div className="space-y-2">
                    <div className="relative group">
                        <Search size={12} className="absolute left-2 top-1.5 text-[#858585] group-focus-within:text-[#3794ef] transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search problems..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#3c3c44] text-[11px] text-[#cccccc] pl-7 pr-2 py-1.5 rounded outline-none border border-transparent focus:border-[#3794ef]"
                        />
                    </div>

                    <div className="flex space-x-2">
                        <select 
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="flex-1 bg-[#3c3c44] text-[11px] text-[#cccccc] px-2 py-1.5 rounded outline-none border border-transparent focus:border-[#3794ef] appearance-none cursor-pointer"
                        >
                            <option value="">Topic</option>
                            {metadata.topics.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select 
                            value={rating}
                            onChange={(e) => setRating(e.target.value)}
                            className="flex-1 bg-[#3c3c44] text-[11px] text-[#cccccc] px-2 py-1.5 rounded outline-none border border-transparent focus:border-[#3794ef] appearance-none cursor-pointer"
                        >
                            <option value="">Rating</option>
                            {metadata.ratings.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <select 
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                        className="w-full bg-[#3c3c44] text-[11px] text-[#cccccc] px-2 py-1.5 rounded outline-none border border-transparent focus:border-[#3794ef] appearance-none cursor-pointer"
                    >
                        <option value="">Filter by Tag</option>
                        {metadata.tags.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="p-4 space-y-3">
                        {[1,2,3].map(i => (
                            <div key={i} className="animate-pulse flex items-center space-x-2">
                                <div className="w-8 h-8 rounded bg-white/5"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-2 bg-white/5 rounded w-3/4"></div>
                                    <div className="h-2 bg-white/5 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : problems.length > 0 ? (
                    <div className="divide-y divide-[#2d2d2d]">
                        {problems.map((prob, idx) => (
                            <div 
                                key={`${prob.contestId}-${prob.index}-${idx}`}
                                className="p-2.5 hover:bg-[#2d2d2d] transition-colors group cursor-pointer border-l-2 border-transparent hover:border-[#3794ef]"
                                onClick={() => onOpenProblemFile(prob.path)}
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <span className="text-[11px] font-medium text-[#cccccc] leading-tight group-hover:text-[#3794ef] transition-colors">
                                        {prob.title}
                                    </span>
                                </div>
                                <div className="flex items-center flex-wrap gap-1 mt-1">
                                    <span className="flex items-center px-1.5 py-0.5 rounded bg-[#3c3c3c] text-[9px] text-[#cccccc] border border-white/5">
                                        <Star size={8} className="mr-1 text-yellow-500" />
                                        {prob.rating}
                                    </span>
                                    <span className="flex items-center px-1.5 py-0.5 rounded bg-[#3c3c3c] text-[9px] text-[#cccccc] border border-white/5">
                                        <Target size={8} className="mr-1" />
                                        {prob.topic}
                                    </span>
                                    {prob.tags && prob.tags.slice(0, 2).map(tag => (
                                        <span key={tag} className="px-1 text-[9px] text-[#858585]">#{tag}</span>
                                    ))}
                                    {prob.tags && prob.tags.length > 2 && (
                                        <span className="text-[9px] text-[#858585]">+{prob.tags.length - 2}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center opacity-30">
                        <LayoutGrid size={48} className="mx-auto mb-4" />
                        <p className="text-[11px]">No problems found matching criteria</p>
                    </div>
                )}
            </div>
            
            <div className="p-2 px-3 bg-[#1e1e1e] border-t border-[#3c3c3c] flex items-center justify-between">
                <span className="text-[10px] text-[#858585]">{problems.length} problems loaded</span>
                <span className="text-[10px] text-[#858585] flex items-center">
                    <Hash size={10} className="mr-1" /> local dataset
                </span>
            </div>
        </div>
    );
}
