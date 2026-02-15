import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Trophy, Tag, Star, Clock, ExternalLink } from 'lucide-react';

export default function ProblemViewer({ problem, onClose }) {
    if (!problem) return null;

    // Helper to convert Codeforces LaTeX notation $$$...$$$ to something readable or standard LaTeX if possible
    // For now, we'll do a simple regex replace to make it look decent in Markdown
    const formatStatement = (text) => {
        if (!text) return '';
        return text
            .replace(/\$\$\$(.*?)\$\$\$/g, '*$1*') // Bold/Italicize formulas for now
            .replace(/\\le/g, '≤')
            .replace(/\\ge/g, '≥')
            .replace(/\\ne/g, '≠')
            .replace(/\\dots/g, '...')
            .replace(/\\times/g, '×')
            .replace(/\\cdot/g, '·')
            .replace(/\\pm/g, '±')
            .replace(/\\sqrt{(.*?)}/g, '√($1)')
            .replace(/\\frac{(.*?)}{(.*?)}/g, '($1/$2)');
    };

    const problemUrl = `https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`;

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#3c3c3c] bg-[#252526]">
                <div className="flex items-center space-x-3">
                    <Trophy className="text-yellow-500" size={20} />
                    <div>
                        <h1 className="text-lg font-bold text-white leading-tight">{problem.title}</h1>
                        <div className="flex items-center space-x-3 mt-1">
                            <span className="flex items-center text-[11px] text-[#858585]">
                                <Star size={12} className="mr-1 text-yellow-500" />
                                Rating: {problem.rating || 'Unrated'}
                            </span>
                            <span className="flex items-center text-[11px] text-[#858585]">
                                <Clock size={12} className="mr-1" />
                                {problem.contestId}{problem.index}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <a 
                        href={problemUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-white/10 rounded-md transition-colors text-[#858585] hover:text-white"
                        title="View on Codeforces"
                    >
                        <ExternalLink size={18} />
                    </a>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-red-500/20 rounded-md transition-colors text-[#858585] hover:text-red-500"
                        title="Close Viewer"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-8 pb-10">
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                        {problem.tags && problem.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 rounded-full bg-[#3c3c3c] border border-white/5 text-[10px] text-[#cccccc] flex items-center">
                                <Tag size={10} className="mr-1 opacity-50" />
                                {tag}
                            </span>
                        ))}
                    </div>

                    {/* Statement */}
                    <section className="prose prose-invert prose-sm max-w-none">
                        <h2 className="text-blue-400 border-b border-blue-400/20 pb-1 mb-4">Problem Statement</h2>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {formatStatement(problem.statement)}
                        </ReactMarkdown>
                    </section>

                    {/* Input Specification */}
                    <section className="prose prose-invert prose-sm max-w-none bg-blue-500/5 p-4 rounded-lg border border-blue-500/10">
                        <h2 className="text-blue-300 mt-0 mb-3">Input</h2>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {formatStatement(problem.inputSpecification)}
                        </ReactMarkdown>
                    </section>

                    {/* Output Specification */}
                    <section className="prose prose-invert prose-sm max-w-none bg-green-500/5 p-4 rounded-lg border border-green-500/10">
                        <h2 className="text-green-300 mt-0 mb-3">Output</h2>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {formatStatement(problem.outputSpecification)}
                        </ReactMarkdown>
                    </section>

                    {/* Notes */}
                    {problem.note && (
                        <section className="prose prose-invert prose-sm max-w-none italic text-[#969696] bg-black/20 p-4 rounded-lg">
                            <h2 className="text-[#cccccc] not-italic mt-0 mb-2">Note</h2>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {formatStatement(problem.note)}
                            </ReactMarkdown>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
