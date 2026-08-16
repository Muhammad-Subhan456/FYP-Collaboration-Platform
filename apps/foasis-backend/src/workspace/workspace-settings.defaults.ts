/** Defaults matching coordinator Settings product policy. */
export const WORKSPACE_SETTINGS_DEFAULTS = {
  teamMaxMembers: 4,
  supervisorMaxTeams: 4,
  supervisorRequestExpiryHours: 24,
} as const;

export type WorkspaceSettings = {
  teamMaxMembers: number;
  supervisorMaxTeams: number;
  supervisorRequestExpiryHours: number;
};

export function supervisorRequestTtlMs(expiryHours: number): number {
  const hours = Math.max(1, Math.floor(expiryHours));
  return hours * 60 * 60 * 1000;
}
