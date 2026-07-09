export type RubricCriterionInput = {
  id?: string;
  title: string;
  description?: string;
  maxMarks: number;
  sortOrder?: number;
};

export function validateRubricCriteria(
  criteria: RubricCriterionInput[],
  totalMarks: number,
) {
  if (!criteria.length) {
    throw new Error('At least one rubric criterion is required');
  }

  const sum = criteria.reduce(
    (acc, criterion) => acc + criterion.maxMarks,
    0,
  );

  if (sum !== totalMarks) {
    throw new Error(
      `Rubric marks (${sum}) must equal total marks (${totalMarks})`,
    );
  }

  for (const criterion of criteria) {
    if (!criterion.title?.trim()) {
      throw new Error('Each rubric criterion must have a title');
    }

    if (criterion.maxMarks <= 0) {
      throw new Error(
        'Each rubric criterion must have positive max marks',
      );
    }
  }
}
