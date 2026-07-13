import api from "@/lib/axios";
import type { AuthUserRecord, UserProfile } from "@/types/profile";
import type { Proposal, Team, TeamMember } from "@/types/student";
import type { PaginatedResponse } from "@/types";
import type {
  CoordinatorDashboardOverview,
  CoordinatorUserStats,
} from "@/services/dashboard.service";
import type {
  CoordinatorEvaluation,
  EvaluationPanel,
  GlobalAnnouncement,
} from "@/types/coordinator";
import type { Notification } from "@/types/student";
import type { Supervisor } from "@/types/student";

export interface CoordinatorAnalyticsData {
  summary: {
    totalTeams: number;
    activePhases: number;
    deliverableTemplates: number;
    lockedTemplates: number;
    activeDeliverables: number;
    pendingEvaluations: number;
    finalizedSubmissions: number;
    publishedPhaseResults: number;
  };
  users: CoordinatorUserStats & { totalEvaluators?: number };
  proposalsByStatus: Record<string, number>;
  submissionsByStatus: Record<string, number>;
  evaluationsByStatus: Record<string, number>;
  phasesByStatus: Record<string, number>;
  templates: {
    total: number;
    locked: number;
    unlocked: number;
  };
}

export interface CoordinatorTeamsPageData {
  teams: Team[];
  membersByTeamId: Record<string, TeamMember[]>;
  profiles: Record<string, UserProfile>;
}

export interface CoordinatorProposalsPageData {
  proposals: Proposal[];
  profiles: Record<string, UserProfile>;
}

export interface CoordinatorEvaluationsPageData {
  evaluations: CoordinatorEvaluation[];
  teams: Team[];
  supervisors: Supervisor[];
  panelsByEvaluationId: Record<string, EvaluationPanel[]>;
  assignmentsByEvaluationId: Record<
    string,
    Array<{
      id: string;
      evaluationId: string;
      teamId: string;
      panelId?: string | null;
    }>
  >;
}

export interface CoordinatorResultsPageData {
  teams: Team[];
  overview: Array<{
    evaluationId: string;
    evaluationTitle: string;
    evaluationType: string;
    evaluationDate: string;
    evaluationVenue: string;
    teamId: string;
    marks: number | null;
    resultId: string | null;
    evaluated: boolean;
  }>;
}

export const coordinatorPageService = {
  getDashboard: async () => {
    const res = await api.get<CoordinatorDashboardOverview>(
      "/coordinator/dashboard",
    );
    return res.data;
  },

  getAnalytics: async () => {
    const res = await api.get<CoordinatorAnalyticsData>(
      "/coordinator/analytics",
    );
    return res.data;
  },

  getUsers: async () => {
    const res = await api.get<AuthUserRecord[]>("/coordinator/users");
    return res.data;
  },

  getTeams: async () => {
    const res = await api.get<CoordinatorTeamsPageData>(
      "/coordinator/teams",
    );
    return res.data;
  },

  getProposals: async () => {
    const res = await api.get<CoordinatorProposalsPageData>(
      "/coordinator/proposals",
    );
    return res.data;
  },

  getEvaluations: async () => {
    const res = await api.get<CoordinatorEvaluationsPageData>(
      "/coordinator/evaluations",
    );
    return res.data;
  },

  getResults: async () => {
    const res = await api.get<CoordinatorResultsPageData>(
      "/coordinator/results",
    );
    return res.data;
  },

  getAnnouncements: async () => {
    const res = await api.get<GlobalAnnouncement[]>(
      "/coordinator/announcements",
    );
    return res.data;
  },

  getNotifications: async (
    page = 1,
    limit = 20,
    readFilter: import("@/services/notification.service").NotificationReadFilter = "all",
  ) => {
    const isRead =
      readFilter === "unread"
        ? false
        : readFilter === "read"
          ? true
          : undefined;
    const res = await api.get<PaginatedResponse<Notification>>(
      "/coordinator/notifications",
      {
        params: {
          page,
          limit,
          ...(isRead === undefined ? {} : { isRead }),
        },
      },
    );
    return res.data;
  },

  getProfile: async () => {
    const res = await api.get<UserProfile>("/coordinator/profile");
    return res.data;
  },
};

export type { CoordinatorUserStats };
