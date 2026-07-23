"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { UnifiedFiltersDropdown } from "@/components/common/unified-filters-dropdown";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { GradePromotionCell } from "@/components/results/grade-promotion-cell";
import { ResultsCsvExportButton } from "@/components/results/results-csv-export-button";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSupervisorResultsFilterOptions } from "@/hooks/use-results-filter-options";
import { formatGpa, formatGrade, formatPercent } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/react-query";
import {
  exportPhaseGpaSummaryCsv,
  exportSupervisorDeliverableResultsCsv,
} from "@/lib/results-csv-export";
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
      <div className="flex flex-wrap items-center justify-end gap-3">
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
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Phase GPA summary</CardTitle>
            <CardDescription>
              Phase marks and GPA for students on your teams.
            </CardDescription>
          </div>
          <ResultsCsvExportButton
            onExport={() => exportPhaseGpaSummaryCsv(phaseResults)}
          />
        </CardHeader>
        <CardContent>
          {phaseResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No phase results for the selected filters.
            </p>
          ) : (
            <Table minWidth={720}>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Phase</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Phase marks</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>GPA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Grade improvement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phaseResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell className="max-w-[10rem] truncate font-medium">
                      {result.phase.name}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate">
                      {result.studentName}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatPercent(result.weightedMarks)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatGrade(result.grade)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatGpa(result.gpa)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={
                          result.isComplete ? "COMPLETE" : "IN_PROGRESS"
                        }
                      />
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Deliverable results</CardTitle>
            <CardDescription>
              Marks from each evaluator and the combined scores.
            </CardDescription>
          </div>
          <ResultsCsvExportButton
            onExport={() =>
              exportSupervisorDeliverableResultsCsv(deliverableResults)
            }
          />
        </CardHeader>
        <CardContent>
          {deliverableResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No deliverable results for the selected filters.
            </p>
          ) : (
            <Table minWidth={1080}>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Student</TableHead>
                  <TableHead>Deliverable</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Evaluator marks</TableHead>
                  <TableHead>Criteria averages</TableHead>
                  <TableHead>Combined total</TableHead>
                  <TableHead>Weightage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliverableResults.map((row) => (
                  <TableRow
                    key={`${row.submissionId}:${row.studentId}`}
                    className="align-top"
                  >
                    <TableCell className="max-w-[10rem] truncate font-medium">
                      {row.studentName}
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate">
                      {row.deliverableTitle}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.phase?.name ?? "—"}
                    </TableCell>
                    <TableCell>
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
                        <span className="text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="font-medium tabular-nums whitespace-nowrap">
                      {row.averagedScore
                        ? `${row.averagedScore.averageTotalMarks}/${row.template.totalMarks}`
                        : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {row.template.weightagePercent}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
