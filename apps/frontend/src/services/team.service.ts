import api from "@/lib/axios";
import type { UserProfile } from "@/types/profile";
import type { JoinRequest, Team, TeamMember } from "@/types/student";

export interface CreateTeamInput {
  name: string;
  domain: string;
  projectTitle?: string;
  projectAbstract?: string;
  maxMembers: number;
}

export interface StudentTeamOverview {
  team: Team | null;
  members: TeamMember[];
  joinRequests: JoinRequest[];
  isLeader: boolean;
  profiles: Record<string, UserProfile>;
  browseTeams?: Team[];
  isWorkflowLocked?: boolean;
  canDeleteTeam?: boolean;
  canLeaveTeam?: boolean;
}

export const teamService = {
  getMyTeamOverview: async () => {
    const res = await api.get<StudentTeamOverview>("/teams/my-team/overview");
    return res.data;
  },

  getMyTeam: async () => {
    const res = await api.get<Team | null>("/teams/my-team");
    return res.data;
  },

  getMyTeamMembers: async () => {
    const res = await api.get<TeamMember[]>("/teams/my-team/members");
    return res.data;
  },

  getAllTeams: async () => {
    const res = await api.get<Team[]>("/teams");
    return res.data;
  },

  searchTeams: async (domain: string) => {
    const res = await api.get<Team[]>("/teams/search", {
      params: { domain },
    });
    return res.data;
  },

  createTeam: async (data: CreateTeamInput) => {
    const res = await api.post<Team>("/teams", data);
    return res.data;
  },

  requestToJoin: async (teamId: string) => {
    const res = await api.post<JoinRequest>(`/teams/${teamId}/join`);
    return res.data;
  },

  getJoinRequests: async () => {
    const res = await api.get<JoinRequest[]>("/teams/my-team/requests");
    return res.data;
  },

  approveRequest: async (requestId: string) => {
    const res = await api.post(`/teams/requests/${requestId}/approve`);
    return res.data;
  },

  rejectRequest: async (requestId: string) => {
    const res = await api.post(`/teams/requests/${requestId}/reject`);
    return res.data;
  },

  getTeamMembers: async (teamId: string) => {
    const res = await api.get<TeamMember[]>(`/teams/${teamId}/members`);
    return res.data;
  },

  updateMemberRole: async (memberId: string, teamRole: string) => {
    const res = await api.patch<TeamMember>(
      `/teams/my-team/members/${memberId}/role`,
      { teamRole: teamRole.trim() || null },
    );
    return res.data;
  },

  leaveTeam: async () => {
    const res = await api.post("/teams/my-team/leave");
    return res.data;
  },

  deleteTeam: async () => {
    const res = await api.post("/teams/my-team/delete");
    return res.data;
  },
};
