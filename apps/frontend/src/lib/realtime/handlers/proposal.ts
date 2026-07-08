import type { QueryClient } from "@tanstack/react-query";

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
        scopeType,
        envelope.payload as Parameters<typeof applyProposalSubmitted>[4],
      );
      break;
    }
    case RealtimeEvents.PROPOSAL_ACCEPTED: {
      applyProposalSnapshot(
        queryClient,
        userId,
        role,
        scopeType,
        envelope.payload as Parameters<typeof applyProposalSnapshot>[4],
        { removeFromSupervisorQueue: scopeType === "supervisor" },
      );
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
        scopeType,
        envelope.payload as Parameters<typeof applyProposalSnapshot>[4],
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
        scopeType,
        envelope.payload as Parameters<typeof applyProposalInterest>[4],
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
        scopeType,
        envelope.payload as Parameters<typeof applyProposalInterestDismissed>[4],
      );
      break;
    }
    case RealtimeEvents.PROPOSAL_RESUBMITTED: {
      applyProposalResubmitted(
        queryClient,
        userId,
        role,
        envelope.payload as Parameters<typeof applyProposalResubmitted>[3],
      );
      break;
    }
    default:
      break;
  }
}
