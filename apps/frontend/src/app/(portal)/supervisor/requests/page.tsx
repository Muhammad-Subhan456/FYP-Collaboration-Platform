"use client";

import { useState } from "react";
import { Check, ExternalLink, Eye, Loader2, X } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { getDisplayName } from "@/hooks/use-profiles";
import { useSupervisorRequestMutations } from "@/mutations/supervisor";
import {
  isSupervisorQueryInitialLoading,
  useSupervisorRequestsQuery,
} from "@/queries/supervisor";
import { ProposalDocumentDialog } from "@/components/proposal/proposal-document-dialog";
import type { Proposal } from "@/types/student";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function resolveFileUrl(url: string) {
  return url.startsWith("http") ? url : `${apiBase}${url}`;
}

export default function SupervisorRequestsPage() {
  const [confirmAction, setConfirmAction] = useState<{
    proposal: Proposal;
    type: "accept" | "reject";
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [viewProposalId, setViewProposalId] = useState<string | null>(null);

  const pageQuery = useSupervisorRequestsQuery();
  const { acceptMutation, rejectMutation } = useSupervisorRequestMutations();

  if (isSupervisorQueryInitialLoading(pageQuery)) return <DashboardSkeleton />;

  if (pageQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(pageQuery.error)}
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  const proposals = pageQuery.data?.proposals ?? [];
  const profiles = pageQuery.data?.profiles;
  const isPending = acceptMutation.isPending || rejectMutation.isPending;

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "accept") {
      acceptMutation.mutate(confirmAction.proposal.id, {
        onSuccess: () => setConfirmAction(null),
      });
      return;
    }
    if (!rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    rejectMutation.mutate(
      {
        proposalId: confirmAction.proposal.id,
        reason: rejectionReason.trim(),
      },
      {
        onSuccess: () => {
          setConfirmAction(null);
          setRejectionReason("");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Proposal Reviews</h2>
        <p className="text-sm text-muted-foreground">
          Accept or reject proposals submitted to you. You are the sole authority
          for supervision assignment.
        </p>
      </div>

      {proposals.length === 0 ? (
        <EmptyState
          title="No pending proposals"
          description="When a team submits a proposal to you, it will appear here for review."
        />
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => {
            const leaderId = proposal.teamLeaderAuthUserId;
            return (
              <Card key={proposal.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{proposal.title}</CardTitle>
                      <CardDescription>{proposal.domain}</CardDescription>
                    </div>
                    <StatusBadge status={proposal.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {proposal.abstract}
                  </p>
                  {proposal.proposalPdfUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={resolveFileUrl(proposal.proposalPdfUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Proposal PDF
                      </a>
                    </Button>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {leaderId && (
                      <span>
                        Team leader: {getDisplayName(profiles, leaderId)}
                      </span>
                    )}
                    <span>Submitted {formatDate(proposal.createdAt)}</span>
                    {proposal.pendingExpiresAt && (
                      <span className="text-amber-600 dark:text-amber-400">
                        Expires {formatDate(proposal.pendingExpiresAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setViewProposalId(proposal.id)}
                    >
                      <Eye className="h-4 w-4" />
                      View full proposal
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        setConfirmAction({ proposal, type: "accept" })
                      }
                    >
                      <Check className="h-4 w-4" />
                      Accept Proposal
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setConfirmAction({ proposal, type: "reject" })
                      }
                    >
                      <X className="h-4 w-4" />
                      Reject Proposal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAction(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === "accept"
                ? "Accept this proposal?"
                : "Reject this proposal?"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "accept"
                ? `You will become the supervisor for "${confirmAction?.proposal.title}". This action is final.`
                : `Provide feedback for declining "${confirmAction?.proposal.title}". The team may submit to another supervisor.`}
            </DialogDescription>
          </DialogHeader>
          {confirmAction?.type === "reject" && (
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection reason</Label>
              <Textarea
                id="rejection-reason"
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this proposal cannot be accepted..."
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProposalDocumentDialog
        proposalId={viewProposalId}
        open={!!viewProposalId}
        onOpenChange={(open) => !open && setViewProposalId(null)}
      />
    </div>
  );
}
