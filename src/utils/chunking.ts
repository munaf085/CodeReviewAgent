import { minimatch } from 'minimatch';

export function filterFiles(files: { filename: string }[], excludePatterns: string[]): { filename: string }[] {
  return files.filter(file => {
    return !excludePatterns.some(pattern => minimatch(file.filename, pattern));
  });
}

export function chunkDiff(diffStr: string, maxTokens: number = 4000): string[] {
  const chunks: string[] = [];
  const charsPerToken = 4;
  const maxChars = maxTokens * charsPerToken;
  let currentChunk = '';

  const lines = diffStr.split('\n');
  for (const line of lines) {
    if ((currentChunk.length + line.length + 1) > maxChars) {
      chunks.push(currentChunk);
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
}
