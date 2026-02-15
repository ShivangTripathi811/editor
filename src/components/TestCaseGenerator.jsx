import React, { useState } from 'react';
import { Play, Save, RefreshCw, FileCode, Check, Copy } from 'lucide-react';

export default function TestCaseGenerator({ activeFile, code, onRefresh }) {
    const [loading, setLoading] = useState(false);
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [error, setError] = useState('');
    const [constraint, setConstraint] = useState('');

    const generateTestCases = async () => {
        if (!activeFile) {
            setError("Please open a file first.");
            return;
        }

        setLoading(true);
        setError('');
        setInput('');
        setOutput('');

        try {
            const fileContent = code ? code.content : await window.electronAPI.readFile(activeFile);
            if (!fileContent) {
                setError("Could not read file content.");
                setLoading(false);
                return;
            }

            // Prompt for the AI
            let prompt = `
Generate a valid input and output test case for the following code.
Format the response exactly as follows:
Input:
<input_data>
Output:
<output_data>

Do not include any other text or markdown formating.
`;

            if (constraint) {
                prompt += `
Constraint: Generate an input of size/length approximately ${constraint}.
`;
            }

            prompt += `
Code:
${fileContent}
            `;

            const response = await window.electronAPI.askAI(prompt, 'test-gen-session');
            
            // Parse response
            const inputMatch = response.match(/Input:\s*([\s\S]*?)\s*Output:/i);
            const outputMatch = response.match(/Output:\s*([\s\S]*)/i);

            if (inputMatch && outputMatch) {
                setInput(inputMatch[1].trim());
                setOutput(outputMatch[1].trim());
            } else {
                // Fallback parsing if formatting fails
                setError("AI response format was unexpected. Raw response:\n" + response);
            }
        } catch (err) {
            setError("Failed to generate test cases: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const saveToFile = async (type, content) => {
        if (!content) return;
        
        try {
            const dir = activeFile.substring(0, activeFile.lastIndexOf('/'));
            const fileName = `${type}.txt`; 
            const fullPath = `${dir}/${fileName}`;

            const success = await window.electronAPI.writeFile(fullPath, content);
            if (success) {
                if (onRefresh) onRefresh();
                alert(`Saved to ${fileName}`);
            } else {
                setError(`Failed to save ${fileName}`);
            }
        } catch (err) {
            setError("Save failed: " + err.message);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] text-white p-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <FileCode size={24} className="text-blue-400" />
                Test Case Generator
            </h2>

            <div className="mb-4">
                <div className="text-sm text-gray-400 mb-1">Active File:</div>
                <div className="text-sm font-mono bg-[#2b2b2b] p-2 rounded truncate" title={activeFile}>
                    {activeFile ? activeFile.split('/').pop() : 'No file selected'}
                </div>
            </div>

            <div className="mb-4">
                <label className="text-sm text-gray-400 mb-1 block">Max Input Length (Optional):</label>
                <input 
                    type="text" 
                    value={constraint}
                    onChange={(e) => setConstraint(e.target.value)}
                    placeholder="e.g. 100, 10^5, or N=50"
                    className="w-full bg-[#2b2b2b] text-white border border-[#3c3c3c] rounded p-2 text-sm focus:border-blue-500 outline-none"
                />
            </div>

            <button
                onClick={generateTestCases}
                disabled={loading || !activeFile}
                className={`flex items-center justify-center gap-2 p-3 rounded font-medium transition-colors ${
                    loading || !activeFile
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
            >
                {loading ? (
                    <RefreshCw size={18} className="animate-spin" />
                ) : (
                    <Play size={18} fill="currentColor" />
                )}
                {loading ? 'Generating...' : 'Generate Test Case'}
            </button>

            {error && (
                <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded text-sm text-red-200">
                    {error}
                </div>
            )}

            <div className="flex-1 overflow-y-auto mt-6 space-y-4">
                {/* Input Section */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-gray-300">Input</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => navigator.clipboard.writeText(input)}
                                disabled={!input}
                                className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                                title="Copy"
                            >
                                <Copy size={14} />
                            </button>
                            <button 
                                onClick={() => saveToFile('input', input)}
                                disabled={!input}
                                className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                                title="Save to input.txt"
                            >
                                <Save size={14} />
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full h-32 bg-[#111] border border-[#333] rounded p-3 font-mono text-sm resize-none focus:border-blue-500 outline-none"
                        placeholder="Generated input will appear here..."
                    />
                </div>

                {/* Output Section */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-gray-300">Output</label>
                         <div className="flex gap-2">
                            <button 
                                onClick={() => navigator.clipboard.writeText(output)}
                                disabled={!output}
                                className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                                title="Copy"
                            >
                                <Copy size={14} />
                            </button>
                            <button 
                                onClick={() => saveToFile('output', output)}
                                disabled={!output}
                                className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                                title="Save to output.txt"
                            >
                                <Save size={14} />
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={output}
                        onChange={(e) => setOutput(e.target.value)}
                        className="w-full h-32 bg-[#111] border border-[#333] rounded p-3 font-mono text-sm resize-none focus:border-blue-500 outline-none"
                        placeholder="Generated output will appear here..."
                    />
                </div>
            </div>
        </div>
    );
}
