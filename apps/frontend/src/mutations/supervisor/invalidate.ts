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

export function invalidateSupervisorMeetings(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.supervisor.meetings(),
  });
  void invalidateDashboard(queryClient, "SUPERVISOR");
  void queryClient.invalidateQueries({
    queryKey: queryKeys.notifications.unreadCount(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.activityLogs.all,
  });
}

export function invalidateSupervisorMilestones(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.supervisor.milestones(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.notifications.unreadCount(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.activityLogs.all,
  });
}

export function invalidateSupervisorEvaluations(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.supervisor.evaluations(),
  });
}

export function invalidateSupervisorWorkStream(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.supervisor.workStream(),
  });
  void invalidateDashboard(queryClient, "SUPERVISOR");
}

export function invalidateSupervisorNotifications(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.notifications.unreadCount(),
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
