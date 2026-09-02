import { Octokit } from '@octokit/rest';
import { Finding, Review } from '../review/schema';
import * as crypto from 'crypto';

export class GitHubComments {
  constructor(private octokit: Octokit, private owner: string, private repo: string, private pullNumber: number) {}

  private generateFingerprint(finding: Finding): string {
    const data = `${finding.file}:${finding.line}:${finding.title}`;
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
    const existingBotComments = existing.filter(c => c.body && c.body.includes('<!-- ai-review:fingerprint='));
    
    const newFingerprints = findings.map(f => this.generateFingerprint(f));

    for (const finding of findings) {
      const fingerprint = this.generateFingerprint(finding);
      if (existingBotComments.some(c => c.body.includes(`fingerprint=${fingerprint}`))) continue;

      let body = `**[${finding.severity.toUpperCase()}] ${finding.title}**\n\n${finding.description}\n\n`;
      if (finding.impact) body += `*Impact*: ${finding.impact}\n`;
      if (finding.suggestion) body += `*Suggestion*: ${finding.suggestion}\n`;
      if (finding.suggestedCode) {
        body += '\n\n```\n' + finding.suggestedCode + '\n```';
      }
      
      body += `\n\n<!-- ai-review:fingerprint=${fingerprint} -->`;

      try {
        await this.octokit.pulls.createReviewComment({
          owner: this.owner,
          repo: this.repo,
          pull_number: this.pullNumber,
          commit_id: commitId,
          path: finding.file,
          line: finding.line,
          side: finding.side as 'RIGHT' | 'LEFT',
          body,
        });
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.warn(`Failed to post comment on ${finding.file}:${finding.line}. It may be out of bounds.`, errMsg);
      }
    }

    // Auto-resolve old comments that are no longer flagged
    for (const comment of existingBotComments) {
      const match = comment.body.match(/<!-- ai-review:fingerprint=(.*?) -->/);
      if (match) {
        const fp = match[1];
        if (!newFingerprints.includes(fp)) {
          // Ensure we haven't already replied resolved to this thread
          const threadComments = existing.filter(c => c.in_reply_to_id === comment.id || c.id === comment.id);
          const alreadyResolved = threadComments.some(c => c.body && c.body.includes('✅ This issue appears to be resolved'));
          
          if (!alreadyResolved) {
            try {
              await this.octokit.pulls.createReplyForReviewComment({
                owner: this.owner,
                repo: this.repo,
                pull_number: this.pullNumber,
                comment_id: comment.id,
                body: '✅ This issue appears to be resolved in the latest commits.'
              });
            } catch (e) {
              console.warn('Failed to post resolution reply', e);
            }
          }
        }
      }
    }
  }

  async postSummary(review: Review, summaryFindings: Finding[]) {
    const existing = await this.getExistingIssueComments();
    const summaryComment = existing.find(c => c.body && c.body.includes('<!-- ai-review:summary -->'));

    let body = `## AI Code Review Summary\n\n`;
    body += `**Overall Risk:** ${review.summary.overallRisk.toUpperCase()}\n\n`;
    body += `${review.summary.description}\n\n`;

    if (review.summary.positiveNotes && review.summary.positiveNotes.length > 0) {
      body += `### Positives\n`;
      for (const note of review.summary.positiveNotes) {
        body += `- ${note}\n`;
      }
      body += `\n`;
    }

    if (summaryFindings.length > 0) {
      body += `### Other Findings\n`;
      for (const f of summaryFindings) {
        body += `- **${f.file}:${f.line}**: ${f.title} (${f.severity})\n`;
      }
    }

    body += `\n\n<!-- ai-review:summary -->`;

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

  async submitFormalReview(event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', body: string) {
    try {
      // Check if we already left a formal review to avoid spamming
      const { data: reviews } = await this.octokit.pulls.listReviews({
        owner: this.owner,
        repo: this.repo,
        pull_number: this.pullNumber,
      });
      
      const alreadyApproved = reviews.some(r => r.state === 'APPROVED' && r.user?.login === 'github-actions[bot]');
      if (event === 'APPROVE' && alreadyApproved) {
        return; // Already approved, no need to spam
      }

      await this.octokit.pulls.createReview({
        owner: this.owner,
        repo: this.repo,
        pull_number: this.pullNumber,
        event,
        body,
      });
    } catch (e) {
      console.warn('Failed to submit formal review', e);
    }
  }
}
