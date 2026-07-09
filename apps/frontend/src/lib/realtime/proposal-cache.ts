import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query";
import type { StudentProposalPageData } from "@/services/student.service";
import type { CoordinatorProposalsPageData } from "@/services/coordinator-page.service";
import type { SupervisorInvitationsPageData } from "@/services/supervisor-page.service";
import type { SupervisorRequestsPageData } from "@/services/supervisor-page.service";
import type { Proposal, ProposalStatus } from "@/types/student";
import type { SupervisorInvitation } from "@/types/supervisor";

import type {
  RealtimeProposalInterestDismissedPayload,
  RealtimeProposalInterestPayload,
  RealtimeProposalSnapshotPayload,
  RealtimeProposalSubmittedPayload,
  RealtimeProposalWire,
  RealtimeSupervisorInvitationWire,
  RealtimeSupervisorRequestWire,
} from "./types";
import {
  syncCoordinatorProposalAccepted,
  syncStudentProposalDashboard,
  syncSupervisorProposalResolved,
  syncSupervisorProposalSubmitted,
  touchCoordinatorDashboard,
  touchSupervisorDashboard,
} from "./dashboard-cache";

const isDev = process.env.NODE_ENV === "development";

function log(...args: unknown[]) {
  if (isDev) {
    console.info("[realtime:proposals]", ...args);
  }
}

function toProposal(wire: RealtimeProposalWire): Proposal {
  return {
    ...wire,
    status: wire.status as ProposalStatus,
  };
}

function toInvitation(
  wire: RealtimeSupervisorInvitationWire,
): SupervisorInvitation {
  return {
    ...wire,
    status: wire.status as SupervisorInvitation["status"],
  };
}

function upsertProposal(items: Proposal[], incoming: Proposal): Proposal[] {
  const index = items.findIndex((item) => item.id === incoming.id);
  if (index === -1) {
    return [incoming, ...items];
  }
  const next = [...items];
  next[index] = { ...next[index], ...incoming };
  return next;
}

function upsertInvitation(
  items: SupervisorInvitation[],
  incoming: SupervisorInvitation,
): SupervisorInvitation[] {
  const index = items.findIndex((item) => item.id === incoming.id);
  if (index === -1) {
    return [incoming, ...items];
  }
  const next = [...items];
  next[index] = { ...next[index], ...incoming };
  return next;
}

function upsertRequestHistory(
  history: StudentProposalPageData["requestHistory"],
  request: RealtimeSupervisorRequestWire,
) {
  const index = history.findIndex((item) => item.id === request.id);
  const entry = {
    ...request,
    status: request.status as StudentProposalPageData["requestHistory"][number]["status"],
  };
  if (index === -1) {
    return [entry, ...history];
  }
  const next = [...history];
  next[index] = { ...next[index], ...entry };
  return next;
}

function patchStudentProposal(
  queryClient: QueryClient,
  userId: string,
  workspaceId: string | null,
  teamId: string,
  updater: (data: StudentProposalPageData) => StudentProposalPageData,
) {
  const queryKey = queryKeys.student.proposal(userId, workspaceId);
  const existing = queryClient.getQueryData<StudentProposalPageData>(queryKey);

  if (!existing?.team?.id) {
    log("no student proposal cache — invalidating", queryKey);
    void queryClient.invalidateQueries({ queryKey });
    return;
  }

  if (existing.team.id !== teamId) {
    return;
  }

  queryClient.setQueryData<StudentProposalPageData>(queryKey, (current) => {
    if (!current?.team?.id || current.team.id !== teamId) {
      return current;
    }
    return updater(current);
  });
}

