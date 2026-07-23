import { downloadCsv, rowsToCsv } from "@/lib/csv";
import { formatDate, formatGpa, formatGrade, formatPercent } from "@/lib/format";
import type {
  CoordinatorDeliverableResult,
  CoordinatorPhaseResult,
  StudentPhaseResult,
} from "@/types/submission-evaluation";

type PhaseGpaExportRow = StudentPhaseResult & { studentName: string };

type SupervisorDeliverableExportRow = {
  submissionId: string;
  studentName: string;
  deliverableTitle: string;
  phase: { id: string; name: string } | null;
  template: {
    title: string;
    totalMarks: number;
    weightagePercent: number;
  };
  averagedScore: CoordinatorDeliverableResult["averagedScore"];
};

function formatGradeImprovement(result: StudentPhaseResult): string {
  if (result.promotionApplied) {
    const details: string[] = ["Promoted +1"];
    if (result.promotedByName) {
      details.push(`by ${result.promotedByName}`);
    }
    if (result.promotedAt) {
      details.push(formatDate(result.promotedAt));
    }
    return details.join(" ");
  }

  if (result.promotionEligible) {
    return "Eligible for promotion";
  }

  return "—";
}

function formatEvaluatorMarks(
  averagedScore: CoordinatorDeliverableResult["averagedScore"],
  totalMarks: number,
): string {
  if (!averagedScore) {
    return "Pending";
  }

  return averagedScore.evaluatorScores
    .map(
      (score) =>
        `${score.evaluatorName}: ${score.totalMarks}/${totalMarks}`,
    )
    .join("; ");
}

function formatRubricAverages(
  averagedScore: CoordinatorDeliverableResult["averagedScore"],
): string {
  if (!averagedScore) {
    return "—";
  }

  return averagedScore.criterionAverages
    .map(
      (criterion) =>
        `${criterion.title}: ${criterion.averageMarks}/${criterion.maxMarks}`,
    )
    .join("; ");
}

function formatEvaluatorsList(row: CoordinatorDeliverableResult): string {
  if (row.evaluators.length === 0) {
    return "—";
  }

  return row.evaluators
    .map((evaluator) => `${evaluator.evaluatorName} (${evaluator.status})`)
    .join("; ");
}

function phaseGpaRows(rows: PhaseGpaExportRow[]): string[][] {
  const header = [
    "Phase",
    "Student",
    "Phase marks",
    "Grade",
    "GPA",
    "Status",
    "Grade improvement",
  ];

  const body = rows.map((result) => [
    result.phase.name,
    result.studentName,
    formatPercent(result.weightedMarks),
    formatGrade(result.grade),
    formatGpa(result.gpa),
    result.isComplete ? "Complete" : "In progress",
    formatGradeImprovement(result),
  ]);

  return [header, ...body];
}

function supervisorDeliverableRows(
  rows: SupervisorDeliverableExportRow[],
): string[][] {
  const header = [
    "Student",
    "Deliverable",
    "Phase",
    "Evaluator marks",
    "Criteria averages",
    "Combined total",
    "Weightage",
  ];

  const body = rows.map((row) => [
    row.studentName,
    row.deliverableTitle,
    row.phase?.name ?? "—",
    formatEvaluatorMarks(row.averagedScore, row.template.totalMarks),
    formatRubricAverages(row.averagedScore),
    row.averagedScore
      ? `${row.averagedScore.averageTotalMarks}/${row.template.totalMarks}`
      : "—",
    `${row.template.weightagePercent}%`,
  ]);

  return [header, ...body];
}

function coordinatorDeliverableRows(
  rows: CoordinatorDeliverableResult[],
): string[][] {
  const header = [
    "Student",
    "Deliverable",
    "Phase",
    "Team",
    "Supervisor",
    "Evaluators",
    "Evaluator marks",
    "Criteria averages",
    "Weightage",
    "Combined total",
  ];

  const body = rows.map((row) => [
    row.studentName,
    row.deliverableTitle,
    row.phase?.name ?? "—",
    row.teamName,
    row.supervisorName,
    formatEvaluatorsList(row),
    formatEvaluatorMarks(row.averagedScore, row.template.totalMarks),
    formatRubricAverages(row.averagedScore),
    `${row.template.weightagePercent}%`,
    row.averagedScore
      ? `${row.averagedScore.averageTotalMarks}/${row.template.totalMarks}`
      : "—",
  ]);

  return [header, ...body];
}

export function exportPhaseGpaSummaryCsv(
  rows: CoordinatorPhaseResult[] | PhaseGpaExportRow[],
  filename = "phase-gpa-summary.csv",
) {
  downloadCsv(filename, rowsToCsv(phaseGpaRows(rows)));
}

export function exportSupervisorDeliverableResultsCsv(
  rows: SupervisorDeliverableExportRow[],
  filename = "deliverable-results.csv",
) {
  downloadCsv(filename, rowsToCsv(supervisorDeliverableRows(rows)));
}

export function exportCoordinatorDeliverableResultsCsv(
  rows: CoordinatorDeliverableResult[],
  filename = "deliverable-results.csv",
) {
  downloadCsv(filename, rowsToCsv(coordinatorDeliverableRows(rows)));
}
