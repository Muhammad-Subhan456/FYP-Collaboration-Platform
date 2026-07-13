import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query";

import type { RealtimeEventEnvelope } from "../types";

/**
 * Invalidate evaluation / results caches for all roles in the workspace.
 * Uses prefix invalidation so filtered query variants refresh too.
 */
export function handleEvaluationEvent(
  queryClient: QueryClient,
  _userId: string,
  role: string,
  workspaceId: string | null,
  envelope: RealtimeEventEnvelope,
) {
  const payload = envelope.payload as { workspaceId?: string };
  if (
    workspaceId &&
    payload.workspaceId &&
    payload.workspaceId !== workspaceId
  ) {
    return;
  }

  void queryClient.invalidateQueries({
    queryKey: ["student", "evaluations"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["student", "submission-results"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["student", "results"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["student", "dashboard"],
  });

  void queryClient.invalidateQueries({
    queryKey: ["supervisor", "submission-results"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["supervisor", "dashboard"],
  });

  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "evaluations"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "submission-evaluations"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "submission-results"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "submission-overview"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "results"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "finalized-submissions"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "evaluator-overview"],
  });

  void queryClient.invalidateQueries({
    queryKey: ["evaluator", "evaluations"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["evaluator", "evaluation"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["evaluator", "dashboard"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["evaluator", "results"],
  });

  if (role === "COORDINATOR") {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.coordinator.dashboard(undefined, workspaceId),
    });
  }
}

/** Shared reconnect catch-up for evaluation-related views. */
export function invalidateEvaluationCachesOnReconnect(
  queryClient: QueryClient,
  workspaceId: string | null,
) {
  handleEvaluationEvent(
    queryClient,
    "",
    "COORDINATOR",
    workspaceId,
    {
      event: "reconnect",
      timestamp: new Date().toISOString(),
      scope: { type: "workspace", id: workspaceId ?? "" },
      payload: { workspaceId: workspaceId ?? undefined },
    },
  );
}
