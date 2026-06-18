import type { Proposal } from "@/types/student";

export type RequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED";

export interface SupervisorRequest {
  id: string;
  proposalId: string;
  supervisorId: string;
  status: RequestStatus;
  createdAt: string;
  proposal: Proposal;
}

export interface SupervisorInvitation {
  id: string;
  proposalId: string;
  supervisorId: string;
  status: RequestStatus;
  createdAt: string;
  proposal: Proposal;
}

export interface ReviewSubmissionInput {
  status: "APPROVED" | "CHANGES_REQUIRED";
  feedback?: string;
  grade?: number;
}