function patchSupervisorRequests(
  queryClient: QueryClient,
  userId: string,
  workspaceId: string | null,
  updater: (data: SupervisorRequestsPageData) => SupervisorRequestsPageData,
  options?: { skipDashboard?: boolean },
) {
  const queryKey = queryKeys.supervisor.requests(userId, workspaceId);
  const existing = queryClient.getQueryData<SupervisorRequestsPageData>(queryKey);

  if (!existing) {
    log("no supervisor requests cache — invalidating", queryKey);
    void queryClient.invalidateQueries({ queryKey });
    return;
  }

  queryClient.setQueryData<SupervisorRequestsPageData>(queryKey, (current) => {
    if (!current) return current;
    return updater(current);
  });

  if (!options?.skipDashboard) {
    touchSupervisorDashboard(queryClient, userId, undefined, workspaceId);
  }
}

function patchSupervisorInvitations(
  queryClient: QueryClient,
  userId: string,
  workspaceId: string | null,
  updater: (
    data: SupervisorInvitationsPageData,
  ) => SupervisorInvitationsPageData,
) {
  const queryKey = queryKeys.supervisor.invitations(userId, workspaceId);
  const existing =
    queryClient.getQueryData<SupervisorInvitationsPageData>(queryKey);

  if (!existing) {
    log("no supervisor invitations cache — invalidating", queryKey);
    void queryClient.invalidateQueries({ queryKey });
    return;
  }

  queryClient.setQueryData<SupervisorInvitationsPageData>(queryKey, (current) => {
    if (!current) return current;
    return updater(current);
  });
}

function patchCoordinatorProposals(
  queryClient: QueryClient,
  userId: string,
  workspaceId: string | null,
  updater: (
    data: CoordinatorProposalsPageData,
  ) => CoordinatorProposalsPageData,
) {
  const queryKey = queryKeys.coordinator.proposals(userId, workspaceId);
  const existing =
    queryClient.getQueryData<CoordinatorProposalsPageData>(queryKey);

  if (!existing) {
    log("no coordinator proposals cache — invalidating", queryKey);
    void queryClient.invalidateQueries({ queryKey });
    return;
  }

  queryClient.setQueryData<CoordinatorProposalsPageData>(queryKey, (current) => {
    if (!current) return current;
    return updater(current);
  });

  void touchCoordinatorDashboard(queryClient, userId, undefined, workspaceId);
}

export function applyProposalSubmitted(
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null,
  scopeType: string,
  payload: RealtimeProposalSubmittedPayload,
) {
  const proposal = toProposal(payload.proposal);

  if (scopeType === "team" && role === "STUDENT") {
    patchStudentProposal(queryClient, userId, workspaceId, payload.teamId, (data) => ({
      ...data,
      proposal,
      pendingSupervisorId: proposal.pendingSupervisorId ?? null,
      hasPendingProposal: true,
      supervisors: [],
      requestHistory: upsertRequestHistory(data.requestHistory, payload.request),
    }));
    syncStudentProposalDashboard(queryClient, userId, proposal);
    return;
  }

  if (scopeType === "supervisor" && role === "SUPERVISOR") {
    patchSupervisorRequests(queryClient, userId, workspaceId, (data) => ({
      ...data,
      proposals: upsertProposal(data.proposals, proposal),
    }));
    syncSupervisorProposalSubmitted(queryClient, userId, proposal);
  }
}

