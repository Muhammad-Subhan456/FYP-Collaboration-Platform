import type { AuthUserRecord, UserProfile } from "@/types/profile";

export type EvaluationType = "MID_VIVA" | "FINAL_VIVA";

export interface CoordinatorProposalStats {
  total?: number;
  pending?: number;
  approved?: number;
  rejected?: number;
  totalProposals?: number;
  pendingProposals?: number;
  assignedProposals?: number;
}

export interface GlobalAnnouncement {
  id: string;
  coordinatorId: string;
  title: string;
  message: string;
  createdAt: string;
}

export interface CoordinatorEvaluation {
  id: string;
  coordinatorId: string;
  title: string;
  type: EvaluationType;
  date: string;
  venue: string;
  remarks?: string | null;
  createdAt: string;
}

export interface PanelEvaluator {
  id: string;
  panelId: string;
  evaluatorId: string;
  role: string;
  createdAt: string;
}

export interface EvaluationPanel {
  id: string;
  evaluationId: string;
  room: string;
  scheduledAt?: string | null;
  remarks?: string | null;
  createdAt: string;
  evaluators?: PanelEvaluator[];
  evaluation?: CoordinatorEvaluation;
  assignments?: Array<{
    id: string;
    evaluationId: string;
    teamId: string;
    panelId?: string | null;
  }>;
}

export interface CoordinatorUserTeamContext {
  team: {
    id: string;
    name: string;
    domain: string;
    description?: string | null;
    maxMembers: number;
    leaderId: string;
    isOpen: boolean;
    createdAt: string;
  };
  membership: {
    id: string;
    teamId: string;
    authUserId: string;
    teamRole?: string | null;
    joinedAt: string;
  };
  memberCount: number;
  isLeader: boolean;
}

export interface CoordinatorUserTask {
  id: string;
  milestoneId: string;
  title: string;
  description?: string | null;
  assignedTo: string;
  dueDate?: string | null;
  status: string;
  createdAt: string;
  milestone?: {
    id: string;
    title: string;
    proposalId: string;
    dueDate: string;
    status: string;
  };
}

export interface CoordinatorUserDetail {
  user: AuthUserRecord;
  profile: UserProfile | null;
  team: CoordinatorUserTeamContext | null;
  tasks: CoordinatorUserTask[];
}

export interface ServiceHealth {
  name: string;
  status: string;
  database?: string;
  service?: string;
  timestamp?: string;
}

export interface SystemHealthResponse {
  status: string;
  service: string;
  services: ServiceHealth[];
  timestamp: string;
}
