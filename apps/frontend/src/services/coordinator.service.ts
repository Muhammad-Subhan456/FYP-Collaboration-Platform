import api from "@/lib/axios";
import { profileService } from "@/services/profile.service";
import { proposalService } from "@/services/proposal.service";
import type { AuthUserRecord, UserProfile } from "@/types/profile";
import type { Proposal, Team, TeamMember } from "@/types/student";
import type {
  CoordinatorEvaluation,
  CoordinatorProposalStats,
  CreateGlobalAnnouncementInput,
  EvaluationPanel,
  EvaluationType,
  GlobalAnnouncement,
  SystemHealthResponse,
  CoordinatorUserDetail,
  CoordinatorUserIssue,
  CoordinatorUserTeamContext,
} from "@/types/coordinator";
import type { EvaluationResult } from "@/types/student";

export const coordinatorService = {
  getAllTeams: async () => {
    const res = await api.get<Team[]>("/teams/all");
    return res.data;
  },

  getTeamMembers: async (teamId: string) => {
    const res = await api.get<TeamMember[]>(`/teams/${teamId}/members`);
    return res.data;
  },

  getAllProposals: async () => {
    const res = await api.get<Proposal[]>("/proposals/all");
    return res.data;
  },

  getProposalStats: async () => {
    const res = await api.get<CoordinatorProposalStats>("/proposals/stats");
    return res.data;
  },

  getProposalById: async (proposalId: string) => {
    const res = await api.get<Proposal>(`/proposals/${proposalId}`);
    return res.data;
  },

  approveProposal: async (proposalId: string) => {
    const res = await api.patch<Proposal>(`/proposals/${proposalId}/approve`);
    return res.data;
  },

  rejectProposal: async (proposalId: string, reason?: string) => {
    const res = await api.patch<Proposal>(`/proposals/${proposalId}/reject`, {
      reason,
    });
    return res.data;
  },

  createGlobalAnnouncement: async (data: CreateGlobalAnnouncementInput) => {
    const res = await api.post<GlobalAnnouncement>("/global-announcements", data);
    return res.data;
  },

  getGlobalAnnouncements: async () => {
    const res = await api.get<GlobalAnnouncement[]>("/global-announcements");
    return res.data;
  },

  createEvaluation: async (data: {
    title: string;
    type: EvaluationType;
    date: string;
    venue: string;
    remarks?: string;
  }) => {
    const res = await api.post<CoordinatorEvaluation>("/evaluations", data);
    return res.data;
  },

  getEvaluations: async () => {
    const res = await api.get<CoordinatorEvaluation[]>("/evaluations");
    return res.data;
  },

  assignTeamToEvaluation: async (
    evaluationId: string,
    data: { teamId: string; panelId?: string },
  ) => {
    const res = await api.post(
      `/evaluations/${evaluationId}/assign-team`,
      data,
    );
    return res.data;
  },

  assignTeamsToEvaluation: async (
    evaluationId: string,
    data: { teamIds: string[]; panelId?: string },
  ) => {
    const res = await api.post(
      `/evaluations/${evaluationId}/assign-teams`,
      data,
    );
    return res.data;
  },

  getEvaluationAssignments: async (evaluationId: string) => {
    const res = await api.get<
      Array<{
        id: string;
        evaluationId: string;
        teamId: string;
        panelId?: string | null;
      }>
    >(`/evaluations/${evaluationId}/assignments`);
    return res.data;
  },

  createEvaluationPanel: async (data: {
    evaluationId: string;
    room: string;
    scheduledAt?: string;
    remarks?: string;
  }) => {
    const res = await api.post<EvaluationPanel>("/evaluation-panels", data);
    return res.data;
  },

  addPanelEvaluator: async (
    panelId: string,
    data: { evaluatorId: string; role?: string },
  ) => {
    const res = await api.post(`/evaluation-panels/${panelId}/evaluators`, data);
    return res.data;
  },

  getPanelsForEvaluation: async (evaluationId: string) => {
    const res = await api.get<EvaluationPanel[]>(
      `/evaluation-panels/evaluation/${evaluationId}`,
    );
    return res.data;
  },

  getResultsForTeam: async (teamId: string) => {
    const res = await api.get<EvaluationResult[]>(
      `/evaluation-results/team/${teamId}`,
    );
    return res.data;
  },

  getResultsOverview: async () => {
    const res = await api.get<
      Array<{
        evaluationId: string;
        evaluationTitle: string;
        evaluationType: string;
        evaluationDate: string;
        evaluationVenue: string;
        teamId: string;
        marks: number | null;
        resultId: string | null;
        evaluated: boolean;
      }>
    >("/evaluation-results/overview");
    return res.data;
  },

  getEvaluatorOverview: async () => {
    const res = await api.get<
      Array<{
        evaluatorId: string;
        teams: Array<{
          teamId: string;
          evaluationId: string;
          evaluationTitle: string;
          panelRoom: string;
        }>;
      }>
    >("/evaluations/evaluator-overview");
    return res.data;
  },

  getSystemHealth: async () => {
    const res = await api.get<SystemHealthResponse>("/health");
    return res.data;
  },

  getTeamForMember: async (authUserId: string) => {
    const res = await api.get<CoordinatorUserTeamContext | null>(
      `/teams/member/${authUserId}/team`,
    );
    return res.data;
  },

  getIssuesForUser: async (authUserId: string) => {
    const res = await api.get<CoordinatorUserIssue[]>(
      `/team-issues/by-user/${authUserId}`,
    );
    return res.data;
  },

  getUserDetail: async (user: AuthUserRecord): Promise<CoordinatorUserDetail> => {
    let profile: UserProfile | null = null;
    try {
      profile = await profileService.getProfileById(user.id);
    } catch {
      profile = null;
    }

    let team: CoordinatorUserTeamContext | null = null;
    let issues: CoordinatorUserIssue[] = [];
    let supervisedTeamCount: number | null = null;

    if (user.role === "STUDENT") {
      try {
        const teamRes = await api.get<CoordinatorUserTeamContext | null>(
          `/teams/member/${user.id}/team`,
        );
        team = teamRes.data;
      } catch {
        team = null;
      }
      try {
        const issuesRes = await api.get<CoordinatorUserIssue[]>(
          `/team-issues/by-user/${user.id}`,
        );
        issues = issuesRes.data;
      } catch {
        issues = [];
      }
    }

    if (user.role === "SUPERVISOR") {
      try {
        const overview = await proposalService.getSupervisorOverview(user.id);
        supervisedTeamCount = overview.activeCount;
      } catch {
        supervisedTeamCount = null;
      }
    }

    return { user, profile, team, issues, supervisedTeamCount };
  },
};
