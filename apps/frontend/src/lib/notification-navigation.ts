import type { LucideIcon } from "lucide-react";
import {
  Award,
  Bell,
  Calendar,
  CheckCircle,
  FileText,
  Megaphone,
  MessageSquare,
  UserCheck,
  Users,
  Video,
  XCircle,
} from "lucide-react";

import type { UserRole } from "@/types";
import type { Notification } from "@/types/student";

const ENTITY_QUERY_PARAMS: Record<string, string> = {
  PROPOSAL: "proposalId",
  SUBMISSION: "submissionId",
  SUBMISSION_EVALUATION: "evaluationId",
  EVALUATION: "evaluationId",
  EVALUATION_RESULT: "resultId",
  DELIVERABLE: "deliverableId",
  TEAM_ISSUE: "issueId",
  MILESTONE: "issueId",
  ANNOUNCEMENT: "announcementId",
  GLOBAL_ANNOUNCEMENT: "announcementId",
  TASK: "taskId",
  TEAM: "teamId",
};

const TYPE_FALLBACK_ROUTES: Record<string, string> = {
  // Live proposal / team types
  PROPOSAL_CREATED: "/student/proposal",
  PROPOSAL_RECEIVED: "/supervisor/requests",
  PROPOSAL_ACCEPTED: "/student/proposal",
  PROPOSAL_ACCEPTED_COORDINATOR: "/coordinator/proposals",
  PROPOSAL_IGNORED: "/supervisor/requests",
  PROPOSAL_REJECTED: "/student/proposal",
  PROPOSAL_RESUBMITTED: "/student/proposal",
  SUPERVISOR_INTEREST_RECEIVED: "/student/proposal",
  SUPERVISOR_REQUEST_REJECTED: "/student/proposal",
  PROFILE_COMPLETED: "/student/dashboard",
  JOIN_REQUEST_RECEIVED: "/student/team",
  JOIN_REQUEST_APPROVED: "/student/team",
  JOIN_REQUEST_REJECTED: "/student/team",
  TEAM_ROLE_ASSIGNED: "/student/team",
  TEAM_ROLE_UPDATED: "/student/team",
  TEAM_ROLE_REMOVED: "/student/team",
  TEAM_MEMBER_LEFT: "/student/team",
  TEAM_MEMBER_REMOVED: "/student/team",
  TEAM_DELETED: "/student/team",
  // Work stream
  DELIVERABLE_CREATED: "/student/work-stream",
  DELIVERABLE_DEADLINE_EXTENDED: "/student/work-stream",
  DELIVERABLE_TEMPLATE_CREATED: "/supervisor/work-stream?tab=templates",
  NEW_SUBMISSION: "/supervisor/work-stream",
  SUBMISSION_REVIEWED: "/student/work-stream",
  SUBMISSION_FINALIZED: "/coordinator/submissions",
  SUBMISSION_REMINDER: "/supervisor/work-stream?tab=deliverables",
  // Evaluations / results
  EVALUATOR_ASSIGNMENT: "/evaluator/evaluations",
  EVALUATION_SUBMITTED: "/coordinator/results",
  EVALUATION_ASSIGNED: "/student/evaluations",
  EVALUATION_PANEL_ASSIGNED: "/evaluator/evaluations",
  RESULT_PUBLISHED: "/student/results",
  RESULT_UPDATED: "/student/results",
  // Announcements / issues
  MEETING_CREATED: "/student/work-stream?tab=announcements",
  ANNOUNCEMENT_PUBLISHED: "/student/work-stream",
  MILESTONE_CREATED: "/student/milestones",
  MILESTONE_UPDATED: "/student/milestones",
  TEAM_ISSUE_CREATED: "/student/milestones",
  TEAM_ISSUE_CLAIMED: "/student/milestones",
  TEAM_ISSUE_RELEASED: "/student/milestones",
  TEAM_ISSUE_COMPLETED: "/student/milestones",
  TEAM_ISSUE_COMMENTED: "/student/milestones",
  WORKSTREAM_COMMENTED: "/student/work-stream",
  GLOBAL_ANNOUNCEMENT: "/student/work-stream?tab=announcements",
  ROLE_UPDATED: "/student/dashboard",
  ACCOUNT_STATUS_UPDATED: "/student/dashboard",
  DEADLINE_REMINDER: "/student/work-stream",
  // Legacy aliases still seen in older rows
  SUPERVISOR_REQUEST_ACCEPTED: "/student/proposal",
  SUPERVISOR_INVITATION_RECEIVED: "/student/proposal",
  PROPOSAL_APPROVED: "/student/proposal",
  PROPOSAL_SUBMITTED: "/student/proposal",
  SUPERVISOR_REQUEST_RECEIVED: "/supervisor/requests",
  INVITATION_ACCEPTED: "/supervisor/teams",
  INVITATION_REJECTED: "/supervisor/invitations",
};

