"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import {
  isDeepLinkFocused,
  useDeepLinkFocus,
} from "@/hooks/use-deep-link-focus";
import { progressService, uploadService } from "@/services/progress.service";
import { useStudentPageQuery } from "@/hooks/use-student-page";
import { studentService } from "@/services/student.service";
import type { Submission } from "@/types/student";
import { cn } from "@/lib/utils";

function isPastDue(dueDate: string) {
  return new Date(dueDate).getTime() < Date.now();
}

export default function StudentSubmissionsPage() {
  const queryClient = useQueryClient();
  const submissionFocusId = useDeepLinkFocus("submissionId");
  const deliverableFocusId = useDeepLinkFocus("deliverableId");
  const [open, setOpen] = useState(false);
  const [deliverableId, setDeliverableId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<{
    deliverableId: string;
    title: string;
  } | null>(null);

  const pageQuery = useStudentPageQuery(
    "submissions",
    studentService.getSubmissions,
  );

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
      queryClient.invalidateQueries({ queryKey: ["student", "submissions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const submissions = pageQuery.data?.submissions.data ?? [];

  useEffect(() => {
    if (!submissionFocusId || submissions.length === 0) {
      return;
    }

    const matched = submissions.find((s) => s.id === submissionFocusId);
    if (matched) {
      setHistoryTarget({
        deliverableId: matched.deliverableId,
        title: matched.deliverable?.title ?? "Deliverable",
      });
      setHistoryOpen(true);
    }
  }, [submissionFocusId, submissions]);

  if (pageQuery.isLoading) return <DashboardSkeleton />;

  const data = pageQuery.data;
  if (!data?.team) {
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

  if (pageQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(pageQuery.error)}
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  const deliverables = data.deliverables;
  const submissionHistories = data.submissionHistories;
  const historyItems = historyTarget
    ? submissionHistories[historyTarget.deliverableId] ?? []
    : [];

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
                {submittableDeliverables.length === 0 ? (
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

      {deliverables.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Available to submit
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {deliverables.map((d) => {
              const pastDue = isPastDue(d.dueDate);
              return (
              <Card
                key={d.id}
                id={`focus-${d.id}`}
                className={cn(
                  isDeepLinkFocused(deliverableFocusId, d.id) &&
                    "border-primary ring-2 ring-primary/20",
                )}
              >
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
            <Card
              key={s.id}
              id={`focus-${s.id}`}
              className={cn(
                isDeepLinkFocused(submissionFocusId, s.id) &&
                  "border-primary ring-2 ring-primary/20",
              )}
            >
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
          {historyItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history found.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {historyItems.map((h) => (
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
