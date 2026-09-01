import parseDiff from 'parse-diff';

export interface ValidLine {
  file: string;
  line: number;
  content: string;
}

export function extractValidLines(diffString: string): ValidLine[] {
  const files = parseDiff(diffString);
  const validLines: ValidLine[] = [];

  for (const file of files) {
    if (!file.to) continue; // Skip deleted files
    
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

export function isCommentableLine(validLines: ValidLine[], file: string, line: number): boolean {
  return validLines.some(vl => vl.file === file && vl.line === line);
}
