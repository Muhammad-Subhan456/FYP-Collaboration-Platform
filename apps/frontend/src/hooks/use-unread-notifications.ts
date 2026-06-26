"use client";

import { useQuery } from "@tanstack/react-query";

import { notificationService } from "@/services/notification.service";
import { useAuth } from "@/providers/auth-provider";

export function useUnreadNotifications(enabled = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications", "unread-count", user?.userId],
    queryFn: notificationService.getUnreadCount,
    enabled: enabled && !!user?.userId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
