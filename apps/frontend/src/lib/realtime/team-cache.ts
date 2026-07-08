import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query";
import type { StudentTeamOverview } from "@/services/team.service";
import type { SupervisorTeamsPageData } from "@/services/supervisor-page.service";
import type { JoinRequest, JoinRequestStatus, TeamMember } from "@/types/student";

import type {
  RealtimeJoinRequestWire,
  RealtimeTeamJoinRequestReceivedPayload,
  RealtimeTeamJoinRequestResolvedPayload,
  RealtimeTeamMemberJoinedPayload,
  RealtimeTeamMemberLeftPayload,
  RealtimeTeamMemberWire,
  RealtimeTeamRoleUpdatedPayload,
} from "./types";
import {
  syncStudentTeamMembers,
  touchSupervisorDashboard,
} from "./dashboard-cache";

const isDev = process.env.NODE_ENV === "development";

function log(...args: unknown[]) {
  if (isDev) {
    console.info("[realtime:teams]", ...args);
  }
}

function toJoinRequest(wire: RealtimeJoinRequestWire): JoinRequest {
  return {
    ...wire,
    status: wire.status as JoinRequestStatus,
  };
}

function toTeamMember(wire: RealtimeTeamMemberWire): TeamMember {
  return { ...wire };
}

function upsertJoinRequest(
  items: JoinRequest[],
  incoming: JoinRequest,
): JoinRequest[] {
  const index = items.findIndex((item) => item.id === incoming.id);
  if (index === -1) {
    return incoming.status === "PENDING" ? [incoming, ...items] : items;
  }
  const next = [...items];
  next[index] = { ...next[index], ...incoming };
  return next.filter((item) => item.status === "PENDING");
}

function upsertMember(items: TeamMember[], incoming: TeamMember): TeamMember[] {
  const index = items.findIndex((item) => item.id === incoming.id);
  if (index === -1) {
    return [...items, incoming];
  }
  const next = [...items];
  next[index] = { ...next[index], ...incoming };
  return next;
}

function patchStudentTeam(
  queryClient: QueryClient,
  userId: string,
  teamId: string,
  updater: (data: StudentTeamOverview) => StudentTeamOverview,
  options?: { syncDashboardMembers?: boolean },
) {
  const queryKey = queryKeys.student.team(userId);
  const existing = queryClient.getQueryData<StudentTeamOverview>(queryKey);

  if (!existing?.team?.id) {
    log("no student team cache — invalidating", queryKey);
    void queryClient.invalidateQueries({ queryKey });
    return;
  }

  if (existing.team.id !== teamId) {
    return;
  }

  queryClient.setQueryData<StudentTeamOverview>(queryKey, (current) => {
    if (!current?.team?.id || current.team.id !== teamId) {
      return current;
    }
    return updater(current);
  });

  if (options?.syncDashboardMembers !== false) {
    const updated = queryClient.getQueryData<StudentTeamOverview>(queryKey);
    if (updated?.members) {
      syncStudentTeamMembers(queryClient, userId, updated.members);
    }
  }
}

function patchSupervisorTeams(
  queryClient: QueryClient,
  userId: string,
  teamId: string,
  updater: (data: SupervisorTeamsPageData) => SupervisorTeamsPageData,
) {
  const queryKey = queryKeys.supervisor.teams(userId);
  const existing = queryClient.getQueryData<SupervisorTeamsPageData>(queryKey);

  if (!existing) {
    log("no supervisor teams cache — invalidating", queryKey);
    void queryClient.invalidateQueries({ queryKey });
    return;
  }

  const hasTeam = existing.proposals.some(
    (proposal) => proposal.teamId === teamId,
  );
  if (!hasTeam) {
    return;
  }

  queryClient.setQueryData<SupervisorTeamsPageData>(queryKey, (current) => {
    if (!current) return current;
    return updater(current);
  });
}

export function applyJoinRequestReceived(
  queryClient: QueryClient,
  userId: string,
  role: string,
  payload: RealtimeTeamJoinRequestReceivedPayload,
) {
  if (role !== "STUDENT") {
    return;
  }

  const joinRequest = toJoinRequest(payload.joinRequest);
  patchStudentTeam(queryClient, userId, payload.teamId, (data) => ({
    ...data,
    joinRequests: upsertJoinRequest(data.joinRequests, joinRequest),
  }), { syncDashboardMembers: false });
}

export function applyJoinRequestResolved(
  queryClient: QueryClient,
  userId: string,
  role: string,
  payload: RealtimeTeamJoinRequestResolvedPayload,
) {
  if (role !== "STUDENT") {
    return;
  }

  const joinRequest = toJoinRequest(payload.joinRequest);
  patchStudentTeam(queryClient, userId, payload.teamId, (data) => ({
    ...data,
    joinRequests: data.joinRequests
      .map((item) =>
        item.id === joinRequest.id ? { ...item, ...joinRequest } : item,
      )
      .filter((item) => item.status === "PENDING"),
  }), { syncDashboardMembers: false });
}

export function applyMemberJoined(
  queryClient: QueryClient,
  userId: string,
  role: string,
  payload: RealtimeTeamMemberJoinedPayload,
) {
  const member = toTeamMember(payload.member);

  if (role === "STUDENT") {
    patchStudentTeam(queryClient, userId, payload.teamId, (data) => ({
      ...data,
      members: upsertMember(data.members, member),
      joinRequests: data.joinRequests.filter(
        (item) => item.authUserId !== member.authUserId,
      ),
    }));
    return;
  }

  if (role === "SUPERVISOR") {
    patchSupervisorTeams(queryClient, userId, payload.teamId, (data) => ({
      ...data,
      membersByTeamId: {
        ...data.membersByTeamId,
        [payload.teamId]: upsertMember(
          data.membersByTeamId[payload.teamId] ?? [],
          member,
        ),
      },
    }));
    void touchSupervisorDashboard(queryClient, userId);
  }
}

export function applyMemberLeft(
  queryClient: QueryClient,
  userId: string,
  role: string,
  payload: RealtimeTeamMemberLeftPayload,
) {
  if (role === "STUDENT") {
    patchStudentTeam(queryClient, userId, payload.teamId, (data) => ({
      ...data,
      members: data.members.filter((item) => item.id !== payload.memberId),
    }));
    return;
  }

  if (role === "SUPERVISOR") {
    patchSupervisorTeams(queryClient, userId, payload.teamId, (data) => ({
      ...data,
      membersByTeamId: {
        ...data.membersByTeamId,
        [payload.teamId]: (data.membersByTeamId[payload.teamId] ?? []).filter(
          (item) => item.id !== payload.memberId,
        ),
      },
    }));
    void touchSupervisorDashboard(queryClient, userId);
  }
}

export function applyRoleUpdated(
  queryClient: QueryClient,
  userId: string,
  role: string,
  payload: RealtimeTeamRoleUpdatedPayload,
) {
  const member = toTeamMember(payload.member);

  if (role === "STUDENT") {
    patchStudentTeam(queryClient, userId, payload.teamId, (data) => ({
      ...data,
      members: upsertMember(data.members, member),
    }));
    return;
  }

  if (role === "SUPERVISOR") {
    patchSupervisorTeams(queryClient, userId, payload.teamId, (data) => ({
      ...data,
      membersByTeamId: {
        ...data.membersByTeamId,
        [payload.teamId]: upsertMember(
          data.membersByTeamId[payload.teamId] ?? [],
          member,
        ),
      },
    }));
  }
}
