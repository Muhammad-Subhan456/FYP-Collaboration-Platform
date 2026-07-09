import type { QueryClient } from "@tanstack/react-query";

import { invalidateDashboard, queryKeys } from "@/lib/react-query";
import type {
  CoordinatorDashboardOverview,
  StudentDashboardOverview,
  SupervisorDashboardOverview,
} from "@/services/dashboard.service";
import type { TeamIssueSummaries } from "@/types/team-issue";
import type {
  Announcement,
  Deliverable,
  Notification,
  Proposal,
  TeamMember,
} from "@/types/student";

type DashboardRole = "STUDENT" | "SUPERVISOR" | "COORDINATOR";

const isDev = process.env.NODE_ENV === "development";

function log(...args: unknown[]) {
  if (isDev) {
    console.info("[realtime:dashboard]", ...args);
  }
}

function patchStudentDashboard(
  queryClient: QueryClient,
  userId: string,
  workspaceId: string | null | undefined,
  updater: (data: StudentDashboardOverview) => StudentDashboardOverview,
): boolean {
  const queryKey = queryKeys.student.dashboard(userId, workspaceId);
  const existing = queryClient.getQueryData<StudentDashboardOverview>(queryKey);
  if (!existing) {
    return false;
  }

  queryClient.setQueryData<StudentDashboardOverview>(queryKey, (current) => {
    if (!current) {
      return current;
    }
    return updater(current);
  });
  return true;
}

function patchSupervisorDashboard(
  queryClient: QueryClient,
  userId: string,
  workspaceId: string | null | undefined,
  updater: (data: SupervisorDashboardOverview) => SupervisorDashboardOverview,
): boolean {
  const queryKey = queryKeys.supervisor.dashboard(userId, workspaceId);
  const existing =
    queryClient.getQueryData<SupervisorDashboardOverview>(queryKey);
  if (!existing) {
    return false;
  }

  queryClient.setQueryData<SupervisorDashboardOverview>(queryKey, (current) => {
    if (!current) {
      return current;
    }
    return updater(current);
  });
  return true;
}

function patchCoordinatorDashboard(
  queryClient: QueryClient,
  userId: string,
  workspaceId: string | null | undefined,
  updater: (
    data: CoordinatorDashboardOverview,
  ) => CoordinatorDashboardOverview,
): boolean {
  const queryKey = queryKeys.coordinator.dashboard(userId, workspaceId);
  const existing =
    queryClient.getQueryData<CoordinatorDashboardOverview>(queryKey);
  if (!existing) {
    return false;
  }

  queryClient.setQueryData<CoordinatorDashboardOverview>(queryKey, (current) => {
    if (!current) {
      return current;
    }
    return updater(current);
  });
  return true;
}

export function touchStudentDashboard(
  queryClient: QueryClient,
  userId: string,
  updater?: (data: StudentDashboardOverview) => StudentDashboardOverview,
  workspaceId?: string | null,
) {
  if (updater && patchStudentDashboard(queryClient, userId, workspaceId, updater)) {
    return;
  }
  log("student dashboard fallback invalidate", userId);
  void invalidateDashboard(queryClient, "STUDENT");
}

export function touchSupervisorDashboard(
  queryClient: QueryClient,
  userId: string,
  updater?: (data: SupervisorDashboardOverview) => SupervisorDashboardOverview,
  workspaceId?: string | null,
) {
  if (updater && patchSupervisorDashboard(queryClient, userId, workspaceId, updater)) {
    return;
  }
  log("supervisor dashboard fallback invalidate", userId);
  void invalidateDashboard(queryClient, "SUPERVISOR");
}

export function touchCoordinatorDashboard(
  queryClient: QueryClient,
  userId: string,
  updater?: (
    data: CoordinatorDashboardOverview,
  ) => CoordinatorDashboardOverview,
  workspaceId?: string | null,
) {
  if (updater && patchCoordinatorDashboard(queryClient, userId, workspaceId, updater)) {
    return;
  }
  log("coordinator dashboard fallback invalidate", userId);
  void invalidateDashboard(queryClient, "COORDINATOR");
}

export function syncStudentIssueStats(
  queryClient: QueryClient,
  userId: string,
  summaries: TeamIssueSummaries,
) {
  touchStudentDashboard(queryClient, userId, (dashboard) => ({
    ...dashboard,
    stats: {
      ...dashboard.stats,
      openIssues: summaries.open,
      assignedIssues: summaries.assignedToMe ?? 0,
      recentlyCompletedIssues: summaries.recentlyCompleted,
    },
  }));
}

export function syncSupervisorIssueStats(
  queryClient: QueryClient,
  userId: string,
  summaries: TeamIssueSummaries,
) {
  touchSupervisorDashboard(queryClient, userId, (dashboard) => ({
    ...dashboard,
    stats: {
      ...dashboard.stats,
      openIssues: summaries.open,
      inProgressIssues: summaries.inProgress ?? 0,
      recentlyCompletedIssues: summaries.recentlyCompleted,
    },
  }));
}

export function syncStudentProposalDashboard(
  queryClient: QueryClient,
  userId: string,
  proposal: Proposal,
) {
  touchStudentDashboard(queryClient, userId, (dashboard) => ({
    ...dashboard,
    proposal,
  }));
}

export function syncSupervisorProposalSubmitted(
  queryClient: QueryClient,
  userId: string,
  proposal: Proposal,
) {
  touchSupervisorDashboard(queryClient, userId, (dashboard) => {
    const exists = dashboard.pendingRequests.some(
      (item) => item.id === proposal.id,
    );
    return {
      ...dashboard,
      pendingRequests: exists
        ? dashboard.pendingRequests
        : [
            { id: proposal.id, proposal: { title: proposal.title } },
            ...dashboard.pendingRequests,
          ],
    };
  });
}

