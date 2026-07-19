import api from "@/lib/axios";
import type {
  Announcement,
  Deliverable,
  DeliverableType,
  Submission,
} from "@/types/student";
import type { ReviewSubmissionInput } from "@/types/supervisor";

export interface CreateDeliverableInput {
  title: string;
  description: string;
  type: DeliverableType;
  dueDate: string;
  attachmentUrl?: string;
  teamIds: string[];
  attachments?: { fileUrl: string; fileName: string }[];
}

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  type?: string;
  dueDate?: string;
  teamIds: string[];
  attachments?: { fileUrl: string; fileName: string }[];
}

export interface UpdateAnnouncementInput {
  title?: string;
  message?: string;
  type?: string;
  dueDate?: string;
  attachments?: { fileUrl: string; fileName: string }[];
}

export const supervisorService = {
  getMyDeliverables: async () => {
    const res = await api.get<Deliverable[]>("/deliverables/my");
    return res.data;
  },

  createDeliverable: async (data: CreateDeliverableInput) => {
    const res = await api.post<Deliverable>("/deliverables", data);
    return res.data;
  },

  updateDeliverable: async (
    id: string,
    data: {
      isActive?: boolean;
      submissionsOpen?: boolean;
      title?: string;
      description?: string;
      type?: DeliverableType;
      dueDate?: string;
      attachments?: { fileUrl: string; fileName: string }[];
    },
  ) => {
    const res = await api.patch<Deliverable>(
      `/deliverables/${id}`,
      data,
    );
    return res.data;
  },

  extendDeliverableDeadline: async (
    id: string,
    data: { newDueDate: string; reason?: string },
  ) => {
    const res = await api.patch<{
      deliverable: Deliverable;
      extension: {
        id: string;
        previousDueDate: string;
        newDueDate: string;
        reason?: string | null;
      };
    }>(`/deliverables/${id}/extend-deadline`, data);
    return res.data;
  },

  getDeliverableSubmissions: async (deliverableId: string) => {
    const res = await api.get<Submission[]>(
      `/submissions/deliverable/${deliverableId}`,
    );
    return res.data;
  },

  getSubmissionDetail: async (submissionId: string) => {
    const res = await api.get<Submission>(
      `/submissions/detail/${submissionId}`,
    );
    return res.data;
  },

  getTeamSubmissions: async (teamId: string) => {
    const res = await api.get<Submission[]>(
      `/submissions/team/${teamId}`,
    );
    return res.data;
  },

  reviewSubmission: async (
    submissionId: string,
    data: ReviewSubmissionInput,
  ) => {
    const res = await api.patch<Submission>(
      `/submissions/${submissionId}/review`,
      data,
    );
    return res.data;
  },

  finalizeSubmission: async (submissionId: string) => {
    const res = await api.patch<Submission>(
      `/submissions/${submissionId}/finalize`,
    );
    return res.data;
  },

  unfinalizeSubmission: async (submissionId: string) => {
    const res = await api.patch<Submission>(
      `/submissions/${submissionId}/unfinalize`,
    );
    return res.data;
  },

  getMyAnnouncements: async () => {
    const res = await api.get<Announcement[]>("/announcements/my");
    return res.data;
  },

  createAnnouncement: async (data: CreateAnnouncementInput) => {
    const res = await api.post<Announcement | Announcement[]>(
      "/announcements",
      data,
    );
    return res.data;
  },

  updateAnnouncement: async (
    id: string,
    data: UpdateAnnouncementInput,
  ) => {
    const res = await api.patch<Announcement>(
      `/announcements/${id}`,
      data,
    );
    return res.data;
  },

  deleteAnnouncement: async (id: string) => {
    const res = await api.delete(`/announcements/${id}`);
    return res.data;
  },

  deleteDeliverable: async (id: string) => {
    const res = await api.delete(`/deliverables/${id}`);
    return res.data;
  },


  getSupervisorStats: async () => {
    const res = await api.get("/stats/supervisor");
    return res.data;
  },
};
