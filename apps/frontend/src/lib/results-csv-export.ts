import { downloadCsv, rowsToCsv } from "@/lib/csv";
import { formatGpa, formatGrade, formatPercent } from "@/lib/format";
import type {
  CoordinatorDeliverableResult,
  CoordinatorPhaseResult,
  DeliverableBreakdownItem,
  StudentPhaseResult,
} from "@/types/submission-evaluation";

type PhaseGpaExportRow = StudentPhaseResult & {
  studentName: string;
  registrationNumber?: string | null;
};

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

export type PhaseGpaDeliverableColumn = {
  templateId: string;
  title: string;
  totalMarks: number;
};

export function buildPhaseGpaDeliverableColumns(
  rows: Array<{ breakdown: DeliverableBreakdownItem[] | null }>,
): PhaseGpaDeliverableColumn[] {
  const columns = new Map<string, PhaseGpaDeliverableColumn>();
  for (const row of rows) {
    for (const item of row.breakdown ?? []) {
      if (!columns.has(item.templateId)) {
        columns.set(item.templateId, {
          templateId: item.templateId,
          title: item.deliverableTitle,
          totalMarks: item.totalMarks,
        });
      }
    }
  }
  return [...columns.values()];
}

export function getBreakdownMarks(
  breakdown: DeliverableBreakdownItem[] | null | undefined,
  templateId: string,
): number | null {
  const item = (breakdown ?? []).find(
    (entry) => entry.templateId === templateId,
  );
  if (!item) {
    return null;
  }
  if (item.evaluationStatus === "PENDING") {
    return null;
  }
  return item.studentMarks;
}

export function sumPhaseDeliverableTotals(
  columns: PhaseGpaDeliverableColumn[],
): number {
  return columns.reduce((sum, column) => sum + column.totalMarks, 0);
}

export function sumObtainedDeliverableMarks(
  breakdown: DeliverableBreakdownItem[] | null | undefined,
  columns: PhaseGpaDeliverableColumn[],
): number | null {
  let total = 0;
  let hasAny = false;
  for (const column of columns) {
    const marks = getBreakdownMarks(breakdown, column.templateId);
    if (marks == null) {
      continue;
    }
    hasAny = true;
    total += marks;
  }
  return hasAny ? total : null;
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
  const columns = buildPhaseGpaDeliverableColumns(rows);
  const totalMax = sumPhaseDeliverableTotals(columns);

  const header = [
    "Name",
    "Roll Number",
    "Phase",
    ...columns.map((column) => `${column.title} (${column.totalMarks})`),
    `Total (${totalMax})`,
    "Percentage",
    "Grade",
    "Phase GPA",
  ];

  const body = rows.map((result) => {
    const obtained = sumObtainedDeliverableMarks(result.breakdown, columns);
    return [
      result.studentName,
      result.registrationNumber?.trim() || "—",
      result.phase.name,
      ...columns.map((column) => {
        const marks = getBreakdownMarks(result.breakdown, column.templateId);
        return marks == null ? "—" : String(marks);
      }),
      obtained == null ? "—" : String(obtained),
      formatPercent(result.weightedMarks),
      formatGrade(result.grade),
      formatGpa(result.gpa),
    ];
  });

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
  filename = "coordinator-deliverable-results.csv",
) {
  downloadCsv(filename, rowsToCsv(coordinatorDeliverableRows(rows)));
}
