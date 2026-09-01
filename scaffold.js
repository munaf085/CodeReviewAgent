const fs = require('fs');
const path = require('path');

const projectRoot = 'c:\\\\Users\\\\keert\\\\Mun\\\\CodeReviewAgent';

const dirs = [
  'src/github',
  'src/ai',
  'src/review',
  'src/config',
  'src/utils',
  'tests',
  '.github/workflows'
];

dirs.forEach(dir => {
  fs.mkdirSync(path.join(projectRoot, dir), { recursive: true });
});

const files = {
  'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "tests/**/*", "dist"]
}`,
  '.prettierrc': `{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}`,
  'eslint.config.mjs': `import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    }
  }
);`,
  'vitest.config.ts': `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});`,
  'src/config/index.ts': `import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export const ConfigSchema = z.object({
  GITHUB_TOKEN: z.string().min(1).default('dummy'),
  GROQ_API_KEY: z.string().min(1).default('dummy'),
  GROQ_MODEL: z.string().default('llama3-70b-8192'),
  GROQ_BASE_URL: z.string().optional(),
  MAX_TOKENS: z.number().default(4000),
  MIN_CONFIDENCE: z.number().default(0.8),
  SEVERITY_LEVELS: z.array(z.string()).default(['critical', 'high', 'medium']),
  EXCLUDE_PATTERNS: z.array(z.string()).default(['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.min.js']),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const config = {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN || process.env.INPUT_GITHUB_TOKEN || 'dummy',
    GROQ_API_KEY: process.env.GROQ_API_KEY || process.env.INPUT_GROQ_API_KEY || 'dummy',
    GROQ_MODEL: process.env.GROQ_MODEL || process.env.INPUT_GROQ_MODEL || 'llama3-70b-8192',
    GROQ_BASE_URL: process.env.GROQ_BASE_URL || process.env.INPUT_GROQ_BASE_URL,
  };

  try {
    return ConfigSchema.parse(config);
  } catch (error) {
    console.error('Configuration error:', error);
    throw new Error('Invalid configuration');
  }
}

export const config = loadConfig();
`,
  'src/utils/chunking.ts': `import { minimatch } from 'minimatch';

export function filterFiles(files: any[], excludePatterns: string[]): any[] {
  return files.filter(file => {
    return !excludePatterns.some(pattern => minimatch(file.filename, pattern));
  });
}

export function chunkDiff(diffStr: string, maxTokens: number = 4000): string[] {
  // A naive chunking approach based on characters
  const chunks: string[] = [];
  const charsPerToken = 4;
  const maxChars = maxTokens * charsPerToken;
  let currentChunk = '';

  const lines = diffStr.split('\\n');
  for (const line of lines) {
    if ((currentChunk.length + line.length + 1) > maxChars) {
      chunks.push(currentChunk);
      currentChunk = line + '\\n';
    } else {
      currentChunk += line + '\\n';
    }
  }
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
}
`,
  'src/review/schema.ts': `import { z } from 'zod';

export const FindingSchema = z.object({
  file: z.string(),
  line: z.number(),
  endLine: z.number().optional(),
  side: z.enum(['RIGHT', 'LEFT', 'BOTH']).default('RIGHT'),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  confidence: z.number().min(0).max(1),
  category: z.string(),
  title: z.string(),
  description: z.string(),
  impact: z.string().optional(),
  suggestion: z.string().optional(),
  suggestedCode: z.string().nullable().optional(),
});

export const ReviewSchema = z.object({
  summary: z.object({
    overallRisk: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string(),
    positiveNotes: z.array(z.string()).optional(),
  }),
  findings: z.array(FindingSchema),
});

export type Finding = z.infer<typeof FindingSchema>;
export type Review = z.infer<typeof ReviewSchema>;
`,
  'src/review/prompts.ts': `export const SYSTEM_PROMPT = \`You are an expert, strict, and highly experienced Staff Software Engineer AI acting as a Code Reviewer.
Your task is to review a GitHub Pull Request diff and provide actionable, high-signal feedback.

IMPORTANT BEHAVIOR:
- Prioritize genuine engineering problems: Bugs, Logic errors, Security vulnerabilities (Auth, Data leaks, SQL injection, XSS, SSRF, Path traversal), Performance bottlenecks.
- AVOID commenting on formatting, semicolons, subjective stylistic preferences, or minor typos. Be conservative. If uncertain, do not comment.
- ONLY comment on the code that has been changed or added (the RIGHT side of the diff). NEVER invent files or line numbers.

You must output a raw JSON object conforming EXACTLY to the following schema:
{
  "summary": { "overallRisk": "low | medium | high | critical", "description": "...", "positiveNotes": ["..."] },
  "findings": [
    { 
      "file": "path/to/file", 
      "line": 42, 
      "endLine": 42, 
      "side": "RIGHT", 
      "severity": "critical | high | medium | low", 
      "confidence": 0.95, 
      "category": "security | logic | performance | architecture", 
      "title": "Short title", 
      "description": "Detailed explanation", 
      "impact": "Potential impact", 
      "suggestion": "How to fix it", 
      "suggestedCode": "replacement code if applicable, or null" 
    }
  ]
}

DO NOT output any markdown blocks like \\\`\\\`\\\`json. Output ONLY raw JSON.
\`;
`,
  'src/ai/provider.ts': `import { Review } from '../review/schema';

export interface AIProvider {
  analyzeDiff(diffChunk: string, context?: any): Promise<Review | null>;
}
`,
  'src/ai/groq-provider.ts': `import Groq from 'groq-sdk';
import { AIProvider } from './provider';
import { Review, ReviewSchema } from '../review/schema';
import { SYSTEM_PROMPT } from '../review/prompts';
import { config } from '../config';

export class GroqProvider implements AIProvider {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({
      apiKey: config.GROQ_API_KEY,
      baseURL: config.GROQ_BASE_URL,
    });
  }

  async analyzeDiff(diffChunk: string, context?: any): Promise<Review | null> {
    try {
      const response = await this.groq.chat.completions.create({
        model: config.GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: \`Review the following diff:\\n\\n\${diffChunk}\` }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content);
      const validated = ReviewSchema.safeParse(parsed);

      if (validated.success) {
        return validated.data;
      } else {
        console.error('Validation error on AI output:', validated.error);
        return null;
      }
    } catch (error) {
      console.error('Groq API error:', error);
      return null;
    }
  }
}
`,
  'src/github/diff.ts': `import parseDiff from 'parse-diff';

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
`,
  'src/github/comments.ts': `import { Octokit } from '@octokit/rest';
import { Finding, Review } from '../review/schema';
import * as crypto from 'crypto';

export class GitHubComments {
  constructor(private octokit: Octokit, private owner: string, private repo: string, private pullNumber: number) {}

  private generateFingerprint(finding: Finding): string {
    const data = \`\${finding.file}:\${finding.line}:\${finding.title}\`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  async getExistingComments() {
    const { data } = await this.octokit.pulls.listReviewComments({
      owner: this.owner,
      repo: this.repo,
      pull_number: this.pullNumber,
    });
    return data;
  }

  async getExistingIssueComments() {
    const { data } = await this.octokit.issues.listComments({
      owner: this.owner,
      repo: this.repo,
      issue_number: this.pullNumber,
    });
    return data;
  }

  async postInlineComments(findings: Finding[], commitId: string) {
    const existing = await this.getExistingComments();
    const existingFingerprints = existing.map(c => {
      const match = c.body.match(/<!-- ai-review:fingerprint=(.*?) -->/);
      return match ? match[1] : null;
    }).filter(Boolean);

    for (const finding of findings) {
      const fingerprint = this.generateFingerprint(finding);
      if (existingFingerprints.includes(fingerprint)) continue;

      let body = \`**[\${finding.severity.toUpperCase()}] \${finding.title}**\\n\\n\${finding.description}\\n\\n\`;
      if (finding.impact) body += \`*Impact*: \${finding.impact}\\n\`;
      if (finding.suggestion) body += \`*Suggestion*: \${finding.suggestion}\\n\`;
      if (finding.suggestedCode) body += '\\n\\n```\\n' + finding.suggestedCode + '\\n```';
      
      body += \`\\n\\n<!-- ai-review:fingerprint=\${fingerprint} -->\`;

      try {
        await this.octokit.pulls.createReviewComment({
          owner: this.owner,
          repo: this.repo,
          pull_number: this.pullNumber,
          commit_id: commitId,
          path: finding.file,
          line: finding.line,
          side: finding.side,
          body,
        });
      } catch (e: any) {
        console.warn(\`Failed to post comment on \${finding.file}:\${finding.line}. It may be out of bounds.\`, e.message);
      }
    }
  }

  async postSummary(review: Review, summaryFindings: Finding[]) {
    const existing = await this.getExistingIssueComments();
    const summaryComment = existing.find(c => c.body && c.body.includes('<!-- ai-review:summary -->'));

    let body = \`## AI Code Review Summary\\n\\n\`;
    body += \`**Overall Risk:** \${review.summary.overallRisk.toUpperCase()}\\n\\n\`;
    body += \`\${review.summary.description}\\n\\n\`;

    if (review.summary.positiveNotes && review.summary.positiveNotes.length > 0) {
      body += \`### Positives\\n\`;
      for (const note of review.summary.positiveNotes) {
        body += \`- \${note}\\n\`;
      }
      body += \`\\n\`;
    }

    if (summaryFindings.length > 0) {
      body += \`### Other Findings\\n\`;
      for (const f of summaryFindings) {
        body += \`- **\${f.file}:\${f.line}**: \${f.title} (\${f.severity})\\n\`;
      }
    }

    body += \`\\n\\n<!-- ai-review:summary -->\`;

    if (summaryComment) {
      await this.octokit.issues.updateComment({
        owner: this.owner,
        repo: this.repo,
        comment_id: summaryComment.id,
        body,
      });
    } else {
      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: this.pullNumber,
        body,
      });
    }
  }
}
`,
  'src/github/index.ts': `import { Octokit } from '@octokit/rest';

export async function getPRDetails(octokit: Octokit, owner: string, repo: string, pullNumber: number) {
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return pr;
}

export async function getPRDiff(octokit: Octokit, owner: string, repo: string, pullNumber: number): Promise<string> {
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: {
      format: 'diff',
    },
  });
  return data as unknown as string;
}
`,
  'src/index.ts': `import { Octokit } from '@octokit/rest';
import { config } from './config';
import { getPRDiff } from './github';
import { extractValidLines, isCommentableLine } from './github/diff';
import { GitHubComments } from './github/comments';
import { GroqProvider } from './ai/groq-provider';
import { chunkDiff } from './utils/chunking';
import { Finding, Review } from './review/schema';
import * as fs from 'fs';

async function run() {
  const githubEventPath = process.env.GITHUB_EVENT_PATH;
  if (!githubEventPath) {
    throw new Error('GITHUB_EVENT_PATH is missing');
  }

  const eventPayload = JSON.parse(fs.readFileSync(githubEventPath, 'utf8'));
  
  if (eventPayload.action === 'synchronize' || eventPayload.action === 'opened' || eventPayload.action === 'reopened' || eventPayload.action === 'ready_for_review') {
    // Proceed
  } else {
    console.log('Skipping event action:', eventPayload.action);
    return;
  }

  const pr = eventPayload.pull_request;
  if (!pr) {
    throw new Error('No pull_request in event payload');
  }

  if (pr.draft) {
    console.log('PR is a draft, skipping.');
    return;
  }

  const owner = pr.base.repo.owner.login;
  const repo = pr.base.repo.name;
  const pullNumber = pr.number;
  const commitId = pr.head.sha;

  const octokit = new Octokit({ auth: config.GITHUB_TOKEN });
  
  const diffString = await getPRDiff(octokit, owner, repo, pullNumber);
  const validLines = extractValidLines(diffString);

  const diffChunks = chunkDiff(diffString, config.MAX_TOKENS);
  
  const aiProvider = new GroqProvider();
  
  const allFindings: Finding[] = [];
  let summaryReview: Review | null = null;

  for (const chunk of diffChunks) {
    const review = await aiProvider.analyzeDiff(chunk);
    if (review) {
      allFindings.push(...review.findings);
      if (!summaryReview) {
        summaryReview = review;
      }
    }
  }

  if (!summaryReview) {
    console.log('No review generated.');
    return;
  }

  // Filter findings based on confidence and severity
  const filteredFindings = allFindings.filter(f => f.confidence >= config.MIN_CONFIDENCE);

  const inlineFindings: Finding[] = [];
  const summaryFindings: Finding[] = [];

  for (const f of filteredFindings) {
    if (config.SEVERITY_LEVELS.includes(f.severity)) {
      if (isCommentableLine(validLines, f.file, f.line)) {
        inlineFindings.push(f);
      } else {
        summaryFindings.push(f);
      }
    } else {
      summaryFindings.push(f);
    }
  }

  const githubComments = new GitHubComments(octokit, owner, repo, pullNumber);
  await githubComments.postInlineComments(inlineFindings, commitId);
  await githubComments.postSummary(summaryReview, summaryFindings);
}

run().catch(error => {
  console.error('Failed to run code review agent:', error);
  process.exit(1);
});
`,
  '.github/workflows/ai-code-review.yml': \`name: AI Code Review

on:
  pull_request:
    types: [opened, reopened, synchronize, ready_for_review]

jobs:
  review:
    runs-on: ubuntu-latest
    if: github.event.pull_request.draft == false
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build Agent
        run: npm run build

      - name: Run AI Code Review Agent
        run: node dist/index.js
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          GROQ_API_KEY: \${{ secrets.GROQ_API_KEY }}
          GROQ_MODEL: "llama3-70b-8192"
\`,
  'README.md': \`# AI Code Review Agent

A complete, production-ready AI GitHub Pull Request Code Review Agent built with Node.js, TypeScript, and the Groq API.

## Features

- **Automated PR Reviews**: Triggers on PR \`opened\`, \`reopened\`, \`synchronize\`, and \`ready_for_review\`.
- **Intelligent Diff Chunking**: Safely splits large changes and avoids exceeding context windows.
- **Precision Inline Comments**: Maps AI findings directly to the valid lines in the PR diff.
- **Smart Filtering**: Ignores formatting, minor typos, and non-actionable feedback. Focuses on critical bugs, logic errors, and security vulnerabilities.
- **Duplicate Prevention**: Uses fingerprinting to ensure comments are not repeated across synchronizations.
- **PR Summary**: Posts an overarching PR summary and rolls up low-severity or un-commentable findings.

## Setup

1. Copy the workflow file to your repository: \`.github/workflows/ai-code-review.yml\`.
2. Add the \`GROQ_API_KEY\` secret in your GitHub Repository settings.
3. The GitHub Token is automatically provided by GitHub Actions.

## Configuration

You can configure the agent via environment variables in the workflow file:
- \`GROQ_API_KEY\`: Your Groq API key (Required)
- \`GROQ_MODEL\`: The model to use (Default: llama3-70b-8192)
- \`MAX_TOKENS\`: Maximum tokens per chunk (Default: 4000)

## Development

\`\`\`bash
npm install
npm run build
npm test
\`\`\`
\`,
  'tests/chunking.test.ts': \`import { describe, it, expect } from 'vitest';
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
    const diff = 'A\\nB\\nC\\nD\\nE';
    const chunks = chunkDiff(diff, 1);
    expect(chunks.length).toBeGreaterThan(0);
  });
});
\`
};

Object.keys(files).forEach(file => {
  fs.writeFileSync(path.join(projectRoot, file), files[file]);
});

const pkgJsonPath = path.join(projectRoot, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
pkg.scripts = {
  "build": "tsc",
  "start": "node dist/index.js",
  "test": "vitest run",
  "lint": "eslint 'src/**/*.{ts,js}'",
  "format": "prettier --write 'src/**/*.{ts,js}'",
  "typecheck": "tsc --noEmit"
};
fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2));

console.log('Scaffolding complete.');
