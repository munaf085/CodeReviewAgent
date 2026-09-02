"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiProvider = void 0;
const genai_1 = require("@google/genai");
const schema_1 = require("../review/schema");
const prompts_1 = require("../review/prompts");
const config_1 = require("../config");
class GeminiProvider {
    ai;
    constructor() {
        if (!config_1.config.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not set');
        }
        this.ai = new genai_1.GoogleGenAI({ apiKey: config_1.config.GEMINI_API_KEY });
    }
    async analyzeDiff(diffChunk, options) {
        try {
            const response = await this.ai.models.generateContent({
                model: config_1.config.GEMINI_MODEL,
                contents: `Review the following diff:\n\n${diffChunk}`,
                config: {
                    systemInstruction: prompts_1.SYSTEM_PROMPT,
                    responseMimeType: 'application/json',
                    temperature: 0.2,
                },
            });
            const usage = response.usageMetadata;
            if (usage) {
                console.log(`[AI-Gemini] Tokens -> Prompt: ${usage.promptTokenCount}, Completion: ${usage.candidatesTokenCount}, Total: ${usage.totalTokenCount}`);
            }
            let content = response.text;
            if (!content)
                return null;
            const parsed = JSON.parse(content);
            const validated = schema_1.ReviewSchema.safeParse(parsed);
            if (!validated.success) {
                console.error('[AI-Gemini] Schema validation failed:', validated.error.message);
                return null;
            }
            return validated.data;
        }
        catch (error) {
            console.error(`[AI-Gemini] API error:`, error?.message || error);
            return null;
        }
    }
}
exports.GeminiProvider = GeminiProvider;
