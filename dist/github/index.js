"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPRDetails = getPRDetails;
exports.getPRDiff = getPRDiff;
async function getPRDetails(octokit, owner, repo, pullNumber) {
    const { data: pr } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
    });
    return pr;
}
async function getPRDiff(octokit, owner, repo, pullNumber) {
    const { data } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
        mediaType: {
            format: 'diff',
        },
    });
    return data;
}
