"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { UnifiedFiltersDropdown } from "@/components/common/unified-filters-dropdown";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useResultsFilterOptions } from "@/hooks/use-results-filter-options";
import { formatGpa, formatPercent } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";
import { submissionResultsService } from "@/services/submission-results.service";
import {
  buildResultsApiParams,
  EMPTY_RESULTS_FILTERS,
  type ResultsFilters,
} from "@/types/evaluation-filters";
import type { CoordinatorDeliverableResult } from "@/types/submission-evaluation";

function EvaluatorMarksCell({
  row,
}: {
  row: CoordinatorDeliverableResult;
}) {
  const averaged = row.averagedScore;
  if (!averaged) {
    return <span className="text-muted-foreground">Pending</span>;
  }

  return (
    <div className="space-y-1">
      {averaged.evaluatorScores.map((score) => (
        <div key={score.evaluationId} className="text-xs">
          <span className="font-medium">{score.evaluatorName}:</span>{" "}
          {score.totalMarks}/{row.template.totalMarks}
        </div>
      ))}
    </div>
  );
}

function RubricAveragesCell({
  row,
}: {
  row: CoordinatorDeliverableResult;
}) {
  const averaged = row.averagedScore;
  if (!averaged) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="space-y-1">
      {averaged.criterionAverages.map((criterion) => (
        <div key={criterion.rubricCriterionId} className="text-xs">
          <span className="font-medium">{criterion.title}:</span>{" "}
          {criterion.averageMarks}/{criterion.maxMarks}
        </div>
      ))}
    </div>
  );
}

export default function CoordinatorResultsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ResultsFilters>(EMPTY_RESULTS_FILTERS);
  const apiParams = useMemo(() => buildResultsApiParams(filters), [filters]);
  const filterOptions = useResultsFilterOptions(filters.phaseId);

  const resultsQuery = useQuery({
    queryKey: queryKeys.coordinator.submissionResults(
      apiParams,
      user?.workspaceId,
    ),
    queryFn: () => submissionResultsService.getCoordinatorResults(apiParams),
    enabled: !!user?.workspaceId,
  });

  const deliverableResults = useMemo(
    () => resultsQuery.data?.deliverableResults ?? [],
    [resultsQuery.data],
  );
  const phaseResults = useMemo(
    () => resultsQuery.data?.phaseResults ?? [],
    [resultsQuery.data],
  );

  if (resultsQuery.isLoading || filterOptions.isLoading) {
    return <DashboardSkeleton />;
  }

  if (resultsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(resultsQuery.error)}
        onRetry={() => resultsQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Results</h1>
          <p className="text-sm text-muted-foreground">
            Workspace-wide evaluation results with averaged rubric marks and GPA.
          </p>
        </div>
        <UnifiedFiltersDropdown
          fields={[
            "phase",
            "deliverable",
            "team",
            "supervisor",
            "evaluator",
            "student",
          ]}
          values={filters}
          options={{
            phases: filterOptions.phases.map((phase) => ({
              value: phase.id,
              label: phase.name,
            })),
            deliverables: filterOptions.templates.map((template) => ({
              value: template.id,
              label: template.title,
            })),
            teams: filterOptions.teams.map((team) => ({
              value: team.id,
              label: team.name,
            })),
            supervisors: filterOptions.supervisors.map((supervisor) => ({
              value: supervisor.id,
              label: supervisor.fullName,
            })),
            evaluators: filterOptions.evaluators.map((evaluator) => ({
              value: evaluator.id,
              label: evaluator.fullName,
            })),
            students: filterOptions.students.map((student) => ({
              value: student.id,
              label: student.fullName,
            })),
          }}
          onChange={(values) =>
            setFilters({ ...filters, ...values } as ResultsFilters)
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phase GPA summary</CardTitle>
          <CardDescription>
            GPA is calculated after phase configuration is published and all
            deliverables are evaluated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {phaseResults.length === 0 ? (
            <EmptyState
              title="No phase results"
              description="No phase results match the current filters."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Phase</th>
                    <th className="px-3 py-2 text-left">Student</th>
                    <th className="px-3 py-2 text-left">Phase marks</th>
                    <th className="px-3 py-2 text-left">GPA</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {phaseResults.map((result) => (
                    <tr key={result.id} className="border-b">
                      <td className="px-3 py-2">{result.phase.name}</td>
                      <td className="px-3 py-2">{result.studentName}</td>
                      <td className="px-3 py-2">
                        {formatPercent(result.weightedMarks)}
                      </td>
                      <td className="px-3 py-2">{formatGpa(result.gpa)}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">
                          {result.isComplete ? "Complete" : "In progress"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deliverable results</CardTitle>
          <CardDescription>
            Individual evaluator marks, rubric averages, and final averaged totals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deliverableResults.length === 0 ? (
            <EmptyState
              title="No deliverable results"
              description="No deliverable results match the current filters."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[1280px] text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Student</th>
                    <th className="px-3 py-2 text-left">Deliverable</th>
                    <th className="px-3 py-2 text-left">Phase</th>
                    <th className="px-3 py-2 text-left">Team</th>
                    <th className="px-3 py-2 text-left">Supervisor</th>
                    <th className="px-3 py-2 text-left">Evaluators</th>
                    <th className="px-3 py-2 text-left">Evaluator marks</th>
                    <th className="px-3 py-2 text-left">Rubric averages</th>
                    <th className="px-3 py-2 text-left">Weightage</th>
                    <th className="px-3 py-2 text-left">Averaged total</th>
                  </tr>
                </thead>
                <tbody>
                  {deliverableResults.map((row) => (
                    <tr
                      key={`${row.submissionId}:${row.studentId}`}
                      className="border-b align-top"
                    >
                      <td className="px-3 py-2">{row.studentName}</td>
                      <td className="px-3 py-2">{row.deliverableTitle}</td>
                      <td className="px-3 py-2">{row.phase?.name ?? "—"}</td>
                      <td className="px-3 py-2">{row.teamName}</td>
                      <td className="px-3 py-2">{row.supervisorName}</td>
                      <td className="px-3 py-2">
                        <div className="space-y-1">
                          {row.evaluators.map((evaluator) => (
                            <div key={evaluator.evaluationId} className="text-xs">
                              {evaluator.evaluatorName}{" "}
                              <Badge variant="outline" className="ml-1">
                                {evaluator.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <EvaluatorMarksCell row={row} />
                      </td>
                      <td className="px-3 py-2">
                        <RubricAveragesCell row={row} />
                      </td>
                      <td className="px-3 py-2">
                        {row.template.weightagePercent}%
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {row.averagedScore
                          ? `${row.averagedScore.averageTotalMarks}/${row.template.totalMarks}`
                          : "—"}
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
