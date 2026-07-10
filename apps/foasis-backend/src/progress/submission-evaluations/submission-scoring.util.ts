import { SubmissionEvaluationStatus } from '@prisma/client';

type CriterionScoreRow = {
  rubricCriterionId: string;
  marksAwarded: number;
  rubricCriterion: {
    id: string;
    title: string;
    maxMarks: number;
    sortOrder?: number;
  };
};

type StudentScoreRow = {
  studentId: string;
  totalMarks: number;
  remarks: string | null;
  criterionScores: CriterionScoreRow[];
};

type EvaluationRow = {
  id: string;
  evaluatorId: string;
  status: SubmissionEvaluationStatus;
  submittedAt: Date | null;
  studentScores: StudentScoreRow[];
};

export type EvaluatorCriterionScore = {
  evaluatorId: string;
  evaluatorName: string;
  marks: number;
};

export type AveragedCriterionScore = {
  rubricCriterionId: string;
  title: string;
  maxMarks: number;
  sortOrder: number;
  averageMarks: number;
  evaluatorScores: EvaluatorCriterionScore[];
};

export type EvaluatorStudentScore = {
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
};

export type AveragedStudentDeliverableScore = {
  studentId: string;
  averageTotalMarks: number;
  criterionAverages: AveragedCriterionScore[];
  evaluatorScores: EvaluatorStudentScore[];
  submittedEvaluatorCount: number;
  assignedEvaluatorCount: number;
};

export function resolveEvaluationAggregateStatus(
  assignments: Array<{ status: SubmissionEvaluationStatus }>,
): 'UNASSIGNED' | 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' {
  if (!assignments.length) {
    return 'UNASSIGNED';
  }

  const statuses = assignments.map((item) => item.status);
  if (statuses.every((status) => status === 'SUBMITTED')) {
    return 'SUBMITTED';
  }
  if (statuses.some((status) => status === 'IN_PROGRESS')) {
    return 'IN_PROGRESS';
  }
  if (statuses.every((status) => status === 'ASSIGNED')) {
    return 'ASSIGNED';
  }
  if (statuses.some((status) => status === 'SUBMITTED')) {
    return 'IN_PROGRESS';
  }

  return 'ASSIGNED';
}

export function averageStudentDeliverableScores(
  evaluations: EvaluationRow[],
  studentId: string,
  evaluatorNames: Map<string, string>,
  rubricCriteria: Array<{
    id: string;
    title: string;
    maxMarks: number;
    sortOrder: number;
  }>,
): AveragedStudentDeliverableScore | null {
  const submittedEvaluations = evaluations.filter(
    (evaluation) => evaluation.status === 'SUBMITTED',
  );

  const evaluatorScores: EvaluatorStudentScore[] = submittedEvaluations
    .map((evaluation) => {
      const studentScore = evaluation.studentScores.find(
        (score) => score.studentId === studentId,
      );
      if (!studentScore) {
        return null;
      }

      return {
        evaluationId: evaluation.id,
        evaluatorId: evaluation.evaluatorId,
        evaluatorName:
          evaluatorNames.get(evaluation.evaluatorId) ?? 'Evaluator',
        totalMarks: studentScore.totalMarks,
        remarks: studentScore.remarks,
        criterionScores: studentScore.criterionScores.map((score) => ({
          rubricCriterionId: score.rubricCriterionId,
          title: score.rubricCriterion.title,
          maxMarks: score.rubricCriterion.maxMarks,
          marksAwarded: score.marksAwarded,
        })),
      };
    })
    .filter((row): row is EvaluatorStudentScore => row !== null);

  if (!evaluatorScores.length) {
    return null;
  }

  const criterionAverages = rubricCriteria.map((criterion) => {
    const evaluatorCriterionScores: EvaluatorCriterionScore[] =
      evaluatorScores
        .map((evaluatorScore) => {
          const match = evaluatorScore.criterionScores.find(
            (score) => score.rubricCriterionId === criterion.id,
          );
          if (!match) {
            return null;
          }
          return {
            evaluatorId: evaluatorScore.evaluatorId,
            evaluatorName: evaluatorScore.evaluatorName,
            marks: match.marksAwarded,
          };
        })
        .filter((row): row is EvaluatorCriterionScore => row !== null);

    const averageMarks =
      evaluatorCriterionScores.length > 0
        ? evaluatorCriterionScores.reduce((sum, item) => sum + item.marks, 0) /
          evaluatorCriterionScores.length
        : 0;

    return {
      rubricCriterionId: criterion.id,
      title: criterion.title,
      maxMarks: criterion.maxMarks,
      sortOrder: criterion.sortOrder,
      averageMarks: Math.round(averageMarks * 100) / 100,
      evaluatorScores: evaluatorCriterionScores,
    };
  });

  const averageTotalMarks =
    Math.round(
      (evaluatorScores.reduce((sum, item) => sum + item.totalMarks, 0) /
        evaluatorScores.length) *
        100,
    ) / 100;

  return {
    studentId,
    averageTotalMarks,
    criterionAverages,
    evaluatorScores,
    submittedEvaluatorCount: submittedEvaluations.length,
    assignedEvaluatorCount: evaluations.length,
  };
}

export function averageTemplateScoreForStudent(
  evaluations: EvaluationRow[],
  studentId: string,
): number | null {
  const totals = evaluations
    .filter((evaluation) => evaluation.status === 'SUBMITTED')
    .map(
      (evaluation) =>
        evaluation.studentScores.find((score) => score.studentId === studentId)
          ?.totalMarks,
    )
    .filter((value): value is number => value !== undefined);

  if (!totals.length) {
    return null;
  }

  return (
    Math.round(
      (totals.reduce((sum, value) => sum + value, 0) / totals.length) * 100,
    ) / 100
  );
}
