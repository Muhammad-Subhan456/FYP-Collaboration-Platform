import type { QueryClient } from "@tanstack/react-query";

import {
  invalidateDashboard,
  queryKeys,
} from "@/lib/react-query";

export function invalidateStudentTeam(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.student.team(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.teams.mine(),
  });
  void invalidateDashboard(queryClient, "STUDENT");
}

export function invalidateStudentProposal(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.student.proposal(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.student.team(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.proposal.all,
  });
  void invalidateDashboard(queryClient, "STUDENT");
}

export function invalidateStudentWorkStream(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.student.workStream(),
  });
  void invalidateDashboard(queryClient, "STUDENT");
}

export function invalidateStudentTasks(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.student.tasks(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.student.milestones(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.activityLogs.all,
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.notifications.unreadCount(),
  });
}

export function invalidateStudentMilestones(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.student.milestones(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.activityLogs.all,
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.notifications.unreadCount(),
  });
}

export function invalidateStudentNotifications(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.notifications.unreadCount(),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.notifications.recentActivity(),
  });
  void queryClient.invalidateQueries({
    queryKey: ["student", "me"],
  });
}

export function invalidateStudentProfile(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.student.profile(),
  });
}
