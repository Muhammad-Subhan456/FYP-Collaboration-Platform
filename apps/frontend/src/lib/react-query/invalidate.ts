import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query/query-keys";

/** Clears all authenticated user server-state (e.g. on logout). */
export function clearAuthenticatedQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: queryKeys.dashboard.all });
  queryClient.removeQueries({ queryKey: queryKeys.student.all });
  queryClient.removeQueries({ queryKey: queryKeys.supervisor.all });
  queryClient.removeQueries({ queryKey: queryKeys.coordinator.all });
  queryClient.removeQueries({ queryKey: queryKeys.teams.all });
  queryClient.removeQueries({ queryKey: queryKeys.teams.mine() });
  queryClient.removeQueries({ queryKey: queryKeys.notifications.all });
  queryClient.removeQueries({ queryKey: queryKeys.profiles.all });
  queryClient.removeQueries({ queryKey: queryKeys.activityLogs.all });
  queryClient.removeQueries({ queryKey: queryKeys.proposal.all });
  queryClient.removeQueries({ queryKey: queryKeys.submissions.all });
}

export function invalidateStudentModule(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.student.all,
  });
}

export function invalidateSupervisorModule(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.supervisor.all,
  });
}

export function invalidateCoordinatorModule(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.coordinator.all,
  });
}

export function invalidateDashboard(
  queryClient: QueryClient,
  role?: "STUDENT" | "SUPERVISOR" | "COORDINATOR" | "EVALUATOR",
) {
  if (role === "STUDENT") {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.student.dashboard(),
    });
  }
  if (role === "SUPERVISOR") {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.supervisor.dashboard(),
    });
  }
  if (role === "COORDINATOR") {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.coordinator.dashboard(),
    });
  }
  if (role === "EVALUATOR") {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.evaluator.dashboard(),
    });
  }

  return queryClient.invalidateQueries({
    queryKey: queryKeys.dashboard.all,
  });
}
