"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, Mail, Search } from "lucide-react";
import { toast } from "sonner";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ProposalDocumentDialog } from "@/components/proposal/proposal-document-dialog";
import { formatDate, formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/react-query";
import { getDisplayName } from "@/hooks/use-profiles";
import { useAuth } from "@/providers/auth-provider";
import {
  isCoordinatorQueryInitialLoading,
  useCoordinatorProposalsQuery,
} from "@/queries/coordinator";
import { coordinatorPageService } from "@/services/coordinator-page.service";
import type { CoordinatorProposalsPageData } from "@/services/coordinator-page.service";

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "SUPERVISOR_ASSIGNED", label: "Awaiting supervisor review" },
  { value: "PENDING_SUPERVISOR", label: "Awaiting supervisor" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "DRAFT", label: "Draft" },
];

type ProposalRow = CoordinatorProposalsPageData["proposals"][number];

function needsSupervisorReminder(proposal: ProposalRow) {
  return !proposal.assignedSupervisorId;
}

export default function CoordinatorProposalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewProposalId, setViewProposalId] = useState<string | null>(null);
  const [reminderTarget, setReminderTarget] = useState<ProposalRow | null>(
    null,
  );
  const [deadline, setDeadline] = useState("");

  const pageQuery = useCoordinatorProposalsQuery();

  const reminderMutation = useMutation({
    mutationFn: coordinatorPageService.sendProposalSupervisorReminder,
    onSuccess: (result) => {
      toast.success(
        `Reminder sent to ${result.recipientCount} student${
          result.recipientCount === 1 ? "" : "s"
        }`,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.coordinator.proposals(
          user?.userId,
          user?.workspaceId,
        ),
      });
      setReminderTarget(null);
      setDeadline("");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const needsReminderCount = useMemo(
    () =>
      (pageQuery.data?.proposals ?? []).filter(needsSupervisorReminder).length,
    [pageQuery.data?.proposals],
  );

  if (isCoordinatorQueryInitialLoading(pageQuery)) return <DashboardSkeleton />;

  if (pageQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(pageQuery.error)}
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  const { proposals: allProposals, profiles } = pageQuery.data ?? {
    proposals: [],
    profiles: {},
  };

  const proposals = allProposals.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.title.toLowerCase().includes(q) ||
      p.domain.toLowerCase().includes(q) ||
      p.abstract.toLowerCase().includes(q) ||
      (p.teamName?.toLowerCase().includes(q) ?? false);
    const matchesStatus =
      statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const awaitingSupervisorCount = allProposals.filter(
    (p) =>
      p.status === "SUPERVISOR_ASSIGNED" ||
      p.status === "PENDING_SUPERVISOR",
  ).length;

  const openReminderDialog = (proposal: ProposalRow) => {
    setReminderTarget(proposal);
    setDeadline("");
  };

  const submitReminder = () => {
    if (!reminderTarget) return;
    if (!deadline) {
      toast.error("Please select a deadline for supervisor selection.");
      return;
    }
    reminderMutation.mutate({
      proposalId: reminderTarget.id,
      // Noon local avoids UTC date-shift for date-only inputs
      deadline: new Date(`${deadline}T12:00:00`).toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          {awaitingSupervisorCount > 0 ? (
            <p className="text-sm font-medium text-amber-600">
              {awaitingSupervisorCount} awaiting supervisor action
            </p>
          ) : null}
          {needsReminderCount > 0 ? (
            <p className="text-sm text-muted-foreground">
              {needsReminderCount} proposal
              {needsReminderCount === 1 ? "" : "s"} without an assigned
              supervisor
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search proposals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {proposals.length === 0 ? (
        <EmptyState
          title="No proposals found"
          description={
            search || statusFilter !== "ALL"
              ? "Try adjusting your filters."
              : "Proposals will appear here once teams submit them."
          }
        />
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => {
            const canRemind = needsSupervisorReminder(proposal);
            const isReminding =
              reminderMutation.isPending &&
              reminderMutation.variables?.proposalId === proposal.id;

            return (
              <Card key={proposal.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">
                        {proposal.title}
                      </CardTitle>
                      <CardDescription>
                        {proposal.domain}
                        {proposal.teamName ? ` · ${proposal.teamName}` : ""} ·
                        Submitted {formatDate(proposal.createdAt)}
                      </CardDescription>
                    </div>
                    <StatusBadge status={proposal.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {proposal.abstract}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Leader:{" "}
                      {proposal.teamLeaderAuthUserId
                        ? getDisplayName(
                            profiles,
                            proposal.teamLeaderAuthUserId,
                          )
                        : "—"}
                    </span>
                    {proposal.assignedSupervisorId ? (
                      <span>
                        Supervisor:{" "}
                        {getDisplayName(
                          profiles,
                          proposal.assignedSupervisorId,
                        )}
                      </span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-500">
                        No supervisor assigned
                      </span>
                    )}
                    {canRemind ? (
                      <span>
                        Last reminded:{" "}
                        {proposal.lastReminderSentAt
                          ? formatDateTime(proposal.lastReminderSentAt)
                          : "Never"}
                      </span>
                    ) : null}
                  </div>
                  {proposal.reviewFeedback && (
                    <p className="text-xs text-muted-foreground">
                      Supervisor feedback: {proposal.reviewFeedback}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewProposalId(proposal.id)}
                    >
                      <Eye className="h-4 w-4" />
                      View full proposal
                    </Button>
                    {canRemind ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reminderMutation.isPending}
                        onClick={() => openReminderDialog(proposal)}
                      >
                        {isReminding ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                        Send Reminder
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ProposalDocumentDialog
        proposalId={viewProposalId}
        open={!!viewProposalId}
        onOpenChange={(open) => !open && setViewProposalId(null)}
      />

      <Dialog
        open={!!reminderTarget}
        onOpenChange={(open) => {
          if (!open) {
            setReminderTarget(null);
            setDeadline("");
          }
        }}
      >
        <DialogContent closeOnOutsideClick={false}>
          <DialogHeader>
            <DialogTitle>Send supervisor selection reminder</DialogTitle>
            <DialogDescription>
              Email all students on this team that no supervisor has been
              selected or assigned yet
              {reminderTarget?.title
                ? ` for “${reminderTarget.title}”.`
                : "."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="supervisor-deadline">
              Supervisor selection deadline *
            </Label>
            <Input
              id="supervisor-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
            <p className="text-xs text-muted-foreground">
              This date is included in the reminder email.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReminderTarget(null);
                setDeadline("");
              }}
              disabled={reminderMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={submitReminder}
              disabled={reminderMutation.isPending || !deadline}
            >
              {reminderMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Send reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