const TYPE_ICONS: Record<string, LucideIcon> = {
  PROPOSAL_CREATED: FileText,
  PROPOSAL_RECEIVED: UserCheck,
  PROPOSAL_ACCEPTED: CheckCircle,
  PROPOSAL_ACCEPTED_COORDINATOR: CheckCircle,
  PROPOSAL_IGNORED: XCircle,
  PROPOSAL_REJECTED: XCircle,
  PROPOSAL_RESUBMITTED: FileText,
  SUPERVISOR_INTEREST_RECEIVED: UserCheck,
  SUPERVISOR_REQUEST_REJECTED: XCircle,
  PROFILE_COMPLETED: CheckCircle,
  JOIN_REQUEST_RECEIVED: Users,
  JOIN_REQUEST_APPROVED: Users,
  JOIN_REQUEST_REJECTED: Users,
  TEAM_ROLE_ASSIGNED: Users,
  TEAM_ROLE_UPDATED: Users,
  TEAM_ROLE_REMOVED: Users,
  TEAM_MEMBER_LEFT: Users,
  TEAM_MEMBER_REMOVED: Users,
  TEAM_DELETED: Users,
  DELIVERABLE_CREATED: FileText,
  DELIVERABLE_DEADLINE_EXTENDED: Calendar,
  DELIVERABLE_TEMPLATE_CREATED: FileText,
  NEW_SUBMISSION: FileText,
  SUBMISSION_REVIEWED: FileText,
  SUBMISSION_FINALIZED: FileText,
  SUBMISSION_REMINDER: Calendar,
  EVALUATOR_ASSIGNMENT: Calendar,
  EVALUATION_SUBMITTED: Award,
  EVALUATION_ASSIGNED: Calendar,
  EVALUATION_PANEL_ASSIGNED: Calendar,
  RESULT_PUBLISHED: Award,
  RESULT_UPDATED: Award,
  MEETING_CREATED: Video,
  ANNOUNCEMENT_PUBLISHED: Megaphone,
  MILESTONE_CREATED: Calendar,
  MILESTONE_UPDATED: Calendar,
  TEAM_ISSUE_CREATED: Calendar,
  TEAM_ISSUE_CLAIMED: Calendar,
  TEAM_ISSUE_RELEASED: Calendar,
  TEAM_ISSUE_COMPLETED: Calendar,
  TEAM_ISSUE_COMMENTED: Calendar,
  WORKSTREAM_COMMENTED: MessageSquare,
  GLOBAL_ANNOUNCEMENT: Megaphone,
  ROLE_UPDATED: Bell,
  ACCOUNT_STATUS_UPDATED: Bell,
  DEADLINE_REMINDER: Calendar,
  SUPERVISOR_REQUEST_ACCEPTED: UserCheck,
  SUPERVISOR_INVITATION_RECEIVED: UserCheck,
  PROPOSAL_APPROVED: CheckCircle,
  PROPOSAL_SUBMITTED: FileText,
  SUPERVISOR_REQUEST_RECEIVED: UserCheck,
  INVITATION_ACCEPTED: CheckCircle,
  INVITATION_REJECTED: XCircle,
};

function roleHome(role?: UserRole | null): string {
  switch (role) {
    case "SUPERVISOR":
      return "/supervisor/dashboard";
    case "COORDINATOR":
      return "/coordinator/dashboard";
    case "EVALUATOR":
      return "/evaluator/dashboard";
    case "SUPER_ADMIN":
      return "/super-admin/workspaces";
    default:
      return "/student/dashboard";
  }
}

