"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react";

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
import { formatDate, formatGpa, formatGrade, formatPercent } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";
import { submissionResultsService } from "@/services/submission-results.service";
import {
  buildResultsApiParams,
  EMPTY_RESULTS_FILTERS,
  type ResultsFilters,
} from "@/types/evaluation-filters";
import type { DeliverableResultRow } from "@/types/submission-evaluation";

function weightedContribution(row: DeliverableResultRow): number | null {
  const averaged = row.averagedScore;
  if (!averaged || row.template.totalMarks <= 0) {
    return null;
  }

  const percentage =
    (averaged.averageTotalMarks / row.template.totalMarks) * 100;
  return (percentage * row.template.weightagePercent) / 100;
}

export default function StudentResultsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ResultsFilters>(EMPTY_RESULTS_FILTERS);
  const apiParams = useMemo(() => buildResultsApiParams(filters), [filters]);
  const filterOptions = useResultsFilterOptions(filters.phaseId);

  const resultsQuery = useQuery({
    queryKey: queryKeys.student.submissionResults(
      apiParams,
      user?.workspaceId,
    ),
    queryFn: () => submissionResultsService.getMyResults(apiParams),
    enabled: !!user?.workspaceId,
  });

  const phaseResults = useMemo(
    () => resultsQuery.data?.phaseResults ?? [],
    [resultsQuery.data],
  );
  const deliverableResults = useMemo(
    () => resultsQuery.data?.deliverableResults ?? [],
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

  const phaseGpaByPhaseId = new Map(
    phaseResults.map((result) => [result.phaseId, result.gpa]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Results</h2>
          <p className="text-sm text-muted-foreground">
            Deliverable marks, rubric breakdown, phase marks, and GPA
          </p>
        </div>
        <UnifiedFiltersDropdown
          fields={["phase", "deliverable"]}
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
          }}
          onChange={(values) =>
            setFilters({ ...filters, ...values } as ResultsFilters)
          }
        />
      </div>

      {phaseResults.length === 0 && deliverableResults.length === 0 ? (
        <EmptyState
          title="No results yet"
          description="Results appear after your submissions are evaluated."
        />
      ) : null}

      {phaseResults.map((phaseResult) => (
        <Card key={phaseResult.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              {phaseResult.phase.name}
            </CardTitle>
            <CardDescription>
              {phaseResult.phase.creditHours} credit hours ·{" "}
              {phaseResult.isComplete ? "Complete" : "In progress"}
              {!phaseResult.phase.isConfigurationPublished
                ? " · Configuration not published"
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Phase marks</p>
                <p className="text-2xl font-semibold">
                  {formatPercent(phaseResult.weightedMarks)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Grade</p>
                <p className="text-2xl font-semibold">
                  {formatGrade(phaseResult.grade)}
                </p>
                {phaseResult.promotionApplied ? (
                  <Badge variant="secondary" className="mt-1">
                    Improved +1
                  </Badge>
                ) : null}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phase GPA</p>
                <p className="text-2xl font-semibold">
                  {formatGpa(phaseResult.gpa)}
                </p>
              </div>
            </div>

            {Array.isArray(phaseResult.breakdown) &&
            phaseResult.breakdown.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left">Deliverable</th>
                      <th className="px-3 py-2 text-left">Weightage</th>
                      <th className="px-3 py-2 text-left">Marks</th>
                      <th className="px-3 py-2 text-left">Contribution</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phaseResult.breakdown.map((item) => (
                      <tr key={item.templateId} className="border-b">
                        <td className="px-3 py-2">{item.deliverableTitle}</td>
                        <td className="px-3 py-2">{item.weightagePercent}%</td>
                        <td className="px-3 py-2">
                          {item.studentMarks}/{item.totalMarks}
                        </td>
                        <td className="px-3 py-2">
                          {formatPercent(item.weightedContribution)}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline">
                            {item.evaluationStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Deliverable evaluation details</CardTitle>
          <CardDescription>
            Rubric-wise marks from each evaluator and averaged results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deliverableResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No evaluated deliverables match the current filters.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Deliverable</th>
                    <th className="px-3 py-2 text-left">Phase</th>
                    <th className="px-3 py-2 text-left">Evaluator(s)</th>
                    <th className="px-3 py-2 text-left">Rubric marks</th>
                    <th className="px-3 py-2 text-left">Averaged total</th>
                    <th className="px-3 py-2 text-left">Weightage</th>
                    <th className="px-3 py-2 text-left">Weighted contribution</th>
                    <th className="px-3 py-2 text-left">Phase GPA</th>
                  </tr>
                </thead>
                <tbody>
                  {deliverableResults.map((row) => {
                    const contribution = weightedContribution(row);
                    const phaseGpa = row.phase
                      ? phaseGpaByPhaseId.get(row.phase.id)
                      : null;

                    return (
                      <tr
                        key={`${row.submissionId}:${row.templateId}`}
                        className="border-b align-top"
                      >
                        <td className="px-3 py-2">
                          <div>{row.deliverableTitle}</div>
                          {row.submittedAt ? (
                            <div className="text-xs text-muted-foreground">
                              {formatDate(row.submittedAt)}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">{row.phase?.name ?? "—"}</td>
                        <td className="px-3 py-2">
                          {row.evaluators.length > 0 ? (
                            <div className="space-y-1">
                              {row.evaluators.map((evaluator) => (
                                <div
                                  key={evaluator.evaluationId}
                                  className="text-xs"
                                >
                                  {evaluator.evaluatorName}{" "}
                                  <Badge variant="outline" className="ml-1">
                                    {evaluator.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {row.averagedScore ? (
                            <div className="space-y-2">
                              {row.averagedScore.criterionAverages.map(
                                (criterion) => (
                                  <div
                                    key={criterion.rubricCriterionId}
                                    className="text-xs"
                                  >
                                    <span className="font-medium">
                                      {criterion.title}:
                                    </span>{" "}
                                    avg {criterion.averageMarks}/
                                    {criterion.maxMarks}
                                  </div>
                                ),
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Pending</span>
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
                        <td className="px-3 py-2">
                          {contribution !== null
                            ? formatPercent(contribution)
                            : "—"}
                        </td>
                        <td className="px-3 py-2">{formatGpa(phaseGpa)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
