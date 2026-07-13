import type { QueryClient } from "@tanstack/react-query";

import type { RealtimeEventEnvelope } from "../types";

/**
 * Invalidate phase / template configuration caches across roles.
 */
export function handleConfigEvent(
  queryClient: QueryClient,
  _userId: string,
  _role: string,
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
    queryKey: ["phases"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "phases"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["deliverable-templates"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "deliverable-templates"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["supervisor", "work-stream"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["student", "submission-results"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "submission-results"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["supervisor", "submission-results"],
  });
}
