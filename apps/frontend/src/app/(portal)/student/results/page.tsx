"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react";

import { UnifiedFiltersDropdown } from "@/components/common/unified-filters-dropdown";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <div className="flex flex-wrap items-center justify-end gap-3">
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
          description="Results appear after evaluations are complete."
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
                ? " · Phase not yet published"
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
              <Table minWidth={720} maxHeight="24rem">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Deliverable</TableHead>
                    <TableHead>Weightage</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Contribution</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {phaseResult.breakdown.map((item) => (
                    <TableRow key={item.templateId}>
                      <TableCell className="max-w-[14rem] truncate font-medium">
                        {item.deliverableTitle}
                      </TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {item.weightagePercent}%
                      </TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {item.studentMarks}/{item.totalMarks}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatPercent(item.weightedContribution)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.evaluationStatus} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Deliverable evaluation details</CardTitle>
          <CardDescription>
            Marks from each evaluator and the combined total.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deliverableResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No results for the selected filters.
            </p>
          ) : (
            <Table minWidth={1200}>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Deliverable</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Evaluator(s)</TableHead>
                  <TableHead>Criteria marks</TableHead>
                  <TableHead>Combined total</TableHead>
                  <TableHead>Weightage</TableHead>
                  <TableHead>Contribution</TableHead>
                  <TableHead>Phase GPA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliverableResults.map((row) => {
                  const contribution = weightedContribution(row);
                  const phaseGpa = row.phase
                    ? phaseGpaByPhaseId.get(row.phase.id)
                    : null;

                  return (
                    <TableRow
                      key={`${row.submissionId}:${row.templateId}`}
                      className="align-top"
                    >
                      <TableCell className="max-w-[14rem]">
                        <div className="truncate font-medium">
                          {row.deliverableTitle}
                        </div>
                        {row.submittedAt ? (
                          <div className="text-xs text-muted-foreground">
                            {formatDate(row.submittedAt)}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {row.phase?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        {row.evaluators.length > 0 ? (
                          <div className="space-y-1">
                            {row.evaluators.map((evaluator) => (
                              <div
                                key={evaluator.evaluationId}
                                className="flex flex-wrap items-center gap-1 text-xs"
                              >
                                <span className="max-w-[8rem] truncate">
                                  {evaluator.evaluatorName}
                                </span>
                                <StatusBadge status={evaluator.status} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="font-medium tabular-nums whitespace-nowrap">
                        {row.averagedScore
                          ? `${row.averagedScore.averageTotalMarks}/${row.template.totalMarks}`
                          : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {row.template.weightagePercent}%
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {contribution !== null
                          ? formatPercent(contribution)
                          : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatGpa(phaseGpa)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
