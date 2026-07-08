import type { QueryClient } from "@tanstack/react-query";

import {
  applyJoinRequestReceived,
  applyJoinRequestResolved,
  applyMemberJoined,
  applyMemberLeft,
  applyRoleUpdated,
} from "../team-cache";
import type { RealtimeEventEnvelope } from "../types";
import { RealtimeEvents } from "../types";

export function handleTeamEvent(
  queryClient: QueryClient,
  userId: string,
  role: string,
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
        envelope.payload as Parameters<typeof applyJoinRequestReceived>[3],
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
        envelope.payload as Parameters<typeof applyJoinRequestResolved>[3],
      );
      break;
    }
    case RealtimeEvents.TEAM_MEMBER_JOINED: {
      applyMemberJoined(
        queryClient,
        userId,
        role,
        envelope.payload as Parameters<typeof applyMemberJoined>[3],
      );
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
        envelope.payload as Parameters<typeof applyMemberLeft>[3],
      );
      break;
    }
    case RealtimeEvents.TEAM_ROLE_UPDATED: {
      applyRoleUpdated(
        queryClient,
        userId,
        role,
        envelope.payload as Parameters<typeof applyRoleUpdated>[3],
      );
      break;
    }
    default:
      break;
  }
}
