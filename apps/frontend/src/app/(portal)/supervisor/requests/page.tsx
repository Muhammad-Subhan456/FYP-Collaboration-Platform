"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, ExternalLink, Loader2, X } from "lucide-react";

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
import { useSupervisorPageQuery } from "@/hooks/use-supervisor-page";
import { proposalService } from "@/services/proposal.service";
import { supervisorPageService } from "@/services/supervisor-page.service";
import type { SupervisorRequest } from "@/types/supervisor";

export default function SupervisorRequestsPage() {
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<{
    request: SupervisorRequest;
    type: "accept" | "reject";
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const pageQuery = useSupervisorPageQuery(
    "requests",
    supervisorPageService.getRequests,
  );

  const acceptMutation = useMutation({
    mutationFn: proposalService.acceptSupervisorRequest,
    onSuccess: () => {
      toast.success("Request accepted");
      queryClient.invalidateQueries({ queryKey: ["supervisor", "requests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setConfirmAction(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      requestId,
      reason,
    }: {
      requestId: string;
      reason: string;
    }) => proposalService.rejectSupervisorRequest(requestId, reason),
    onSuccess: () => {
      toast.success("Request rejected");
      queryClient.invalidateQueries({ queryKey: ["supervisor", "requests"] });
      setConfirmAction(null);
      setRejectionReason("");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (pageQuery.isLoading) return <DashboardSkeleton />;

  if (pageQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(pageQuery.error)}
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  const requests = pageQuery.data?.requests ?? [];
  const profiles = pageQuery.data?.profiles;
  const isPending = acceptMutation.isPending || rejectMutation.isPending;

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "accept") {
      acceptMutation.mutate(confirmAction.request.id);
      return;
    }
    if (!rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    rejectMutation.mutate({
      requestId: confirmAction.request.id,
      reason: rejectionReason.trim(),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Supervision Requests</h2>
        <p className="text-sm text-muted-foreground">
          Review proposals from students who requested you as supervisor
        </p>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          title="No pending requests"
          description="When students request you as their supervisor, they will appear here."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const leaderId = request.proposal.teamLeaderAuthUserId;
            return (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{request.proposal.title}</CardTitle>
                      <CardDescription>
                        {request.proposal.domain}
                      </CardDescription>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {request.proposal.abstract}
                  </p>
                  {request.proposal.proposalPdfUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={request.proposal.proposalPdfUrl}
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
                        Team leader:{" "}
                        {getDisplayName(profiles, leaderId)}
                      </span>
                    )}
                    <span>Requested {formatDate(request.createdAt)}</span>
                    {request.expiresAt && (
                      <span className="text-amber-600 dark:text-amber-400">
                        Expires {formatDate(request.expiresAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        setConfirmAction({ request, type: "accept" })
                      }
                    >
                      <Check className="h-4 w-4" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setConfirmAction({ request, type: "reject" })
                      }
                    >
                      <X className="h-4 w-4" />
                      Reject
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
                ? "Accept supervision request?"
                : "Reject supervision request?"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "accept"
                ? `You will become the supervisor for "${confirmAction?.request.proposal.title}".`
                : `Provide a reason for declining "${confirmAction?.request.proposal.title}".`}
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
                placeholder="Explain why you cannot supervise this project..."
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
    </div>
  );
}
