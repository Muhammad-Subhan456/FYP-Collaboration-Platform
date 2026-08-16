import { WORKSPACE_SETTINGS_DEFAULTS } from '../workspace/workspace-settings.defaults';

/**
 * Fallback constants — prefer WorkspaceSettingsService values at runtime.
 * Capacity is always enforced against workspace.supervisorMaxTeams.
 */
export const SUPERVISOR_MAX_ACCEPTED_TEAMS =
  WORKSPACE_SETTINGS_DEFAULTS.supervisorMaxTeams;

export const SUPERVISOR_CAPACITY_ENFORCED = true;

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
