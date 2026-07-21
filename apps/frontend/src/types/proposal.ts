import type { ProjectNature, ProposalStatus } from "@/types/student";

export interface ProposalDocumentMember {
  authUserId: string;
  isLeader: boolean;
  teamRole: string | null;
  fullName: string | null;
  registrationNumber: string | null;
  cgpa: number | null;
  email: string | null;
  phone: string | null;
}

export interface ProposalDocument {
  proposal: {
    id: string;
    projectCode: string | null;
    title: string;
    domain: string;
    domains: string[];
    otherDomain: string | null;
    nature: ProjectNature | null;
    sdgs: number[];
    sdgJustification: string | null;
    previousObjectives: string | null;
    abstract: string;
    proposalPdfUrl: string | null;
    status: ProposalStatus;
    assignedSupervisorId: string | null;
    pendingSupervisorId: string | null;
    pendingExpiresAt: string | null;
    reviewFeedback: string | null;
    reviewedAt: string | null;
    createdAt: string;
  };
  team: {
    id: string;
    name: string;
    maxMembers: number;
  };
  members: ProposalDocumentMember[];
  supervisorName: string | null;
}
