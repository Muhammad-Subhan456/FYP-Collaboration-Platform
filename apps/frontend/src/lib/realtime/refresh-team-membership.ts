import type { QueryClient } from "@tanstack/react-query";

import { getStoredToken } from "@/lib/auth";
import { queryKeys } from "@/lib/react-query";
import { reconnectRealtime } from "@/lib/realtime/socket";

/**
 * After team membership / supervision changes, invalidate student team caches
 * and reconnect the socket so the client joins the correct team room.
 */
export function refreshStudentTeamMembership(
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null,
) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.student.team(userId, workspaceId),
  });
  void queryClient.invalidateQueries({
    queryKey: ["student", "team"],
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.student.proposal(userId, workspaceId),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.student.dashboard(userId, workspaceId),
  });
  void queryClient.invalidateQueries({
    queryKey: ["student", "work-stream"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["teams", "browse"],
  });

  const token = getStoredToken();
  if (!token) {
    return;
  }

  reconnectRealtime(token, userId, role, workspaceId, queryClient);
}
