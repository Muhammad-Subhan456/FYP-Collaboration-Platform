"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys, studentPageQueryOptions } from "@/lib/react-query";
import { notificationService } from "@/services/notification.service";
import { useAuth } from "@/providers/auth-provider";

export function useUnreadNotifications(enabled = true) {
  const { user } = useAuth();

  return useQuery({
    ...studentPageQueryOptions,
    queryKey: queryKeys.notifications.unreadCount(user?.userId, user?.workspaceId),
    queryFn: notificationService.getUnreadCount,
    enabled: enabled && !!user?.userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useUnreadNotificationsPreview(enabled = true) {
  const { user } = useAuth();

  return useQuery({
    ...studentPageQueryOptions,
    queryKey: queryKeys.notifications.unreadPreview(user?.userId, user?.workspaceId),
    queryFn: () => notificationService.getUnreadPreview(20),
    enabled: enabled && !!user?.userId,
    staleTime: 60 * 1000,
  });
}
