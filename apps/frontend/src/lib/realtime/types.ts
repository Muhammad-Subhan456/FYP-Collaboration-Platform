export type RealtimeScopeType =
  | "user"
  | "team"
  | "supervisor"
  | "coordinator";

export interface RealtimeEventEnvelope<T = object> {
  event: string;
  timestamp: string;
  actorId?: string;
  scope: { type: RealtimeScopeType; id: string };
  entity?: { type: string; id: string };
  payload: T;
}

export interface RealtimeNotificationPayload {
  notification: {
    id?: string;
    authUserId: string;
    title: string;
    message: string;
    type?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    route?: string | null;
    isRead: boolean;
    createdAt: string;
  };
}

export interface RealtimeIssueSnapshot {
  id: string;
  teamId: string;
  title: string;
  description: string;
  priority: string;
  labels: string[];
  status: string;
  assignedToId?: string | null;
  githubPrUrl?: string | null;
  githubCommitUrl?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  comments?: import("@/types/team-issue").TeamIssueComment[];
  activities?: import("@/types/team-issue").TeamIssueActivity[];
}

export interface RealtimeIssueSnapshotPayload {
  issue: RealtimeIssueSnapshot;
}

export interface RealtimeIssueCommentPayload {
  issueId: string;
  teamId: string;
  comment: import("@/types/team-issue").TeamIssueComment;
  activity: import("@/types/team-issue").TeamIssueActivity;
}

export const RealtimeEvents = {
  NOTIFICATION_CREATED: "notification.created",
  ISSUE_CREATED: "issue.created",
  ISSUE_UPDATED: "issue.updated",
  ISSUE_CLAIMED: "issue.claimed",
  ISSUE_RELEASED: "issue.released",
  ISSUE_COMPLETED: "issue.completed",
  ISSUE_COMMENT_CREATED: "issue.comment.created",
  WORKSTREAM_COMMENT_CREATED: "workstream.comment.created",
  ANNOUNCEMENT_CREATED: "announcement.created",
  ANNOUNCEMENT_UPDATED: "announcement.updated",
  ANNOUNCEMENT_DELETED: "announcement.deleted",
  DELIVERABLE_CREATED: "deliverable.created",
  DELIVERABLE_UPDATED: "deliverable.updated",
  DELIVERABLE_DEADLINE_EXTENDED: "deliverable.deadline_extended",
  SUBMISSION_CREATED: "submission.created",
  SUBMISSION_REVIEWED: "submission.reviewed",
  PROPOSAL_SUBMITTED: "proposal.submitted",
  PROPOSAL_ACCEPTED: "proposal.accepted",
  PROPOSAL_REJECTED: "proposal.rejected",
  PROPOSAL_INTEREST_RECEIVED: "proposal.interest_received",
  PROPOSAL_INTEREST_DISMISSED: "proposal.interest_dismissed",
  PROPOSAL_RESUBMITTED: "proposal.resubmitted",
  TEAM_JOIN_REQUEST_RECEIVED: "team.join_request_received",
  TEAM_JOIN_REQUEST_RESOLVED: "team.join_request_resolved",
  TEAM_MEMBER_JOINED: "team.member_joined",
  TEAM_MEMBER_LEFT: "team.member_left",
  TEAM_ROLE_UPDATED: "team.role_updated",
  CONNECTED: "realtime.connected",
  ERROR: "realtime.error",
} as const;

export const ISSUE_SNAPSHOT_EVENTS = [
  RealtimeEvents.ISSUE_CREATED,
  RealtimeEvents.ISSUE_UPDATED,
  RealtimeEvents.ISSUE_CLAIMED,
  RealtimeEvents.ISSUE_RELEASED,
  RealtimeEvents.ISSUE_COMPLETED,
] as const;

export interface RealtimeWorkstreamCommentPayload {
  entityType: "ANNOUNCEMENT" | "DELIVERABLE";
  entityId: string;
  teamId: string;
  comment: {
    id: string;
    authUserId: string;
    body: string;
    createdAt: string;
  };
}

export interface RealtimeAnnouncementWire {
  id: string;
  supervisorId: string;
  teamId?: string | null;
  title: string;
  message: string;
  type: string;
  dueDate?: string | null;
  createdAt: string;
  preview?: string;
  createdByName?: string;
  teamName?: string | null;
  attachmentCount?: number;
  commentCount?: number;
}

export interface RealtimeAnnouncementPayload {
  teamId: string;
  announcement: RealtimeAnnouncementWire;
}

export interface RealtimeAnnouncementDeletedPayload {
  teamId: string;
  announcementId: string;
}