export function syncSupervisorProposalResolved(
  queryClient: QueryClient,
  userId: string,
  proposal: Proposal,
) {
  const accepted =
    proposal.status === "APPROVED" ||
    proposal.status === "SUPERVISOR_ASSIGNED";

  touchSupervisorDashboard(queryClient, userId, (dashboard) => {
    const pendingRequests = dashboard.pendingRequests.filter(
      (item) => item.id !== proposal.id,
    );
    const supervisedTeams = accepted
      ? [
          ...dashboard.supervisedTeams.filter((item) => item.id !== proposal.id),
          {
            id: proposal.id,
            title: proposal.title,
            domain: proposal.domain,
          },
        ]
      : dashboard.supervisedTeams;

    const supervisedCount = supervisedTeams.length;

    return {
      ...dashboard,
      pendingRequests,
      supervisedTeams,
      stats: {
        ...dashboard.stats,
        supervisedTeams: supervisedCount,
      },
    };
  });
}

export function syncCoordinatorProposalAccepted(
  queryClient: QueryClient,
  userId: string,
) {
  touchCoordinatorDashboard(queryClient, userId, (dashboard) => {
    const pending =
      dashboard.proposals.pendingProposals ?? dashboard.proposals.pending;
    const assigned = dashboard.proposals.assignedProposals ?? 0;

    return {
      ...dashboard,
      proposals: {
        ...dashboard.proposals,
        approved: dashboard.proposals.approved + 1,
        pending: Math.max(0, dashboard.proposals.pending - 1),
        pendingProposals: Math.max(0, pending - 1),
        assignedProposals: assigned + 1,
      },
    };
  });
}

export function syncStudentTeamMembers(
  queryClient: QueryClient,
  userId: string,
  members: TeamMember[],
  workspaceId?: string | null,
) {
  touchStudentDashboard(queryClient, userId, (dashboard) => ({
    ...dashboard,
    teamMembers: members,
  }), workspaceId);
}

function upsertDeliverable(
  items: Deliverable[],
  incoming: Deliverable,
): Deliverable[] {
  const index = items.findIndex((item) => item.id === incoming.id);
  if (index === -1) {
    return [incoming, ...items];
  }
  const next = [...items];
  next[index] = { ...next[index], ...incoming };
  return next;
}

function countUpcomingDeliverables(deliverables: Deliverable[]) {
  const now = Date.now();
  return deliverables.filter(
    (item) => item.isActive && new Date(item.dueDate).getTime() >= now,
  ).length;
}

export function syncStudentDashboardDeliverable(
  queryClient: QueryClient,
  userId: string,
  deliverable: Deliverable,
) {
  touchStudentDashboard(queryClient, userId, (dashboard) => {
    const deliverables = upsertDeliverable(dashboard.deliverables, deliverable);
    return {
      ...dashboard,
      deliverables,
      stats: {
        ...dashboard.stats,
        upcomingDeliverables: countUpcomingDeliverables(deliverables),
      },
    };
  });
}

function upsertAnnouncement(
  items: Announcement[],
  incoming: Announcement,
): Announcement[] {
  const index = items.findIndex((item) => item.id === incoming.id);
  if (index === -1) {
    return [incoming, ...items];
  }
  const next = [...items];
  next[index] = { ...next[index], ...incoming };
  return next;
}

export function syncStudentDashboardAnnouncement(
  queryClient: QueryClient,
  userId: string,
  announcement: Announcement,
) {
  touchStudentDashboard(queryClient, userId, (dashboard) => ({
    ...dashboard,
    announcements: upsertAnnouncement(dashboard.announcements, announcement),
  }));
}

export function syncSupervisorDashboardPendingReviews(
  queryClient: QueryClient,
  userId: string,
  delta: number,
) {
  touchSupervisorDashboard(queryClient, userId, (dashboard) => ({
    ...dashboard,
    stats: {
      ...dashboard.stats,
      pendingReviews: Math.max(0, dashboard.stats.pendingReviews + delta),
    },
  }));
}

export function syncStudentDashboardPendingSubmissions(
  queryClient: QueryClient,
  userId: string,
  delta: number,
) {
  touchStudentDashboard(queryClient, userId, (dashboard) => ({
    ...dashboard,
    stats: {
      ...dashboard.stats,
      pendingSubmissions: Math.max(0, dashboard.stats.pendingSubmissions + delta),
    },
  }));
}

export function prependDashboardNotification(
  queryClient: QueryClient,
  role: DashboardRole,
  userId: string,
  notification: Notification,
  workspaceId?: string | null,
) {
  const prependNotifications = <
    T extends StudentDashboardOverview | SupervisorDashboardOverview | CoordinatorDashboardOverview,
  >(
    dashboard: T,
  ): T => {
    const feed = dashboard.recentActivity.notifications;
    const withoutDuplicate = feed.data.filter(
      (item) => item.id !== notification.id,
    );
    const isNew = withoutDuplicate.length === feed.data.length;

    return {
      ...dashboard,
      recentActivity: {
        ...dashboard.recentActivity,
        notifications: {
          ...feed,
          data: [notification, ...withoutDuplicate],
          meta: {
            ...feed.meta,
            total: isNew ? feed.meta.total + 1 : feed.meta.total,
          },
        },
      },
    };
  };

  if (role === "STUDENT") {
    patchStudentDashboard(queryClient, userId, workspaceId, prependNotifications);
    return;
  }
  if (role === "SUPERVISOR") {
    patchSupervisorDashboard(queryClient, userId, workspaceId, prependNotifications);
    return;
  }
  if (role === "COORDINATOR") {
    patchCoordinatorDashboard(queryClient, userId, workspaceId, prependNotifications);
  }
}
