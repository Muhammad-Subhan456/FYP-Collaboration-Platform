"use client";

import { useQuery } from "@tanstack/react-query";

import { portalPageQueryOptions, queryKeys } from "@/lib/react-query";
import { notificationService } from "@/services/notification.service";
import { progressService } from "@/services/progress.service";
import { useAuth } from "@/providers/auth-provider";

export function useRecentActivityFeedQuery(fetchLimit = 20, enabled = true) {
  const { user } = useAuth();

  const notificationsQuery = useQuery({
    ...portalPageQueryOptions,
    queryKey: queryKeys.notifications.recentActivity(),
    queryFn: () => notificationService.getMyNotifications(1, fetchLimit),
    enabled: enabled && !!user?.userId,
  });

  const activityQuery = useQuery({
    ...portalPageQueryOptions,
    queryKey: queryKeys.activityLogs.mine(),
    queryFn: progressService.getMyActivityLogs,
    enabled: enabled && !!user?.userId,
  });

  return { notificationsQuery, activityQuery };
}
