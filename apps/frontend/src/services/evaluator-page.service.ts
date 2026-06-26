import api from "@/lib/axios";
import type { EvaluationPanel } from "@/types/coordinator";
import type { UserProfile } from "@/types/profile";
import type { EvaluationResult } from "@/types/student";
import type { PaginatedResponse } from "@/types";
import type { Notification } from "@/types/student";

export interface EvaluatorDashboardPageData {
  panels: EvaluationPanel[];
  teamNameById: Record<string, string>;
  recentNotifications: PaginatedResponse<Notification>;
}

export interface EvaluatorEvaluationsPageData {
  panels: EvaluationPanel[];
  teamNameById: Record<string, string>;
  results: EvaluationResult[];
}

export const evaluatorPageService = {
  getDashboard: async () => {
    const res = await api.get<EvaluatorDashboardPageData>(
      "/evaluator/dashboard",
    );
    return res.data;
  },

  getEvaluations: async () => {
    const res = await api.get<EvaluatorEvaluationsPageData>(
      "/evaluator/evaluations",
    );
    return res.data;
  },

  getResults: async () => {
    const res = await api.get<EvaluatorEvaluationsPageData>(
      "/evaluator/results",
    );
    return res.data;
  },

  getNotifications: async (page = 1, limit = 20) => {
    const res = await api.get<PaginatedResponse<Notification>>(
      "/evaluator/notifications",
      { params: { page, limit } },
    );
    return res.data;
  },

  getProfile: async () => {
    const res = await api.get<UserProfile>("/evaluator/profile");
    return res.data;
  },
};
