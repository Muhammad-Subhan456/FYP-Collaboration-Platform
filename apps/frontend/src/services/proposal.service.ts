import api from "@/lib/axios";
import type { Proposal, Supervisor } from "@/types/student";
import type {
  SupervisorInvitation,
  SupervisorRequest,
} from "@/types/supervisor";

export interface CreateProposalInput {
  teamId: string;
  title: string;
  domain: string;
  abstract: string;
}

export const proposalService = {
  getMyProposal: async () => {
    const res = await api.get<Proposal | null>("/proposals/my-proposal");
    return res.data;
  },

  createProposal: async (data: CreateProposalInput) => {
    const res = await api.post<Proposal>("/proposals", data);
    return res.data;
  },

  requestSupervisor: async (proposalId: string, supervisorId: string) => {
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

  rejectSupervisorRequest: async (requestId: string) => {
    const res = await api.post(
      `/proposals/requests/${requestId}/reject`,
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

  getSupervisedProposals: async () => {
    const res = await api.get<Proposal[]>("/proposals/supervised");
    return res.data;
  },
};
