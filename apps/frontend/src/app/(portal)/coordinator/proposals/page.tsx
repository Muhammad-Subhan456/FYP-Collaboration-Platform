"use client";

import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProposalDocumentDialog } from "@/components/proposal/proposal-document-dialog";
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { getDisplayName } from "@/hooks/use-profiles";
import {
  isCoordinatorQueryInitialLoading,
  useCoordinatorProposalsQuery,
} from "@/queries/coordinator";

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
  const [viewProposalId, setViewProposalId] = useState<string | null>(null);

  const pageQuery = useCoordinatorProposalsQuery();

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
      p.abstract.toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const awaitingSupervisorCount = allProposals.filter(
    (p) =>
      p.status === "SUPERVISOR_ASSIGNED" ||
      p.status === "PENDING_SUPERVISOR",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {awaitingSupervisorCount > 0 ? (
            <p className="text-sm font-medium text-amber-600">
              {awaitingSupervisorCount} awaiting supervisor action
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
                  onClick={() => setViewProposalId(proposal.id)}
                >
                  <Eye className="h-4 w-4" />
                  View full proposal
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProposalDocumentDialog
        proposalId={viewProposalId}
        open={!!viewProposalId}
        onOpenChange={(open) => !open && setViewProposalId(null)}
      />
    </div>
  );
}
