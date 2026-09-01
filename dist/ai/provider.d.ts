import { Review } from '../review/schema';
export interface AIProvider {
    analyzeDiff(diffChunk: string, context?: any): Promise<Review | null>;
}
