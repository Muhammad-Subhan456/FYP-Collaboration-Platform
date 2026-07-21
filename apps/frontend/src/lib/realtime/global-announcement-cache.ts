import type { QueryClient } from "@tanstack/react-query";

import { invalidateDashboard } from "@/lib/react-query";
import { gaTrace } from "@/lib/realtime/ga-trace";
import type { GlobalAnnouncement } from "@/types/coordinator";
import {
  sortGlobalAnnouncementsNewestFirst,
} from "@/lib/global-announcements";

import { prependGlobalAnnouncement } from "./dashboard-cache";
import type { RealtimeEventEnvelope } from "./types";

export interface RealtimeGlobalAnnouncementPayload {
  announcement: {
    id: string;
    workspaceId: string;
    title: string;
    message: string;
    audienceRoles: string[];
    attachmentCount: number;
    publishedAt: string;
  };
}

type DashboardRole = "STUDENT" | "SUPERVISOR" | "COORDINATOR" | "EVALUATOR";

function isDashboardRole(role: string): role is DashboardRole {
  return (
    role === "STUDENT" ||
    role === "SUPERVISOR" ||
    role === "COORDINATOR" ||
    role === "EVALUATOR"
  );
}

function isGlobalAnnouncementListQuery(queryKey: readonly unknown[]): boolean {
  if (!Array.isArray(queryKey)) {
    return false;
  }

  if (queryKey[0] === "coordinator" && queryKey[1] === "announcements") {
    return true;
  }

  if (queryKey[0] === "global-announcements" && queryKey[2] === "list") {
    return true;
  }

  return false;
}

function snapshotListCaches(queryClient: QueryClient) {
  return queryClient
    .getQueryCache()
    .findAll({
      predicate: (query) => isGlobalAnnouncementListQuery(query.queryKey),
    })
    .map((query) => ({
      queryKey: query.queryKey,
      cacheLength: Array.isArray(query.state.data)
        ? query.state.data.length
        : null,
      announcementIds: Array.isArray(query.state.data)
        ? query.state.data.map((item: GlobalAnnouncement) => item.id)
        : [],
    }));
}

/** Synchronously prepend into mounted announcement list page caches. */
export function prependGlobalAnnouncementListCaches(
  queryClient: QueryClient,
  announcement: GlobalAnnouncement,
) {
  gaTrace("10-before-setQueryData", {
    announcementId: announcement.id,
    caches: snapshotListCaches(queryClient),
  });

  queryClient.setQueriesData<GlobalAnnouncement[]>(
    {
      predicate: (query) => isGlobalAnnouncementListQuery(query.queryKey),
    },
    (existing) => {
      const merged = !existing || !Array.isArray(existing)
        ? [announcement]
        : existing.some((item) => item.id === announcement.id)
          ? existing
          : [announcement, ...existing];

      return sortGlobalAnnouncementsNewestFirst(merged);
    },
  );

  gaTrace("11-after-setQueryData", {
    announcementId: announcement.id,
    caches: snapshotListCaches(queryClient),
  });
}

/**
 * Patch all mounted announcement caches (list pages + dashboard widgets).
 * Call this before invalidation so the UI updates immediately without waiting
 * for a refetch that can race with stale data.
 */
export function prependGlobalAnnouncementToCaches(
  queryClient: QueryClient,
  role: string,
  userId: string,
  workspaceId: string | null,
  announcement: GlobalAnnouncement,
) {
  prependGlobalAnnouncementListCaches(queryClient, announcement);

  const normalizedRole = role.toUpperCase();
  if (isDashboardRole(normalizedRole)) {
    prependGlobalAnnouncement(
      queryClient,
      normalizedRole,
      userId,
      announcement,
      workspaceId,
    );
  }
}

export function handleGlobalAnnouncementPublished(
  queryClient: QueryClient,
  role: string,
  workspaceId: string | null,
  userId: string,
  envelope: RealtimeEventEnvelope<RealtimeGlobalAnnouncementPayload>,
) {
  const incoming = envelope.payload.announcement;
  const normalizedRole = role.toUpperCase();
  const audienceRoles = incoming.audienceRoles.map((item) =>
    item.toUpperCase(),
  );

  gaTrace("9-event-received", {
    eventName: "global_announcement.published",
    announcementId: incoming.id,
    title: incoming.title,
    role: normalizedRole,
    audienceRoles,
    userId,
    workspaceId,
  });

  if (
    normalizedRole !== "COORDINATOR" &&
    !audienceRoles.includes(normalizedRole)
  ) {
    gaTrace("9-audience-filtered-out", {
      announcementId: incoming.id,
      role: normalizedRole,
      audienceRoles,
    });
    return;
  }

  const announcement: GlobalAnnouncement = {
    id: incoming.id,
    coordinatorId: "",
    title: incoming.title,
    message: incoming.message,
    audienceRoles: incoming.audienceRoles,
    publishedAt: incoming.publishedAt,
    status: "PUBLISHED",
    attachments: [],
    attachmentCount: incoming.attachmentCount,
    createdAt: incoming.publishedAt,
  };

  prependGlobalAnnouncementToCaches(
    queryClient,
    role,
    userId,
    workspaceId,
    announcement,
  );

  if (normalizedRole === "COORDINATOR") {
    gaTrace("12-before-invalidateQueries", {
      announcementId: announcement.id,
      queryKey: ["coordinator", "announcements"],
    });

    void queryClient
      .invalidateQueries({
        queryKey: ["coordinator", "announcements"],
      })
      .then(() => {
        gaTrace("13-after-invalidateQueries", {
          announcementId: announcement.id,
          queryKey: ["coordinator", "announcements"],
          caches: snapshotListCaches(queryClient),
        });
      });

    void invalidateDashboard(queryClient, "COORDINATOR");
    return;
  }

  gaTrace("12-before-invalidateQueries", {
    announcementId: announcement.id,
    queryKey: ["global-announcements"],
  });

  void queryClient
    .invalidateQueries({
      queryKey: ["global-announcements"],
    })
    .then(() => {
      gaTrace("13-after-invalidateQueries", {
        announcementId: announcement.id,
        queryKey: ["global-announcements"],
        caches: snapshotListCaches(queryClient),
      });
    });
}
