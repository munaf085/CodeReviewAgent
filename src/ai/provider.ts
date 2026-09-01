import { Review } from '../review/schema';

export interface AIProvider {
  analyzeDiff(diffChunk: string, context?: unknown): Promise<Review | null>;
}
