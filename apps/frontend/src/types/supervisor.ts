import type { Proposal } from "@/types/student";

export type RequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "IGNORED"
  | "CANCELLED";

export interface SupervisorRequest {
  id: string;
  proposalId: string;
  supervisorId: string;
  status: RequestStatus;
  rejectionReason?: string | null;
  expiresAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  proposal: Proposal;
}

export interface SupervisorInvitation {
  id: string;
  proposalId?: string | null;
  teamId?: string | null;
  supervisorId: string;
  status: RequestStatus;
  createdAt: string;
  proposal?: Proposal | null;
}

export interface ReviewSubmissionInput {
  status: "APPROVED" | "CHANGES_REQUIRED";
  feedback?: string;
  grade?: number;
}
