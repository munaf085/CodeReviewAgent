import Groq from 'groq-sdk';
import { AIProvider, AIProviderOptions } from './provider';
import { Review, ReviewSchema } from '../review/schema';
import { SYSTEM_PROMPT } from '../review/prompts';
import { config } from '../config';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;

export class GroqProvider implements AIProvider {
  private groq: Groq;
  private requestCount = 0;

  constructor() {
    this.groq = new Groq({
      apiKey: config.GROQ_API_KEY,
      baseURL: config.GROQ_BASE_URL,
    });
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async attemptCall(
    diffChunk: string,
    model: string,
    options?: AIProviderOptions,
    retryCount: number = 0
  ): Promise<Review | null> {
    this.requestCount++;
    console.log(`[AI] Request #${this.requestCount} using model: ${model}, Effort: ${options?.reasoningEffort || 'medium'} (Attempt ${retryCount + 1})`);

    try {
      const payload: any = {
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Review the following diff:\n\n${diffChunk}` }
        ],
        temperature: 0.2,
      };

      // Add reasoning_effort if defined
      if (options?.reasoningEffort) {
        payload.reasoning_effort = options.reasoningEffort;
      }

      const response = await this.groq.chat.completions.create(payload);

      const usage = response.usage;
      if (usage) {
        console.log(`[AI] Response received. Tokens -> Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}`);
      }

      let content = response.choices[0]?.message?.content;
      if (!content) return null;

      // Strip markdown code blocks if the model wrapped the JSON
      content = content.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();

      const parsed = JSON.parse(content);
      const validated = ReviewSchema.safeParse(parsed);

      if (validated.success) {
        return validated.data;
      } else {
        console.error('[AI] Validation error on AI output:', validated.error);
        return null;
      }
    } catch (error: any) {
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
        } else {
          console.error(`[AI] Max retries reached for model ${model} on rate limit.`);
          throw error; // Throw so we can catch and fallback
        }
      }
      
      console.error(`[AI] API error (${error?.status || 'Unknown'}):`, error.message);
      throw error;
    }
  }

  async analyzeDiff(diffChunk: string, options?: AIProviderOptions): Promise<Review | null> {
    try {
      return await this.attemptCall(diffChunk, config.GROQ_MODEL, options);
    } catch (error: any) {
      if (error?.status === 429 && config.GROQ_FALLBACK_MODEL && config.GROQ_MODEL !== config.GROQ_FALLBACK_MODEL) {
        console.warn(`[AI] Falling back to lightweight model: ${config.GROQ_FALLBACK_MODEL}`);
        try {
          return await this.attemptCall(diffChunk, config.GROQ_FALLBACK_MODEL, options);
        } catch (fallbackError) {
          console.error('[AI] Fallback model also failed:', fallbackError);
          return null;
        }
      }
      return null;
    }
  }
}
