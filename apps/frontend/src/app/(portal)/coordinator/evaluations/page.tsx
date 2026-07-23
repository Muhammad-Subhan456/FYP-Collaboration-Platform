"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Bell, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { EvaluatorMultiSelect } from "@/components/coordinator/evaluator-multi-select";
import { UnifiedFiltersDropdown } from "@/components/common/unified-filters-dropdown";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useResultsFilterOptions } from "@/hooks/use-results-filter-options";
import { formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";
import { submissionEvaluationService } from "@/services/submission-evaluation.service";
import {
  EMPTY_COORDINATOR_LIST_FILTERS,
  toApiFilterValue,
  type CoordinatorListFilters,
} from "@/types/evaluation-filters";
import type {
  EligibleSubmissionRow,
  SubmissionEvaluationPerson,
  SubmissionEvaluationStatus,
} from "@/types/submission-evaluation";

export default function CoordinatorEvaluationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<CoordinatorListFilters>(
    EMPTY_COORDINATOR_LIST_FILTERS,
  );
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);
  const [selectedEvaluatorIds, setSelectedEvaluatorIds] = useState<string[]>(
    [],
  );
  const [assignedEvaluatorIds, setAssignedEvaluatorIds] = useState<string[]>(
    [],
  );

  const phaseId = toApiFilterValue(filters.phaseId);
  const templateId = toApiFilterValue(filters.templateId);
  const supervisorId = toApiFilterValue(filters.supervisorId);
  const teamId = toApiFilterValue(filters.teamId);
  const evaluatorId = toApiFilterValue(filters.evaluatorId);
  const evaluationStatus =
    filters.evaluationStatus === "all"
      ? undefined
      : (filters.evaluationStatus as SubmissionEvaluationStatus);

  const filterOptions = useResultsFilterOptions(filters.phaseId);

  const eligibleQuery = useQuery({
    queryKey: [
      ...queryKeys.coordinator.submissionEvaluations(
        phaseId,
        filters.evaluationStatus,
        user?.workspaceId,
      ),
      templateId,
      supervisorId,
      teamId,
      evaluatorId,
    ],
    queryFn: () =>
      submissionEvaluationService.listEligible({
        phaseId,
        templateId,
        supervisorId,
        teamId,
        evaluatorId,
        evaluationStatus,
      }),
    enabled: !!user?.workspaceId,
  });

  const evaluatorsQuery = useQuery({
    queryKey: queryKeys.coordinator.evaluators(user?.workspaceId),
    queryFn: submissionEvaluationService.listEvaluators,
    enabled: !!user?.workspaceId,
  });

  const assignMutation = useMutation({
    mutationFn: submissionEvaluationService.assignEvaluators,
    onSuccess: (created) => {
      const count = Array.isArray(created) ? created.length : 1;
      toast.success(
        count === 1
          ? "Evaluator assigned"
          : `${count} evaluators assigned`,
      );
      setAssignDialogOpen(false);
      setSelectedSubmissionId(null);
      setSelectedEvaluatorIds([]);
      setAssignedEvaluatorIds([]);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.coordinator.submissionEvaluations(),
      });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const [remindingSubmissionId, setRemindingSubmissionId] = useState<
    string | null
  >(null);
  const [remindDialogOpen, setRemindDialogOpen] = useState(false);
  const [remindSubmissionId, setRemindSubmissionId] = useState<string | null>(
    null,
  );
  const [remindEvaluatorIds, setRemindEvaluatorIds] = useState<string[]>([]);
  const [pendingRemindEvaluators, setPendingRemindEvaluators] = useState<
    SubmissionEvaluationPerson[]
  >([]);

  const remindMutation = useMutation({
    mutationFn: submissionEvaluationService.remindEvaluators,
    onSuccess: (result) => {
      toast.success(
        result.remindedCount === 1
          ? "Reminder sent to 1 evaluator"
          : `Reminder sent to ${result.remindedCount} evaluators`,
      );
      setRemindingSubmissionId(null);
      setRemindDialogOpen(false);
      setRemindSubmissionId(null);
      setRemindEvaluatorIds([]);
      setPendingRemindEvaluators([]);
    },
    onError: (error) => {
      setRemindingSubmissionId(null);
      toast.error(getErrorMessage(error));
    },
  });

  const pendingCount = useMemo(
    () =>
      (eligibleQuery.data ?? []).filter(
        (row) => row.evaluationStatus !== "SUBMITTED",
      ).length,
    [eligibleQuery.data],
  );

  const availableEvaluators = useMemo(
    () =>
      (evaluatorsQuery.data ?? []).filter(
        (evaluator) => !assignedEvaluatorIds.includes(evaluator.id),
      ),
    [assignedEvaluatorIds, evaluatorsQuery.data],
  );

  if (eligibleQuery.isLoading || filterOptions.isLoading) {
    return <DashboardSkeleton />;
  }

  if (eligibleQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(eligibleQuery.error)}
        onRetry={() => eligibleQuery.refetch()}
      />
    );
  }

  const rows = eligibleQuery.data ?? [];

  const openAssignDialog = (
    submissionId: string,
    currentEvaluatorIds: string[],
  ) => {
    setSelectedSubmissionId(submissionId);
    setAssignedEvaluatorIds(currentEvaluatorIds);
    setSelectedEvaluatorIds([]);
    setAssignDialogOpen(true);
  };

  const openRemindDialog = (row: EligibleSubmissionRow) => {
    const pending = row.evaluations.filter(
      (assignment) =>
        assignment.status === "ASSIGNED" ||
        assignment.status === "IN_PROGRESS",
    );
    setRemindSubmissionId(row.submissionId);
    setPendingRemindEvaluators(
      pending
        .map((assignment) => assignment.evaluator)
        .filter(
          (evaluator): evaluator is NonNullable<typeof evaluator> =>
            evaluator != null,
        ),
    );
    setRemindEvaluatorIds(pending.map((assignment) => assignment.evaluatorId));
    setRemindDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {pendingCount > 0 ? (
          <Badge variant="secondary">{pendingCount} pending</Badge>
        ) : null}
        <UnifiedFiltersDropdown
          fields={[
            "phase",
            "deliverable",
            "team",
            "supervisor",
            "evaluator",
            "evaluationStatus",
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
          }}
          onChange={(values) =>
            setFilters({ ...filters, ...values } as CoordinatorListFilters)
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eligible submissions</CardTitle>
          <CardDescription>
            You can assign more than one evaluator per submission. Final marks
            combine their scores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              title="No submissions found"
              description="No submissions match the selected filters."
            />
          ) : (
            <Table minWidth={1200}>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Deliverable</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Finalized</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Evaluators</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.submissionId}
                    className="align-top"
                  >
                    <TableCell className="max-w-[14rem] truncate font-medium">
                      {row.deliverableTitle}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.phase?.name ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate">
                      {row.teamName}
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate">
                      {row.supervisor.fullName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {row.finalizedAt
                        ? formatDateTime(row.finalizedAt)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.evaluationStatus} />
                    </TableCell>
                    <TableCell>
                      {row.evaluations.length > 0 ? (
                        <div className="space-y-1">
                          {row.evaluations.map((assignment) => (
                            <div
                              key={assignment.evaluationId}
                              className="flex flex-wrap items-center gap-1 text-xs"
                            >
                              <span className="max-w-[8rem] truncate">
                                {assignment.evaluator?.fullName ?? "Evaluator"}
                              </span>
                              <StatusBadge status={assignment.status} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground whitespace-nowrap">
                      {row.submittedEvaluatorCount}/
                      {row.assignedEvaluatorCount} submitted
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <a
                            href={row.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View file
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            openAssignDialog(
                              row.submissionId,
                              row.evaluations.map(
                                (assignment) => assignment.evaluatorId,
                              ),
                            )
                          }
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add evaluator
                        </Button>
                        {row.evaluations.some(
                          (assignment) =>
                            assignment.status === "ASSIGNED" ||
                            assignment.status === "IN_PROGRESS",
                        ) ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={
                              remindingSubmissionId === row.submissionId &&
                              remindMutation.isPending
                            }
                            onClick={() => openRemindDialog(row)}
                          >
                            {remindingSubmissionId === row.submissionId &&
                            remindMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Bell className="mr-2 h-4 w-4" />
                            )}
                            Remind
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign evaluators</DialogTitle>
            <DialogDescription>
              Select one or more evaluators. Each marks separately; final marks
              are combined. Already assigned evaluators aren&apos;t listed.
            </DialogDescription>
          </DialogHeader>
          <EvaluatorMultiSelect
            evaluators={availableEvaluators}
            selectedIds={selectedEvaluatorIds}
            onChange={setSelectedEvaluatorIds}
            excludedIds={assignedEvaluatorIds}
            label="Evaluators"
            placeholder="Select one or more evaluators"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                !selectedSubmissionId ||
                selectedEvaluatorIds.length === 0 ||
                assignMutation.isPending
              }
              onClick={() => {
                if (!selectedSubmissionId || selectedEvaluatorIds.length === 0) {
                  return;
                }
                assignMutation.mutate({
                  submissionId: selectedSubmissionId,
                  evaluatorIds: selectedEvaluatorIds,
                });
              }}
            >
              {assignMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Assign{" "}
              {selectedEvaluatorIds.length > 0
                ? `(${selectedEvaluatorIds.length})`
                : "evaluators"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={remindDialogOpen} onOpenChange={setRemindDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send evaluation reminders</DialogTitle>
            <DialogDescription>
              Choose one or more evaluators with pending evaluations for this
              submission. Only selected evaluators will receive a reminder.
            </DialogDescription>
          </DialogHeader>
          <EvaluatorMultiSelect
            evaluators={pendingRemindEvaluators}
            selectedIds={remindEvaluatorIds}
            onChange={setRemindEvaluatorIds}
            label="Evaluators to remind"
            placeholder="Select evaluators"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemindDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                !remindSubmissionId ||
                remindEvaluatorIds.length === 0 ||
                remindMutation.isPending
              }
              onClick={() => {
                if (!remindSubmissionId || remindEvaluatorIds.length === 0) {
                  return;
                }
                setRemindingSubmissionId(remindSubmissionId);
                remindMutation.mutate({
                  submissionId: remindSubmissionId,
                  evaluatorIds: remindEvaluatorIds,
                });
              }}
            >
              {remindMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Send reminder
              {remindEvaluatorIds.length > 0
                ? ` (${remindEvaluatorIds.length})`
                : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
