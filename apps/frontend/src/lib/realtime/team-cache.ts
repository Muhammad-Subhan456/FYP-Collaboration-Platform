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
  workspaceId: string | null,
  teamId: string,
  updater: (data: StudentTeamOverview) => StudentTeamOverview,
  options?: { syncDashboardMembers?: boolean },
) {
  const queryKey = queryKeys.student.team(userId, workspaceId);
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
      syncStudentTeamMembers(queryClient, userId, updated.members, workspaceId);
    }
  }
}

function patchSupervisorTeams(
  queryClient: QueryClient,
  userId: string,
  workspaceId: string | null,
  teamId: string,
  updater: (data: SupervisorTeamsPageData) => SupervisorTeamsPageData,
) {
  const queryKey = queryKeys.supervisor.teams(userId, workspaceId);
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
  workspaceId: string | null,
  payload: RealtimeTeamJoinRequestReceivedPayload,
) {
  if (role !== "STUDENT") {
    return;
  }

  const joinRequest = toJoinRequest(payload.joinRequest);
  patchStudentTeam(queryClient, userId, workspaceId, payload.teamId, (data) => ({
    ...data,
    joinRequests: upsertJoinRequest(data.joinRequests, joinRequest),
  }), { syncDashboardMembers: false });
}

export function applyJoinRequestResolved(
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null,
  payload: RealtimeTeamJoinRequestResolvedPayload,
) {
  if (role !== "STUDENT") {
    return;
  }

  const joinRequest = toJoinRequest(payload.joinRequest);
  patchStudentTeam(queryClient, userId, workspaceId, payload.teamId, (data) => ({
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
  workspaceId: string | null,
  payload: RealtimeTeamMemberJoinedPayload,
) {
  const member = toTeamMember(payload.member);

  if (role === "STUDENT") {
    patchStudentTeam(queryClient, userId, workspaceId, payload.teamId, (data) => ({
      ...data,
      members: upsertMember(data.members, member),
      joinRequests: data.joinRequests.filter(
        (item) => item.authUserId !== member.authUserId,
      ),
    }));
    return;
  }

  if (role === "SUPERVISOR") {
    patchSupervisorTeams(queryClient, userId, workspaceId, payload.teamId, (data) => ({
      ...data,
      membersByTeamId: {
        ...data.membersByTeamId,
        [payload.teamId]: upsertMember(
          data.membersByTeamId[payload.teamId] ?? [],
          member,
        ),
      },
    }));
    void touchSupervisorDashboard(queryClient, userId, undefined, workspaceId);
  }
}

export function applyMemberLeft(
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null,
  payload: RealtimeTeamMemberLeftPayload,
) {
  if (role === "STUDENT") {
    patchStudentTeam(queryClient, userId, workspaceId, payload.teamId, (data) => ({
      ...data,
      members: data.members.filter((item) => item.id !== payload.memberId),
    }));
    return;
  }

  if (role === "SUPERVISOR") {
    patchSupervisorTeams(queryClient, userId, workspaceId, payload.teamId, (data) => ({
      ...data,
      membersByTeamId: {
        ...data.membersByTeamId,
        [payload.teamId]: (data.membersByTeamId[payload.teamId] ?? []).filter(
          (item) => item.id !== payload.memberId,
        ),
      },
    }));
    void touchSupervisorDashboard(queryClient, userId, undefined, workspaceId);
  }
}

export function applyRoleUpdated(
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null,
  payload: RealtimeTeamRoleUpdatedPayload,
) {
  const member = toTeamMember(payload.member);

  if (role === "STUDENT") {
    patchStudentTeam(queryClient, userId, workspaceId, payload.teamId, (data) => ({
      ...data,
      members: upsertMember(data.members, member),
    }));
    return;
  }

  if (role === "SUPERVISOR") {
    patchSupervisorTeams(queryClient, userId, workspaceId, payload.teamId, (data) => ({
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

function invalidateTeamRelatedCaches(
  queryClient: QueryClient,
  workspaceId: string | null,
) {
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "teams"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "all-teams"],
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.teams.browse("", workspaceId),
  });
  void queryClient.invalidateQueries({
    queryKey: ["teams", "browse"],
  });
}

export function applyTeamUpdated(
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null,
  payload: import("./types").RealtimeTeamUpdatedPayload,
) {
  if (
    workspaceId &&
    payload.workspaceId &&
    payload.workspaceId !== workspaceId
  ) {
    return;
  }

  if (role === "STUDENT") {
    patchStudentTeam(
      queryClient,
      userId,
      workspaceId,
      payload.teamId,
      (data) => ({
        ...data,
        team: data.team
          ? {
              ...data.team,
              ...payload.team,
            }
          : data.team,
      }),
      { syncDashboardMembers: false },
    );
    void queryClient.invalidateQueries({
      queryKey: queryKeys.student.proposal(userId, workspaceId),
    });
  }

  if (role === "SUPERVISOR") {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.supervisor.teams(userId, workspaceId),
    });
    void touchSupervisorDashboard(queryClient, userId, undefined, workspaceId);
  }

  if (role === "COORDINATOR") {
    invalidateTeamRelatedCaches(queryClient, workspaceId);
  }

  void queryClient.invalidateQueries({
    queryKey: ["teams", "browse"],
  });
}

export function applyTeamDeleted(
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null,
  payload: import("./types").RealtimeTeamDeletedPayload,
) {
  if (
    workspaceId &&
    payload.workspaceId &&
    payload.workspaceId !== workspaceId
  ) {
    return;
  }

  if (role === "STUDENT") {
    const teamKey = queryKeys.student.team(userId, workspaceId);
    const existing = queryClient.getQueryData<StudentTeamOverview>(teamKey);
    if (!existing?.team || existing.team.id === payload.teamId) {
      void queryClient.invalidateQueries({ queryKey: teamKey });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.student.proposal(userId, workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.student.dashboard(userId, workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["student", "work-stream"],
      });
    }
  }

  if (role === "SUPERVISOR") {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.supervisor.teams(userId, workspaceId),
    });
    void queryClient.invalidateQueries({
      queryKey: ["supervisor", "work-stream"],
    });
    void touchSupervisorDashboard(queryClient, userId, undefined, workspaceId);
  }

  if (role === "COORDINATOR") {
    invalidateTeamRelatedCaches(queryClient, workspaceId);
  }

  void queryClient.invalidateQueries({
    queryKey: ["teams", "browse"],
  });
}
