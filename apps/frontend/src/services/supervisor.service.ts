import api from "@/lib/axios";
import type { EvaluationPanel } from "@/types/coordinator";
import type {
  Announcement,
  EvaluationResult,
  Deliverable,
  DeliverableType,
  Milestone,
  MilestoneStatus,
  Submission,
  Task,
  TaskStatus,
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

export interface CreateMilestoneInput {
  proposalId: string;
  title: string;
  description?: string;
  dueDate: string;
}

export interface CreateTaskInput {
  milestoneId: string;
  title: string;
  description?: string;
  assignedTo: string;
  dueDate?: string;
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

  getMilestones: async (proposalId: string) => {
    const res = await api.get<Milestone[]>(`/milestones/${proposalId}`);
    return res.data;
  },

  createMilestone: async (data: CreateMilestoneInput) => {
    const res = await api.post<Milestone>("/milestones", data);
    return res.data;
  },

  updateMilestoneStatus: async (
    milestoneId: string,
    status: MilestoneStatus,
  ) => {
    const res = await api.patch<Milestone>(
      `/milestones/${milestoneId}/status`,
      { status },
    );
    return res.data;
  },

  getMilestoneTasks: async (milestoneId: string) => {
    const res = await api.get<Task[]>(`/tasks/milestone/${milestoneId}`);
    return res.data;
  },

  createTask: async (data: CreateTaskInput) => {
    const res = await api.post<Task>("/tasks", data);
    return res.data;
  },

  updateTaskStatus: async (taskId: string, status: TaskStatus) => {
    const res = await api.patch<Task>(`/tasks/${taskId}/status`, { status });
    return res.data;
  },

  getSupervisorStats: async () => {
    const res = await api.get("/stats/supervisor");
    return res.data;
  },

  getMyEvaluationPanels: async () => {
    const res = await api.get<EvaluationPanel[]>("/evaluation-panels/my");
    return res.data;
  },

  submitEvaluationResult: async (
    evaluationId: string,
    data: { teamId: string; marks: number; comments?: string },
  ) => {
    const res = await api.post(`/evaluation-results/${evaluationId}`, data);
    return res.data;
  },

  updateEvaluationResult: async (
    resultId: string,
    data: { marks: number; comments?: string },
  ) => {
    const res = await api.patch(`/evaluation-results/${resultId}`, data);
    return res.data;
  },

  getResultsForTeam: async (teamId: string) => {
    const res = await api.get<EvaluationResult[]>(
      `/evaluation-results/team/${teamId}`,
    );
    return res.data;
  },
};
