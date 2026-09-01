import { AIProvider, AIProviderOptions } from './provider';
import { Review } from '../review/schema';
export declare class GroqProvider implements AIProvider {
    private groq;
    private requestCount;
    constructor();
    private sleep;
    private attemptCall;
    analyzeDiff(diffChunk: string, options?: AIProviderOptions): Promise<Review | null>;
}
