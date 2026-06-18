"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2 } from "lucide-react";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { getTeamLabel } from "@/hooks/use-team-labels";
import { proposalService } from "@/services/proposal.service";
import { supervisorService } from "@/services/supervisor.service";
import type { Submission } from "@/types/student";

export default function SupervisorReviewsPage() {
  const queryClient = useQueryClient();
  const [deliverableId, setDeliverableId] = useState("");
  const [reviewTarget, setReviewTarget] = useState<Submission | null>(null);
  const [status, setStatus] = useState<"APPROVED" | "CHANGES_REQUIRED">(
    "APPROVED",
  );
  const [feedback, setFeedback] = useState("");
  const [grade, setGrade] = useState("");

  const deliverablesQuery = useQuery({
    queryKey: ["deliverables", "my"],
    queryFn: supervisorService.getMyDeliverables,
  });

  const supervisedQuery = useQuery({
    queryKey: ["proposals", "supervised"],
    queryFn: proposalService.getSupervisedProposals,
  });

  const submissionsQuery = useQuery({
    queryKey: ["submissions", "deliverable", deliverableId],
    queryFn: () => supervisorService.getDeliverableSubmissions(deliverableId),
    enabled: !!deliverableId,
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      supervisorService.reviewSubmission(reviewTarget!.id, {
        status,
        feedback: feedback || undefined,
        grade: grade ? Number(grade) : undefined,
      }),
    onSuccess: () => {
      toast.success("Review submitted");
      setReviewTarget(null);
      setFeedback("");
      setGrade("");
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (deliverablesQuery.isLoading) return <DashboardSkeleton />;

  if (deliverablesQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(deliverablesQuery.error)}
        onRetry={() => deliverablesQuery.refetch()}
      />
    );
  }

  const deliverables = deliverablesQuery.data ?? [];
  const submissions = submissionsQuery.data ?? [];
  const supervised = supervisedQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Submission Reviews</h2>
        <p className="text-sm text-muted-foreground">
          Review and provide feedback on team submissions
        </p>
      </div>

      {deliverables.length === 0 ? (
        <EmptyState
          title="No deliverables"
          description="Create deliverables first, then review submissions here."
        />
      ) : (
        <>
          <div className="max-w-md space-y-2">
            <Label>Select deliverable</Label>
            <Select value={deliverableId} onValueChange={setDeliverableId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a deliverable" />
              </SelectTrigger>
              <SelectContent>
                {deliverables.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {deliverableId && submissionsQuery.isLoading && (
            <DashboardSkeleton />
          )}

          {deliverableId && submissionsQuery.isError && (
            <ErrorState
              message={getErrorMessage(submissionsQuery.error)}
              onRetry={() => submissionsQuery.refetch()}
            />
          )}

          {deliverableId && !submissionsQuery.isLoading && (
            submissions.length === 0 ? (
              <EmptyState
                title="No submissions"
                description="No teams have submitted for this deliverable yet."
              />
            ) : (
              <div className="space-y-3">
                {submissions.map((s) => (
                  <Card key={s.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-base">
                            {getTeamLabel(supervised, s.teamId)}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Version {s.version} ·{" "}
                            {formatDateTime(s.submittedAt)}
                          </p>
                        </div>
                        <StatusBadge status={s.status} />
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={s.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View File
                        </a>
                      </Button>
                      {s.status === "SUBMITTED" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setReviewTarget(s);
                            setStatus("APPROVED");
                            setFeedback("");
                            setGrade("");
                          }}
                        >
                          Review
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}
        </>
      )}

      <Dialog
        open={!!reviewTarget}
        onOpenChange={(open) => !open && setReviewTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Decision</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setStatus(v as "APPROVED" | "CHANGES_REQUIRED")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">Approve</SelectItem>
                  <SelectItem value="CHANGES_REQUIRED">
                    Request Changes
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">Grade (optional)</Label>
              <Input
                id="grade"
                type="number"
                min={0}
                max={100}
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewTarget(null)}
              disabled={reviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending && (
                <Loader2 className="animate-spin" />
              )}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
