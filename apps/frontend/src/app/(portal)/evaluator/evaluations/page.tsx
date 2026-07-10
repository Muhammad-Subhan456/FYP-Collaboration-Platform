"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { UnifiedFiltersDropdown } from "@/components/common/unified-filters-dropdown";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { ErrorState } from "@/components/common/state-blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";
import { submissionEvaluationService } from "@/services/submission-evaluation.service";
import {
  ALL_FILTER_VALUE,
  EMPTY_EVALUATOR_FILTERS,
  type EvaluatorListFilters,
} from "@/types/evaluation-filters";
import type { SubmissionEvaluationDetail } from "@/types/submission-evaluation";

function applyEvaluatorFilters(
  evaluations: SubmissionEvaluationDetail[],
  filters: EvaluatorListFilters,
) {
  return evaluations.filter((evaluation) => {
    if (
      filters.phaseId !== ALL_FILTER_VALUE &&
      evaluation.deliverable.phase?.id !== filters.phaseId
    ) {
      return false;
    }

    if (
      filters.templateId !== ALL_FILTER_VALUE &&
      evaluation.template.id !== filters.templateId
    ) {
      return false;
    }

    if (
      filters.teamId !== ALL_FILTER_VALUE &&
      evaluation.teamId !== filters.teamId
    ) {
      return false;
    }

    if (
      filters.supervisorId !== ALL_FILTER_VALUE &&
      evaluation.deliverable.supervisorId !== filters.supervisorId
    ) {
      return false;
    }

    if (
      filters.evaluationStatus !== ALL_FILTER_VALUE &&
      evaluation.status !== filters.evaluationStatus
    ) {
      return false;
    }

    if (
      filters.submissionStatus !== ALL_FILTER_VALUE &&
      evaluation.submission.status !== filters.submissionStatus
    ) {
      return false;
    }

    return true;
  });
}

function awardedMarksSummary(evaluation: SubmissionEvaluationDetail) {
  if (evaluation.status !== "SUBMITTED" || !evaluation.studentScores.length) {
    return "—";
  }

  const totals = evaluation.studentScores.map((score) => score.totalMarks);
  const average =
    totals.reduce((sum, value) => sum + value, 0) / totals.length;

  return `${average.toFixed(1)}/${evaluation.template.totalMarks} avg · ${totals.length} student${totals.length === 1 ? "" : "s"}`;
}

export default function EvaluatorEvaluationsPage() {
  const { user } = useAuth();
  const [filters, setFilters] =
    useState<EvaluatorListFilters>(EMPTY_EVALUATOR_FILTERS);

  const evaluationsQuery = useQuery({
    queryKey: queryKeys.evaluator.evaluations(user?.workspaceId),
    queryFn: () => submissionEvaluationService.getMyEvaluations(),
    enabled: !!user?.workspaceId,
  });

  const allEvaluations = evaluationsQuery.data ?? [];

  const filterOptions = useMemo(() => {
    const phases = new Map<string, string>();
    const deliverables = new Map<string, string>();
    const teams = new Map<string, string>();
    const supervisors = new Map<string, string>();

    for (const evaluation of allEvaluations) {
      if (evaluation.deliverable.phase) {
        phases.set(
          evaluation.deliverable.phase.id,
          evaluation.deliverable.phase.name,
        );
      }

      deliverables.set(evaluation.template.id, evaluation.template.title);
      teams.set(evaluation.teamId, evaluation.teamName ?? "Team");

      if (evaluation.supervisor) {
        supervisors.set(
          evaluation.supervisor.id,
          evaluation.supervisor.fullName,
        );
      }
    }

    return {
      phases: [...phases.entries()].map(([value, label]) => ({ value, label })),
      deliverables: [...deliverables.entries()].map(([value, label]) => ({
        value,
        label,
      })),
      teams: [...teams.entries()].map(([value, label]) => ({ value, label })),
      supervisors: [...supervisors.entries()].map(([value, label]) => ({
        value,
        label,
      })),
    };
  }, [allEvaluations]);

  const evaluations = useMemo(
    () => applyEvaluatorFilters(allEvaluations, filters),
    [allEvaluations, filters],
  );

  const pendingCount = useMemo(
    () =>
      allEvaluations.filter((evaluation) => evaluation.status !== "SUBMITTED")
        .length,
    [allEvaluations],
  );

  if (evaluationsQuery.isLoading) return <DashboardSkeleton />;

  if (evaluationsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(evaluationsQuery.error)}
        onRetry={() => evaluationsQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Evaluations</h1>
          <p className="text-sm text-muted-foreground">
            Assigned and completed evaluations in one place. {pendingCount}{" "}
            pending.
          </p>
        </div>
        <UnifiedFiltersDropdown
          fields={[
            "phase",
            "deliverable",
            "team",
            "supervisor",
            "evaluationStatus",
            "submissionStatus",
          ]}
          values={filters}
          options={filterOptions}
          onChange={(values) =>
            setFilters({ ...filters, ...values } as EvaluatorListFilters)
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My evaluations</CardTitle>
          <CardDescription>
            Open pending evaluations to score students, or review submitted
            marks and remarks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {evaluations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No evaluations match the current filters.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Deliverable</th>
                    <th className="px-3 py-2 text-left">Phase</th>
                    <th className="px-3 py-2 text-left">Team</th>
                    <th className="px-3 py-2 text-left">Supervisor</th>
                    <th className="px-3 py-2 text-left">Submission</th>
                    <th className="px-3 py-2 text-left">Evaluation</th>
                    <th className="px-3 py-2 text-left">Awarded marks</th>
                    <th className="px-3 py-2 text-left">Submitted</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((evaluation) => (
                    <tr key={evaluation.id} className="border-b align-top">
                      <td className="px-3 py-2 font-medium">
                        {evaluation.deliverable.title}
                      </td>
                      <td className="px-3 py-2">
                        {evaluation.deliverable.phase?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {evaluation.teamName ?? "Team"}
                      </td>
                      <td className="px-3 py-2">
                        {evaluation.supervisor?.fullName ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">
                          {evaluation.submission.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={
                            evaluation.status === "SUBMITTED"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {evaluation.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        {awardedMarksSummary(evaluation)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {evaluation.submittedAt
                          ? formatDateTime(evaluation.submittedAt)
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Button asChild size="sm">
                          <Link href={`/evaluator/evaluations/${evaluation.id}`}>
                            {evaluation.status === "SUBMITTED"
                              ? "View results"
                              : "Evaluate"}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
