"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, List, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { PhaseFilter } from "@/components/common/phase-filter";
import { SortableTableHeader } from "@/components/common/sortable-table-header";
import { StatusBadge } from "@/components/common/status-badge";
import { UnifiedFiltersDropdown } from "@/components/common/unified-filters-dropdown";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
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
import { coordinatorSubmissionsService } from "@/services/coordinator-submissions.service";
import type {
  CoordinatorFinalizedSubmission,
  FinalizedSubmissionSortBy,
} from "@/types/coordinator-submissions";
import {
  EMPTY_COORDINATOR_LIST_FILTERS,
  toApiFilterValue,
  type CoordinatorListFilters,
} from "@/types/evaluation-filters";
import type { SubmissionEvaluationStatus } from "@/types/submission-evaluation";

type PageSection = "forwarded" | "tracking";
type ViewMode = "list" | "table";

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

function submissionAttachments(submission: CoordinatorFinalizedSubmission) {
  if (submission.attachments?.length) {
    return submission.attachments;
  }
  if (submission.fileUrl) {
    return [
      {
        id: `${submission.id}-primary`,
        fileUrl: submission.fileUrl,
        fileName: "Submission file",
      },
    ];
  }
  return [];
}

function SubmissionAttachmentsLinks({
  submission,
}: {
  submission: CoordinatorFinalizedSubmission;
}) {
  const attachments = submissionAttachments(submission);
  if (attachments.length === 0) {
    return <span className="text-sm text-muted-foreground">No files</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {attachments.map((attachment) => (
        <Button key={attachment.id} asChild size="sm" variant="outline">
          <a
            href={attachment.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={attachment.fileName}
          >
            {attachments.length === 1
              ? "View file"
              : attachment.fileName.length > 24
                ? `${attachment.fileName.slice(0, 21)}…`
                : attachment.fileName}
          </a>
        </Button>
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
      <SubmissionAttachmentsLinks submission={submission} />
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
  return (
    <Table minWidth={1200}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>
            <SortableTableHeader
              label="Deliverable"
              active={sortBy === "deliverable"}
              direction={sortOrder}
              onClick={() => onSortChange("deliverable")}
            />
          </TableHead>
          <TableHead>Phase</TableHead>
          <TableHead>
            <SortableTableHeader
              label="Team"
              active={sortBy === "team"}
              direction={sortOrder}
              onClick={() => onSortChange("team")}
            />
          </TableHead>
          <TableHead>
            <SortableTableHeader
              label="Supervisor"
              active={sortBy === "supervisor"}
              direction={sortOrder}
              onClick={() => onSortChange("supervisor")}
            />
          </TableHead>
          <TableHead>Submission</TableHead>
          <TableHead>Evaluation</TableHead>
          <TableHead>
            <SortableTableHeader
              label="Finalized"
              active={sortBy === "finalizedAt"}
              direction={sortOrder}
              onClick={() => onSortChange("finalizedAt")}
            />
          </TableHead>
          <TableHead>Evaluators</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {submissions.map((submission) => (
          <TableRow key={submission.id} className="align-top">
            <TableCell className="max-w-[14rem] truncate font-medium">
              {submission.deliverable.title}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {submission.deliverable.phase?.name ?? "—"}
            </TableCell>
            <TableCell className="max-w-[10rem] truncate">
              {submission.team.name}
            </TableCell>
            <TableCell className="max-w-[10rem] truncate">
              {submission.supervisor.fullName}
            </TableCell>
            <TableCell>
              <StatusBadge status={submission.status} />
            </TableCell>
            <TableCell>
              <StatusBadge status={submission.evaluationStatus} />
            </TableCell>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {submission.finalizedAt
                ? formatDateTime(submission.finalizedAt)
                : "—"}
            </TableCell>
            <TableCell>
              <EvaluatorsSummary submission={submission} />
            </TableCell>
            <TableCell className="text-right">
              <SubmissionAttachmentsLinks submission={submission} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function CoordinatorSubmissionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<PageSection>("forwarded");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filters, setFilters] = useState<CoordinatorListFilters>(
    EMPTY_COORDINATOR_LIST_FILTERS,
  );
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<FinalizedSubmissionSortBy>("finalizedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const phaseId = toApiFilterValue(filters.phaseId);
  const templateId = toApiFilterValue(filters.templateId);
  const supervisorId = toApiFilterValue(filters.supervisorId);
  const teamId = toApiFilterValue(filters.teamId);
  const evaluationStatus =
    filters.evaluationStatus === "all"
      ? undefined
      : (filters.evaluationStatus as SubmissionEvaluationStatus);
  const evaluatorId = toApiFilterValue(filters.evaluatorId);

  const filterOptions = useResultsFilterOptions(filters.phaseId);

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

  const isLoading =
    section === "forwarded"
      ? submissionsQuery.isLoading || filterOptions.isLoading
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
              <CardTitle>Submitted work</CardTitle>
              <CardDescription>
                Review submitted work. Use Filters to narrow by phase,
                deliverable, team, supervisor, status, or evaluator.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
                onChange={(values) => {
                  setFilters({
                    ...filters,
                    ...values,
                  } as CoordinatorListFilters);
                  resetPage();
                }}
              />
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
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
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
              <EmptyState
                title="No submissions found"
                description="No submissions match the selected filters."
              />
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
              <div className="flex items-center justify-between gap-3 border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm tabular-nums text-muted-foreground">
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
                {pendingOverview.length === 1 ? "" : "s"} still awaiting
                completion.
              </CardDescription>
            </div>
            <PhaseFilter
              value={filters.phaseId}
              onChange={(value) =>
                setFilters((current) => ({ ...current, phaseId: value }))
              }
            />
          </CardHeader>
          <CardContent>
            {overview.length === 0 ? (
              <EmptyState
                title="No deliverables to track"
                description="No published deliverables yet."
              />
            ) : (
              <Table minWidth={1080}>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Deliverable</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Assigned teams</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Last reminder</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.map((row) => {
                    const rowKey = `${row.templateId}:${row.supervisorId}`;
                    const isReminding = remindingKey === rowKey;

                    return (
                      <TableRow key={rowKey}>
                        <TableCell className="max-w-[14rem] truncate font-medium">
                          {row.deliverableTitle}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {row.phaseName}
                        </TableCell>
                        <TableCell className="max-w-[10rem] truncate">
                          {row.supervisor.fullName}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {row.assignedTeamCount}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {row.submittedTeamCount}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.pendingTeamCount > 0
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {row.pendingTeamCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {row.progressLabel}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {row.lastReminderSentAt
                            ? formatDateTime(row.lastReminderSentAt)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
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
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
