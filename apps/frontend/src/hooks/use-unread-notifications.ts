"use client";

import { useQuery } from "@tanstack/react-query";

import { notificationService } from "@/services/notification.service";

export function useUnreadNotifications(enabled = true) {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: notificationService.getUnreadCount,
    enabled,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}
