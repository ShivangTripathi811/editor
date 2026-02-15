import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';

export default function InputModal({ isOpen, title, onClose, onSubmit, placeholder, defaultValue = '' }) {
    const [value, setValue] = useState(defaultValue);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
            // Focus after a tiny delay to ensure transition doesn't mess it up
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, defaultValue]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (value.trim()) {
            onSubmit(value.trim());
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-3 border-b border-[#3c3c3c] bg-[#252526]">
                    <h3 className="text-xs font-bold text-[#cccccc] uppercase tracking-wider">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-[#858585] transition-colors">
                        <X size={14} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full bg-[#2d2d2d] border border-[#3c3c3c] rounded-lg px-3 py-2 text-sm text-[#cccccc] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-[#6e6e6e]"
                        placeholder={placeholder}
                    />
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 text-xs font-medium text-[#969696] hover:text-[#cccccc] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex items-center space-x-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-blue-900/20"
                        >
                            <Check size={14} />
                            <span>Create</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
