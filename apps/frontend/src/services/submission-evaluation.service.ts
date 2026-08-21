import api from "@/lib/axios";

import type {
  EligibleSubmissionRow,
  StudentEvaluationScoreInput,
  SubmissionEvaluationDetail,
  SubmissionEvaluationPerson,
  SubmissionEvaluationStatus,
} from "@/types/submission-evaluation";

export const submissionEvaluationService = {
  listEligible: async (params?: {
    phaseId?: string;
    templateId?: string;
    supervisorId?: string;
    teamId?: string;
    evaluationStatus?: SubmissionEvaluationStatus;
    evaluatorId?: string;
  }) => {
    const res = await api.get<EligibleSubmissionRow[]>(
      "/submission-evaluations/eligible",
      { params },
    );
    return res.data;
  },

  listEvaluators: async () => {
    const res = await api.get<SubmissionEvaluationPerson[]>(
      "/submission-evaluations/evaluators",
    );
    return res.data;
  },

  assignEvaluator: async (payload: {
    submissionId: string;
    evaluatorId: string;
  }) => {
    const res = await api.post("/submission-evaluations/assign", payload);
    return res.data;
  },

  assignEvaluators: async (payload: {
    submissionId: string;
    evaluatorIds: string[];
  }) => {
    const res = await api.post("/submission-evaluations/assign-many", payload);
    return res.data;
  },

  assignSupervisorAsEvaluator: async (payload: { submissionId: string }) => {
    const res = await api.post(
      "/submission-evaluations/assign-supervisor",
      payload,
    );
    return res.data;
  },

  remindEvaluators: async (payload: {
    submissionId: string;
    evaluatorIds?: string[];
  }) => {
    const res = await api.post<{
      success: boolean;
      remindedCount: number;
      remindedAt: string;
    }>("/submission-evaluations/remind", payload);
    return res.data;
  },

  getMyEvaluations: async (status?: SubmissionEvaluationStatus) => {
    const res = await api.get<SubmissionEvaluationDetail[]>(
      "/submission-evaluations/my",
      { params: status ? { status } : undefined },
    );
    return res.data;
  },

  getEvaluation: async (id: string) => {
    const res = await api.get<SubmissionEvaluationDetail>(
      `/submission-evaluations/${id}`,
    );
    return res.data;
  },

  saveDraft: async (
    id: string,
    payload: { studentScores: StudentEvaluationScoreInput[] },
  ) => {
    const res = await api.post<SubmissionEvaluationDetail>(
      `/submission-evaluations/${id}/draft`,
      payload,
    );
    return res.data;
  },

  submitEvaluation: async (
    id: string,
    payload: { studentScores: StudentEvaluationScoreInput[] },
  ) => {
    const res = await api.post<SubmissionEvaluationDetail>(
      `/submission-evaluations/${id}/submit`,
      payload,
    );
    return res.data;
  },
};
