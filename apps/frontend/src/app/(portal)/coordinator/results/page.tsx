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
import { useResultsFilterOptions } from "@/hooks/use-results-filter-options";
import { formatGpa, formatGrade, formatPercent } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/react-query";
import {
  exportCoordinatorDeliverableResultsCsv,
  exportPhaseGpaSummaryCsv,
} from "@/lib/results-csv-export";
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
  const queryClient = useQueryClient();
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
        queryKey: ["coordinator", "submission-results"],
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
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
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Phase GPA summary</CardTitle>
            <CardDescription>
              GPA appears after the phase is published and all deliverables are
              evaluated.
            </CardDescription>
          </div>
          <ResultsCsvExportButton
            onExport={() => exportPhaseGpaSummaryCsv(phaseResults)}
          />
        </CardHeader>
        <CardContent>
          {phaseResults.length === 0 ? (
            <EmptyState
              title="No phase results"
              description="No phase results for the selected filters."
            />
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
              Marks from each evaluator, criteria averages, and combined totals.
            </CardDescription>
          </div>
          <ResultsCsvExportButton
            onExport={() =>
              exportCoordinatorDeliverableResultsCsv(deliverableResults)
            }
          />
        </CardHeader>
        <CardContent>
          {deliverableResults.length === 0 ? (
            <EmptyState
              title="No deliverable results"
              description="No deliverable results for the selected filters."
            />
          ) : (
            <Table minWidth={1280}>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Student</TableHead>
                  <TableHead>Deliverable</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Evaluators</TableHead>
                  <TableHead>Evaluator marks</TableHead>
                  <TableHead>Criteria averages</TableHead>
                  <TableHead>Weightage</TableHead>
                  <TableHead>Combined total</TableHead>
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
                    <TableCell className="max-w-[10rem] truncate">
                      {row.teamName}
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate">
                      {row.supervisorName}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <EvaluatorMarksCell row={row} />
                    </TableCell>
                    <TableCell>
                      <RubricAveragesCell row={row} />
                    </TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      {row.template.weightagePercent}%
                    </TableCell>
                    <TableCell className="font-medium tabular-nums whitespace-nowrap">
                      {row.averagedScore
                        ? `${row.averagedScore.averageTotalMarks}/${row.template.totalMarks}`
                        : "—"}
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
