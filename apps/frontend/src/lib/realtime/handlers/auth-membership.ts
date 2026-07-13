import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { invalidateDashboard, queryKeys } from "@/lib/react-query";
import type { UserRole } from "@/types";

import type {
  RealtimeEventEnvelope,
  RealtimeUserRoleUpdatedPayload,
  RealtimeUserStatusUpdatedPayload,
} from "../types";
import { RealtimeEvents } from "../types";

export interface AuthMembershipCallbacks {
  onRoleUpdated: (input: {
    workspaceId: string;
    role: UserRole;
  }) => Promise<void> | void;
  onAccountDisabled: () => void;
}

/**
 * Keep coordinator user lists in sync and apply session changes for the
 * affected user (new JWT role context, or forced logout when disabled).
 */
export function handleAuthMembershipEvent(
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null,
  envelope: RealtimeEventEnvelope,
  callbacks?: AuthMembershipCallbacks | null,
) {
  const payload = envelope.payload as
    | RealtimeUserRoleUpdatedPayload
    | RealtimeUserStatusUpdatedPayload;

  if (
    workspaceId &&
    payload.workspaceId &&
    payload.workspaceId !== workspaceId
  ) {
    return;
  }

  void queryClient.invalidateQueries({
    queryKey: queryKeys.coordinator.users(),
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "users"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "evaluators"],
  });

  if (role === "COORDINATOR") {
    void invalidateDashboard(queryClient, "COORDINATOR");
  }

  if (payload.userId !== userId || !callbacks) {
    return;
  }

  if (envelope.event === RealtimeEvents.USER_ROLE_UPDATED) {
    const rolePayload = payload as RealtimeUserRoleUpdatedPayload;
    const nextRole = rolePayload.role as UserRole;
    if (!nextRole || nextRole === role) {
      return;
    }

    toast.info(`Your role was updated to ${nextRole}. Switching workspace…`);
    void Promise.resolve(
      callbacks.onRoleUpdated({
        workspaceId: rolePayload.workspaceId,
        role: nextRole,
      }),
    ).catch(() => {
      toast.error(
        "Your role changed. Please sign out and sign in again to continue.",
      );
    });
    return;
  }

  if (envelope.event === RealtimeEvents.USER_STATUS_UPDATED) {
    const statusPayload = payload as RealtimeUserStatusUpdatedPayload;
    if (!statusPayload.isActive) {
      toast.error("Your account has been disabled by a coordinator.");
      callbacks.onAccountDisabled();
    }
  }
}
