import api from "@/lib/axios";
import type { UserProfile } from "@/types/profile";
import type {
  Announcement,
  Deliverable,
  Proposal,
  Submission,
  TeamMember,
} from "@/types/student";
import type {
  SupervisorDashboardOverview,
} from "@/services/dashboard.service";
import type { SupervisorInvitation, SupervisorRequest } from "@/types/supervisor";
import type { PaginatedResponse } from "@/types";
import type { Notification } from "@/types/student";
import type { SupervisorMilestonesPageData } from "@/types/team-issue";

export interface SupervisorTeamsPageData {
  proposals: Proposal[];
  membersByTeamId: Record<string, TeamMember[]>;
  profiles: Record<string, UserProfile>;
}

export interface InvitationBrowseTarget {
  inviteKey: string;
  kind: "team" | "proposal";
  teamId: string;
  proposalId?: string | null;
  teamName: string;
  domain: string;
  title?: string | null;
  abstract?: string | null;
  teamLeaderAuthUserId?: string | null;
  availability: "AVAILABLE" | "UNAVAILABLE";
  canInvite: boolean;
  invitationSent: boolean;
}

export interface SupervisorInvitationsPageData {
  browseTargets: InvitationBrowseTarget[];
  invitations: SupervisorInvitation[];
  profiles: Record<string, UserProfile>;
  atCapacity: boolean;
}

export interface SupervisorRequestsPageData {
  proposals: Proposal[];
  profiles: Record<string, UserProfile>;
}

export interface SupervisorReviewsPageData {
  deliverables: Deliverable[];
  supervisedProposals: Proposal[];
  selectedDeliverableId: string | null;
  submissions: Submission[];
}

export const supervisorPageService = {
  getDashboard: async () => {
    const res = await api.get<SupervisorDashboardOverview>(
      "/supervisor/dashboard",
    );
    return res.data;
  },

  getTeams: async () => {
    const res = await api.get<SupervisorTeamsPageData>("/supervisor/teams");
    return res.data;
  },

  getDeliverables: async () => {
    const res = await api.get<Deliverable[]>("/supervisor/deliverables");
    return res.data;
  },

  getAnnouncements: async () => {
    const res = await api.get<Announcement[]>("/supervisor/announcements");
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
      "/supervisor/notifications",
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
    const res = await api.get<UserProfile>("/supervisor/profile");
    return res.data;
  },

  getRequests: async () => {
    const res = await api.get<SupervisorRequestsPageData>(
      "/supervisor/requests",
    );
    return res.data;
  },

  getInvitations: async () => {
    const res = await api.get<SupervisorInvitationsPageData>(
      "/supervisor/invitations",
    );
    return res.data;
  },

  getReviews: async (deliverableId?: string) => {
    const res = await api.get<SupervisorReviewsPageData>(
      "/supervisor/reviews",
      { params: deliverableId ? { deliverableId } : undefined },
    );
    return res.data;
  },

  getMilestones: async (teamId?: string) => {
    const res = await api.get<SupervisorMilestonesPageData>(
      "/supervisor/milestones",
      { params: teamId ? { teamId } : undefined },
    );
    return res.data;
  },

  getWorkStream: async (teamId?: string, phaseId?: string) => {
    const res = await api.get<
      import("@/types/work-stream").SupervisorWorkStreamPageData
    >("/supervisor/work-stream", {
      params: {
        ...(teamId ? { teamId } : {}),
        ...(phaseId ? { phaseId } : {}),
      },
    });
    return res.data;
  },
};
