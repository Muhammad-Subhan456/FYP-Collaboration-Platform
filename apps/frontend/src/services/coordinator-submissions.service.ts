import api from "@/lib/axios";
import type { PaginatedResponse } from "@/types";
import type {
  CoordinatorFinalizedSubmission,
  CoordinatorSubmissionOverviewRow,
  FinalizedSubmissionSortBy,
} from "@/types/coordinator-submissions";

export const coordinatorSubmissionsService = {
  getFinalizedSubmissions: async (params?: {
    phaseId?: string;
    page?: number;
    limit?: number;
    sortBy?: FinalizedSubmissionSortBy;
    sortOrder?: "asc" | "desc";
  }) => {
    const res = await api.get<PaginatedResponse<CoordinatorFinalizedSubmission>>(
      "/coordinator/submissions/finalized",
      { params },
    );
    return res.data;
  },

  getOverview: async (phaseId?: string) => {
    const res = await api.get<CoordinatorSubmissionOverviewRow[]>(
      "/coordinator/submissions/overview",
      { params: phaseId ? { phaseId } : undefined },
    );
    return res.data;
  },

  sendReminder: async (payload: {
    templateId: string;
    supervisorId: string;
  }) => {
    const res = await api.post<{ success: boolean; lastReminderSentAt: string }>(
      "/coordinator/submissions/remind",
      payload,
    );
    return res.data;
  },
};
