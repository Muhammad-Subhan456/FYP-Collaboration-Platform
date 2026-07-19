"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { UnifiedFiltersDropdown } from "@/components/common/unified-filters-dropdown";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { GradePromotionCell } from "@/components/results/grade-promotion-cell";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSupervisorResultsFilterOptions } from "@/hooks/use-results-filter-options";
import { formatGpa, formatGrade, formatPercent } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";
import { submissionResultsService } from "@/services/submission-results.service";
import {
  buildResultsApiParams,
  EMPTY_RESULTS_FILTERS,
  type ResultsFilters,
} from "@/types/evaluation-filters";

export default function SupervisorResultsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ResultsFilters>(EMPTY_RESULTS_FILTERS);
  const apiParams = useMemo(() => buildResultsApiParams(filters), [filters]);
  const filterOptions = useSupervisorResultsFilterOptions(filters.phaseId);

  const resultsQuery = useQuery({
    queryKey: queryKeys.supervisor.submissionResults(
      apiParams,
      user?.workspaceId,
    ),
    queryFn: () => submissionResultsService.getSupervisorResults(apiParams),
    enabled: !!user?.workspaceId,
  });

  const promoteMutation = useMutation({
    mutationFn: ({
      phaseId,
      studentId,
    }: {
      phaseId: string;
      studentId: string;
    }) => submissionResultsService.promoteGrade(phaseId, studentId),
    onSuccess: () => {
      toast.success("Grade promoted (+1 mark)");
      void queryClient.invalidateQueries({
        queryKey: ["supervisor", "submission-results"],
      });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
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

  const isEmpty =
    deliverableResults.length === 0 && phaseResults.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Results</h1>
          <p className="text-sm text-muted-foreground">
            Evaluation results for your supervised teams, including averaged
            marks and phase GPA.
          </p>
        </div>
        <UnifiedFiltersDropdown
          fields={["phase", "deliverable", "team"]}
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
          }}
          onChange={(values) =>
            setFilters({ ...filters, ...values } as ResultsFilters)
          }
        />
      </div>

      {isEmpty ? (
        <EmptyState
          title="No results yet"
          description="Results appear after submissions are evaluated."
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Phase GPA summary</CardTitle>
          <CardDescription>
            Weighted phase marks and GPA for students on your teams.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {phaseResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No phase results match the current filters.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Phase</th>
                    <th className="px-3 py-2 text-left">Student</th>
                    <th className="px-3 py-2 text-left">Phase marks</th>
                    <th className="px-3 py-2 text-left">Grade</th>
                    <th className="px-3 py-2 text-left">GPA</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Grade improvement</th>
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
                      <td className="px-3 py-2 font-medium">
                        {formatGrade(result.grade)}
                      </td>
                      <td className="px-3 py-2">{formatGpa(result.gpa)}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">
                          {result.isComplete ? "Complete" : "In progress"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <GradePromotionCell
                          result={result}
                          isPending={promoteMutation.isPending}
                          onPromote={() =>
                            promoteMutation.mutate({
                              phaseId: result.phaseId,
                              studentId: result.studentId,
                            })
                          }
                        />
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
            Individual evaluator marks and averaged rubric scores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deliverableResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No evaluated deliverables match the current filters.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Student</th>
                    <th className="px-3 py-2 text-left">Deliverable</th>
                    <th className="px-3 py-2 text-left">Phase</th>
                    <th className="px-3 py-2 text-left">Evaluator marks</th>
                    <th className="px-3 py-2 text-left">Rubric averages</th>
                    <th className="px-3 py-2 text-left">Averaged total</th>
                    <th className="px-3 py-2 text-left">Weightage</th>
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
                      <td className="px-3 py-2">
                        {row.averagedScore ? (
                          <div className="space-y-1">
                            {row.averagedScore.evaluatorScores.map((score) => (
                              <div key={score.evaluationId} className="text-xs">
                                {score.evaluatorName}: {score.totalMarks}/
                                {row.template.totalMarks}
                              </div>
                            ))}
                          </div>
                        ) : (
                          "Pending"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {row.averagedScore ? (
                          <div className="space-y-1">
                            {row.averagedScore.criterionAverages.map(
                              (criterion) => (
                                <div
                                  key={criterion.rubricCriterionId}
                                  className="text-xs"
                                >
                                  {criterion.title}: {criterion.averageMarks}/
                                  {criterion.maxMarks}
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {row.averagedScore
                          ? `${row.averagedScore.averageTotalMarks}/${row.template.totalMarks}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row.template.weightagePercent}%
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
