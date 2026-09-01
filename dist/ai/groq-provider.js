"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroqProvider = void 0;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const schema_1 = require("../review/schema");
const prompts_1 = require("../review/prompts");
const config_1 = require("../config");
class GroqProvider {
    groq;
    constructor() {
        this.groq = new groq_sdk_1.default({
            apiKey: config_1.config.GROQ_API_KEY,
            baseURL: config_1.config.GROQ_BASE_URL,
        });
    }
    async analyzeDiff(diffChunk, context) {
        try {
            const response = await this.groq.chat.completions.create({
                model: config_1.config.GROQ_MODEL,
                messages: [
                    { role: 'system', content: prompts_1.SYSTEM_PROMPT },
                    { role: 'user', content: `Review the following diff:\n\n${diffChunk}` }
                ],
                temperature: 0.2,
                response_format: { type: 'json_object' },
            });
            const content = response.choices[0]?.message?.content;
            if (!content)
                return null;
            const parsed = JSON.parse(content);
            const validated = schema_1.ReviewSchema.safeParse(parsed);
            if (validated.success) {
                return validated.data;
            }
            else {
                console.error('Validation error on AI output:', validated.error);
                return null;
            }
        }
        catch (error) {
            console.error('Groq API error:', error);
            return null;
        }
    }
}
exports.GroqProvider = GroqProvider;
