import React, { useState, useEffect } from 'react';
import { Download, AlertCircle, CheckCircle, X } from 'lucide-react';

const ModelDownloadModal = ({ onClose, onDownloadComplete }) => {
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState("");
    const [error, setError] = useState(null);
    const [models, setModels] = useState({});
    const [isComplete, setIsComplete] = useState(false);

    const refreshModelStatus = async () => {
        if (window.electronAPI && window.electronAPI.getModels) {
            const status = await window.electronAPI.getModels();
            setModels(status);
            
            // Simplified "isComplete": At least one main model + Nomic
            // We'll check this in the Parent or use a more granular check
        }
    };

    useEffect(() => {
        refreshModelStatus();

        if (window.electronAPI && window.electronAPI.onAIDownloadProgress) {
            window.electronAPI.onAIDownloadProgress((prog, msg) => {
                setProgress(prog);
                if (msg) setMessage(msg);
            });
        }
    }, []);

    const handleDownload = async (modelId) => {
        setDownloading(true);
        setError(null);
        try {
            const result = await window.electronAPI.initAI(modelId);
            if (!result.success) {
                setError(result.error);
            } else {
                await refreshModelStatus();
                // If this was the last required model, we could close
                // For now, let user see "Downloaded" status
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setDownloading(false);
        }
    };

    const handleDelete = async () => {
        if (window.electronAPI && window.electronAPI.deleteModel) {
            try {
                await window.electronAPI.deleteModel();
                await refreshModelStatus();
                setError(null);
            } catch (e) {
                setError("Failed to delete model: " + e.message);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-lg shadow-2xl w-[600px] p-6 text-vscode-text animate-fade-in relative max-h-[90vh] overflow-y-auto">
                {!downloading && (
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 text-gray-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                )}

                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mb-4 text-blue-500">
                        <Download size={24} />
                    </div>
                    
                    <h2 className="text-xl font-bold text-white mb-2">AI Model Management</h2>
                    <p className="text-gray-400 text-sm mb-6">
                        Download local LLMs for code completion and chat. These run entirely on your machine.
                    </p>

                    {error && (
                        <div className="w-full flex items-center space-x-2 text-red-400 bg-red-400/10 px-4 py-2 rounded mb-4 text-sm text-left">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="w-full space-y-4 mb-8">
                        {Object.entries(models).map(([id, model]) => (
                            <div key={id} className="bg-[#252525] border border-[#333] rounded-lg p-4 flex items-center justify-between text-left">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                        <h3 className="font-semibold text-white">{model.name}</h3>
                                        {model.downloaded && (
                                            <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/30">
                                                Downloaded
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {id === 'deepseek' ? 'Fast and efficient for code completion.' : 'Powerful instructions and reasoning.'}
                                    </p>
                                </div>
                                
                                <button
                                    disabled={downloading || model.downloaded}
                                    onClick={() => handleDownload(id)}
                                    className={`ml-4 px-4 py-1.5 text-xs font-medium rounded transition-all flex items-center space-x-2 ${
                                        model.downloaded 
                                            ? 'bg-green-600/10 text-green-500 cursor-default' 
                                            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                                    }`}
                                >
                                    {model.downloaded ? (
                                        <><CheckCircle size={14} /> <span>Ready</span></>
                                    ) : (
                                        <><Download size={14} /> <span>Download</span></>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>

                    {downloading ? (
                        <div className="w-full">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>{message}</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-[#2d2d2d] h-2 rounded-full overflow-hidden">
                                <div 
                                    className="bg-blue-600 h-full transition-all duration-200 ease-out" 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Please do not close the application.</p>
                        </div>
                    ) : (
                        <div className="flex w-full justify-between items-center mt-4">
                            <button
                                onClick={handleDelete}
                                className="text-xs text-red-400 hover:text-red-300 transition-colors"
                            >
                                Delete All Models
                            </button>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-lg"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModelDownloadModal;
