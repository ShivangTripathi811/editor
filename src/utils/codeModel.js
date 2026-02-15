const path = require('path');
const fs = require('fs');

class CodeModel {
    constructor() {
        this.llama = null;
        this.model = null;
        this.context = null;
        this.modelPath = null;
        this.LlamaChatSession = null;
    }

    async init(modelPath) {
        if (this.model) return;
        this.modelPath = modelPath;

        if (!fs.existsSync(modelPath)) {
            console.error("CodeModel: Model file not found at", modelPath);
            return;
        }

        try {
            const { getLlama, LlamaChatSession } = await import("node-llama-cpp");
            this.LlamaChatSession = LlamaChatSession;

            this.llama = await getLlama({ gpu: false });

            this.model = await this.llama.loadModel({
                modelPath: this.modelPath,
            });

            this.context = await this.model.createContext({
                contextSize: 2048,
            });
        } catch (error) {
            console.error("CodeModel: Failed to initialize:", error);
            this.model = null;
            this.context = null;
        }
    }

    _extractCode(response) {
        if (!response) return response;

        // Strip markdown code fences
        const fenceRegex = /```(?:cpp|c\+\+)?\s*\n([\s\S]*?)```/;
        const match = response.match(fenceRegex);
        if (match) {
            return match[1].trim();
        }

        // Strip leading explanation lines
        const lines = response.trim().split('\n');
        const codeStartIdx = lines.findIndex(line =>
            /^[\s]*(#include|using |int |void |for|if|while|cout|cin|return|vector|auto |const |string )/.test(line) ||
            /^[\s]*[a-zA-Z_]+[\s]*[({=;]/.test(line)
        );

        if (codeStartIdx > 0) {
            return lines.slice(codeStartIdx).join('\n').trim();
        }

        return response.trim();
    }

    async query(code) {
        if (!this.context || !this.LlamaChatSession) {
            return code;
        }

        try {
            const sequence = this.context.getSequence();
            const session = new this.LlamaChatSession({
                contextSequence: sequence,
                systemPrompt: "You are a code completion tool. Replace markers in C++ code with real code. Keep all existing code exactly the same. Output ONLY the final C++ code.",
            });

            const prom = `Complete this C++ code. Replace every !@#$("...") marker with the code described inside it.
Keep ALL existing code, variables, and values unchanged. Only replace the markers.
Output the complete final code only.

${code}`;
            const response = await session.prompt(prom);

            if (!sequence.disposed) {
                sequence.dispose();
            }

            const cleaned = this._extractCode(response);
            return cleaned || code;
        } catch (error) {
            console.error("CodeModel: Query failed:", error);
            return code;
        }
    }
}

module.exports = new CodeModel();