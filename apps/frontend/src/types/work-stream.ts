import type { UserProfile } from "@/types/profile";
import type { Submission, Team } from "@/types/student";

export type WorkStreamEntityType = "ANNOUNCEMENT" | "DELIVERABLE";

export interface WorkStreamAttachment {
  id: string;
  fileUrl: string;
  fileName: string;
  createdAt: string;
}

export interface WorkStreamComment {
  id: string;
  authUserId: string;
  body: string;
  createdAt: string;
  teamId?: string;
  entityType?: WorkStreamEntityType;
  entityId?: string;
  authorName?: string;
}

export interface WorkStreamAnnouncementItem {
  id: string;
  supervisorId: string;
  teamId?: string | null;
  title: string;
  message: string;
  type: string;
  dueDate?: string | null;
  createdAt: string;
  preview: string;
  createdByName: string;
  teamName?: string | null;
  attachmentCount: number;
  commentCount: number;
  attachments: WorkStreamAttachment[];
}

export interface WorkStreamDeliverableItem {
  id: string;
  supervisorId: string;
  teamId?: string | null;
  phaseId?: string | null;
  phase?: { id: string; name: string } | null;
  title: string;
  description: string;
  type: string;
  dueDate: string;
  attachmentUrl?: string | null;
  isActive: boolean;
  submissionsOpen: boolean;
  createdAt: string;
  preview: string;
  teamName?: string | null;
  attachmentCount: number;
  commentCount: number;
  attachments: WorkStreamAttachment[];
  latestSubmissionStatus: string | null;
  submissionCount: number;
  submissionOpen: boolean;
  submissionClosedReason: string | null;
}

export interface StudentWorkStreamPageData {
  team: Team | null;
  supervisorProfile: UserProfile | null;
  announcements: WorkStreamAnnouncementItem[];
  deliverables: WorkStreamDeliverableItem[];
  submissionHistories: Record<string, Submission[]>;
  profiles: Record<string, UserProfile>;
  commentsByEntity: Record<string, WorkStreamComment[]>;
}

export interface SupervisorWorkStreamTeam {
  id: string;
  name: string;
  projectTitle?: string | null;
}

export interface SupervisorWorkStreamPageData {
  teams: SupervisorWorkStreamTeam[];
  teamNameById: Record<string, string>;
  announcements: WorkStreamAnnouncementItem[];
  deliverables: WorkStreamDeliverableItem[];
  submissionsByDeliverable: Record<string, Submission[]>;
  profiles: Record<string, UserProfile>;
  commentsByEntity: Record<string, WorkStreamComment[]>;
}

export function workStreamEntityKey(
  entityType: WorkStreamEntityType,
  entityId: string,
) {
  return `${entityType}:${entityId}`;
}
