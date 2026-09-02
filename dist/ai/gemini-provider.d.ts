import { AIProvider, AIProviderOptions } from './provider';
import { Review } from '../review/schema';
export declare class GeminiProvider implements AIProvider {
    private ai;
    constructor();
    analyzeDiff(diffChunk: string, options?: AIProviderOptions): Promise<Review | null>;
}
