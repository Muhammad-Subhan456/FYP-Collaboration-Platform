export type ProposalStatus =
  | "DRAFT"
  | "PENDING_SUPERVISOR"
  | "SUPERVISOR_ASSIGNED"
  | "APPROVED"
  | "REJECTED"
  | "IGNORED";

export type SubmissionStatus =
  | "SUBMITTED"
  | "CHANGES_REQUIRED"
  | "APPROVED";

export type DeliverableType =
  | "SRS"
  | "DESIGN"
  | "MID_VIVA"
  | "FINAL_REPORT"
  | "PRESENTATION"
  | "OTHER";

export type JoinRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Team {
  id: string;
  name: string;
  domain: string;
  projectTitle?: string | null;
  projectAbstract?: string | null;
  proposalPdfUrl?: string | null;
  maxMembers: number;
  leaderId: string;
  isOpen: boolean;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  authUserId: string;
  teamRole?: string | null;
  joinedAt: string;
}

export interface JoinRequest {
  id: string;
  teamId: string;
  authUserId: string;
  status: JoinRequestStatus;
  createdAt: string;
}

export interface Proposal {
  id: string;
  teamId: string;
  teamLeaderAuthUserId?: string | null;
  title: string;
  domain: string;
  abstract: string;
  proposalPdfUrl?: string | null;
  status: ProposalStatus;
  assignedSupervisorId?: string | null;
  pendingSupervisorId?: string | null;
  pendingExpiresAt?: string | null;
  reviewFeedback?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  createdAt: string;
}

export interface Supervisor {
  id: string;
  fullName: string;
  email: string;
  profilePicture?: string | null;
  department?: string | null;
  designation?: string | null;
  researchAreas?: string[];
  biography?: string | null;
  officeHours?: string | null;
  supervisedTeamCount?: number;
  isAvailable?: boolean;
}

export interface Deliverable {
  id: string;
  supervisorId: string;
  teamId?: string | null;
  title: string;
  description: string;
  type: DeliverableType;
  dueDate: string;
  attachmentUrl?: string | null;
  isActive: boolean;
  submissionsOpen?: boolean;
  createdAt: string;
}

export interface Submission {
  id: string;
  deliverableId: string;
  teamId: string;
  version: number;
  fileUrl: string;
  remarks?: string | null;
  status: SubmissionStatus;
  submittedAt: string;
  deliverable?: Deliverable;
}

export interface EvaluationAssignment {
  id: string;
  evaluationId: string;
  teamId: string;
  panelId?: string | null;
  evaluation: {
    id: string;
    title: string;
    type: string;
    date: string;
    venue?: string | null;
  };
}

export interface EvaluationResult {
  id: string;
  evaluationId: string;
  teamId: string;
  marks: number;
  comments?: string | null;
  evaluation: {
    id: string;
    title: string;
    type: string;
    date: string;
    venue?: string | null;
  };
}

export interface Notification {
  id: string;
  authUserId: string;
  title: string;
  message: string;
  type?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  route?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Announcement {
  id: string;
  supervisorId: string;
  teamId?: string | null;
  title: string;
  message: string;
  type: string;
  dueDate?: string | null;
  createdAt: string;
}

export interface Meeting {
  id: string;
  supervisorId: string;
  title: string;
  description?: string | null;
  type: string;
  meetingDate: string;
  location?: string | null;
  meetingLink?: string | null;
  createdAt: string;
}

export type MilestoneStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export interface Milestone {
  id: string;
  proposalId: string;
  title: string;
  description?: string | null;
  dueDate: string;
  status: MilestoneStatus;
  createdAt: string;
}

export interface Task {
  id: string;
  milestoneId: string;
  title: string;
  description?: string | null;
  assignedTo: string;
  dueDate?: string | null;
  status: TaskStatus;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  authUserId: string;
  title: string;
  description?: string | null;
  createdAt: string;
}

export interface UploadResponse {
  fileUrl: string;
  originalName: string;
  mimeType: string;
  size: number;
}
