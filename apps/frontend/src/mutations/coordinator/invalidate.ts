import type { QueryClient } from "@tanstack/react-query";

import { invalidateDashboard, queryKeys } from "@/lib/react-query";

export function invalidateCoordinatorUsers(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.coordinator.users(),
  });
  void invalidateDashboard(queryClient, "COORDINATOR");
}

export function invalidateCoordinatorAnnouncements(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.coordinator.announcements(),
  });
  void invalidateDashboard(queryClient, "COORDINATOR");
}

export function invalidateCoordinatorEvaluations(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.coordinator.evaluations(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.coordinator.results(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.coordinator.evaluatorOverview(),
  });
}

export function invalidateCoordinatorNotifications(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.notifications.unreadCount(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.notifications.unreadPreview(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.notifications.recentActivity(),
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "me"],
  });
}

export function invalidateCoordinatorProfile(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.coordinator.profile(),
  });
}
