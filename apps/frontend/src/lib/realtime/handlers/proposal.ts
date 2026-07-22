import type { QueryClient } from "@tanstack/react-query";

import { getStoredToken } from "@/lib/auth";
import { reconnectRealtime } from "@/lib/realtime/socket";

import {
  applyProposalInterest,
  applyProposalInterestDismissed,
  applyProposalResubmitted,
  applyProposalSnapshot,
  applyProposalSubmitted,
} from "../proposal-cache";
import type { RealtimeEventEnvelope } from "../types";
import { RealtimeEvents } from "../types";

export function handleProposalEvent(
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null,
  envelope: RealtimeEventEnvelope,
) {
  const scopeType = envelope.scope.type;

  switch (envelope.event) {
    case RealtimeEvents.PROPOSAL_SUBMITTED: {
      if (envelope.actorId === userId) {
        break;
      }
      applyProposalSubmitted(
        queryClient,
        userId,
        role,
        workspaceId,
        scopeType,
        envelope.payload as Parameters<typeof applyProposalSubmitted>[5],
      );
      break;
    }
    case RealtimeEvents.PROPOSAL_ACCEPTED: {
      applyProposalSnapshot(
        queryClient,
        userId,
        role,
        workspaceId,
        scopeType,
        envelope.payload as Parameters<typeof applyProposalSnapshot>[5],
        { removeFromSupervisorQueue: scopeType === "supervisor" },
      );

      // Ensure accepting supervisor joins team room for deliverables/announcements.
      if (role === "SUPERVISOR" && envelope.actorId === userId) {
        const token = getStoredToken();
        if (token) {
          reconnectRealtime(token, userId, role, workspaceId, queryClient);
        }
      }
      break;
    }
    case RealtimeEvents.PROPOSAL_REJECTED: {
      if (envelope.actorId === userId && scopeType === "supervisor") {
        break;
      }
      applyProposalSnapshot(
        queryClient,
        userId,
        role,
        workspaceId,
        scopeType,
        envelope.payload as Parameters<typeof applyProposalSnapshot>[5],
        { removeFromSupervisorQueue: scopeType === "supervisor" },
      );
      break;
    }
    case RealtimeEvents.PROPOSAL_INTEREST_RECEIVED: {
      if (envelope.actorId === userId && scopeType === "supervisor") {
        break;
      }
      applyProposalInterest(
        queryClient,
        userId,
        role,
        workspaceId,
        scopeType,
        envelope.payload as Parameters<typeof applyProposalInterest>[5],
      );
      break;
    }
    case RealtimeEvents.PROPOSAL_INTEREST_DISMISSED: {
      if (envelope.actorId === userId) {
        break;
      }
      applyProposalInterestDismissed(
        queryClient,
        userId,
        role,
        workspaceId,
        scopeType,
        envelope.payload as Parameters<typeof applyProposalInterestDismissed>[5],
      );
      break;
    }
    case RealtimeEvents.PROPOSAL_RESUBMITTED: {
      applyProposalResubmitted(
        queryClient,
        userId,
        role,
        workspaceId,
        envelope.payload as Parameters<typeof applyProposalResubmitted>[4],
        scopeType,
      );
      break;
    }
    default:
      break;
  }
}
