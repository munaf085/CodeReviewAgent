"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubComments = void 0;
const crypto = __importStar(require("crypto"));
class GitHubComments {
    octokit;
    owner;
    repo;
    pullNumber;
    constructor(octokit, owner, repo, pullNumber) {
        this.octokit = octokit;
        this.owner = owner;
        this.repo = repo;
        this.pullNumber = pullNumber;
    }
    generateFingerprint(finding) {
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
    async postInlineComments(findings, commitId) {
        const existing = await this.getExistingComments();
        const existingFingerprints = existing.map(c => {
            const match = c.body.match(/<!-- ai-review:fingerprint=(.*?) -->/);
            return match ? match[1] : null;
        }).filter(Boolean);
        for (const finding of findings) {
            const fingerprint = this.generateFingerprint(finding);
            if (existingFingerprints.includes(fingerprint))
                continue;
            let body = `**[${finding.severity.toUpperCase()}] ${finding.title}**\n\n${finding.description}\n\n`;
            if (finding.impact)
                body += `*Impact*: ${finding.impact}\n`;
            if (finding.suggestion)
                body += `*Suggestion*: ${finding.suggestion}\n`;
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
                    side: finding.side,
                    body,
                });
            }
            catch (e) {
                const errMsg = e instanceof Error ? e.message : String(e);
                console.warn(`Failed to post comment on ${finding.file}:${finding.line}. It may be out of bounds.`, errMsg);
            }
        }
    }
    async postSummary(review, summaryFindings) {
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
        }
        else {
            await this.octokit.issues.createComment({
                owner: this.owner,
                repo: this.repo,
                issue_number: this.pullNumber,
                body,
            });
        }
    }
}
exports.GitHubComments = GitHubComments;
