"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";

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
    mutationFn: proposalService.rejectSupervisorRequest,
    onSuccess: () => {
      toast.success("Request rejected");
      queryClient.invalidateQueries({ queryKey: ["supervisor", "requests"] });
      setConfirmAction(null);
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
    } else {
      rejectMutation.mutate(confirmAction.request.id);
    }
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
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {leaderId && (
                      <span>
                        Team leader:{" "}
                        {getDisplayName(profiles, leaderId)}
                      </span>
                    )}
                    <span>Requested {formatDate(request.createdAt)}</span>
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
        onOpenChange={(open) => !open && setConfirmAction(null)}
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
                : `The team will be notified that you declined "${confirmAction?.request.proposal.title}".`}
            </DialogDescription>
          </DialogHeader>
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
