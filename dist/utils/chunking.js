"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterFiles = filterFiles;
exports.chunkDiff = chunkDiff;
const minimatch_1 = require("minimatch");
function filterFiles(files, excludePatterns) {
    return files.filter(file => {
        return !excludePatterns.some(pattern => (0, minimatch_1.minimatch)(file.filename, pattern));
    });
}
function chunkDiff(diffStr, maxTokens = 4000) {
    const chunks = [];
    const charsPerToken = 4;
    const maxChars = maxTokens * charsPerToken;
    let currentChunk = '';
    const lines = diffStr.split('\n');
    for (const line of lines) {
        if ((currentChunk.length + line.length + 1) > maxChars) {
            chunks.push(currentChunk);
            currentChunk = line + '\n';
        }
        else {
            currentChunk += line + '\n';
        }
    }
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk);
    }
    return chunks;
}
