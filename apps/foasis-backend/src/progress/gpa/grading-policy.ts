/**
 * Official university grading policy.
 *
 * Maps a percentage (0–100) to a letter grade and grade points. This is the
 * single source of truth for grade/grade-point mapping across the backend.
 * The frontend mirrors this table in `lib/format.ts` for display only.
 *
 * | Percentage        | Grade | Grade Points |
 * | ----------------- | ----- | -----------: |
 * | 85+               | A     |         4.00 |
 * | 80–84             | A-    |         3.70 |
 * | 75–79             | B+    |         3.30 |
 * | 70–74             | B     |         3.00 |
 * | 65–69             | B-    |         2.70 |
 * | 61–64             | C+    |         2.30 |
 * | 58–60             | C     |         2.00 |
 * | 55–57             | C-    |         1.70 |
 * | 50–54             | D     |         1.00 |
 * | Below 50 / Absent | F     |         0.00 |
 */
export interface GradeResult {
  grade: string;
  gradePoints: number;
}

interface GradeBand {
  min: number;
  grade: string;
  gradePoints: number;
}

const GRADE_BANDS: GradeBand[] = [
  { min: 85, grade: 'A', gradePoints: 4.0 },
  { min: 80, grade: 'A-', gradePoints: 3.7 },
  { min: 75, grade: 'B+', gradePoints: 3.3 },
  { min: 70, grade: 'B', gradePoints: 3.0 },
  { min: 65, grade: 'B-', gradePoints: 2.7 },
  { min: 61, grade: 'C+', gradePoints: 2.3 },
  { min: 58, grade: 'C', gradePoints: 2.0 },
  { min: 55, grade: 'C-', gradePoints: 1.7 },
  { min: 50, grade: 'D', gradePoints: 1.0 },
];

const FAIL_GRADE: GradeResult = { grade: 'F', gradePoints: 0.0 };

function roundMarks(value: number) {
  return Math.round(value * 100) / 100;
}

export function resolveGrade(percentage: number): GradeResult {
  if (!Number.isFinite(percentage)) {
    return { ...FAIL_GRADE };
  }

  for (const band of GRADE_BANDS) {
    if (percentage >= band.min) {
      return { grade: band.grade, gradePoints: band.gradePoints };
    }
  }

  return { ...FAIL_GRADE };
}

export function calculateGradePoints(percentage: number): number {
  return resolveGrade(percentage).gradePoints;
}

export function resolveGradeLetter(percentage: number): string {
  return resolveGrade(percentage).grade;
}

/**
 * True when rounded marks sit exactly one point below a grade band minimum
 * (e.g. 49→50, 74→75, 84→85), so a single +1 promotion changes the letter grade.
 */
export function isOneMarkBelowNextGrade(percentage: number): boolean {
  if (!Number.isFinite(percentage)) {
    return false;
  }

  const base = roundMarks(percentage);
  return GRADE_BANDS.some((band) => roundMarks(band.min - 1) === base);
}
