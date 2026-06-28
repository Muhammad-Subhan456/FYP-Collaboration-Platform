"use client";

/**
 * @deprecated There is no Evaluator user role in FOASIS.
 * Panel evaluators are supervisors assigned via Coordinator → Evaluations.
 * Use hooks from @/queries/coordinator instead.
 */
export function useEvaluatorPageQuery() {
  throw new Error(
    "useEvaluatorPageQuery is removed — there is no Evaluator portal role.",
  );
}
