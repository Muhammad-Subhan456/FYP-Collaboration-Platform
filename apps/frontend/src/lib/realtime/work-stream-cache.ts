import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query";
import type { Submission } from "@/types/student";
import type { DeliverableType } from "@/types/student";
import type {
  StudentWorkStreamPageData,
  SupervisorWorkStreamPageData,
  WorkStreamAnnouncementItem,
  WorkStreamComment,
  WorkStreamDeliverableItem,
  WorkStreamEntityType,
} from "@/types/work-stream";

import {
  syncStudentDashboardAnnouncement,
  syncStudentDashboardDeliverable,
  syncStudentDashboardPendingSubmissions,
  syncSupervisorDashboardPendingReviews,
  touchStudentDashboard,
  touchSupervisorDashboard,
} from "./dashboard-cache";

import type {
  RealtimeAnnouncementWire,
  RealtimeDeliverableWire,
  RealtimeSubmissionWire,
} from "./types";

function previewText(text: string, max = 160) {
  const plain = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trim()}…`;
}

function toAnnouncementItem(
  wire: RealtimeAnnouncementWire,
  existing?: WorkStreamAnnouncementItem,
): WorkStreamAnnouncementItem {
  return {
    id: wire.id,
    supervisorId: wire.supervisorId,
    teamId: wire.teamId ?? null,
    title: wire.title,
    message: wire.message,
    type: wire.type,
    dueDate: wire.dueDate ?? null,
    createdAt: wire.createdAt,
    preview: wire.preview ?? previewText(wire.message),
    createdByName: wire.createdByName ?? existing?.createdByName ?? "Supervisor",
    teamName: wire.teamName ?? existing?.teamName ?? null,
    attachmentCount: wire.attachmentCount ?? existing?.attachmentCount ?? 0,
    commentCount: wire.commentCount ?? existing?.commentCount ?? 0,
    attachments: existing?.attachments ?? [],
  };
}

function toDeliverableItem(
  wire: RealtimeDeliverableWire,
  existing?: WorkStreamDeliverableItem,
): WorkStreamDeliverableItem {
  return {
    id: wire.id,
    supervisorId: wire.supervisorId,
    teamId: wire.teamId ?? null,
    title: wire.title,
    description: wire.description,
    type: wire.type,
    dueDate: wire.dueDate,
    attachmentUrl: wire.attachmentUrl ?? null,
    isActive: wire.isActive,
    submissionsOpen: wire.submissionsOpen,
    createdAt: wire.createdAt,
    preview: wire.preview ?? previewText(wire.description),
    teamName: wire.teamName ?? existing?.teamName ?? null,
    attachmentCount: wire.attachmentCount ?? existing?.attachmentCount ?? 0,
    commentCount: wire.commentCount ?? existing?.commentCount ?? 0,
    attachments: existing?.attachments ?? [],
    latestSubmissionStatus:
      wire.latestSubmissionStatus ?? existing?.latestSubmissionStatus ?? null,
    submissionCount:
      wire.submissionCount ?? existing?.submissionCount ?? 0,
    submissionOpen: wire.submissionOpen ?? existing?.submissionOpen ?? false,
    submissionClosedReason:
      wire.submissionClosedReason ?? existing?.submissionClosedReason ?? null,
  };
}

function toSubmission(wire: RealtimeSubmissionWire): Submission {
  return {
    id: wire.id,
    deliverableId: wire.deliverableId,
    teamId: wire.teamId,
    version: wire.version,
    fileUrl: wire.fileUrl,
    remarks: wire.remarks,
    status: wire.status as Submission["status"],
    submittedAt: wire.submittedAt,
  };
}

function toDashboardAnnouncement(
  item: WorkStreamAnnouncementItem,
): import("@/types/student").Announcement {
  return {
    id: item.id,
    supervisorId: item.supervisorId,
    teamId: item.teamId,
    title: item.title,
    message: item.message,
    type: item.type,
    dueDate: item.dueDate,
    createdAt: item.createdAt,
  };
}

function toDashboardDeliverable(
  item: WorkStreamDeliverableItem,
): import("@/types/student").Deliverable {
  return {
    id: item.id,
    supervisorId: item.supervisorId,
    teamId: item.teamId,
    title: item.title,
    description: item.description,
    type: item.type as DeliverableType,
    dueDate: item.dueDate,
    attachmentUrl: item.attachmentUrl,
    isActive: item.isActive,
    submissionsOpen: item.submissionsOpen,
    createdAt: item.createdAt,
  };
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function upsertAnnouncement(
  items: WorkStreamAnnouncementItem[],
  incoming: WorkStreamAnnouncementItem,
) {
  const index = items.findIndex((item) => item.id === incoming.id);
  if (index === -1) {
    return dedupeById([incoming, ...items]);
  }
  const next = [...items];
  next[index] = { ...next[index], ...incoming };
  return dedupeById(next);
}

function upsertDeliverable(
  items: WorkStreamDeliverableItem[],
  incoming: WorkStreamDeliverableItem,
) {
  const index = items.findIndex((item) => item.id === incoming.id);
  if (index === -1) {
    return dedupeById([incoming, ...items]);
  }
  const next = [...items];
  next[index] = { ...next[index], ...incoming };
  return dedupeById(next);
}

function appendComment(
  data: {
    commentsByEntity: Record<string, WorkStreamComment[]>;
    announcements: WorkStreamAnnouncementItem[];
    deliverables: WorkStreamDeliverableItem[];
  },
  entityType: WorkStreamEntityType,
  entityId: string,
  comment: WorkStreamComment,
) {
  const entityKey = `${entityType}:${entityId}`;
  const existingComments = data.commentsByEntity[entityKey] ?? [];
  const isNew = !existingComments.some((item) => item.id === comment.id);
  const comments = dedupeById(
    isNew ? [...existingComments, comment] : existingComments,
  );

  const bump = <T extends { id: string; commentCount: number }>(items: T[]) =>
    items.map((item) =>
      item.id === entityId
        ? { ...item, commentCount: item.commentCount + 1 }
        : item,
    );

  return {
    commentsByEntity: {
      ...data.commentsByEntity,
      [entityKey]: comments,
    },
    announcements:
      entityType === "ANNOUNCEMENT" && isNew
        ? bump(data.announcements)
        : data.announcements,
    deliverables:
      entityType === "DELIVERABLE" && isNew
        ? bump(data.deliverables)
        : data.deliverables,
  };
}

function supervisorItemVisible(
  filterKey: unknown,
  itemTeamId?: string | null,
) {
  if (typeof filterKey !== "string" || filterKey === "pending") {
    return false;
  }
  return itemTeamId === filterKey || itemTeamId == null;
}

function patchStudentWorkStream(
  queryClient: QueryClient,
  userId: string,
  workspaceId: string | null,
  role: string,
  teamId: string,
  updater: (data: StudentWorkStreamPageData) => StudentWorkStreamPageData | undefined,
  options?: { skipDashboard?: boolean },
) {
  const queryKey = queryKeys.student.workStream(userId, workspaceId);
  const existing = queryClient.getQueryData<StudentWorkStreamPageData>(queryKey);
  if (!existing?.team?.id || existing.team.id !== teamId) {
    return;
  }

  queryClient.setQueryData<StudentWorkStreamPageData>(queryKey, (current) => {
    if (!current?.team?.id || current.team.id !== teamId) {
      return current;
    }
    const updated = updater(current) ?? current;
    return {
      ...current,
      ...updated,
      profiles: updated.profiles ?? current.profiles ?? {},
      commentsByEntity:
        updated.commentsByEntity ?? current.commentsByEntity ?? {},
      submissionHistories:
        updated.submissionHistories ?? current.submissionHistories ?? {},
      announcements: updated.announcements ?? current.announcements ?? [],
      deliverables: updated.deliverables ?? current.deliverables ?? [],
    };
  });
}

function patchSupervisorWorkStream(
  queryClient: QueryClient,
  userId: string,
  role: string,
  teamId: string,
  itemTeamId: string | null | undefined,
  updater: (
    data: SupervisorWorkStreamPageData,
  ) => SupervisorWorkStreamPageData | undefined,
  options?: { skipDashboard?: boolean },
) {
  queryClient.setQueriesData<SupervisorWorkStreamPageData>(
    {
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === "supervisor" &&
        query.queryKey[1] === "work-stream" &&
        query.queryKey[2] === userId &&
        supervisorItemVisible(query.queryKey[3], itemTeamId ?? teamId),
    },
    (current) => {
      if (!current) return current;
      return updater(current) ?? current;
    },
  );
}

export function patchWorkStreamCaches(
  queryClient: QueryClient,
  teamId: string,
  userId: string,
  role: string,
  workspaceId: string | null,
  itemTeamId: string | null | undefined,
  updater: {
    student?: (data: StudentWorkStreamPageData) => StudentWorkStreamPageData;
    supervisor?: (
      data: SupervisorWorkStreamPageData,
    ) => SupervisorWorkStreamPageData;
  },
  options?: { skipDashboard?: boolean },
) {
  if (updater.student) {
    patchStudentWorkStream(
      queryClient,
      userId,
      workspaceId,
      role,
      teamId,
      updater.student,
      options,
    );
  }
  if (updater.supervisor) {
    patchSupervisorWorkStream(
      queryClient,
      userId,
      role,
      teamId,
      itemTeamId,
      updater.supervisor,
      options,
    );
  }
}

export function patchLocalWorkStreamComment(
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null | undefined,
  input: {
    entityType: WorkStreamEntityType;
    entityId: string;
    teamId: string;
    comment: WorkStreamComment;
  },
) {
  const { entityType, entityId, teamId, comment } = input;
  patchWorkStreamCaches(
    queryClient,
    teamId,
    userId,
    role,
    workspaceId ?? null,
    teamId,
    {
      student: (data) => ({
        ...data,
        ...appendComment(data, entityType, entityId, comment),
      }),
      supervisor: (data) => ({
        ...data,
        ...appendComment(data, entityType, entityId, comment),
      }),
    },
    { skipDashboard: true },
  );
}

export function applyWorkStreamCommentEvent(
  queryClient: QueryClient,
  teamId: string,
  userId: string,
  role: string,
  workspaceId: string | null,
  entityType: WorkStreamEntityType,
  entityId: string,
  comment: WorkStreamComment,
) {
  patchWorkStreamCaches(
    queryClient,
    teamId,
    userId,
    role,
    workspaceId,
    teamId,
    {
      student: (data) => ({
        ...data,
        ...appendComment(data, entityType, entityId, comment),
      }),
      supervisor: (data) => ({
        ...data,
        ...appendComment(data, entityType, entityId, comment),
      }),
    },
    { skipDashboard: true },
  );
}

export function applyAnnouncementDeleted(
  queryClient: QueryClient,
  teamId: string,
  userId: string,
  role: string,
  workspaceId: string | null,
  announcementId: string,
) {
  patchWorkStreamCaches(
    queryClient,
    teamId,
    userId,
    role,
    workspaceId,
    teamId,
    {
      student: (data) => ({
        ...data,
        announcements: data.announcements.filter(
          (item) => item.id !== announcementId,
        ),
      }),
      supervisor: (data) => ({
        ...data,
        announcements: data.announcements.filter(
          (item) => item.id !== announcementId,
        ),
      }),
    },
  );

  if (role === "STUDENT") {
    touchStudentDashboard(
      queryClient,
      userId,
      (dashboard) => ({
        ...dashboard,
        announcements: dashboard.announcements.filter(
          (item) => item.id !== announcementId,
        ),
      }),
      workspaceId,
    );
  }
}

export function applyAnnouncementSnapshot(
  queryClient: QueryClient,
  teamId: string,
  userId: string,
  role: string,
  workspaceId: string | null,
  announcement: RealtimeAnnouncementWire,
) {
  const incoming = toAnnouncementItem(announcement);
  patchWorkStreamCaches(
    queryClient,
    teamId,
    userId,
    role,
    workspaceId,
    incoming.teamId,
    {
      student: (data) => ({
        ...data,
        announcements: upsertAnnouncement(
          data.announcements,
          incoming,
        ),
      }),
      supervisor: (data) => ({
        ...data,
        announcements: upsertAnnouncement(
          data.announcements,
          incoming,
        ),
      }),
    },
  );

  if (role === "STUDENT") {
    syncStudentDashboardAnnouncement(
      queryClient,
      userId,
      toDashboardAnnouncement(incoming),
      workspaceId,
    );
  }
}

export function applyDeliverableSnapshot(
  queryClient: QueryClient,
  teamId: string,
  userId: string,
  role: string,
  workspaceId: string | null,
  deliverable: RealtimeDeliverableWire,
) {
  const incoming = toDeliverableItem(deliverable);
  const dashboardDeliverable = toDashboardDeliverable(incoming);

  patchWorkStreamCaches(
    queryClient,
    teamId,
    userId,
    role,
    workspaceId,
    incoming.teamId,
    {
      student: (data) => ({
        ...data,
        deliverables: upsertDeliverable(data.deliverables, incoming),
      }),
      supervisor: (data) => ({
        ...data,
        deliverables: upsertDeliverable(data.deliverables, incoming),
      }),
    },
  );

  if (role === "STUDENT") {
    syncStudentDashboardDeliverable(
      queryClient,
      userId,
      dashboardDeliverable,
      workspaceId,
    );
  }

  if (role === "SUPERVISOR") {
    touchSupervisorDashboard(
      queryClient,
      userId,
      (dashboard) => {
      const deliverables = upsertDashboardDeliverable(
        dashboard.deliverables,
        dashboardDeliverable,
      ).slice(0, 3);
      return {
        ...dashboard,
        deliverables,
        stats: {
          ...dashboard.stats,
          activeDeliverables: deliverables.filter((item) => item.isActive).length,
        },
      };
    },
      workspaceId,
    );
  }
}

export function applyDeliverableDeleted(
  queryClient: QueryClient,
  teamId: string,
  userId: string,
  role: string,
  workspaceId: string | null,
  deliverableId: string,
) {
  patchWorkStreamCaches(
    queryClient,
    teamId,
    userId,
    role,
    workspaceId,
    teamId,
    {
      student: (data) => ({
        ...data,
        deliverables: data.deliverables.filter((item) => item.id !== deliverableId),
      }),
      supervisor: (data) => ({
        ...data,
        deliverables: data.deliverables.filter((item) => item.id !== deliverableId),
      }),
    },
  );

  if (role === "STUDENT") {
    touchStudentDashboard(
      queryClient,
      userId,
      (dashboard) => {
      const deliverables = (dashboard.deliverables ?? []).filter(
        (item) => item.id !== deliverableId,
      );
      return {
        ...dashboard,
        deliverables,
        stats: {
          ...dashboard.stats,
          upcomingDeliverables: deliverables.filter(
            (item) =>
              item.isActive && new Date(item.dueDate).getTime() >= Date.now(),
          ).length,
        },
      };
    },
      workspaceId,
    );
  }

  if (role === "SUPERVISOR") {
    touchSupervisorDashboard(
      queryClient,
      userId,
      (dashboard) => {
      const deliverables = dashboard.deliverables.filter(
        (item) => item.id !== deliverableId,
      );
      return {
        ...dashboard,
        deliverables,
        stats: {
          ...dashboard.stats,
          activeDeliverables: deliverables.filter((item) => item.isActive).length,
        },
      };
    },
      workspaceId,
    );
  }
}

function upsertDashboardDeliverable(
  items: import("@/types/student").Deliverable[],
  incoming: import("@/types/student").Deliverable,
) {
  const index = items.findIndex((item) => item.id === incoming.id);
  if (index === -1) {
    return [incoming, ...items];
  }
  const next = [...items];
  next[index] = { ...next[index], ...incoming };
  return next;
}

function mergeSubmissionHistory(
  histories: Record<string, Submission[]>,
  submission: Submission,
) {
  const list = [...(histories[submission.deliverableId] ?? [])];
  const index = list.findIndex((item) => item.id === submission.id);
  if (index === -1) {
    list.unshift(submission);
  } else {
    list[index] = { ...list[index], ...submission };
  }
  return {
    ...histories,
    [submission.deliverableId]: dedupeById(list),
  };
}

export function applySubmissionSnapshot(
  queryClient: QueryClient,
  teamId: string,
  userId: string,
  role: string,
  workspaceId: string | null,
  deliverableId: string,
  wire: RealtimeSubmissionWire,
  options?: { created?: boolean; reviewed?: boolean },
) {
  const submission = toSubmission(wire);
  const isNewSubmission =
    options?.created ??
    (options?.reviewed !== true && submission.status === "SUBMITTED");

  const bumpSubmissionCount = (
    items: WorkStreamDeliverableItem[],
    histories: Record<string, Submission[]>,
  ) =>
    items.map((item) => {
      if (item.id !== deliverableId) {
        return item;
      }

      const history = histories[item.id] ?? [];
      const isNewInHistory = !history.some(
        (entry) => entry.id === submission.id,
      );

      return {
        ...item,
        latestSubmissionStatus: submission.status,
        submissionCount:
          isNewSubmission && isNewInHistory
            ? (item.submissionCount ?? history.length) + 1
            : (item.submissionCount ?? history.length),
      };
    });
  patchWorkStreamCaches(
    queryClient,
    teamId,
    userId,
    role,
    workspaceId,
    teamId,
    {
      student: (data) => {
        const submissionHistories = mergeSubmissionHistory(
          data.submissionHistories,
          submission,
        );
        return {
          ...data,
          submissionHistories,
          deliverables: bumpSubmissionCount(
            data.deliverables,
            submissionHistories,
          ),
        };
      },
      supervisor: (data) => {
        const submissionsByDeliverable = mergeSubmissionHistory(
          data.submissionsByDeliverable,
          submission,
        );
        return {
          ...data,
          submissionsByDeliverable,
          deliverables: bumpSubmissionCount(
            data.deliverables,
            submissionsByDeliverable,
          ),
        };
      },
    },
  );

  if (role === "STUDENT" && isNewSubmission) {
    syncStudentDashboardPendingSubmissions(queryClient, userId, 1);
  }

  if (role === "SUPERVISOR" && options?.reviewed) {
    syncSupervisorDashboardPendingReviews(queryClient, userId, -1);
  } else if (role === "SUPERVISOR" && isNewSubmission) {
    syncSupervisorDashboardPendingReviews(queryClient, userId, 1);
  }
}
