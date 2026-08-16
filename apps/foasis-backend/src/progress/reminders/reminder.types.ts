export const ReminderTypes = {
  ANNOUNCEMENT_PUBLISH: 'ANNOUNCEMENT_PUBLISH',
  DELIVERABLE_DEADLINE: 'DELIVERABLE_DEADLINE',
  EVALUATION_UPCOMING: 'EVALUATION_UPCOMING',
  SUPERVISOR_SUBMISSION_PENDING: 'SUPERVISOR_SUBMISSION_PENDING',
  EVALUATOR_EVALUATION_PENDING: 'EVALUATOR_EVALUATION_PENDING',
  PROPOSAL_SUPERVISOR_SELECTION: 'PROPOSAL_SUPERVISOR_SELECTION',
  GENERIC: 'GENERIC',
} as const;

export type ReminderType =
  (typeof ReminderTypes)[keyof typeof ReminderTypes];

export type ReminderChannel = 'notification' | 'email';

export type ReminderAudienceSpec = {
  roles?: string[];
  userIds?: string[];
};

export type ScheduleReminderInput = {
  workspaceId: string;
  reminderType: ReminderType;
  entityType?: string;
  entityId?: string;
  title: string;
  message: string;
  route?: string;
  channels?: ReminderChannel[];
  audienceSpec?: ReminderAudienceSpec;
  scheduledFor: Date;
  metadata?: Record<string, unknown>;
};
