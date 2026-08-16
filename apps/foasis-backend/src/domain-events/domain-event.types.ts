export type DomainEventScopeType =
  | 'user'
  | 'team'
  | 'supervisor'
  | 'coordinator'
  | 'workspace';

export interface DomainEventScope {
  type: DomainEventScopeType;
  id: string;
}

export interface DomainEventEntity {
  type: string;
  id: string;
}

export interface DomainEvent<TPayload = object> {
  name: string;
  timestamp: string;
  actorId?: string;
  scope: DomainEventScope;
  entity?: DomainEventEntity;
  payload: TPayload;
}

export interface NotificationCreatedPayload {
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

export interface IssueSnapshotWire {
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
  comments?: IssueCommentWire[];
  activities?: IssueActivityWire[];
}

export interface IssueCommentWire {
  id: string;
  issueId: string;
  teamId: string;
  authUserId: string;
  body: string;
  createdAt: string;
  authorName?: string;
}

export interface IssueActivityWire {
  id: string;
  issueId: string;
  teamId: string;
  actorId: string;
  type: string;
  description?: string | null;
  createdAt: string;
}

export interface IssueSnapshotPayload {
  issue: IssueSnapshotWire;
}

export interface IssueCommentCreatedPayload {
  issueId: string;
  teamId: string;
  comment: IssueCommentWire;
  activity: IssueActivityWire;
}

export interface WorkstreamCommentWire {
  id: string;
  authUserId: string;
  body: string;
  createdAt: string;
  authorName?: string;
}

export interface WorkstreamCommentCreatedPayload {
  entityType: string;
  entityId: string;
  teamId: string;
  comment: WorkstreamCommentWire;
}

export interface GlobalAnnouncementWire {
  id: string;
  workspaceId: string;
  title: string;
  message: string;
  audienceRoles: string[];
  attachmentCount: number;
  publishedAt: string;
}

export interface GlobalAnnouncementPublishedPayload {
  announcement: GlobalAnnouncementWire;
}

export interface AnnouncementWire {
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

export interface AnnouncementSnapshotPayload {
  teamId: string;
  announcement: AnnouncementWire;
}

export interface AnnouncementDeletedPayload {
  teamId: string;
  announcementId: string;
}

export interface DeliverableWire {
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

export interface DeliverableSnapshotPayload {
  teamId: string;
  deliverable: DeliverableWire;
}

export interface DeliverableDeletedPayload {
  teamId: string;
  deliverableId: string;
}

export interface SubmissionWire {
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
  finalizedAt?: string | null;
  attachments?: Array<{
    id: string;
    fileUrl: string;
    fileName: string;
    createdAt: string;
  }>;
}

export interface SubmissionSnapshotPayload {
  teamId: string;
  deliverableId: string;
  submission: SubmissionWire;
}

export interface ProposalWire {
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

export interface ProposalSnapshotPayload {
  teamId: string;
  proposal: ProposalWire;
}

export interface ProposalSubmittedPayload {
  teamId: string;
  proposal: ProposalWire;
  request: SupervisorRequestWire;
}

export interface SupervisorRequestWire {
  id: string;
  proposalId: string;
  supervisorId: string;
  status: string;
  rejectionReason?: string | null;
  expiresAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface SupervisorInvitationWire {
  id: string;
  proposalId?: string | null;
  teamId?: string | null;
  supervisorId: string;
  status: string;
  createdAt: string;
}

export interface ProposalInterestPayload {
  teamId: string;
  invitation: SupervisorInvitationWire;
}

export interface ProposalInterestDismissedPayload {
  teamId: string;
  invitationId: string;
  supervisorId: string;
}

export interface JoinRequestWire {
  id: string;
  teamId: string;
  authUserId: string;
  status: string;
  createdAt: string;
}

export interface TeamMemberWire {
  id: string;
  teamId: string;
  authUserId: string;
  teamRole?: string | null;
  joinedAt: string;
}

export interface TeamJoinRequestReceivedPayload {
  teamId: string;
  joinRequest: JoinRequestWire;
  /** Requester profile for immediate leader UI (same workspace). */
  requesterProfile?: Record<string, unknown> | null;
}

export interface TeamJoinRequestResolvedPayload {
  teamId: string;
  joinRequest: JoinRequestWire;
}

export interface TeamMemberJoinedPayload {
  teamId: string;
  member: TeamMemberWire;
}

export interface TeamMemberLeftPayload {
  teamId: string;
  memberId: string;
  authUserId: string;
}

export interface TeamRoleUpdatedPayload {
  teamId: string;
  member: TeamMemberWire;
}

export interface TeamUpdatedPayload {
  workspaceId: string;
  teamId: string;
  team: {
    id: string;
    name: string;
    domain: string;
    projectTitle: string | null;
    projectAbstract: string | null;
    proposalPdfUrl: string | null;
    maxMembers: number;
    isOpen: boolean;
  };
}

export interface TeamDeletedPayload {
  workspaceId: string;
  teamId: string;
  name: string;
}

export interface LegacyEvaluationAssignedPayload {
  workspaceId: string;
  evaluationId: string;
  teamId: string;
  title: string;
  date: string;
  venue: string;
}

export interface LegacyResultPayload {
  workspaceId: string;
  evaluationId: string;
  teamId: string;
  resultId: string;
  marks: number;
}

export interface SubmissionEvaluationRealtimePayload {
  workspaceId: string;
  evaluationId: string;
  submissionId: string;
  deliverableId: string;
  teamId: string;
  evaluatorId: string;
  status: string;
  deliverableTitle?: string;
  phaseId?: string | null;
}

export interface GpaRecalculatedPayload {
  workspaceId: string;
  phaseId: string;
  teamId: string;
}

export interface PhaseRealtimePayload {
  workspaceId: string;
  phaseId: string;
  name: string;
  status?: string;
  isConfigurationPublished?: boolean;
}

export interface DeliverableTemplateRealtimePayload {
  workspaceId: string;
  template: {
    id: string;
    title: string;
    phaseId: string;
    phaseName: string;
  };
}

export interface UserRoleUpdatedPayload {
  workspaceId: string;
  userId: string;
  role: string;
  fullName?: string;
  email?: string;
}

export interface UserStatusUpdatedPayload {
  workspaceId: string;
  userId: string;
  isActive: boolean;
  role?: string;
  fullName?: string;
  email?: string;
}
