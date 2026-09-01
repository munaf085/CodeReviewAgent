import Groq from 'groq-sdk';
import { AIProvider } from './provider';
import { Review, ReviewSchema } from '../review/schema';
import { SYSTEM_PROMPT } from '../review/prompts';
import { config } from '../config';

export class GroqProvider implements AIProvider {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({
      apiKey: config.GROQ_API_KEY,
      baseURL: config.GROQ_BASE_URL,
    });
  }

  async analyzeDiff(diffChunk: string, _context?: unknown): Promise<Review | null> {
    try {
      const response = await this.groq.chat.completions.create({
        model: config.GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Review the following diff:\n\n${diffChunk}` }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content);
      const validated = ReviewSchema.safeParse(parsed);

      if (validated.success) {
        return validated.data;
      } else {
        console.error('Validation error on AI output:', validated.error);
        return null;
      }
    } catch (error) {
      console.error('Groq API error:', error);
      return null;
    }
  }
}
