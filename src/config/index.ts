import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export const ConfigSchema = z.object({
  GITHUB_TOKEN: z.string().min(1).default('dummy'),
  GROQ_API_KEY: z.string().min(1).default('dummy'),
  GROQ_MODEL: z.string().default('openai/gpt-oss-120b'),
  GROQ_FALLBACK_MODEL: z.string().default('openai/gpt-oss-20b'),
  GROQ_BASE_URL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.7-flash'),
  MAX_TOKENS: z.number().default(4000),
  MIN_CONFIDENCE: z.number().default(0.8),
  MAX_CONCURRENT_REVIEWS: z.number().default(2),
  SEVERITY_LEVELS: z.array(z.string()).default(['critical', 'high', 'medium']),
  EXCLUDE_PATTERNS: z.array(z.string()).default(['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.min.js']),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const config = {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN || process.env.INPUT_GITHUB_TOKEN || 'dummy',
    GROQ_API_KEY: process.env.GROQ_API_KEY || process.env.INPUT_GROQ_API_KEY || 'dummy',
    GROQ_MODEL: process.env.GROQ_MODEL || process.env.INPUT_GROQ_MODEL || 'openai/gpt-oss-120b',
    GROQ_FALLBACK_MODEL: process.env.GROQ_FALLBACK_MODEL || process.env.INPUT_GROQ_FALLBACK_MODEL || 'openai/gpt-oss-20b',
    GROQ_BASE_URL: process.env.GROQ_BASE_URL || process.env.INPUT_GROQ_BASE_URL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.INPUT_GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL || process.env.INPUT_GEMINI_MODEL || 'gemini-3.7-flash',
    MAX_TOKENS: process.env.MAX_TOKENS ? parseInt(process.env.MAX_TOKENS, 10) : 2500,
    MIN_CONFIDENCE: process.env.MIN_CONFIDENCE ? parseFloat(process.env.MIN_CONFIDENCE) : 0.8,
    MAX_CONCURRENT_REVIEWS: process.env.MAX_CONCURRENT_REVIEWS ? parseInt(process.env.MAX_CONCURRENT_REVIEWS, 10) : 1,
  };

  try {
    return ConfigSchema.parse(config);
  } catch (error) {
    console.error('Configuration error:', error);
    throw new Error('Invalid configuration', { cause: error });
  }
}

export const config = loadConfig();
