import { Review } from '../review/schema';

export interface AIProviderOptions {
  reasoningEffort?: 'low' | 'medium' | 'high';
  context?: unknown;
}

export interface AIProvider {
  analyzeDiff(diffChunk: string, options?: AIProviderOptions): Promise<Review | null>;
}
