import React, { useRef, useEffect, useCallback } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Zap } from 'lucide-react';

// Configure monaco-editor to use local node_modules
loader.config({ monaco });

export default function MonacoEditor({
    activeTab,
    tabs,
    theme,
    onCursorChange,
    onContentChange,
    onSave,
    editorRef,
    isAICompleting, // New prop
}) {
    const monacoRef = useRef(null);

    const handleEditorDidMount = useCallback((editor, mon) => {
        monacoRef.current = mon;
        editorRef.current = editor;
        window.monaco = mon; // Expose for external use (like executeEdits)

        // Define dark theme
        mon.editor.defineTheme('vs-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#1e1e1e',
                'editor.foreground': '#d4d4d4',
            },
        });

        // Define Monokai theme
        mon.editor.defineTheme('monokai-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '75715e' },
                { token: 'keyword', foreground: 'f92672' },
                { token: 'string', foreground: 'e6db74' },
                { token: 'number', foreground: 'ae81ff' },
                { token: 'type', foreground: '66d9ef' },
            ],
            colors: {
                'editor.background': '#272822',
                'editor.foreground': '#f8f8f2',
                'editorCursor.foreground': '#f8f8f0',
                'editor.lineHighlightBackground': '#3e3d32',
                'editor.selectionBackground': '#49483e',
                'editorSuggestWidget.background': '#272822',
                'editorSuggestWidget.border': '#75715e',
            },
        });

        mon.editor.setTheme(theme);

        // Cursor position tracking
        editor.onDidChangeCursorPosition((e) => {
            onCursorChange(e.position.lineNumber, e.position.column);
        });

        // Shared AI Completion Logic moved to editor mount but registration only once
        const getAICompletion = async (model, position, useFullContext = false) => {
            let prefix, suffix;
            
            if (useFullContext) {
                // Send entire file for maximum context (Ctrl+J)
                prefix = model.getValueInRange({
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                });
                suffix = model.getValueInRange({
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: model.getLineCount(),
                    endColumn: 1000 // Safely capture end of line
                });
            } else {
                // Send limited context for automatic ghost text
                prefix = model.getValueInRange({
                    startLineNumber: Math.max(1, position.lineNumber - 30),
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                });
                suffix = model.getValueInRange({
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: Math.min(model.getLineCount(), position.lineNumber + 10),
                    endColumn: 1,
                });
            }

            return await window.electronAPI.completeAI(`${prefix}<CURSOR>${suffix}`);
        };

        const isInsidePrompt = (model, position) => {
            const lineContent = model.getLineContent(position.lineNumber);
            const textBefore = lineContent.substring(0, position.column - 1);
            const textAfter = lineContent.substring(position.column - 1);
            
            // Check if we are inside ~(" ... ")
            const hasStart = textBefore.includes('~("');
            const hasEnd = textAfter.includes('")');
            
            // If we see the start but no end, or if the cursor is between them
            // A more robust check for current line:
            const promptRegex = /~\("([^"]*)$/;
            return promptRegex.test(textBefore);
        };

        const languages = ['cpp', 'javascript', 'python', 'java', 'c', 'plaintext'];

        if (!window.__monacoProvidersRegistered) {
            window.__monacoProvidersRegistered = true;
            console.log("Monaco: Registering AI Providers...");

            let ghostTextTimer = null;
            languages.forEach(lang => {
                // 1. Ghost Text (Inline Completions) - Uses limited context
                mon.languages.registerInlineCompletionsProvider(lang, {
                    provideInlineCompletions: async (model, position, context, token) => {
                        if (ghostTextTimer) clearTimeout(ghostTextTimer);

                        // Suppress ghost text if we are typing a prompt or if AI is already working
                        if (isAICompleting || isInsidePrompt(model, position)) {
                            return { items: [] };
                        }

                        return new Promise((resolve) => {
                            ghostTextTimer = setTimeout(async () => {
                                if (token.isCancellationRequested) return resolve({ items: [] });
                                
                                const completion = await getAICompletion(model, position, false);
                                if (!completion || completion.trim().length === 0) return resolve({ items: [] });

                                resolve({
                                    items: [{
                                        insertText: completion,
                                        range: new mon.Range(position.lineNumber, position.column, position.lineNumber, position.column)
                                    }]
                                });
                            }, 800); 
                        });
                    }
                });

                // 2. IntelliSense Dropdown - Uses full context
                mon.languages.registerCompletionItemProvider(lang, {
                    // Removed space ' ' from trigger characters as it's too aggressive
                    triggerCharacters: ['.', '>', ':', '('],
                    provideCompletionItems: async (model, position, context, token) => {
                        // Suppress items if AI is already working or we are inside a prompt
                        if (isAICompleting || isInsidePrompt(model, position)) {
                            return { suggestions: [] };
                        }

                        if (context.triggerKind !== mon.languages.CompletionTriggerKind.Invoke && 
                            !context.triggerCharacter) {
                            return { suggestions: [] };
                        }

                        // Use full context for explicit requests (Ctrl+J)
                        const completion = await getAICompletion(model, position, true);
                        if (!completion) return { suggestions: [] };

                        return {
                            suggestions: [{
                                label: completion.split('\n')[0].substring(0, 50),
                                kind: mon.languages.CompletionItemKind.Snippet,
                                insertText: completion,
                                detail: 'GeeksAI Full Context Suggestion',
                                range: new mon.Range(position.lineNumber, position.column, position.lineNumber, position.column)
                            }]
                        };
                    }
                });
            });
        }

        // Ctrl/Cmd + S to save
        editor.addCommand(mon.KeyMod.CtrlCmd | mon.KeyCode.KeyS, () => {
            onSave();
        });

        // Ctrl + J to trigger suggestions
        editor.addCommand(mon.KeyMod.CtrlCmd | mon.KeyCode.KeyJ, () => {
            editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
        });

        // Global override for Ctrl+J which is often hijacked by browser (Downloads)
        const handleGlobalKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
                e.preventDefault();
                editor.focus();
                editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown, true);

        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown, true);
        };
    }, [onCursorChange, onSave, editorRef]);

    // Sync theme when it changes
    useEffect(() => {
        if (monacoRef.current) {
            monacoRef.current.editor.setTheme(theme);
        }
    }, [theme]);

    // Find active tab
    const currentTab = tabs.find((t) => t.filePath === activeTab);

    if (!currentTab) return null;

    return (
        <div id="monaco-container" style={{ display: 'block', position: 'relative' }}>
            {isAICompleting && (
                <div className="absolute top-4 right-10 z-10 flex items-center space-x-2 px-3 py-1.5 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-400 text-xs animate-pulse">
                    <Zap size={14} className="animate-spin" fill="currentColor" />
                    <span>AI is thinking...</span>
                </div>
            )}
            <Editor
                key={currentTab.filePath}
                defaultValue={currentTab.content}
                language={currentTab.language}
                theme={theme}
                onMount={handleEditorDidMount}
                onChange={(value) => onContentChange(currentTab.filePath, value)}
                options={{
                    automaticLayout: true,
                    fontSize: 14,
                    fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    renderWhitespace: 'selection',
                    lineNumbers: 'on',
                    glyphMargin: false,
                    folding: true,
                    lineDecorationsWidth: 10,
                    lineNumbersMinChars: 3,
                    bracketPairColorization: { enabled: true },
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    smoothScrolling: true,
                    padding: { top: 8 },
                    wordWrap: 'off',
                    tabSize: 2,
                    insertSpaces: true,
                    renderLineHighlight: 'all',
                    matchBrackets: 'always',
                    suggest: { showWords: true },
                    inlineSuggest: { enabled: true }, // Enable inline suggestions
                }}
            />
        </div>
    );
}
