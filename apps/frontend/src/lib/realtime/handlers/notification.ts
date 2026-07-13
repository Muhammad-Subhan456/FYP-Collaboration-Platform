import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys } from "@/lib/react-query";
import type { PaginatedResponse } from "@/types";
import type { Notification } from "@/types/student";

import { prependDashboardNotification } from "../dashboard-cache";
import type {
  RealtimeEventEnvelope,
  RealtimeNotificationPayload,
} from "../types";

export function handleNotificationCreated(
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null,
  envelope: RealtimeEventEnvelope<RealtimeNotificationPayload>,
) {
  const incoming = envelope.payload.notification;

  if (incoming.authUserId !== userId) {
    return;
  }

  if (!incoming.id) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.unreadCount(userId, workspaceId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.unreadPreview(userId, workspaceId),
    });
    return;
  }

  const notification: Notification = {
    id: incoming.id,
    authUserId: incoming.authUserId,
    title: incoming.title,
    message: incoming.message,
    type: incoming.type,
    entityType: incoming.entityType,
    entityId: incoming.entityId,
    route: incoming.route,
    isRead: incoming.isRead,
    createdAt: incoming.createdAt,
  };

  const previewKey = queryKeys.notifications.unreadPreview(userId, workspaceId);
  const preview = queryClient.getQueryData<PaginatedResponse<Notification>>(
    previewKey,
  );
  const existingInPreview = preview?.data.some(
    (item) => item.id === notification.id,
  );

  if (!notification.isRead && !existingInPreview) {
    queryClient.setQueryData<{ count: number }>(
      queryKeys.notifications.unreadCount(userId, workspaceId),
      (previous) => ({
        count: (previous?.count ?? 0) + 1,
      }),
    );
  }

  if (!notification.isRead) {
    queryClient.setQueryData<PaginatedResponse<Notification>>(
      previewKey,
      (existing) => {
        if (!existing) {
          return existing;
        }

        const withoutDuplicate = existing.data.filter(
          (item) => item.id !== notification.id,
        );

        return {
          ...existing,
          data: [notification, ...withoutDuplicate].slice(
            0,
            existing.meta.limit,
          ),
        };
      },
    );
  }

  queryClient.getQueryCache().findAll({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey.length >= 3 &&
        (query.queryKey[0] === "student" ||
          query.queryKey[0] === "supervisor" ||
          query.queryKey[0] === "coordinator" ||
          query.queryKey[0] === "evaluator") &&
        query.queryKey[1] === "me" &&
        (workspaceId == null || query.queryKey.includes(workspaceId)),
    }).forEach((query) => {
    queryClient.setQueryData<PaginatedResponse<Notification>>(
      query.queryKey,
      (existing) => {
        if (!existing) {
          return existing;
        }

        const readFilter = String(query.queryKey[3] ?? "all");
        const page = Number(query.queryKey[2] ?? 1);
        const existingIndex = existing.data.findIndex(
          (item) => item.id === notification.id,
        );

        if (existingIndex >= 0) {
          const nextData = [...existing.data];
          nextData[existingIndex] = notification;
          return { ...existing, data: nextData };
        }

        if (page !== 1) {
          return existing;
        }

        if (readFilter === "read") {
          return existing;
        }

        if (notification.isRead && readFilter === "unread") {
          return existing;
        }

        return {
          ...existing,
          data: [notification, ...existing.data].slice(0, existing.meta.limit),
          meta: {
            ...existing.meta,
            total: existing.meta.total + 1,
          },
        };
      },
    );
  });

  if (
    role === "STUDENT" ||
    role === "SUPERVISOR" ||
    role === "COORDINATOR"
  ) {
    prependDashboardNotification(queryClient, role, userId, notification, workspaceId);
  }

  void queryClient.invalidateQueries({
    queryKey: queryKeys.notifications.recentActivity(workspaceId),
  });

  if (!existingInPreview) {
    toast(notification.title, {
      description: notification.message,
      duration: 5000,
    });
  }
}
