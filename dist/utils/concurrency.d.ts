export declare function makeLimit(concurrency: number): <T>(fn: () => Promise<T>) => Promise<T>;
