import type { LucideIcon } from "lucide-react";
import {
  Award,
  Bell,
  Calendar,
  CheckCircle,
  FileText,
  Megaphone,
  UserCheck,
  Users,
  Video,
  XCircle,
} from "lucide-react";

import type { Notification } from "@/types/student";

const ENTITY_QUERY_PARAMS: Record<string, string> = {
  PROPOSAL: "proposalId",
  SUBMISSION: "submissionId",
  EVALUATION: "evaluationId",
  EVALUATION_RESULT: "resultId",
  MEETING: "meetingId",
  DELIVERABLE: "deliverableId",
  MILESTONE: "milestoneId",
  ANNOUNCEMENT: "announcementId",
  TASK: "taskId",
  TEAM: "teamId",
};

const TYPE_FALLBACK_ROUTES: Record<string, string> = {
  SUPERVISOR_REQUEST_ACCEPTED: "/student/proposal",
  SUPERVISOR_REQUEST_REJECTED: "/student/proposal",
  SUPERVISOR_INVITATION_RECEIVED: "/student/proposal",
  PROPOSAL_APPROVED: "/student/proposal",
  PROPOSAL_REJECTED: "/student/proposal",
  INVITATION_ACCEPTED: "/supervisor/proposals",
  INVITATION_REJECTED: "/supervisor/proposals",
  JOIN_REQUEST_RECEIVED: "/student/team",
  JOIN_REQUEST_APPROVED: "/student/team",
  JOIN_REQUEST_REJECTED: "/student/team",
  TEAM_ROLE_ASSIGNED: "/student/team",
  TEAM_ROLE_UPDATED: "/student/team",
  TEAM_ROLE_REMOVED: "/student/team",
  DELIVERABLE_CREATED: "/student/submissions",
  DELIVERABLE_DEADLINE_EXTENDED: "/student/submissions",
  NEW_SUBMISSION: "/supervisor/submissions",
  SUBMISSION_REVIEWED: "/student/submissions",
  EVALUATION_ASSIGNED: "/student/evaluations",
  EVALUATION_PANEL_ASSIGNED: "/supervisor/evaluations",
  RESULT_PUBLISHED: "/student/results",
  RESULT_UPDATED: "/student/results",
  MEETING_CREATED: "/student/meetings",
  ANNOUNCEMENT_PUBLISHED: "/student/announcements",
  MILESTONE_CREATED: "/student/milestones",
  MILESTONE_UPDATED: "/student/milestones",
  GLOBAL_ANNOUNCEMENT: "/student/announcements",
  ROLE_UPDATED: "/student/dashboard",
  ACCOUNT_STATUS_UPDATED: "/student/dashboard",
  DEADLINE_REMINDER: "/student/submissions",
};

const TYPE_ICONS: Record<string, LucideIcon> = {
  SUPERVISOR_REQUEST_ACCEPTED: UserCheck,
  SUPERVISOR_REQUEST_REJECTED: XCircle,
  SUPERVISOR_INVITATION_RECEIVED: UserCheck,
  PROPOSAL_APPROVED: CheckCircle,
  PROPOSAL_REJECTED: XCircle,
  INVITATION_ACCEPTED: CheckCircle,
  INVITATION_REJECTED: XCircle,
  JOIN_REQUEST_RECEIVED: Users,
  JOIN_REQUEST_APPROVED: Users,
  JOIN_REQUEST_REJECTED: Users,
  TEAM_ROLE_ASSIGNED: Users,
  TEAM_ROLE_UPDATED: Users,
  TEAM_ROLE_REMOVED: Users,
  DELIVERABLE_CREATED: FileText,
  DELIVERABLE_DEADLINE_EXTENDED: Calendar,
  NEW_SUBMISSION: FileText,
  SUBMISSION_REVIEWED: FileText,
  EVALUATION_ASSIGNED: Calendar,
  EVALUATION_PANEL_ASSIGNED: Calendar,
  RESULT_PUBLISHED: Award,
  RESULT_UPDATED: Award,
  MEETING_CREATED: Video,
  ANNOUNCEMENT_PUBLISHED: Megaphone,
  MILESTONE_CREATED: Calendar,
  MILESTONE_UPDATED: Calendar,
  GLOBAL_ANNOUNCEMENT: Megaphone,
  ROLE_UPDATED: Bell,
  ACCOUNT_STATUS_UPDATED: Bell,
  DEADLINE_REMINDER: Calendar,
};

function appendEntityQuery(
  base: string,
  entityType?: string | null,
  entityId?: string | null,
): string {
  if (!entityId || !entityType) {
    return base;
  }

  const param = ENTITY_QUERY_PARAMS[entityType];
  if (!param) {
    return base;
  }

  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${param}=${encodeURIComponent(entityId)}`;
}

export function resolveNotificationHref(
  notification: Notification,
): string | null {
  const route =
    notification.route ??
    (notification.type
      ? TYPE_FALLBACK_ROUTES[notification.type]
      : undefined);

  if (!route) {
    return null;
  }

  return appendEntityQuery(
    route,
    notification.entityType,
    notification.entityId,
  );
}

export function getNotificationIcon(
  notification: Notification,
): LucideIcon {
  if (notification.type && TYPE_ICONS[notification.type]) {
    return TYPE_ICONS[notification.type];
  }
  return Bell;
}

export function isNotificationActionable(
  notification: Notification,
): boolean {
  return resolveNotificationHref(notification) !== null;
}