export function applyProposalSnapshot(
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null,
  scopeType: string,
  payload: RealtimeProposalSnapshotPayload,
  options?: { removeFromSupervisorQueue?: boolean },
) {
  const proposal = toProposal(payload.proposal);

  if (scopeType === "team" && role === "STUDENT") {
    const isAccepted =
      proposal.status === "APPROVED" ||
      proposal.status === "SUPERVISOR_ASSIGNED";

    patchStudentProposal(queryClient, userId, workspaceId, payload.teamId, (data) => ({
      ...data,
      proposal,
      pendingSupervisorId: proposal.pendingSupervisorId ?? null,
      hasPendingProposal: proposal.status === "PENDING_SUPERVISOR",
      isWorkflowLocked: isAccepted || data.isWorkflowLocked,
      interests: isAccepted ? [] : data.interests,
      invitations: isAccepted ? [] : data.invitations,
      supervisors: isAccepted ? [] : data.supervisors,
    }));
    syncStudentProposalDashboard(queryClient, userId, proposal);

    if (isAccepted) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.student.dashboard(userId, workspaceId),
      });
    }
    return;
  }

  if (scopeType === "supervisor" && role === "SUPERVISOR") {
    patchSupervisorRequests(
      queryClient,
      userId,
      workspaceId,
      (data) => ({
        ...data,
        proposals: options?.removeFromSupervisorQueue
          ? data.proposals.filter((item) => item.id !== proposal.id)
          : upsertProposal(data.proposals, proposal),
      }),
      { skipDashboard: true },
    );

    if (options?.removeFromSupervisorQueue) {
      syncSupervisorProposalResolved(queryClient, userId, proposal);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supervisor.teams(userId, workspaceId),
      });
    }
    return;
  }

  if (scopeType === "coordinator" && role === "COORDINATOR") {
    patchCoordinatorProposals(queryClient, userId, workspaceId, (data) => ({
      ...data,
      proposals: upsertProposal(data.proposals, proposal),
    }));

    if (
      proposal.status === "APPROVED" ||
      proposal.status === "SUPERVISOR_ASSIGNED"
    ) {
      syncCoordinatorProposalAccepted(queryClient, userId);
    }
  }
}

export function applyProposalInterest(
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null,
  scopeType: string,
  payload: RealtimeProposalInterestPayload,
) {
  const invitation = toInvitation(payload.invitation);

  if (scopeType === "team" && role === "STUDENT") {
    patchStudentProposal(queryClient, userId, workspaceId, payload.teamId, (data) => ({
      ...data,
      interests: upsertInvitation(data.interests, invitation),
      invitations: upsertInvitation(data.invitations, invitation),
    }));
    return;
  }

  if (scopeType === "supervisor" && role === "SUPERVISOR") {
    patchSupervisorInvitations(queryClient, userId, workspaceId, (data) => ({
      ...data,
      invitations: upsertInvitation(data.invitations, invitation),
      browseTargets: data.browseTargets.map((target) =>
        target.teamId === payload.teamId
          ? { ...target, invitationSent: true, canInvite: false }
          : target,
      ),
    }));
  }
}

export function applyProposalInterestDismissed(
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null,
  scopeType: string,
  payload: RealtimeProposalInterestDismissedPayload,
) {
  if (scopeType === "team" && role === "STUDENT") {
    patchStudentProposal(queryClient, userId, workspaceId, payload.teamId, (data) => ({
      ...data,
      interests: data.interests.filter(
        (item) => item.id !== payload.invitationId,
      ),
      invitations: data.invitations.filter(
        (item) => item.id !== payload.invitationId,
      ),
    }));
    return;
  }

  if (scopeType === "supervisor" && role === "SUPERVISOR") {
    patchSupervisorInvitations(queryClient, userId, workspaceId, (data) => ({
      ...data,
      invitations: data.invitations.map((item) =>
        item.id === payload.invitationId
          ? { ...item, status: "IGNORED" }
          : item,
      ),
      browseTargets: data.browseTargets.map((target) =>
        target.teamId === payload.teamId
          ? { ...target, invitationSent: false, canInvite: true }
          : target,
      ),
    }));
  }
}

export function applyProposalResubmitted(
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null,
  payload: RealtimeProposalSnapshotPayload,
) {
  if (role !== "STUDENT") {
    return;
  }

  const proposal = toProposal(payload.proposal);
  patchStudentProposal(queryClient, userId, workspaceId, payload.teamId, (data) => ({
    ...data,
    proposal,
    hasPendingProposal: false,
    pendingSupervisorId: null,
  }));
  syncStudentProposalDashboard(queryClient, userId, proposal);
}
