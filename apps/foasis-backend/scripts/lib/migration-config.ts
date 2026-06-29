/**
 * Table copy order respects foreign keys within foasis_db.
 * Source DB env keys map each service database.
 */
export const SOURCE_ENV_KEYS = {
  auth: 'AUTH_SOURCE_DATABASE_URL',
  user: 'USER_SOURCE_DATABASE_URL',
  team: 'TEAM_SOURCE_DATABASE_URL',
  proposal: 'PROPOSAL_SOURCE_DATABASE_URL',
  notification: 'NOTIFICATION_SOURCE_DATABASE_URL',
  progress: 'PROGRESS_SOURCE_DATABASE_URL',
} as const;

export type TableMigration = {
  table: string;
  sourceEnvKey: string;
};

/** All application tables in safe insert order. */
export const TABLE_MIGRATIONS: TableMigration[] = [
  { table: 'User', sourceEnvKey: SOURCE_ENV_KEYS.auth },
  { table: 'Organization', sourceEnvKey: SOURCE_ENV_KEYS.auth },
  { table: 'UserProfile', sourceEnvKey: SOURCE_ENV_KEYS.user },
  { table: 'Team', sourceEnvKey: SOURCE_ENV_KEYS.team },
  { table: 'TeamMember', sourceEnvKey: SOURCE_ENV_KEYS.team },
  { table: 'JoinRequest', sourceEnvKey: SOURCE_ENV_KEYS.team },
  { table: 'Proposal', sourceEnvKey: SOURCE_ENV_KEYS.proposal },
  {
    table: 'SupervisorRequest',
    sourceEnvKey: SOURCE_ENV_KEYS.proposal,
  },
  {
    table: 'SupervisorInvitation',
    sourceEnvKey: SOURCE_ENV_KEYS.proposal,
  },
  {
    table: 'Notification',
    sourceEnvKey: SOURCE_ENV_KEYS.notification,
  },
  { table: 'Announcement', sourceEnvKey: SOURCE_ENV_KEYS.progress },
  { table: 'Deliverable', sourceEnvKey: SOURCE_ENV_KEYS.progress },
  { table: 'GlobalAnnouncement', sourceEnvKey: SOURCE_ENV_KEYS.progress },
  { table: 'Evaluation', sourceEnvKey: SOURCE_ENV_KEYS.progress },
  { table: 'ActivityLog', sourceEnvKey: SOURCE_ENV_KEYS.progress },
  {
    table: 'DeliverableDeadlineExtension',
    sourceEnvKey: SOURCE_ENV_KEYS.progress,
  },
  { table: 'Submission', sourceEnvKey: SOURCE_ENV_KEYS.progress },
  { table: 'TeamIssue', sourceEnvKey: SOURCE_ENV_KEYS.progress },
  { table: 'TeamIssueComment', sourceEnvKey: SOURCE_ENV_KEYS.progress },
  { table: 'TeamIssueActivity', sourceEnvKey: SOURCE_ENV_KEYS.progress },
  {
    table: 'EvaluationPanel',
    sourceEnvKey: SOURCE_ENV_KEYS.progress,
  },
  {
    table: 'PanelEvaluator',
    sourceEnvKey: SOURCE_ENV_KEYS.progress,
  },
  {
    table: 'EvaluationAssignment',
    sourceEnvKey: SOURCE_ENV_KEYS.progress,
  },
  {
    table: 'EvaluationResult',
    sourceEnvKey: SOURCE_ENV_KEYS.progress,
  },
];

export const ALL_TABLES = TABLE_MIGRATIONS.map(
  (entry) => entry.table,
);
