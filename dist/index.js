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
const rest_1 = require("@octokit/rest");
const config_1 = require("./config");
const github_1 = require("./github");
const diff_1 = require("./github/diff");
const comments_1 = require("./github/comments");
const groq_provider_1 = require("./ai/groq-provider");
const chunking_1 = require("./utils/chunking");
const fs = __importStar(require("fs"));
async function run() {
    const githubEventPath = process.env.GITHUB_EVENT_PATH;
    if (!githubEventPath) {
        throw new Error('GITHUB_EVENT_PATH is missing');
    }
    const eventPayload = JSON.parse(fs.readFileSync(githubEventPath, 'utf8'));
    if (eventPayload.action === 'synchronize' || eventPayload.action === 'opened' || eventPayload.action === 'reopened' || eventPayload.action === 'ready_for_review') {
        // Proceed
    }
    else {
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
    const octokit = new rest_1.Octokit({ auth: config_1.config.GITHUB_TOKEN });
    const diffString = await (0, github_1.getPRDiff)(octokit, owner, repo, pullNumber);
    const validLines = (0, diff_1.extractValidLines)(diffString);
    const diffChunks = (0, chunking_1.chunkDiff)(diffString, config_1.config.MAX_TOKENS);
    const aiProvider = new groq_provider_1.GroqProvider();
    const allFindings = [];
    let summaryReview = null;
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
    const filteredFindings = allFindings.filter(f => f.confidence >= config_1.config.MIN_CONFIDENCE);
    const inlineFindings = [];
    const summaryFindings = [];
    for (const f of filteredFindings) {
        if (config_1.config.SEVERITY_LEVELS.includes(f.severity)) {
            if ((0, diff_1.isCommentableLine)(validLines, f.file, f.line)) {
                inlineFindings.push(f);
            }
            else {
                summaryFindings.push(f);
            }
        }
        else {
            summaryFindings.push(f);
        }
    }
    const githubComments = new comments_1.GitHubComments(octokit, owner, repo, pullNumber);
    await githubComments.postInlineComments(inlineFindings, commitId);
    await githubComments.postSummary(summaryReview, summaryFindings);
}
run().catch(error => {
    console.error('Failed to run code review agent:', error);
    process.exit(1);
});
