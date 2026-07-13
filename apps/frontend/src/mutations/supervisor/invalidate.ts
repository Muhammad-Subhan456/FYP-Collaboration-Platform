import type { QueryClient } from "@tanstack/react-query";

import { invalidateDashboard, queryKeys } from "@/lib/react-query";

export function invalidateSupervisorTeams(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.supervisor.teams(),
  });
  void invalidateDashboard(queryClient, "SUPERVISOR");
}

export function invalidateSupervisorRequests(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.supervisor.requests(),
  });
  void invalidateSupervisorTeams(queryClient);
}

export function invalidateSupervisorInvitations(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.supervisor.invitations(),
  });
}

export function invalidateSupervisorMilestones(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.supervisor.milestonesPrefix(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.notifications.unreadCount(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.activityLogs.all,
  });
  invalidateDashboard(queryClient, "SUPERVISOR");
}

export function invalidateSupervisorWorkStream(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.supervisor.workStreamPrefix(),
  });
  void invalidateDashboard(queryClient, "SUPERVISOR");
}

export function invalidateSupervisorNotifications(queryClient: QueryClient) {
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
    queryKey: ["supervisor", "me"],
  });
}

export function invalidateSupervisorProfile(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.supervisor.profile(),
  });
}
