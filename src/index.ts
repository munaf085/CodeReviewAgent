import { Octokit } from '@octokit/rest';
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
  
  const { makeLimit } = await import('./utils/concurrency');
  const limit = makeLimit(config.MAX_CONCURRENT_REVIEWS);
  
  const allFindings: Finding[] = [];
  let summaryReview: Review | null = null;

  const tasks = diffChunks.map((chunk, index) => limit(async () => {
    // Large or first chunks get high effort, subsequent ones get medium
    const reasoningEffort = index === 0 ? 'high' : 'medium';
    const review = await aiProvider.analyzeDiff(chunk, { reasoningEffort });
    if (review) {
      allFindings.push(...review.findings);
      if (!summaryReview && index === 0) {
        summaryReview = review;
      }
    }
  }));

  await Promise.all(tasks);

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
