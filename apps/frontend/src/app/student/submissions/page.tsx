"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ExternalLink,
  History,
  Loader2,
  Upload,
} from "lucide-react";

import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { progressService, uploadService } from "@/services/progress.service";
import { teamService } from "@/services/team.service";
import type { Submission } from "@/types/student";

function isPastDue(dueDate: string) {
  return new Date(dueDate).getTime() < Date.now();
}

export default function StudentSubmissionsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deliverableId, setDeliverableId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<{
    deliverableId: string;
    title: string;
  } | null>(null);

  const teamQuery = useQuery({
    queryKey: ["team", "my-team"],
    queryFn: teamService.getMyTeam,
  });

  const submissionsQuery = useQuery({
    queryKey: ["submissions", "my"],
    queryFn: () => progressService.getMySubmissions(1, 50),
    enabled: !!teamQuery.data,
  });

  const deliverablesQuery = useQuery({
    queryKey: ["deliverables", "for-my-team"],
    queryFn: progressService.getDeliverablesForMyTeam,
    enabled: !!teamQuery.data,
  });

  const historyQuery = useQuery({
    queryKey: ["submissions", "history", historyTarget?.deliverableId],
    queryFn: () =>
      progressService.getSubmissionHistory(
        historyTarget!.deliverableId,
        teamQuery.data!.id,
      ),
    enabled: !!historyTarget && !!teamQuery.data,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!file || !deliverableId) throw new Error("File and deliverable required");
      const uploaded = await uploadService.uploadFile(file);
      return progressService.createSubmission({
        deliverableId,
        fileUrl: uploaded.fileUrl,
        remarks: remarks || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Submission uploaded!");
      setOpen(false);
      setFile(null);
      setRemarks("");
      setDeliverableId("");
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (teamQuery.isLoading) return <DashboardSkeleton />;

  if (!teamQuery.data) {
    return (
      <EmptyState
        title="No team yet"
        description="Join a team before submitting deliverables."
        action={
          <Button asChild>
            <Link href="/student/team">Go to Team</Link>
          </Button>
        }
      />
    );
  }

  if (submissionsQuery.isLoading || deliverablesQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (submissionsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(submissionsQuery.error)}
        onRetry={() => submissionsQuery.refetch()}
      />
    );
  }

  const submissions = submissionsQuery.data?.data ?? [];
  const deliverables = deliverablesQuery.data ?? [];
  const submittableDeliverables = deliverables.filter(
    (d) => !isPastDue(d.dueDate),
  );
  const hasSubmittable = submittableDeliverables.length > 0;

  const openSubmitDialog = (preselectedId?: string) => {
    if (preselectedId) {
      setDeliverableId(preselectedId);
    }
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">My Submissions</h2>
          <p className="text-sm text-muted-foreground">
            Track and upload your deliverable submissions
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!hasSubmittable}>
              <Upload className="h-4 w-4" />
              New Submission
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Deliverable</DialogTitle>
              <DialogDescription>
                Upload your file (PDF, DOC, PPT, ZIP — max 10MB)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Deliverable</Label>
                {deliverablesQuery.isFetching ? (
                  <p className="text-sm text-muted-foreground">
                    Loading deliverables...
                  </p>
                ) : submittableDeliverables.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No deliverables are currently open for submission. Deadlines may have passed.
                  </p>
                ) : (
                  <Select value={deliverableId} onValueChange={setDeliverableId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select deliverable" />
                    </SelectTrigger>
                    <SelectContent>
                      {submittableDeliverables.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.title} — due {formatDate(d.dueDate)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.png,.jpg,.jpeg"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks (optional)</Label>
                <Textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any notes for your supervisor..."
                />
              </div>
              <Button
                className="w-full"
                onClick={() => submitMutation.mutate()}
                disabled={
                  submitMutation.isPending ||
                  !file ||
                  !deliverableId ||
                  submittableDeliverables.every((d) => d.id !== deliverableId)
                }
              >
                {submitMutation.isPending && <Loader2 className="animate-spin" />}
                Upload & Submit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {deliverablesQuery.isError ? (
        <ErrorState
          message={getErrorMessage(deliverablesQuery.error)}
          onRetry={() => deliverablesQuery.refetch()}
        />
      ) : deliverables.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Available to submit
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {deliverables.map((d) => {
              const pastDue = isPastDue(d.dueDate);
              return (
              <Card key={d.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{d.title}</CardTitle>
                  <CardDescription>
                    Due {formatDate(d.dueDate)}
                    {pastDue && (
                      <span className="ml-2 text-destructive">· Deadline passed</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                    {d.description}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => openSubmitDialog(d.id)}
                    disabled={pastDue}
                  >
                    <Upload className="h-4 w-4" />
                    {pastDue ? "Submission closed" : "Submit"}
                  </Button>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          title="No deliverables assigned"
          description="Your supervisor has not published any active deliverables yet. Check back after they create one."
        />
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Your submissions
        </h3>
      {submissions.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          description="Upload your first deliverable submission using the button above."
          action={
            deliverables.length > 0 ? (
              <Button onClick={() => openSubmitDialog()}>
                <Upload className="h-4 w-4" />
                New Submission
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {submissions.map((s: Submission) => (
            <Card key={s.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="font-medium">
                    {s.deliverable?.title ?? "Deliverable"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Version {s.version} · Submitted {formatDateTime(s.submittedAt)}
                  </p>
                  {s.remarks && (
                    <p className="text-sm text-muted-foreground">{s.remarks}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={s.status} />
                  <Button variant="outline" size="sm" asChild>
                    <a href={s.fileUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                      View File
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setHistoryTarget({
                        deliverableId: s.deliverableId,
                        title: s.deliverable?.title ?? "Deliverable",
                      });
                      setHistoryOpen(true);
                    }}
                  >
                    <History className="h-3 w-3" />
                    History
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submission History</DialogTitle>
            <DialogDescription>{historyTarget?.title}</DialogDescription>
          </DialogHeader>
          {historyQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {historyQuery.data?.map((h) => (
                <div key={h.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">v{h.version}</span>
                    <StatusBadge status={h.status} />
                  </div>
                  <p className="text-muted-foreground">
                    {formatDateTime(h.submittedAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
