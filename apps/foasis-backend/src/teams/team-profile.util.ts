import type { Team } from '@prisma/client';

type TeamProfileFields = Pick<
  Team,
  | 'name'
  | 'domain'
  | 'projectTitle'
  | 'projectAbstract'
  | 'proposalPdfUrl'
>;

export function isTeamProfileComplete(
  team: TeamProfileFields,
): boolean {
  return (
    !!team.name?.trim() &&
    !!team.domain?.trim() &&
    !!team.projectTitle?.trim() &&
    team.projectTitle.trim().length >= 5 &&
    !!team.projectAbstract?.trim() &&
    team.projectAbstract.trim().length >= 20 &&
    !!team.proposalPdfUrl?.trim()
  );
}

export function getTeamProfileSnapshot(team: TeamProfileFields) {
  return {
    title: team.projectTitle?.trim() ?? '',
    domain: team.domain.trim(),
    abstract: team.projectAbstract?.trim() ?? '',
    proposalPdfUrl: team.proposalPdfUrl?.trim() ?? null,
  };
}
