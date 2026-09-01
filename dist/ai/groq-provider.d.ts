import { AIProvider } from './provider';
import { Review } from '../review/schema';
export declare class GroqProvider implements AIProvider {
    private groq;
    constructor();
    analyzeDiff(diffChunk: string, _context?: unknown): Promise<Review | null>;
}
