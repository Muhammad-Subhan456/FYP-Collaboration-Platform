import type { QueryClient } from "@tanstack/react-query";

import { invalidateDashboard } from "@/lib/react-query";

export function invalidateStudentTeam(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: ["student", "team"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["team"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "users"],
  });
  void invalidateDashboard(queryClient, "STUDENT");
}

export function invalidateStudentProposal(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: ["student", "proposal"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["student", "team"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["proposal"],
  });
  void invalidateDashboard(queryClient, "STUDENT");
}

export function invalidateStudentWorkStream(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: ["student", "work-stream"],
  });
  void invalidateDashboard(queryClient, "STUDENT");
}

export function invalidateStudentMilestones(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: ["student", "milestones"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["activity-logs"],
  });
  invalidateDashboard(queryClient, "STUDENT");
}

export function invalidateStudentNotifications(queryClient: QueryClient) {
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
    queryKey: ["student", "me"],
  });
}

export function invalidateStudentProfile(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: ["student", "profile"],
  });
}
