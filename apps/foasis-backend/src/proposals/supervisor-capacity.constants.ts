export const SUPERVISOR_MAX_ACCEPTED_TEAMS = Number.POSITIVE_INFINITY;

/** Capacity enforcement is disabled — supervisors may manage unlimited teams. */
export const SUPERVISOR_CAPACITY_ENFORCED = false;

export type TeamAvailability = 'AVAILABLE' | 'UNAVAILABLE';

export interface InvitationBrowseTarget {
  inviteKey: string;
  kind: 'team' | 'proposal';
  teamId: string;
  proposalId?: string | null;
  teamName: string;
  domain: string;
  title?: string | null;
  abstract?: string | null;
  teamLeaderAuthUserId?: string | null;
  availability: TeamAvailability;
  canInvite: boolean;
  invitationSent: boolean;
}
