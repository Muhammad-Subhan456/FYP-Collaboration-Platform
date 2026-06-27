import api from "@/lib/axios";
import type { PaginatedResponse } from "@/types";
import type { UserProfile } from "@/types/profile";
import type { Supervisor } from "@/types/student";
import type {
  SupervisorInvitation,
  SupervisorRequest,
} from "@/types/supervisor";
import type {
  Announcement,
  Deliverable,
  EvaluationAssignment,
  EvaluationResult,
  JoinRequest,
  Meeting,
  Milestone,
  Notification,
  Proposal,
  Submission,
  Task,
  Team,
  TeamMember,
} from "@/types/student";
import type {
  DashboardOverview,
  StudentDashboardOverview,
} from "@/services/dashboard.service";
import type { StudentTeamOverview } from "@/services/team.service";

export interface StudentDeliverablesPageData {
  team: Team | null;
  deliverables: Deliverable[];
}

export interface StudentSubmissionsPageData {
  team: Team | null;
  deliverables: Deliverable[];
  submissions: PaginatedResponse<Submission>;
  submissionHistories: Record<string, Submission[]>;
}

export interface StudentAnnouncementsPageData {
  team: Team | null;
  announcements: Announcement[];
}

export interface StudentMeetingsPageData {
  team: Team | null;
  meetings: Meeting[];
  profiles: Record<string, UserProfile>;
}

export interface MilestoneWithTasks extends Milestone {
  tasks: Task[];
}

export interface StudentMilestonesPageData {
  team: Team | null;
  proposal: Proposal | null;
  milestones: MilestoneWithTasks[];
}

export interface StudentTasksPageData {
  team: Team | null;
  tasks: Task[];
}

export interface StudentEvaluationsPageData {
  team: Team | null;
  evaluations: EvaluationAssignment[];
}

export interface StudentResultsPageData {
  team: Team | null;
  results: EvaluationResult[];
}

export interface StudentProposalPageData {
  team: Team | null;
  proposal: Proposal | null;
  interests: SupervisorInvitation[];
  invitations: SupervisorInvitation[];
  supervisors: Supervisor[];
  requestHistory: Array<
    Omit<SupervisorRequest, "proposal"> & { proposal?: SupervisorRequest["proposal"] }
  >;
  pendingSupervisorId: string | null;
  hasPendingProposal: boolean;
  isWorkflowLocked: boolean;
  isProfileComplete: boolean;
  profiles: Record<string, UserProfile>;
}

export const studentService = {
  getDashboard: async () => {
    const res = await api.get<StudentDashboardOverview>("/student/dashboard");
    return res.data;
  },

  getTeam: async () => {
    const res = await api.get<StudentTeamOverview>("/student/team");
    return res.data;
  },

  getDeliverables: async () => {
    const res = await api.get<StudentDeliverablesPageData>(
      "/student/deliverables",
    );
    return res.data;
  },

  getSubmissions: async () => {
    const res = await api.get<StudentSubmissionsPageData>(
      "/student/submissions",
    );
    return res.data;
  },

  getAnnouncements: async () => {
    const res = await api.get<StudentAnnouncementsPageData>(
      "/student/announcements",
    );
    return res.data;
  },

  getMeetings: async () => {
    const res = await api.get<StudentMeetingsPageData>("/student/meetings");
    return res.data;
  },

  getMilestones: async () => {
    const res = await api.get<StudentMilestonesPageData>(
      "/student/milestones",
    );
    return res.data;
  },

  getTasks: async () => {
    const res = await api.get<StudentTasksPageData>("/student/tasks");
    return res.data;
  },

  getEvaluations: async () => {
    const res = await api.get<StudentEvaluationsPageData>(
      "/student/evaluations",
    );
    return res.data;
  },

  getResults: async () => {
    const res = await api.get<StudentResultsPageData>("/student/results");
    return res.data;
  },

  getNotifications: async (page = 1, limit = 20) => {
    const res = await api.get<PaginatedResponse<Notification>>(
      "/student/notifications",
      { params: { page, limit } },
    );
    return res.data;
  },

  getProfile: async () => {
    const res = await api.get<UserProfile>("/student/profile");
    return res.data;
  },

  getProposal: async () => {
    const res = await api.get<StudentProposalPageData>("/student/proposal");
    return res.data;
  },
};

export type { DashboardOverview };
