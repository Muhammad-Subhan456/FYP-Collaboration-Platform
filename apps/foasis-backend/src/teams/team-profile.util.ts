import type { Team } from '@prisma/client';

import { validateProposalContent } from '../proposals/proposal-constants';

type TeamProfileFields = Pick<
  Team,
  | 'name'
  | 'domain'
  | 'domains'
  | 'otherDomain'
  | 'nature'
  | 'sdgs'
  | 'sdgJustification'
  | 'previousObjectives'
  | 'projectTitle'
  | 'projectAbstract'
  | 'proposalPdfUrl'
>;

/**
 * Human-readable list of what is missing/invalid on a team's proposal profile
 * under the university template. Empty array means the profile is complete.
 * Abstract is optional; the proposal PDF is required for submission.
 */
export function getTeamProfileErrors(team: TeamProfileFields): string[] {
  const errors: string[] = [];

  if (!team.name?.trim()) {
    errors.push('Team name is required');
  }
  if (!team.projectTitle?.trim() || team.projectTitle.trim().length < 5) {
    errors.push('Project title must be at least 5 characters');
  }
  if (!team.proposalPdfUrl?.trim()) {
    errors.push('Upload the proposal PDF before submitting');
  }

  errors.push(
    ...validateProposalContent({
      nature: team.nature,
      domains: team.domains,
      otherDomain: team.otherDomain,
      abstract: team.projectAbstract,
      previousObjectives: team.previousObjectives,
      sdgs: team.sdgs,
      sdgJustification: team.sdgJustification,
    }),
  );

  return errors;
}

export function isTeamProfileComplete(team: TeamProfileFields): boolean {
  return getTeamProfileErrors(team).length === 0;
}

export function getTeamProfileSnapshot(team: TeamProfileFields) {
  const domains = team.domains ?? [];
  const otherDomain = team.otherDomain?.trim() || null;

  // Keep the legacy free-text `domain` column meaningful for existing views and
  // search by deriving it from the structured domain selections when present.
  const legacyDomain = domains.length
    ? [...domains, ...(otherDomain ? [otherDomain] : [])].join(', ')
    : team.domain.trim();

  return {
    title: team.projectTitle?.trim() ?? '',
    domain: legacyDomain,
    domains,
    otherDomain,
    nature: team.nature ?? null,
    sdgs: team.sdgs ?? [],
    sdgJustification: team.sdgJustification?.trim() || null,
    previousObjectives: team.previousObjectives?.trim() || null,
    abstract: team.projectAbstract?.trim() ?? '',
    proposalPdfUrl: team.proposalPdfUrl?.trim() ?? null,
  };
}
