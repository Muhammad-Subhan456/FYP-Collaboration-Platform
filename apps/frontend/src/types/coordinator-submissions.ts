export interface CoordinatorSubmissionPerson {
  id: string;
  fullName: string;
  email: string;
}

export interface CoordinatorFinalizedSubmission {
  id: string;
  version: number;
  status: string;
  fileUrl: string;
  finalizedAt: string | null;
  submittedAt: string;
  deliverable: {
    id: string;
    title: string;
    phase: { id: string; name: string } | null;
    template: { id: string; title: string } | null;
  };
  team: {
    id: string;
    name: string;
  };
  supervisor: CoordinatorSubmissionPerson;
  evaluator: null;
}

export interface CoordinatorSubmissionOverviewRow {
  templateId: string;
  deliverableTitle: string;
  phaseId: string;
  phaseName: string;
  supervisorId: string;
  supervisor: CoordinatorSubmissionPerson;
  assignedTeamCount: number;
  submittedTeamCount: number;
  pendingTeamCount: number;
  progressLabel: string;
  deliverableIds: string[];
  pendingTeamIds: string[];
  lastReminderSentAt: string | null;
}

export type FinalizedSubmissionSortBy =
  | "finalizedAt"
  | "deliverable"
  | "team"
  | "supervisor";
