export interface ValidLine {
    file: string;
    line: number;
    content: string;
}
export declare function extractValidLines(diffString: string): ValidLine[];
export declare function isCommentableLine(validLines: ValidLine[], file: string, line: number): boolean;
