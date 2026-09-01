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
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;
class GroqProvider {
    groq;
    requestCount = 0;
    constructor() {
        this.groq = new groq_sdk_1.default({
            apiKey: config_1.config.GROQ_API_KEY,
            baseURL: config_1.config.GROQ_BASE_URL,
        });
    }
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async attemptCall(diffChunk, model, options, retryCount = 0) {
        this.requestCount++;
        console.log(`[AI] Request #${this.requestCount} using model: ${model}, Effort: ${options?.reasoningEffort || 'medium'} (Attempt ${retryCount + 1})`);
        try {
            const payload = {
                model,
                messages: [
                    { role: 'system', content: prompts_1.SYSTEM_PROMPT },
                    { role: 'user', content: `Review the following diff:\n\n${diffChunk}` }
                ],
                temperature: 0.2,
                response_format: { type: 'json_object' },
            };
            // Add reasoning_effort if defined (many SDKs / OSS models ignore it if unsupported, but we pass it as requested)
            if (options?.reasoningEffort) {
                payload.reasoning_effort = options.reasoningEffort;
            }
            const response = await this.groq.chat.completions.create(payload);
            const usage = response.usage;
            if (usage) {
                console.log(`[AI] Response received. Tokens -> Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}`);
            }
            const content = response.choices[0]?.message?.content;
            if (!content)
                return null;
            const parsed = JSON.parse(content);
            const validated = schema_1.ReviewSchema.safeParse(parsed);
            if (validated.success) {
                return validated.data;
            }
            else {
                console.error('[AI] Validation error on AI output:', validated.error);
                return null;
            }
        }
        catch (error) {
            if (error?.status === 429) {
                console.warn(`[AI] Rate limit hit (429) for model ${model}.`);
                if (retryCount < MAX_RETRIES) {
                    // Parse retry-after header if available
                    let waitTime = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
                    if (error.headers && error.headers['retry-after']) {
                        const retryAfter = parseInt(error.headers['retry-after'], 10);
                        if (!isNaN(retryAfter)) {
                            waitTime = retryAfter * 1000;
                        }
                    }
                    console.log(`[AI] Retrying in ${waitTime}ms...`);
                    await this.sleep(waitTime);
                    return this.attemptCall(diffChunk, model, options, retryCount + 1);
                }
                else {
                    console.error(`[AI] Max retries reached for model ${model} on rate limit.`);
                    throw error; // Throw so we can catch and fallback
                }
            }
            console.error(`[AI] API error (${error?.status || 'Unknown'}):`, error.message);
            throw error;
        }
    }
    async analyzeDiff(diffChunk, options) {
        try {
            return await this.attemptCall(diffChunk, config_1.config.GROQ_MODEL, options);
        }
        catch (error) {
            if (error?.status === 429 && config_1.config.GROQ_FALLBACK_MODEL && config_1.config.GROQ_MODEL !== config_1.config.GROQ_FALLBACK_MODEL) {
                console.warn(`[AI] Falling back to lightweight model: ${config_1.config.GROQ_FALLBACK_MODEL}`);
                try {
                    return await this.attemptCall(diffChunk, config_1.config.GROQ_FALLBACK_MODEL, options);
                }
                catch (fallbackError) {
                    console.error('[AI] Fallback model also failed:', fallbackError);
                    return null;
                }
            }
            return null;
        }
    }
}
exports.GroqProvider = GroqProvider;
