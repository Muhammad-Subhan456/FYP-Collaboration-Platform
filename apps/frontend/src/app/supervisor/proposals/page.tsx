"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
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
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { getDisplayName, useProfilesLookup } from "@/hooks/use-profiles";
import { proposalService } from "@/services/proposal.service";
import type { Proposal } from "@/types/student";

export default function SupervisorProposalsPage() {
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<Proposal | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveTarget, setApproveTarget] = useState<Proposal | null>(null);

  const reviewQuery = useQuery({
    queryKey: ["proposals", "review-queue"],
    queryFn: proposalService.getSupervisorReviewQueue,
  });

  const leaderIds =
    reviewQuery.data
      ?.map((p) => p.teamLeaderAuthUserId)
      .filter((id): id is string => !!id) ?? [];
  const profilesQuery = useProfilesLookup(leaderIds);

  const approveMutation = useMutation({
    mutationFn: (proposalId: string) =>
      proposalService.approveProposal(proposalId),
    onSuccess: () => {
      toast.success("Proposal accepted and you are now assigned as supervisor.");
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setApproveTarget(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      proposalService.rejectProposal(id, reason),
    onSuccess: () => {
      toast.success("Proposal rejected with feedback.");
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setRejectTarget(null);
      setRejectReason("");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (reviewQuery.isLoading) return <DashboardSkeleton />;

  if (reviewQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(reviewQuery.error)}
        onRetry={() => reviewQuery.refetch()}
      />
    );
  }

  const proposals = reviewQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Proposal Reviews</h2>
        <p className="text-sm text-muted-foreground">
          Accept or reject student proposals assigned to you or requesting your supervision.
        </p>
      </div>

      {proposals.length === 0 ? (
        <EmptyState
          title="No proposals awaiting review"
          description="Proposals will appear here when students request your supervision or after you accept a supervision request."
        />
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <Card key={proposal.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {proposal.title}
                    </CardTitle>
                    <CardDescription>
                      {proposal.domain} · Submitted {formatDate(proposal.createdAt)}
                    </CardDescription>
                  </div>
                  <StatusBadge status={proposal.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{proposal.abstract}</p>
                {proposal.teamLeaderAuthUserId && (
                  <p className="text-sm text-muted-foreground">
                    Team leader:{" "}
                    {getDisplayName(
                      profilesQuery.data,
                      proposal.teamLeaderAuthUserId,
                    )}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setApproveTarget(proposal)}>
                    <Check className="h-4 w-4" />
                    Accept Proposal
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setRejectTarget(proposal)}
                  >
                    <X className="h-4 w-4" />
                    Reject with Feedback
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!approveTarget}
        onOpenChange={(open) => !open && setApproveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept this proposal?</DialogTitle>
            <DialogDescription>
              Accepting &quot;{approveTarget?.title}&quot; will approve the proposal and
              assign you as the team&apos;s supervisor.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                approveTarget && approveMutation.mutate(approveTarget.id)
              }
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending && <Loader2 className="animate-spin" />}
              Accept & Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject proposal</DialogTitle>
            <DialogDescription>
              Provide written feedback for &quot;{rejectTarget?.title}&quot;. The
              student team will be able to revise and resubmit.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Explain what needs to be improved..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                rejectTarget &&
                rejectMutation.mutate({
                  id: rejectTarget.id,
                  reason: rejectReason,
                })
              }
              disabled={
                rejectMutation.isPending || rejectReason.trim().length < 10
              }
            >
              {rejectMutation.isPending && <Loader2 className="animate-spin" />}
              Reject Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
