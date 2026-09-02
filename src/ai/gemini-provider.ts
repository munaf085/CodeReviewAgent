import { GoogleGenAI } from '@google/genai';
import { AIProvider, AIProviderOptions } from './provider';
import { Review, ReviewSchema } from '../review/schema';
import { SYSTEM_PROMPT } from '../review/prompts';
import { config } from '../config';

export class GeminiProvider implements AIProvider {
  private ai: GoogleGenAI;

  constructor() {
    if (!config.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    this.ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  }

  async analyzeDiff(diffChunk: string, options?: AIProviderOptions): Promise<Review | null> {
    try {
      const response = await this.ai.models.generateContent({
        model: config.GEMINI_MODEL,
        contents: `Review the following diff:\n\n${diffChunk}`,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const usage = response.usageMetadata;
      if (usage) {
        console.log(`[AI-Gemini] Tokens -> Prompt: ${usage.promptTokenCount}, Completion: ${usage.candidatesTokenCount}, Total: ${usage.totalTokenCount}`);
      }

      let content = response.text;
      if (!content) return null;

      const parsed = JSON.parse(content);
      const validated = ReviewSchema.safeParse(parsed);

      if (!validated.success) {
        console.error('[AI-Gemini] Schema validation failed:', validated.error.message);
        return null;
      }

      return validated.data;
    } catch (error: any) {
      console.error(`[AI-Gemini] API error:`, error?.message || error);
      return null;
    }
  }
}
