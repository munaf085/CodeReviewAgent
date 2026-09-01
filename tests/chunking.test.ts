import { describe, it, expect } from 'vitest';
import { chunkDiff, filterFiles } from '../src/utils/chunking';

describe('Chunking and Filtering', () => {
  it('should filter files correctly', () => {
    const files = [
      { filename: 'src/index.ts' },
      { filename: 'node_modules/test/index.js' },
      { filename: 'dist/app.js' }
    ];
    const excludes = ['**/node_modules/**', '**/dist/**'];
    
    const result = filterFiles(files, excludes);
    expect(result.length).toBe(1);
    expect(result[0].filename).toBe('src/index.ts');
  });

  it('should chunk diff string', () => {
    const diff = 'A\nB\nC\nD\nE';
    const chunks = chunkDiff(diff, 1);
    expect(chunks.length).toBeGreaterThan(0);
  });
});
