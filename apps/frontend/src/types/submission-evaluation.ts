export type SubmissionEvaluationStatus =
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "UNASSIGNED";

export interface SubmissionEvaluationPerson {
  id: string;
  fullName: string;
  email: string;
}

export interface EligibleEvaluatorAssignment {
  evaluationId: string;
  evaluatorId: string;
  evaluator: SubmissionEvaluationPerson | null;
  status: SubmissionEvaluationStatus;
}

export interface EligibleSubmissionRow {
  submissionId: string;
  deliverableId: string;
  teamId: string;
  teamName: string;
  templateId: string | null;
  deliverableTitle: string;
  phase: { id: string; name: string } | null;
  supervisor: SubmissionEvaluationPerson;
  submissionStatus: string;
  finalizedAt: string | null;
  fileUrl: string;
  evaluationStatus: SubmissionEvaluationStatus;
  evaluations: EligibleEvaluatorAssignment[];
  assignedEvaluatorCount: number;
  submittedEvaluatorCount: number;
}

export interface RubricCriterionScore {
  rubricCriterionId: string;
  marksAwarded: number;
}

export interface StudentEvaluationScoreInput {
  studentId: string;
  totalMarks: number;
  remarks?: string;
  criterionScores: RubricCriterionScore[];
}

export interface SubmissionEvaluationDetail {
  id: string;
  workspaceId: string;
  submissionId: string;
  deliverableId: string;
  teamId: string;
  teamName?: string;
  templateId: string;
  evaluatorId: string;
  status: SubmissionEvaluationStatus;
  submittedAt: string | null;
  supervisor?: SubmissionEvaluationPerson;
  submission: {
    id: string;
    fileUrl: string;
    version: number;
    finalizedAt: string | null;
    status: string;
  };
  deliverable: {
    id: string;
    title: string;
    supervisorId: string;
    phaseId: string;
    phase: { id: string; name: string } | null;
  };
  template: {
    id: string;
    title: string;
    totalMarks: number;
    weightagePercent: number;
    rubricCriteria: Array<{
      id: string;
      title: string;
      maxMarks: number;
      sortOrder: number;
    }>;
  };
  studentScores: Array<{
    id: string;
    studentId: string;
    totalMarks: number;
    remarks: string | null;
    criterionScores: Array<{
      rubricCriterionId: string;
      marksAwarded: number;
      rubricCriterion: {
        id: string;
        title: string;
        maxMarks: number;
        sortOrder: number;
      };
    }>;
  }>;
  teamMembers: Array<{
    authUserId: string;
    teamRole?: string | null;
  }>;
  isReadOnly: boolean;
}

export interface DeliverableBreakdownItem {
  templateId: string;
  deliverableTitle: string;
  totalMarks: number;
  weightagePercent: number;
  studentMarks: number;
  percentage: number;
  weightedContribution: number;
  evaluationStatus: "PENDING" | "SUBMITTED";
}

export interface StudentPhaseResult {
  id: string;
  phaseId: string;
  studentId: string;
  weightedMarks: number;
  gpa: number | null;
  isComplete: boolean;
  breakdown: DeliverableBreakdownItem[] | null;
  calculatedAt: string;
  phase: {
    id: string;
    name: string;
    creditHours: number;
    isConfigurationPublished?: boolean;
  };
}

export interface EvaluatorCriterionScore {
  evaluatorId: string;
  evaluatorName: string;
  marks: number;
}

export interface AveragedCriterionScore {
  rubricCriterionId: string;
  title: string;
  maxMarks: number;
  sortOrder: number;
  averageMarks: number;
  evaluatorScores: EvaluatorCriterionScore[];
}

export interface EvaluatorStudentScore {
  evaluationId: string;
  evaluatorId: string;
  evaluatorName: string;
  totalMarks: number;
  remarks: string | null;
  criterionScores: Array<{
    rubricCriterionId: string;
    title: string;
    maxMarks: number;
    marksAwarded: number;
  }>;
}

export interface AveragedStudentDeliverableScore {
  studentId: string;
  averageTotalMarks: number;
  criterionAverages: AveragedCriterionScore[];
  evaluatorScores: EvaluatorStudentScore[];
  submittedEvaluatorCount: number;
  assignedEvaluatorCount: number;
}

export interface DeliverableResultRow {
  submissionId: string;
  templateId: string;
  deliverableTitle: string;
  phase: { id: string; name: string } | null;
  template: {
    title: string;
    totalMarks: number;
    weightagePercent: number;
    rubricCriteria: Array<{
      id: string;
      title: string;
      maxMarks: number;
      sortOrder: number;
    }>;
  };
  submittedAt: string | null;
  averagedScore: AveragedStudentDeliverableScore | null;
  evaluators: Array<{
    evaluationId: string;
    evaluatorId: string;
    evaluatorName: string;
    status: SubmissionEvaluationStatus;
  }>;
}

export interface StudentResultsPayload {
  phaseResults: StudentPhaseResult[];
  deliverableResults: DeliverableResultRow[];
}

export interface CoordinatorDeliverableResult {
  submissionId: string;
  teamId: string;
  teamName: string;
  studentId: string;
  studentName: string;
  deliverableTitle: string;
  phase: { id: string; name: string } | null;
  supervisorName: string;
  template: {
    title: string;
    totalMarks: number;
    weightagePercent: number;
  };
  averagedScore: AveragedStudentDeliverableScore | null;
  evaluators: Array<{
    evaluationId: string;
    evaluatorId: string;
    evaluatorName: string;
    status: SubmissionEvaluationStatus;
  }>;
}

export interface CoordinatorPhaseResult extends StudentPhaseResult {
  studentName: string;
}

export interface CoordinatorResultsPayload {
  deliverableResults: CoordinatorDeliverableResult[];
  phaseResults: CoordinatorPhaseResult[];
}

export interface SupervisorResultsPayload {
  teams: Array<{ id: string; name: string }>;
  deliverableResults: Array<{
    submissionId: string;
    teamId: string;
    studentId: string;
    studentName: string;
    deliverableTitle: string;
    phase: { id: string; name: string } | null;
    template: {
      title: string;
      totalMarks: number;
      weightagePercent: number;
    };
    averagedScore: AveragedStudentDeliverableScore | null;
  }>;
  phaseResults: Array<StudentPhaseResult & { studentName: string }>;
}
