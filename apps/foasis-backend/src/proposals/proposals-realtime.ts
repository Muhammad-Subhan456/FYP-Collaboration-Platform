import type {
  Proposal,
  SupervisorInvitation,
  SupervisorRequest,
} from '@prisma/client';

import type {
  ProposalWire,
  SupervisorInvitationWire,
  SupervisorRequestWire,
} from '../domain-events/domain-event.types';

export function serializeProposal(proposal: Proposal): ProposalWire {
  return {
    id: proposal.id,
    teamId: proposal.teamId,
    teamLeaderAuthUserId: proposal.teamLeaderAuthUserId,
    title: proposal.title,
    domain: proposal.domain,
    abstract: proposal.abstract,
    proposalPdfUrl: proposal.proposalPdfUrl,
    status: proposal.status,
    assignedSupervisorId: proposal.assignedSupervisorId,
    pendingSupervisorId: proposal.pendingSupervisorId,
    pendingExpiresAt: proposal.pendingExpiresAt?.toISOString() ?? null,
    reviewFeedback: proposal.reviewFeedback,
    reviewedAt: proposal.reviewedAt?.toISOString() ?? null,
    reviewedById: proposal.reviewedById,
    createdAt: proposal.createdAt.toISOString(),
  };
}

export function serializeSupervisorInvitation(
  invitation: SupervisorInvitation,
): SupervisorInvitationWire {
  return {
    id: invitation.id,
    proposalId: invitation.proposalId,
    teamId: invitation.teamId,
    supervisorId: invitation.supervisorId,
    status: invitation.status,
    createdAt: invitation.createdAt.toISOString(),
  };
}

export function serializeSupervisorRequest(
  request: SupervisorRequest,
): SupervisorRequestWire {
  return {
    id: request.id,
    proposalId: request.proposalId,
    supervisorId: request.supervisorId,
    status: request.status,
    rejectionReason: request.rejectionReason,
    expiresAt: request.expiresAt?.toISOString() ?? null,
    resolvedAt: request.resolvedAt?.toISOString() ?? null,
    createdAt: request.createdAt.toISOString(),
  };
}
