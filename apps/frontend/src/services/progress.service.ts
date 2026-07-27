import api from "@/lib/axios";
import type { PaginatedResponse } from "@/types";
import type { GlobalAnnouncement } from "@/types/coordinator";
import type {
  ActivityLog,
  Announcement,
  Deliverable,
  EvaluationAssignment,
  EvaluationResult,
  Submission,
  UploadResponse,
} from "@/types/student";

export const progressService = {
  getDeliverablesForMyTeam: async () => {
    const res = await api.get<Deliverable[]>("/deliverables/for-my-team");
    return res.data;
  },

  getMySubmissions: async (page = 1, limit = 20) => {
    const res = await api.get<PaginatedResponse<Submission>>("/submissions/my", {
      params: { page, limit },
    });
    return res.data;
  },

  createSubmission: async (data: {
    deliverableId: string;
    fileUrl: string;
    attachments?: Array<{ fileUrl: string; fileName: string }>;
    remarks?: string;
  }) => {
    const res = await api.post<Submission>("/submissions", data);
    return res.data;
  },

  getSubmissionHistory: async (deliverableId: string, teamId: string) => {
    const res = await api.get<Submission[]>(
      `/submissions/${deliverableId}/team/${teamId}/history`,
    );
    return res.data;
  },

  getMyEvaluations: async () => {
    const res = await api.get<EvaluationAssignment[]>("/evaluations/my");
    return res.data;
  },

  getMyResults: async () => {
    const res = await api.get<EvaluationResult[]>("/evaluation-results/my");
    return res.data;
  },

  getGlobalAnnouncements: async () => {
    const res = await api.get<GlobalAnnouncement[]>("/global-announcements");
    return res.data;
  },

  getGlobalAnnouncementsPage: async (page = 1, limit = 6) => {
    const res = await api.get<PaginatedResponse<GlobalAnnouncement>>(
      "/global-announcements",
      { params: { page, limit } },
    );
    return res.data;
  },

  getAnnouncementsForMyTeam: async () => {
    const res = await api.get<Announcement[]>("/announcements/for-my-team");
    return res.data;
  },


  getMyActivityLogs: async () => {
    const res = await api.get<ActivityLog[]>("/activity-logs/my");
    return res.data;
  },

  getStudentStats: async () => {
    const res = await api.get("/stats/student");
    return res.data;
  },
};

export const uploadService = {
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<UploadResponse>("/uploads", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  uploadProposalPdf: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<UploadResponse>(
      "/uploads?type=proposal-pdf",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return res.data;
  },
};
