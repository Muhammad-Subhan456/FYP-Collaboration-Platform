import type { SubmissionEvaluationStatus } from "@/types/submission-evaluation";

export const ALL_FILTER_VALUE = "all";

export type EvaluationFilterStatus = SubmissionEvaluationStatus | typeof ALL_FILTER_VALUE;

export type SubmissionStatusFilter =
  | typeof ALL_FILTER_VALUE
  | "FINALIZED"
  | "SUBMITTED"
  | "DRAFT";

export interface ResultsFilters {
  phaseId: string;
  templateId: string;
  teamId: string;
  supervisorId: string;
  evaluatorId: string;
  studentId: string;
  [key: string]: string;
}

export interface EvaluatorListFilters extends ResultsFilters {
  evaluationStatus: EvaluationFilterStatus;
  submissionStatus: SubmissionStatusFilter;
  [key: string]: string;
}

export const EMPTY_RESULTS_FILTERS: ResultsFilters = {
  phaseId: ALL_FILTER_VALUE,
  templateId: ALL_FILTER_VALUE,
  teamId: ALL_FILTER_VALUE,
  supervisorId: ALL_FILTER_VALUE,
  evaluatorId: ALL_FILTER_VALUE,
  studentId: ALL_FILTER_VALUE,
};

export const EMPTY_EVALUATOR_FILTERS: EvaluatorListFilters = {
  ...EMPTY_RESULTS_FILTERS,
  evaluationStatus: ALL_FILTER_VALUE,
  submissionStatus: ALL_FILTER_VALUE,
};

export type UnifiedFilterField =
  | "phase"
  | "deliverable"
  | "team"
  | "supervisor"
  | "evaluator"
  | "student"
  | "evaluationStatus"
  | "submissionStatus";

export function countActiveFilters(
  filters: Record<string, string>,
  fields: UnifiedFilterField[],
): number {
  return fields.filter((field) => {
    const key = FILTER_FIELD_KEYS[field];
    const value = filters[key];
    return value && value !== ALL_FILTER_VALUE;
  }).length;
}

export const FILTER_FIELD_KEYS: Record<UnifiedFilterField, string> = {
  phase: "phaseId",
  deliverable: "templateId",
  team: "teamId",
  supervisor: "supervisorId",
  evaluator: "evaluatorId",
  student: "studentId",
  evaluationStatus: "evaluationStatus",
  submissionStatus: "submissionStatus",
};

export function toApiFilterValue(value: string) {
  return value === ALL_FILTER_VALUE ? undefined : value;
}

export function buildResultsApiParams(filters: ResultsFilters) {
  return {
    phaseId: toApiFilterValue(filters.phaseId),
    templateId: toApiFilterValue(filters.templateId),
    teamId: toApiFilterValue(filters.teamId),
    supervisorId: toApiFilterValue(filters.supervisorId),
    evaluatorId: toApiFilterValue(filters.evaluatorId),
    studentId: toApiFilterValue(filters.studentId),
  };
}
