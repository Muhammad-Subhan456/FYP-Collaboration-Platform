/** Canonical domain event names (past tense for completed facts). */
export const DomainEvents = {
  NOTIFICATION_CREATED: 'notification.created',

  ANNOUNCEMENT_CREATED: 'announcement.created',
  ANNOUNCEMENT_UPDATED: 'announcement.updated',
  ANNOUNCEMENT_DELETED: 'announcement.deleted',

  DELIVERABLE_CREATED: 'deliverable.created',
  DELIVERABLE_UPDATED: 'deliverable.updated',
  DELIVERABLE_DEADLINE_EXTENDED: 'deliverable.deadline_extended',

  SUBMISSION_CREATED: 'submission.created',
  SUBMISSION_REVIEWED: 'submission.reviewed',

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

  TEAM_JOIN_REQUEST_RECEIVED: 'team.join_request_received',
  TEAM_JOIN_REQUEST_RESOLVED: 'team.join_request_resolved',
  TEAM_MEMBER_JOINED: 'team.member_joined',
  TEAM_MEMBER_LEFT: 'team.member_left',
  TEAM_ROLE_UPDATED: 'team.role_updated',

  EVALUATION_ASSIGNED: 'evaluation.assigned',
  RESULT_PUBLISHED: 'result.published',
  RESULT_UPDATED: 'result.updated',
} as const;

export type DomainEventName =
  (typeof DomainEvents)[keyof typeof DomainEvents];
