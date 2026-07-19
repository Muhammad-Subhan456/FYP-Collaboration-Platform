export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

const proposalStatusLabels: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_SUPERVISOR: "Awaiting supervisor",
  SUPERVISOR_ASSIGNED: "Ready for review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function formatProposalStatus(status?: string | null) {
  if (!status) return "—";
  return proposalStatusLabels[status] ?? status.replace(/_/g, " ");
}

export function pluralize(
  count: number,
  singular: string,
  plural?: string,
) {
  const word = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${word}`;
}

export function formatGpa(gpa: number | null | undefined) {
  if (gpa === null || gpa === undefined) {
    return "—";
  }
  return Number(gpa).toFixed(2);
}

export function formatPercent(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`;
}

/**
 * Official university grading policy (mirrors backend `grading-policy.ts`).
 * Maps a percentage (0–100) to a letter grade and grade points.
 */
const GRADE_BANDS: Array<{ min: number; grade: string; gradePoints: number }> = [
  { min: 85, grade: "A", gradePoints: 4.0 },
  { min: 80, grade: "A-", gradePoints: 3.7 },
  { min: 75, grade: "B+", gradePoints: 3.3 },
  { min: 70, grade: "B", gradePoints: 3.0 },
  { min: 65, grade: "B-", gradePoints: 2.7 },
  { min: 61, grade: "C+", gradePoints: 2.3 },
  { min: 58, grade: "C", gradePoints: 2.0 },
  { min: 55, grade: "C-", gradePoints: 1.7 },
  { min: 50, grade: "D", gradePoints: 1.0 },
];

export function resolveGrade(percentage: number): {
  grade: string;
  gradePoints: number;
} {
  if (!Number.isFinite(percentage)) {
    return { grade: "F", gradePoints: 0.0 };
  }
  for (const band of GRADE_BANDS) {
    if (percentage >= band.min) {
      return { grade: band.grade, gradePoints: band.gradePoints };
    }
  }
  return { grade: "F", gradePoints: 0.0 };
}

export function formatGrade(grade: string | null | undefined) {
  if (!grade) {
    return "—";
  }
  return grade;
}
