import type { QueryClient } from "@tanstack/react-query";

import {
  applyJoinRequestReceived,
  applyJoinRequestResolved,
  applyMemberJoined,
  applyMemberLeft,
  applyRoleUpdated,
  applyTeamDeleted,
  applyTeamUpdated,
} from "../team-cache";
import type { RealtimeEventEnvelope } from "../types";
import { RealtimeEvents } from "../types";

export function handleTeamEvent(
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null,
  envelope: RealtimeEventEnvelope,
) {
  switch (envelope.event) {
    case RealtimeEvents.TEAM_JOIN_REQUEST_RECEIVED: {
      if (envelope.actorId === userId) {
        break;
      }
      applyJoinRequestReceived(
        queryClient,
        userId,
        role,
        workspaceId,
        envelope.payload as Parameters<typeof applyJoinRequestReceived>[4],
      );
      break;
    }
    case RealtimeEvents.TEAM_JOIN_REQUEST_RESOLVED: {
      if (envelope.actorId === userId) {
        break;
      }
      applyJoinRequestResolved(
        queryClient,
        userId,
        role,
        workspaceId,
        envelope.payload as Parameters<typeof applyJoinRequestResolved>[4],
      );
      break;
    }
    case RealtimeEvents.TEAM_MEMBER_JOINED: {
      applyMemberJoined(
        queryClient,
        userId,
        role,
        workspaceId,
        envelope.payload as Parameters<typeof applyMemberJoined>[4],
      );
      if (role === "COORDINATOR") {
        void queryClient.invalidateQueries({
          queryKey: ["coordinator", "teams"],
        });
        void queryClient.invalidateQueries({
          queryKey: ["coordinator", "all-teams"],
        });
      }
      break;
    }
    case RealtimeEvents.TEAM_MEMBER_LEFT: {
      if (envelope.actorId === userId) {
        break;
      }
      applyMemberLeft(
        queryClient,
        userId,
        role,
        workspaceId,
        envelope.payload as Parameters<typeof applyMemberLeft>[4],
      );
      if (role === "COORDINATOR") {
        void queryClient.invalidateQueries({
          queryKey: ["coordinator", "teams"],
        });
        void queryClient.invalidateQueries({
          queryKey: ["coordinator", "all-teams"],
        });
      }
      break;
    }
    case RealtimeEvents.TEAM_ROLE_UPDATED: {
      applyRoleUpdated(
        queryClient,
        userId,
        role,
        workspaceId,
        envelope.payload as Parameters<typeof applyRoleUpdated>[4],
      );
      break;
    }
    case RealtimeEvents.TEAM_UPDATED: {
      applyTeamUpdated(
        queryClient,
        userId,
        role,
        workspaceId,
        envelope.payload as Parameters<typeof applyTeamUpdated>[4],
      );
      break;
    }
    case RealtimeEvents.TEAM_DELETED: {
      applyTeamDeleted(
        queryClient,
        userId,
        role,
        workspaceId,
        envelope.payload as Parameters<typeof applyTeamDeleted>[4],
      );
      break;
    }
    default:
      break;
  }
}
