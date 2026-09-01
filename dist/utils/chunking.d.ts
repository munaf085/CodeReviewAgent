export declare function filterFiles(files: {
    filename: string;
}[], excludePatterns: string[]): {
    filename: string;
}[];
export declare function chunkDiff(diffStr: string, maxTokens?: number): string[];
