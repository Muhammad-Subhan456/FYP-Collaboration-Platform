import type { QueryClient } from "@tanstack/react-query";

import { invalidateDashboard } from "@/lib/react-query";

export function invalidateSupervisorTeams(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: ["supervisor", "teams"],
  });
  void invalidateDashboard(queryClient, "SUPERVISOR");
}

export function invalidateSupervisorRequests(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: ["supervisor", "requests"],
  });
  void invalidateSupervisorTeams(queryClient);
}

export function invalidateSupervisorInvitations(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: ["supervisor", "invitations"],
  });
}

export function invalidateSupervisorMilestones(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: ["supervisor", "milestones"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["activity-logs"],
  });
  invalidateDashboard(queryClient, "SUPERVISOR");
}

export function invalidateSupervisorWorkStream(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: ["supervisor", "work-stream"],
  });
  void invalidateDashboard(queryClient, "SUPERVISOR");
}

export function invalidateSupervisorNotifications(queryClient: QueryClient) {
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
    queryKey: ["supervisor", "me"],
  });
}

export function invalidateSupervisorProfile(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: ["supervisor", "profile"],
  });
}
