"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, List, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { PhaseFilter } from "@/components/common/phase-filter";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { ErrorState } from "@/components/common/state-blocks";
import { SegmentedControl } from "@/components/work-stream/segmented-control";
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
import { coordinatorSubmissionsService } from "@/services/coordinator-submissions.service";
import { deliverableTemplateService } from "@/services/deliverable-template.service";
import { submissionEvaluationService } from "@/services/submission-evaluation.service";
import type {
  CoordinatorFinalizedSubmission,
  FinalizedSubmissionSortBy,
} from "@/types/coordinator-submissions";
import type { SubmissionEvaluationStatus } from "@/types/submission-evaluation";
import { cn } from "@/lib/utils";

type PageSection = "forwarded" | "tracking";
type ViewMode = "list" | "table";

const ALL_FILTER = "all";

const EVALUATION_STATUS_OPTIONS: Array<{
  value: SubmissionEvaluationStatus | "all";
  label: string;
}> = [
  { value: "all", label: "All evaluation statuses" },
  { value: "UNASSIGNED", label: "Unassigned" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "SUBMITTED", label: "Submitted" },
];

function EvaluatorsSummary({
  submission,
}: {
  submission: CoordinatorFinalizedSubmission;
}) {
  if (submission.evaluators.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="space-y-1">
      {submission.evaluators.map((assignment) => (
        <div key={assignment.evaluationId} className="text-xs">
          {assignment.evaluator?.fullName ?? "Evaluator"}{" "}
          <Badge variant="outline" className="ml-1">
            {assignment.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function FinalizedSubmissionListItem({
  submission,
}: {
  submission: CoordinatorFinalizedSubmission;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{submission.deliverable.title}</p>
          <Badge variant="outline">
            {submission.deliverable.phase?.name ?? "Phase"}
          </Badge>
          <Badge>{submission.status}</Badge>
          <Badge
            variant={
              submission.evaluationStatus === "SUBMITTED"
                ? "secondary"
                : submission.evaluationStatus === "UNASSIGNED"
                  ? "destructive"
                  : "outline"
            }
          >
            {submission.evaluationStatus}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Team: {submission.team.name} · Supervisor:{" "}
          {submission.supervisor.fullName}
        </p>
        <div className="text-xs text-muted-foreground">
          v{submission.version}
          {submission.finalizedAt
            ? ` · finalized ${formatDateTime(submission.finalizedAt)}`
            : ""}
        </div>
        <div className="pt-1">
          <EvaluatorsSummary submission={submission} />
        </div>
      </div>
      <Button asChild size="sm" variant="outline">
        <a
          href={submission.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          View file
        </a>
      </Button>
    </div>
  );
}

function FinalizedSubmissionsTable({
  submissions,
  sortBy,
  sortOrder,
  onSortChange,
}: {
  submissions: CoordinatorFinalizedSubmission[];
  sortBy: FinalizedSubmissionSortBy;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: FinalizedSubmissionSortBy) => void;
}) {
  const headerClass = (column: FinalizedSubmissionSortBy) =>
    cn(
      "cursor-pointer select-none px-3 py-2 text-left font-medium",
      sortBy === column && "text-foreground",
    );

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[1200px] text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th
              className={headerClass("deliverable")}
              onClick={() => onSortChange("deliverable")}
            >
              Deliverable {sortBy === "deliverable" ? `(${sortOrder})` : ""}
            </th>
            <th className="px-3 py-2 text-left font-medium">Phase</th>
            <th
              className={headerClass("team")}
              onClick={() => onSortChange("team")}
            >
              Team {sortBy === "team" ? `(${sortOrder})` : ""}
            </th>
            <th
              className={headerClass("supervisor")}
              onClick={() => onSortChange("supervisor")}
            >
              Supervisor {sortBy === "supervisor" ? `(${sortOrder})` : ""}
            </th>
            <th className="px-3 py-2 text-left font-medium">
              Submission status
            </th>
            <th className="px-3 py-2 text-left font-medium">
              Evaluation status
            </th>
            <th
              className={headerClass("finalizedAt")}
              onClick={() => onSortChange("finalizedAt")}
            >
              Finalized {sortBy === "finalizedAt" ? `(${sortOrder})` : ""}
            </th>
            <th className="px-3 py-2 text-left font-medium">Evaluators</th>
            <th className="px-3 py-2 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((submission) => (
            <tr key={submission.id} className="border-b last:border-b-0 align-top">
              <td className="px-3 py-3">{submission.deliverable.title}</td>
              <td className="px-3 py-3">
                {submission.deliverable.phase?.name ?? "—"}
              </td>
              <td className="px-3 py-3">{submission.team.name}</td>
              <td className="px-3 py-3">{submission.supervisor.fullName}</td>
              <td className="px-3 py-3">
                <Badge variant="secondary">{submission.status}</Badge>
              </td>
              <td className="px-3 py-3">
                <Badge
                  variant={
                    submission.evaluationStatus === "SUBMITTED"
                      ? "secondary"
                      : submission.evaluationStatus === "UNASSIGNED"
                        ? "destructive"
                        : "outline"
                  }
                >
                  {submission.evaluationStatus}
                </Badge>
              </td>
              <td className="px-3 py-3">
                {submission.finalizedAt
                  ? formatDateTime(submission.finalizedAt)
                  : "—"}
              </td>
              <td className="px-3 py-3">
                <EvaluatorsSummary submission={submission} />
              </td>
              <td className="px-3 py-3">
                <Button asChild size="sm" variant="outline">
                  <a
                    href={submission.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View
                  </a>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CoordinatorSubmissionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<PageSection>("forwarded");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState(ALL_FILTER);
  const [supervisorFilter, setSupervisorFilter] = useState(ALL_FILTER);
  const [teamFilter, setTeamFilter] = useState(ALL_FILTER);
  const [evaluationStatusFilter, setEvaluationStatusFilter] =
    useState<SubmissionEvaluationStatus | "all">("all");
  const [evaluatorFilter, setEvaluatorFilter] = useState(ALL_FILTER);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<FinalizedSubmissionSortBy>("finalizedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const phaseId = phaseFilter === "all" ? undefined : phaseFilter;
  const templateId =
    templateFilter === ALL_FILTER ? undefined : templateFilter;
  const supervisorId =
    supervisorFilter === ALL_FILTER ? undefined : supervisorFilter;
  const teamId = teamFilter === ALL_FILTER ? undefined : teamFilter;
  const evaluationStatus =
    evaluationStatusFilter === "all" ? undefined : evaluationStatusFilter;
  const evaluatorId =
    evaluatorFilter === ALL_FILTER ? undefined : evaluatorFilter;

  const submissionsQuery = useQuery({
    queryKey: [
      ...queryKeys.coordinator.finalizedSubmissions(
        phaseId,
        page,
        user?.workspaceId,
      ),
      templateId,
      supervisorId,
      teamId,
      evaluationStatus,
      evaluatorId,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      coordinatorSubmissionsService.getFinalizedSubmissions({
        phaseId,
        templateId,
        supervisorId,
        teamId,
        evaluationStatus,
        evaluatorId,
        page,
        sortBy,
        sortOrder,
      }),
    enabled: !!user?.workspaceId && section === "forwarded",
  });

  const overviewQuery = useQuery({
    queryKey: queryKeys.coordinator.submissionOverview(
      phaseId,
      user?.workspaceId,
    ),
    queryFn: () => coordinatorSubmissionsService.getOverview(phaseId),
    enabled: !!user?.workspaceId && section === "tracking",
  });

  const templatesQuery = useQuery({
    queryKey: queryKeys.coordinator.deliverableTemplates(
      phaseId,
      user?.workspaceId,
    ),
    queryFn: () => deliverableTemplateService.list(phaseId),
    enabled: !!user?.workspaceId && section === "forwarded",
  });

  const teamsQuery = useQuery({
    queryKey: queryKeys.coordinator.teams(user?.userId, user?.workspaceId),
    queryFn: coordinatorPageService.getTeams,
    enabled: !!user?.workspaceId && section === "forwarded",
  });

  const usersQuery = useQuery({
    queryKey: queryKeys.coordinator.users(user?.userId, user?.workspaceId),
    queryFn: coordinatorPageService.getUsers,
    enabled: !!user?.workspaceId && section === "forwarded",
  });

  const evaluatorsQuery = useQuery({
    queryKey: queryKeys.coordinator.evaluators(user?.workspaceId),
    queryFn: submissionEvaluationService.listEvaluators,
    enabled: !!user?.workspaceId && section === "forwarded",
  });

  const [remindingKey, setRemindingKey] = useState<string | null>(null);

  const reminderMutation = useMutation({
    mutationFn: coordinatorSubmissionsService.sendReminder,
    onSuccess: () => {
      toast.success("Reminder sent to supervisor");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.coordinator.submissionOverview(),
      });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () => setRemindingKey(null),
  });

  const handleSortChange = (column: FinalizedSubmissionSortBy) => {
    if (sortBy === column) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortOrder(column === "finalizedAt" ? "desc" : "asc");
    setPage(1);
  };

  const resetPage = () => setPage(1);

  const pendingOverview = useMemo(
    () => (overviewQuery.data ?? []).filter((row) => row.pendingTeamCount > 0),
    [overviewQuery.data],
  );

  const supervisors = useMemo(
    () =>
      (usersQuery.data ?? []).filter((userRecord) => userRecord.role === "SUPERVISOR"),
    [usersQuery.data],
  );

  const teams = teamsQuery.data?.teams ?? [];

  const isLoading =
    section === "forwarded"
      ? submissionsQuery.isLoading
      : overviewQuery.isLoading;

  const isError =
    section === "forwarded"
      ? submissionsQuery.isError
      : overviewQuery.isError;

  if (isLoading) return <DashboardSkeleton />;

  if (isError) {
    const error =
      section === "forwarded"
        ? submissionsQuery.error
        : overviewQuery.error;
    return (
      <ErrorState
        message={getErrorMessage(error)}
        onRetry={() => {
          if (section === "forwarded") {
            void submissionsQuery.refetch();
          } else {
            void overviewQuery.refetch();
          }
        }}
      />
    );
  }

  const submissions = submissionsQuery.data?.data ?? [];
  const meta = submissionsQuery.data?.meta;
  const overview = overviewQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Submissions</h1>
          <p className="text-sm text-muted-foreground">
            Review finalized work and track supervisor submission progress.
          </p>
        </div>
      </div>

      <SegmentedControl
        value={section}
        onChange={(value) => setSection(value as PageSection)}
        options={[
          { value: "forwarded", label: "Forwarded submissions" },
          { value: "tracking", label: "Supervisor tracking" },
        ]}
      />

      {section === "forwarded" ? (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Finalized submissions</CardTitle>
              <CardDescription>
                Filter by phase, deliverable, supervisor, team, evaluation
                status, and evaluator.
              </CardDescription>
            </div>
            <div className="flex gap-1 rounded-lg border p-1">
              <Button
                size="sm"
                variant={viewMode === "list" ? "secondary" : "ghost"}
                onClick={() => setViewMode("list")}
              >
                <List className="mr-2 h-4 w-4" />
                List
              </Button>
              <Button
                size="sm"
                variant={viewMode === "table" ? "secondary" : "ghost"}
                onClick={() => setViewMode("table")}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Table
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <PhaseFilter
                value={phaseFilter}
                onChange={(value) => {
                  setPhaseFilter(value);
                  resetPage();
                }}
              />
              <Select
                value={templateFilter}
                onValueChange={(value) => {
                  setTemplateFilter(value);
                  resetPage();
                }}
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
                onValueChange={(value) => {
                  setSupervisorFilter(value);
                  resetPage();
                }}
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
              <Select
                value={teamFilter}
                onValueChange={(value) => {
                  setTeamFilter(value);
                  resetPage();
                }}
              >
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
                value={evaluationStatusFilter}
                onValueChange={(value) => {
                  setEvaluationStatusFilter(
                    value as SubmissionEvaluationStatus | "all",
                  );
                  resetPage();
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Evaluation status" />
                </SelectTrigger>
                <SelectContent>
                  {EVALUATION_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={evaluatorFilter}
                onValueChange={(value) => {
                  setEvaluatorFilter(value);
                  resetPage();
                }}
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

            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={sortBy}
                onValueChange={(value) =>
                  handleSortChange(value as FinalizedSubmissionSortBy)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="finalizedAt">Finalized date</SelectItem>
                  <SelectItem value="deliverable">Deliverable</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortOrder}
                onValueChange={(value) =>
                  setSortOrder(value as "asc" | "desc")
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No finalized submissions match the current filters.
              </p>
            ) : viewMode === "list" ? (
              submissions.map((submission) => (
                <FinalizedSubmissionListItem
                  key={submission.id}
                  submission={submission}
                />
              ))
            ) : (
              <FinalizedSubmissionsTable
                submissions={submissions}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
              />
            )}

            {meta && meta.totalPages > 1 ? (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {meta.page} of {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Supervisor submission tracking</CardTitle>
              <CardDescription>
                {pendingOverview.length} supervisor deliverable group
                {pendingOverview.length === 1 ? "" : "s"} still have pending
                finalizations.
              </CardDescription>
            </div>
            <PhaseFilter
              value={phaseFilter}
              onChange={setPhaseFilter}
            />
          </CardHeader>
          <CardContent>
            {overview.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No published deliverables to track yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[1080px] text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">
                        Deliverable
                      </th>
                      <th className="px-3 py-2 text-left font-medium">Phase</th>
                      <th className="px-3 py-2 text-left font-medium">
                        Supervisor
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Assigned teams
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Submitted
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Pending
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Progress
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Last reminder
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.map((row) => {
                      const rowKey = `${row.templateId}:${row.supervisorId}`;
                      const isReminding = remindingKey === rowKey;

                      return (
                        <tr
                          key={rowKey}
                          className="border-b last:border-b-0"
                        >
                          <td className="px-3 py-3">{row.deliverableTitle}</td>
                          <td className="px-3 py-3">{row.phaseName}</td>
                          <td className="px-3 py-3">
                            {row.supervisor.fullName}
                          </td>
                          <td className="px-3 py-3">{row.assignedTeamCount}</td>
                          <td className="px-3 py-3">{row.submittedTeamCount}</td>
                          <td className="px-3 py-3">
                            <Badge
                              variant={
                                row.pendingTeamCount > 0
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {row.pendingTeamCount}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 font-medium">
                            {row.progressLabel}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {row.lastReminderSentAt
                              ? formatDateTime(row.lastReminderSentAt)
                              : "—"}
                          </td>
                          <td className="px-3 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                row.pendingTeamCount === 0 || isReminding
                              }
                              onClick={() => {
                                setRemindingKey(rowKey);
                                reminderMutation.mutate({
                                  templateId: row.templateId,
                                  supervisorId: row.supervisorId,
                                });
                              }}
                            >
                              {isReminding ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="mr-2 h-4 w-4" />
                              )}
                              Send reminder
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