function roleAwareFallback(
  type: string,
  role?: UserRole | null,
): string | undefined {
  if (type === "GLOBAL_ANNOUNCEMENT") {
    switch (role) {
      case "SUPERVISOR":
        return "/supervisor/work-stream?tab=announcements";
      case "COORDINATOR":
        return "/coordinator/announcements";
      case "EVALUATOR":
        return "/evaluator/dashboard";
      default:
        return "/student/work-stream?tab=announcements";
    }
  }

  if (type === "ROLE_UPDATED" || type === "ACCOUNT_STATUS_UPDATED") {
    return roleHome(role);
  }

  if (type === "EVALUATION_ASSIGNED" || type === "EVALUATOR_ASSIGNMENT") {
    if (role === "EVALUATOR") return "/evaluator/evaluations";
    // Supervisors evaluate only in Evaluator context — switch role via header.
    if (role === "SUPERVISOR") return "/supervisor/dashboard";
    return "/student/evaluations";
  }

  if (type === "EVALUATION_SUBMITTED") {
    if (role === "SUPERVISOR") return "/supervisor/results";
    if (role === "COORDINATOR") return "/coordinator/results";
    if (role === "EVALUATOR") return "/evaluator/evaluations";
    return "/student/results";
  }

  if (type === "EVALUATION_PANEL_ASSIGNED") {
    if (role === "EVALUATOR") return "/evaluator/evaluations";
    if (role === "SUPERVISOR") return "/supervisor/dashboard";
    return "/evaluator/evaluations";
  }

  if (type === "RESULT_PUBLISHED" || type === "RESULT_UPDATED") {
    if (role === "SUPERVISOR") return "/supervisor/results";
    if (role === "COORDINATOR") return "/coordinator/results";
    if (role === "EVALUATOR") return "/evaluator/evaluations";
    return "/student/results";
  }

  return TYPE_FALLBACK_ROUTES[type];
}

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

function isForeignRoleRoute(route: string, role: UserRole): boolean {
  const prefixes = [
    "/student/",
    "/supervisor/",
    "/coordinator/",
    "/evaluator/",
    "/super-admin/",
  ] as const;

  const ownPrefix =
    role === "SUPER_ADMIN"
      ? "/super-admin/"
      : (`/${role.toLowerCase()}/` as const);

  return prefixes.some(
    (prefix) => prefix !== ownPrefix && route.startsWith(prefix),
  );
}

export function resolveNotificationHref(
  notification: Notification,
  role?: UserRole | null,
): string | null {
  let route =
    notification.route ??
    (notification.type
      ? roleAwareFallback(notification.type, role)
      : undefined);

  if (!route) {
    return null;
  }

  // Prefer role-aware fallbacks when the stored route would bounce the user.
  if (role && isForeignRoleRoute(route, role)) {
    route =
      roleAwareFallback(notification.type ?? "", role) ?? roleHome(role);
  }

  if (
    role === "SUPERVISOR" &&
    (notification.type === "EVALUATION_SUBMITTED" ||
      notification.type === "EVALUATION_ASSIGNED" ||
      notification.type === "EVALUATOR_ASSIGNMENT" ||
      notification.type === "EVALUATION_PANEL_ASSIGNED") &&
    (route.startsWith("/coordinator/") ||
      route.startsWith("/student/") ||
      route.startsWith("/evaluator/") ||
      route.startsWith("/supervisor/evaluations"))
  ) {
    route =
      notification.type === "EVALUATION_SUBMITTED"
        ? "/supervisor/results"
        : "/supervisor/dashboard";
  }

  if (route === "/supervisor/evaluations") {
    route = "/supervisor/dashboard";
  }

  if (route === "/supervisor/submissions") {
    route = "/supervisor/work-stream";
  }

  if (
    route === "/student/announcements" ||
    route === "/supervisor/announcements"
  ) {
    route =
      route === "/supervisor/announcements"
        ? "/supervisor/work-stream?tab=announcements"
        : "/student/work-stream?tab=announcements";
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
  role?: UserRole | null,
): boolean {
  return resolveNotificationHref(notification, role) !== null;
}