export interface RealtimeDeliverableWire {
  id: string;
  supervisorId: string;
  teamId?: string | null;
  title: string;
  description: string;
  type: string;
  dueDate: string;
  attachmentUrl?: string | null;
  isActive: boolean;
  submissionsOpen: boolean;
  createdAt: string;
  preview?: string;
  teamName?: string | null;
  attachmentCount?: number;
  commentCount?: number;
  latestSubmissionStatus?: string | null;
  submissionCount?: number;
  submissionOpen?: boolean;
  submissionClosedReason?: string | null;
}

export interface RealtimeDeliverablePayload {
  teamId: string;
  deliverable: RealtimeDeliverableWire;
}

export interface RealtimeSubmissionWire {
  id: string;
  deliverableId: string;
  teamId: string;
  version: number;
  fileUrl: string;
  remarks?: string | null;
  status: string;
  feedback?: string | null;
  grade?: number | null;
  submittedAt: string;
}

export interface RealtimeSubmissionPayload {
  teamId: string;
  deliverableId: string;
  submission: RealtimeSubmissionWire;
}

export const WORKSTREAM_EVENTS = [
  RealtimeEvents.WORKSTREAM_COMMENT_CREATED,
  RealtimeEvents.ANNOUNCEMENT_CREATED,
  RealtimeEvents.ANNOUNCEMENT_UPDATED,
  RealtimeEvents.ANNOUNCEMENT_DELETED,
  RealtimeEvents.DELIVERABLE_CREATED,
  RealtimeEvents.DELIVERABLE_UPDATED,
  RealtimeEvents.DELIVERABLE_DEADLINE_EXTENDED,
  RealtimeEvents.SUBMISSION_CREATED,
  RealtimeEvents.SUBMISSION_REVIEWED,
] as const;

export interface RealtimeProposalWire {
  id: string;
  teamId: string;
  teamLeaderAuthUserId?: string | null;
  title: string;
  domain: string;
  abstract: string;
  proposalPdfUrl?: string | null;
  status: string;
  assignedSupervisorId?: string | null;
  pendingSupervisorId?: string | null;
  pendingExpiresAt?: string | null;
  reviewFeedback?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  createdAt: string;
}

export interface RealtimeSupervisorRequestWire {
  id: string;
  proposalId: string;
  supervisorId: string;
  status: string;
  rejectionReason?: string | null;
  expiresAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface RealtimeSupervisorInvitationWire {
  id: string;
  proposalId?: string | null;
  teamId?: string | null;
  supervisorId: string;
  status: string;
  createdAt: string;
}

export interface RealtimeProposalSnapshotPayload {
  teamId: string;
  proposal: RealtimeProposalWire;
}

export interface RealtimeProposalSubmittedPayload {
  teamId: string;
  proposal: RealtimeProposalWire;
  request: RealtimeSupervisorRequestWire;
}

export interface RealtimeProposalInterestPayload {
  teamId: string;
  invitation: RealtimeSupervisorInvitationWire;
}

export interface RealtimeProposalInterestDismissedPayload {
  teamId: string;
  invitationId: string;
  supervisorId: string;
}

export interface RealtimeJoinRequestWire {
  id: string;
  teamId: string;
  authUserId: string;
  status: string;
  createdAt: string;
}

export interface RealtimeTeamMemberWire {
  id: string;
  teamId: string;
  authUserId: string;
  teamRole?: string | null;
  joinedAt: string;
}

export interface RealtimeTeamJoinRequestReceivedPayload {
  teamId: string;
  joinRequest: RealtimeJoinRequestWire;
}

export interface RealtimeTeamJoinRequestResolvedPayload {
  teamId: string;
  joinRequest: RealtimeJoinRequestWire;
}

export interface RealtimeTeamMemberJoinedPayload {
  teamId: string;
  member: RealtimeTeamMemberWire;
}

export interface RealtimeTeamMemberLeftPayload {
  teamId: string;
  memberId: string;
  authUserId: string;
}

export interface RealtimeTeamRoleUpdatedPayload {
  teamId: string;
  member: RealtimeTeamMemberWire;
}

export const PROPOSAL_EVENTS = [
  RealtimeEvents.PROPOSAL_SUBMITTED,
  RealtimeEvents.PROPOSAL_ACCEPTED,
  RealtimeEvents.PROPOSAL_REJECTED,
  RealtimeEvents.PROPOSAL_INTEREST_RECEIVED,
  RealtimeEvents.PROPOSAL_INTEREST_DISMISSED,
  RealtimeEvents.PROPOSAL_RESUBMITTED,
] as const;

export const TEAM_EVENTS = [
  RealtimeEvents.TEAM_JOIN_REQUEST_RECEIVED,
  RealtimeEvents.TEAM_JOIN_REQUEST_RESOLVED,
  RealtimeEvents.TEAM_MEMBER_JOINED,
  RealtimeEvents.TEAM_MEMBER_LEFT,
  RealtimeEvents.TEAM_ROLE_UPDATED,
] as const;
