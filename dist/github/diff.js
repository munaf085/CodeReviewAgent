"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractValidLines = extractValidLines;
exports.isCommentableLine = isCommentableLine;
const parse_diff_1 = __importDefault(require("parse-diff"));
function extractValidLines(diffString) {
    const files = (0, parse_diff_1.default)(diffString);
    const validLines = [];
    for (const file of files) {
        if (!file.to)
            continue; // Skip deleted files
        for (const chunk of file.chunks) {
            for (const change of chunk.changes) {
                if (change.type === 'add' || change.type === 'normal') {
                    // Both add and normal are technically commentable, but typically we only review 'add' lines.
                    if (change.type === 'add') {
                        validLines.push({
                            file: file.to,
                            line: change.ln,
                            content: change.content
                        });
                    }
                }
            }
        }
    }
    return validLines;
}
function isCommentableLine(validLines, file, line) {
    return validLines.some(vl => vl.file === file && vl.line === line);
}
