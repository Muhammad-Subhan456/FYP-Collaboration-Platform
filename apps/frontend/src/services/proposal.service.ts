import api from "@/lib/axios";
import type { Proposal, Supervisor } from "@/types/student";
import type { ProposalDocument } from "@/types/proposal";
import type {
  SupervisorInvitation,
  SupervisorRequest,
} from "@/types/supervisor";

export interface CreateProposalInput {
  teamId: string;
  title: string;
  domain: string;
  abstract: string;
  proposalPdfUrl: string;
}

export const proposalService = {
  getMyProposal: async () => {
    const res = await api.get<Proposal | null>("/proposals/my-proposal");
    return res.data;
  },

  getProposalDocument: async (proposalId: string) => {
    const res = await api.get<ProposalDocument>(
      `/proposals/${proposalId}/document`,
    );
    return res.data;
  },

  createProposal: async (data: CreateProposalInput) => {
    const res = await api.post<Proposal>("/proposals", data);
    return res.data;
  },

  requestSupervisor: async (supervisorId: string) => {
    const res = await api.post(
      "/proposals/my-team/request-supervisor",
      { supervisorId },
    );
    return res.data;
  },

  requestSupervisorByProposalId: async (
    proposalId: string,
    supervisorId: string,
  ) => {
    const res = await api.post(
      `/proposals/${proposalId}/request-supervisor`,
      { supervisorId },
    );
    return res.data;
  },

  getSupervisors: async () => {
    const res = await api.get<Supervisor[]>("/auth/supervisors");
    return res.data;
  },

  getSupervisorRequests: async () => {
    const res = await api.get<SupervisorRequest[]>(
      "/proposals/supervisor/requests",
    );
    return res.data;
  },

  acceptSupervisorRequest: async (requestId: string) => {
    const res = await api.post(
      `/proposals/requests/${requestId}/accept`,
    );
    return res.data;
  },

  rejectSupervisorRequest: async (requestId: string, reason: string) => {
    const res = await api.post(
      `/proposals/requests/${requestId}/reject`,
      { reason },
    );
    return res.data;
  },

  getAvailableProposals: async () => {
    const res = await api.get<Proposal[]>("/proposals");
    return res.data;
  },

  getSupervisorInvitations: async () => {
    const res = await api.get<SupervisorInvitation[]>(
      "/proposals/supervisor/invitations",
    );
    return res.data;
  },

  inviteProposal: async (proposalId: string) => {
    const res = await api.post(`/proposals/${proposalId}/invite`);
    return res.data;
  },

  inviteTeam: async (teamId: string) => {
    const res = await api.post(`/proposals/teams/${teamId}/invite`);
    return res.data;
  },

  getSupervisedProposals: async () => {
    const res = await api.get<Proposal[]>("/proposals/supervised");
    return res.data;
  },

  getTeamInvitations: async () => {
    const res = await api.get<SupervisorInvitation[]>(
      "/proposals/my-invitations",
    );
    return res.data;
  },

  acceptInvitation: async (_invitationId: string) => {
    throw new Error(
      "Students cannot accept supervision. Send a proposal instead.",
    );
  },

  ignoreInterest: async (invitationId: string) => {
    const res = await api.post(
      `/proposals/invitations/${invitationId}/ignore`,
    );
    return res.data;
  },

  rejectInvitation: async (invitationId: string) => {
    const res = await api.post(
      `/proposals/invitations/${invitationId}/ignore`,
    );
    return res.data;
  },

  getSupervisorReviewQueue: async () => {
    const res = await api.get<Proposal[]>(
      "/proposals/supervisor/review-queue",
    );
    return res.data;
  },

  getSupervisorOverview: async (supervisorId: string) => {
    const res = await api.get<{
      supervisedProposals: Array<{
        id: string;
        title: string;
        domain: string;
        status: string;
        teamId: string;
        createdAt: string;
      }>;
      activeCount: number;
      approvedCount: number;
      totalCount: number;
    }>(`/proposals/supervisor/${supervisorId}/overview`);
    return res.data;
  },

  approveProposal: async (proposalId: string) => {
    const res = await api.patch<Proposal>(
      `/proposals/${proposalId}/approve`,
    );
    return res.data;
  },

  rejectProposal: async (proposalId: string, reason: string) => {
    const res = await api.patch<Proposal>(
      `/proposals/${proposalId}/reject`,
      { reason },
    );
    return res.data;
  },

  resubmitProposal: async (data: {
    title: string;
    domain: string;
    abstract: string;
    proposalPdfUrl?: string;
  }) => {
    const res = await api.patch<Proposal>(
      "/proposals/my-proposal/resubmit",
      data,
    );
    return res.data;
  },
};
