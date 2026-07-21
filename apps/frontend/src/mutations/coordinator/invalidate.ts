import type { QueryClient } from "@tanstack/react-query";

import { invalidateDashboard } from "@/lib/react-query";

export function invalidateCoordinatorUsers(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "users"],
  });
  void invalidateDashboard(queryClient, "COORDINATOR");
}

export function invalidateCoordinatorAnnouncements(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "announcements"],
  });
  void invalidateDashboard(queryClient, "COORDINATOR");
}

export function invalidateCoordinatorEvaluations(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "evaluations"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "results"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "evaluator-overview"],
  });
}

export function invalidateCoordinatorNotifications(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: ["notifications", "unread-count"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["notifications", "unread-preview"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["notifications", "recent-activity"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "me"],
  });
}

export function invalidateCoordinatorProfile(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "profile"],
  });
}
