import { BadRequestException } from '@nestjs/common';

const GITHUB_PR_REGEX =
  /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+\/?$/;

const GITHUB_COMMIT_REGEX =
  /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/commit\/[a-f0-9]{7,40}\/?$/i;

export function parseGithubLinks(
  githubPrUrl?: string | null,
  githubCommitUrl?: string | null,
) {
  const pr = githubPrUrl?.trim();
  const commit = githubCommitUrl?.trim();

  if (pr && !GITHUB_PR_REGEX.test(pr)) {
    throw new BadRequestException(
      'Invalid GitHub pull request URL format',
    );
  }

  if (commit && !GITHUB_COMMIT_REGEX.test(commit)) {
    throw new BadRequestException(
      'Invalid GitHub commit URL format',
    );
  }

  return {
    githubPrUrl: pr || null,
    githubCommitUrl: commit || null,
  };
}

/** @deprecated Use parseGithubLinks */
export const assertGithubEvidence = parseGithubLinks;
