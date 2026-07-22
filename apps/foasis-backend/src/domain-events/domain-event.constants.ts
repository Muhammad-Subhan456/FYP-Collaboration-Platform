/** Canonical domain event names (past tense for completed facts). */
export const DomainEvents = {
  NOTIFICATION_CREATED: 'notification.created',

  GLOBAL_ANNOUNCEMENT_PUBLISHED: 'global_announcement.published',

  ANNOUNCEMENT_CREATED: 'announcement.created',
  ANNOUNCEMENT_UPDATED: 'announcement.updated',
  ANNOUNCEMENT_DELETED: 'announcement.deleted',

  DELIVERABLE_CREATED: 'deliverable.created',
  DELIVERABLE_UPDATED: 'deliverable.updated',
  DELIVERABLE_DEADLINE_EXTENDED: 'deliverable.deadline_extended',
  DELIVERABLE_DELETED: 'deliverable.deleted',
  DELIVERABLE_TEMPLATE_CREATED: 'deliverable_template.created',
  DELIVERABLE_TEMPLATE_UPDATED: 'deliverable_template.updated',
  DELIVERABLE_TEMPLATE_DELETED: 'deliverable_template.deleted',

  SUBMISSION_CREATED: 'submission.created',
  SUBMISSION_REVIEWED: 'submission.reviewed',
  SUBMISSION_FINALIZED: 'submission.finalized',
  SUBMISSION_UNFINALIZED: 'submission.unfinalized',

  PHASE_CREATED: 'phase.created',
  PHASE_UPDATED: 'phase.updated',
  PHASE_CONFIGURATION_PUBLISHED: 'phase.configuration_published',
  PHASE_DELETED: 'phase.deleted',

  WORKSTREAM_COMMENT_CREATED: 'workstream.comment.created',

  ISSUE_CREATED: 'issue.created',
  ISSUE_UPDATED: 'issue.updated',
  ISSUE_CLAIMED: 'issue.claimed',
  ISSUE_RELEASED: 'issue.released',
  ISSUE_COMPLETED: 'issue.completed',
  ISSUE_COMMENT_CREATED: 'issue.comment.created',

  PROPOSAL_ACCEPTED: 'proposal.accepted',
  PROPOSAL_REJECTED: 'proposal.rejected',
  PROPOSAL_SUBMITTED: 'proposal.submitted',
  PROPOSAL_INTEREST_RECEIVED: 'proposal.interest_received',
  PROPOSAL_INTEREST_DISMISSED: 'proposal.interest_dismissed',
  PROPOSAL_SUPERVISOR_ASSIGNED: 'proposal.supervisor_assigned',
  PROPOSAL_RESUBMITTED: 'proposal.resubmitted',

  TEAM_CREATED: 'team.created',
  TEAM_JOIN_REQUEST_RECEIVED: 'team.join_request_received',
  TEAM_JOIN_REQUEST_RESOLVED: 'team.join_request_resolved',
  TEAM_MEMBER_JOINED: 'team.member_joined',
  TEAM_MEMBER_LEFT: 'team.member_left',
  TEAM_ROLE_UPDATED: 'team.role_updated',
  TEAM_UPDATED: 'team.updated',
  TEAM_DELETED: 'team.deleted',

  EVALUATION_ASSIGNED: 'evaluation.assigned',
  RESULT_PUBLISHED: 'result.published',
  RESULT_UPDATED: 'result.updated',

  SUBMISSION_EVALUATION_ASSIGNED: 'submission_evaluation.assigned',
  SUBMISSION_EVALUATION_UPDATED: 'submission_evaluation.updated',
  SUBMISSION_EVALUATION_SUBMITTED: 'submission_evaluation.submitted',
  GPA_RECALCULATED: 'gpa.recalculated',

  USER_ROLE_UPDATED: 'user.role_updated',
  USER_STATUS_UPDATED: 'user.status_updated',
} as const;

export type DomainEventName =
  (typeof DomainEvents)[keyof typeof DomainEvents];
