"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Bell, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { EvaluatorMultiSelect } from "@/components/coordinator/evaluator-multi-select";
import { PhaseFilter } from "@/components/common/phase-filter";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";
import { coordinatorPageService } from "@/services/coordinator-page.service";
import { deliverableTemplateService } from "@/services/deliverable-template.service";
import { submissionEvaluationService } from "@/services/submission-evaluation.service";
import type {
  EligibleSubmissionRow,
  SubmissionEvaluationPerson,
  SubmissionEvaluationStatus,
} from "@/types/submission-evaluation";

const STATUS_OPTIONS: Array<{
  value: SubmissionEvaluationStatus | "all";
  label: string;
}> = [
  { value: "all", label: "All statuses" },
  { value: "UNASSIGNED", label: "Unassigned" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "SUBMITTED", label: "Submitted" },
];

const ALL_FILTER = "all";

export default function CoordinatorEvaluationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [statusFilter, setStatusFilter] =
    useState<SubmissionEvaluationStatus | "all">("all");
  const [templateFilter, setTemplateFilter] = useState(ALL_FILTER);
  const [supervisorFilter, setSupervisorFilter] = useState(ALL_FILTER);
  const [teamFilter, setTeamFilter] = useState(ALL_FILTER);
  const [evaluatorFilter, setEvaluatorFilter] = useState(ALL_FILTER);
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

  const phaseId = phaseFilter === "all" ? undefined : phaseFilter;
  const templateId =
    templateFilter === ALL_FILTER ? undefined : templateFilter;
  const supervisorId =
    supervisorFilter === ALL_FILTER ? undefined : supervisorFilter;
  const teamId = teamFilter === ALL_FILTER ? undefined : teamFilter;
  const evaluatorId =
    evaluatorFilter === ALL_FILTER ? undefined : evaluatorFilter;

  const eligibleQuery = useQuery({
    queryKey: [
      ...queryKeys.coordinator.submissionEvaluations(
        phaseId,
        statusFilter,
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
        evaluationStatus:
          statusFilter === "all" ? undefined : statusFilter,
      }),
    enabled: !!user?.workspaceId,
  });

  const evaluatorsQuery = useQuery({
    queryKey: queryKeys.coordinator.evaluators(user?.workspaceId),
    queryFn: submissionEvaluationService.listEvaluators,
    enabled: !!user?.workspaceId,
  });

  const templatesQuery = useQuery({
    queryKey: queryKeys.coordinator.deliverableTemplates(
      phaseId,
      user?.workspaceId,
    ),
    queryFn: () => deliverableTemplateService.list(phaseId),
    enabled: !!user?.workspaceId,
  });

  const teamsQuery = useQuery({
    queryKey: queryKeys.coordinator.teams(user?.userId, user?.workspaceId),
    queryFn: coordinatorPageService.getTeams,
    enabled: !!user?.workspaceId,
  });

  const usersQuery = useQuery({
    queryKey: queryKeys.coordinator.users(user?.userId, user?.workspaceId),
    queryFn: coordinatorPageService.getUsers,
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

  const supervisors = useMemo(
    () =>
      (usersQuery.data ?? []).filter((userRecord) => userRecord.role === "SUPERVISOR"),
    [usersQuery.data],
  );

  const availableEvaluators = useMemo(
    () =>
      (evaluatorsQuery.data ?? []).filter(
        (evaluator) => !assignedEvaluatorIds.includes(evaluator.id),
      ),
    [assignedEvaluatorIds, evaluatorsQuery.data],
  );

  if (eligibleQuery.isLoading) return <DashboardSkeleton />;

  if (eligibleQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(eligibleQuery.error)}
        onRetry={() => eligibleQuery.refetch()}
      />
    );
  }

  const rows = eligibleQuery.data ?? [];
  const teams = teamsQuery.data?.teams ?? [];

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Evaluations</h1>
          <p className="text-sm text-muted-foreground">
            Assign one or more evaluators per submission. {pendingCount} pending.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <PhaseFilter value={phaseFilter} onChange={setPhaseFilter} />
        <Select
          value={templateFilter}
          onValueChange={setTemplateFilter}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Deliverable" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All deliverables</SelectItem>
            {(templatesQuery.data ?? []).map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={supervisorFilter}
          onValueChange={setSupervisorFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Supervisor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All supervisors</SelectItem>
            {supervisors.map((supervisor) => (
              <SelectItem key={supervisor.id} value={supervisor.id}>
                {supervisor.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All teams</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as SubmissionEvaluationStatus | "all")
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={evaluatorFilter}
          onValueChange={setEvaluatorFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Evaluator" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All evaluators</SelectItem>
            {(evaluatorsQuery.data ?? []).map((evaluator) => (
              <SelectItem key={evaluator.id} value={evaluator.id}>
                {evaluator.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eligible submissions</CardTitle>
          <CardDescription>
            Finalized submissions can have multiple independent evaluators.
            Results are averaged across submitted evaluations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              title="No eligible submissions"
              description="No finalized submissions match the current filters."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[1200px] text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Deliverable</th>
                    <th className="px-3 py-2 text-left font-medium">Phase</th>
                    <th className="px-3 py-2 text-left font-medium">Team</th>
                    <th className="px-3 py-2 text-left font-medium">Supervisor</th>
                    <th className="px-3 py-2 text-left font-medium">Finalized</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Evaluators</th>
                    <th className="px-3 py-2 text-left font-medium">Progress</th>
                    <th className="px-3 py-2 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.submissionId} className="border-b last:border-b-0">
                      <td className="px-3 py-3">{row.deliverableTitle}</td>
                      <td className="px-3 py-3">{row.phase?.name ?? "—"}</td>
                      <td className="px-3 py-3">{row.teamName}</td>
                      <td className="px-3 py-3">{row.supervisor.fullName}</td>
                      <td className="px-3 py-3">
                        {row.finalizedAt
                          ? formatDateTime(row.finalizedAt)
                          : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          variant={
                            row.evaluationStatus === "SUBMITTED"
                              ? "secondary"
                              : row.evaluationStatus === "UNASSIGNED"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {row.evaluationStatus}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        {row.evaluations.length > 0 ? (
                          <div className="space-y-1">
                            {row.evaluations.map((assignment) => (
                              <div
                                key={assignment.evaluationId}
                                className="text-xs"
                              >
                                {assignment.evaluator?.fullName ?? "Evaluator"}{" "}
                                <Badge variant="outline" className="ml-1">
                                  {assignment.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {row.submittedEvaluatorCount}/{row.assignedEvaluatorCount}{" "}
                        submitted
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
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
                              Remind evaluators
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign evaluators</DialogTitle>
            <DialogDescription>
              Select one or more evaluators. Each scores independently; final
              results use averaged marks. Already assigned evaluators are
              excluded.
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
