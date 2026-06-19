"use client";

import { useMemo, useState } from "react";
import { Eye, Search } from "lucide-react";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatDate, formatProposalStatus } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { getDisplayName, useProfilesLookup } from "@/hooks/use-profiles";
import { coordinatorService } from "@/services/coordinator.service";
import type { Proposal, ProposalStatus } from "@/types/student";
import { useQuery } from "@tanstack/react-query";

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "All statuses" },
  { value: "SUPERVISOR_ASSIGNED", label: "Awaiting supervisor review" },
  { value: "PENDING_SUPERVISOR", label: "Awaiting supervisor" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "DRAFT", label: "Draft" },
];

export default function CoordinatorProposalsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewProposal, setViewProposal] = useState<Proposal | null>(null);

  const proposalsQuery = useQuery({
    queryKey: ["coordinator", "proposals"],
    queryFn: coordinatorService.getAllProposals,
  });

  const profileIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of proposalsQuery.data ?? []) {
      if (p.teamLeaderAuthUserId) ids.add(p.teamLeaderAuthUserId);
      if (p.assignedSupervisorId) ids.add(p.assignedSupervisorId);
    }
    return Array.from(ids);
  }, [proposalsQuery.data]);

  const profilesQuery = useProfilesLookup(profileIds);

  if (proposalsQuery.isLoading) return <DashboardSkeleton />;

  if (proposalsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(proposalsQuery.error)}
        onRetry={() => proposalsQuery.refetch()}
      />
    );
  }

  const proposals = (proposalsQuery.data ?? []).filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.title.toLowerCase().includes(q) ||
      p.domain.toLowerCase().includes(q) ||
      p.abstract.toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const profiles = profilesQuery.data;
  const awaitingSupervisorCount = (proposalsQuery.data ?? []).filter(
    (p) =>
      p.status === "SUPERVISOR_ASSIGNED" ||
      p.status === "PENDING_SUPERVISOR",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Proposals Oversight</h2>
          <p className="text-sm text-muted-foreground">
            Monitor proposal statuses and supervisor decisions across all teams.
            {awaitingSupervisorCount > 0 && (
              <span className="ml-1 font-medium text-amber-600">
                · {awaitingSupervisorCount} awaiting supervisor action
              </span>
            )}
          </p>
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
          {proposals.map((proposal) => (
            <Card key={proposal.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">
                      {proposal.title}
                    </CardTitle>
                    <CardDescription>
                      {proposal.domain} · Submitted {formatDate(proposal.createdAt)}
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
                      ? getDisplayName(profiles, proposal.teamLeaderAuthUserId)
                      : "—"}
                  </span>
                  {proposal.assignedSupervisorId && (
                    <span>
                      Supervisor:{" "}
                      {getDisplayName(profiles, proposal.assignedSupervisorId)}
                    </span>
                  )}
                </div>
                {proposal.reviewFeedback && (
                  <p className="text-xs text-muted-foreground">
                    Supervisor feedback: {proposal.reviewFeedback}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewProposal(proposal)}
                >
                  <Eye className="h-4 w-4" />
                  View details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!viewProposal}
        onOpenChange={(open) => !open && setViewProposal(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {viewProposal && (
            <>
              <DialogHeader>
                <DialogTitle>{viewProposal.title}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {viewProposal.domain} ·{" "}
                  {formatProposalStatus(viewProposal.status as ProposalStatus)}
                </p>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium">Abstract</p>
                  <p className="mt-1 text-muted-foreground">
                    {viewProposal.abstract}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="font-medium">Team leader</p>
                    <p className="text-muted-foreground">
                      {viewProposal.teamLeaderAuthUserId
                        ? getDisplayName(
                            profiles,
                            viewProposal.teamLeaderAuthUserId,
                          )
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Supervisor</p>
                    <p className="text-muted-foreground">
                      {viewProposal.assignedSupervisorId
                        ? getDisplayName(
                            profiles,
                            viewProposal.assignedSupervisorId,
                          )
                        : "Not assigned"}
                    </p>
                  </div>
                </div>
                {viewProposal.reviewFeedback && (
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="font-medium">Supervisor review feedback</p>
                    <p className="mt-1 text-muted-foreground">
                      {viewProposal.reviewFeedback}
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Submitted {formatDate(viewProposal.createdAt)}
                  {viewProposal.reviewedAt &&
                    ` · Reviewed ${formatDate(viewProposal.reviewedAt)}`}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
