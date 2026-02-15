import React, { useState, useEffect } from 'react';
import { X, Save, Shield } from 'lucide-react';

export default function CodeforcesSettingsModal({ isOpen, onClose, onSave }) {
    const [handle, setHandle] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            window.electronAPI.codeforces.getCreds().then(creds => {
                if (creds) {
                    setHandle(creds.handle || '');
                    setApiKey(creds.apiKey || '');
                    setApiSecret(creds.apiSecret || '');
                }
            });
        }
    }, [isOpen]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const success = await window.electronAPI.codeforces.saveCreds({ handle, apiKey, apiSecret });
        setIsSaving(false);
        if (success) {
            onSave();
            onClose();
        } else {
            alert('Failed to save credentials.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl shadow-2xl w-full max-w-md overflow-hidden shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between p-4 border-b border-[#3c3c3c] bg-[#252526]">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center">
                            <Shield size={18} className="text-red-500" />
                        </div>
                        <h2 className="text-sm font-semibold text-[#cccccc]">Codeforces Settings</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-[#858585] hover:text-[#cccccc]">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-5 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-[#969696] uppercase tracking-wider">CF Handle</label>
                        <input
                            type="text"
                            value={handle}
                            onChange={(e) => setHandle(e.target.value)}
                            className="w-full bg-[#2d2d2d] border border-[#3c3c3c] rounded-lg px-3 py-2 text-sm text-[#cccccc] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all placeholder:text-[#6e6e6e]"
                            placeholder="e.g. tourist"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-[#969696] uppercase tracking-wider">API Key</label>
                        <input
                            type="text"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full bg-[#2d2d2d] border border-[#3c3c3c] rounded-lg px-3 py-2 text-sm text-[#cccccc] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all placeholder:text-[#6e6e6e]"
                            placeholder="Your CF API Key"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-[#969696] uppercase tracking-wider">API Secret</label>
                        <input
                            type="password"
                            value={apiSecret}
                            onChange={(e) => setApiSecret(e.target.value)}
                            className="w-full bg-[#2d2d2d] border border-[#3c3c3c] rounded-lg px-3 py-2 text-sm text-[#cccccc] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all placeholder:text-[#6e6e6e]"
                            placeholder="Your CF API Secret"
                        />
                    </div>

                    <p className="text-[11px] text-[#6e6e6e] leading-relaxed">
                        API Key and Secret are only required for accessing private data or submitting. Most data is public.
                    </p>

                    <div className="pt-2 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-[#969696] hover:text-[#cccccc] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                        >
                            <Save size={16} />
                            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
