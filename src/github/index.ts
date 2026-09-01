import { Octokit } from '@octokit/rest';

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
