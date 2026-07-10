import api from "@/lib/axios";

import type {
  CoordinatorResultsPayload,
  StudentResultsPayload,
  SupervisorResultsPayload,
} from "@/types/submission-evaluation";

export const submissionResultsService = {
  getMyResults: async (params?: {
    phaseId?: string;
    templateId?: string;
  }) => {
    const res = await api.get<StudentResultsPayload>(
      "/submission-results/my",
      { params },
    );
    return res.data;
  },

  getSupervisorResults: async (params?: {
    phaseId?: string;
    templateId?: string;
    teamId?: string;
  }) => {
    const res = await api.get<SupervisorResultsPayload>(
      "/submission-results/supervisor",
      { params },
    );
    return res.data;
  },

  getCoordinatorResults: async (params?: {
    phaseId?: string;
    templateId?: string;
    supervisorId?: string;
    teamId?: string;
    studentId?: string;
    evaluatorId?: string;
  }) => {
    const res = await api.get<CoordinatorResultsPayload>(
      "/submission-results/coordinator",
      { params },
    );
    return res.data;
  },
};
