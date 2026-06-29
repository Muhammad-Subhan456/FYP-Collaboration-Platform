import api from "@/lib/axios";
import type { PaginatedResponse } from "@/types";
import type { GlobalAnnouncement } from "@/types/coordinator";
import type { UserProfile } from "@/types/profile";
import type {
  ActivityLog,
  Announcement,
  Deliverable,
  EvaluationAssignment,
  Notification,
  Proposal,
  Team,
  TeamMember,
} from "@/types/student";

export interface StudentDashboardStats {
  pendingSubmissions: number;
  upcomingDeliverables: number;
  openIssues: number;
  assignedIssues: number;
  recentlyCompletedIssues: number;
  upcomingEvaluations: number;
}

export interface SupervisorDashboardStats {
  activeDeliverables: number;
  pendingReviews: number;
  supervisedTeams: number;
  activeTeams?: number;
  openIssues?: number;
  inProgressIssues?: number;
  recentlyCompletedIssues?: number;
}

export interface CoordinatorUserStats {
  totalStudents: number;
  totalSupervisors: number;
  totalCoordinators: number;
}

export interface CoordinatorProposalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalProposals?: number;
  pendingProposals?: number;
  assignedProposals?: number;
}

export interface CoordinatorProgressStats {
  pendingSubmissions: number;
  upcomingEvaluations: number;
  totalDeliverables: number;
  publishedResults: number;
  activeDeliverables?: number;
}

interface DashboardRecentActivity {
  notifications: PaginatedResponse<Notification>;
  activityLogs: ActivityLog[];
}

interface DashboardOverviewBase {
  globalAnnouncements: GlobalAnnouncement[];
  recentActivity: DashboardRecentActivity;
}

export interface StudentDashboardOverview extends DashboardOverviewBase {
  role: "STUDENT";
  team: Team | null;
  proposal: Proposal | null;
  stats: StudentDashboardStats;
  deliverables: Deliverable[];
  evaluations: EvaluationAssignment[];
  teamMembers: TeamMember[];
  announcements: Announcement[];
  supervisor: UserProfile | null;
}

export interface SupervisorDashboardOverview extends DashboardOverviewBase {
  role: "SUPERVISOR";
  stats: SupervisorDashboardStats;
  deliverables: Deliverable[];
  pendingRequests: Array<{
    id: string;
    proposal?: { title: string };
  }>;
  supervisedTeams: Array<{
    id: string;
    title: string;
    domain: string;
  }>;
}

export interface CoordinatorDashboardOverview extends DashboardOverviewBase {
  role: "COORDINATOR";
  users: CoordinatorUserStats;
  totalTeams: number;
  proposals: CoordinatorProposalStats;
  progress: CoordinatorProgressStats;
}

export type DashboardOverview =
  | StudentDashboardOverview
  | SupervisorDashboardOverview
  | CoordinatorDashboardOverview;

export const dashboardService = {
  getOverview: async () => {
    const res = await api.get<DashboardOverview>("/dashboard/overview");
    return res.data;
  },

  getStudent: async () => {
    const res = await api.get("/dashboard/student");
    return res.data;
  },

  getSupervisor: async () => {
    const res = await api.get("/dashboard/supervisor");
    return res.data;
  },

  getCoordinator: async () => {
    const res = await api.get("/dashboard/coordinator");
    return res.data;
  },
};
