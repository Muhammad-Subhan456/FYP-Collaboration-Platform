"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  Megaphone,
  MessageSquare,
  Package,
  Paperclip,
  Upload,
} from "lucide-react";

import { PhaseFilter } from "@/components/common/phase-filter";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { StatusBadge } from "@/components/common/status-badge";
import { AttachmentList } from "@/components/work-stream/attachment-list";
import { CommentSection } from "@/components/work-stream/comment-section";
import { SubmissionRemarks } from "@/components/work-stream/submission-remarks";
import { RichContent } from "@/components/work-stream/rich-content";
import { SegmentedControl } from "@/components/work-stream/segmented-control";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { useStudentWorkStreamMutations } from "@/mutations/student";
import { useAuth } from "@/providers/auth-provider";
import {
  useStudentWorkStreamQuery,
  isStudentQueryPending,
} from "@/queries/student";
import type { Submission } from "@/types/student";
import type {
  WorkStreamAnnouncementItem,
  WorkStreamDeliverableItem,
} from "@/types/work-stream";
import { workStreamEntityKey } from "@/types/work-stream";

type MainTab = "announcements" | "deliverables";
type DeliverableTab = "comments" | "history";

function getRemainingTime(dueDate: string) {
  const diff = new Date(dueDate).getTime() - Date.now();
  if (diff <= 0) return "Past due";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

function submissionStatusLabel(
  deliverable: WorkStreamDeliverableItem,
  history: Submission[] | undefined,
) {
  const latest = history?.[0];
  if (latest?.status === "FINALIZED") return "Finalized";
  if (latest?.status === "APPROVED") return "Approved";
  if (latest?.status === "CHANGES_REQUIRED") return "Changes required";
  if (latest) return `Submitted (v${latest.version})`;
  if (!deliverable.submissionOpen) return "Closed";
  return "Not submitted";
}

export default function StudentWorkStreamPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [mainTab, setMainTab] = useState<MainTab>("announcements");
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<
    string | null
  >(null);
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<
    string | null
  >(null);
  const [deliverableTab, setDeliverableTab] =
    useState<DeliverableTab>("comments");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitRemarks, setSubmitRemarks] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("all");

  const pageQuery = useStudentWorkStreamQuery(
    phaseFilter === "all" ? null : phaseFilter,
  );
  const { commentMutation, submitMutation } = useStudentWorkStreamMutations();

  useEffect(() => {
    const announcementId = searchParams.get("announcementId");
    const deliverableId = searchParams.get("deliverableId");
    const tab = searchParams.get("tab");
    if (tab === "deliverables") {
      setMainTab("deliverables");
    }
    if (announcementId) {
      setMainTab("announcements");
      setSelectedAnnouncementId(announcementId);
    }
    if (deliverableId) {
      setMainTab("deliverables");
      setSelectedDeliverableId(deliverableId);
    }
  }, [searchParams]);

  const selectedAnnouncement = useMemo(
    () =>
      pageQuery.data?.announcements.find(
        (item) => item.id === selectedAnnouncementId,
      ) ?? null,
    [pageQuery.data?.announcements, selectedAnnouncementId],
  );

  const selectedDeliverable = useMemo(
    () =>
      pageQuery.data?.deliverables.find(
        (item) => item.id === selectedDeliverableId,
      ) ?? null,
    [pageQuery.data?.deliverables, selectedDeliverableId],
  );

  if (isStudentQueryPending(pageQuery)) {
    return <DashboardSkeleton />;
  }

  if (pageQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(pageQuery.error)}
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  if (!pageQuery.data) {
    return <DashboardSkeleton />;
  }

  const data = pageQuery.data;
  const profiles = {
    ...(data.profiles ?? {}),
    ...(data.supervisorProfile
      ? { [data.supervisorProfile.authUserId]: data.supervisorProfile }
      : {}),
  };

  if (!data.team) {
    return (
      <EmptyState
        title="No team yet"
        description="Join a team to access your collaboration work stream."
        action={
          <Button asChild>
            <Link href="/student/team">Go to Team</Link>
          </Button>
        }
      />
    );
  }

  const postComment = async (
    entityType: "ANNOUNCEMENT" | "DELIVERABLE",
    entityId: string,
    body: string,
  ) => {
    await commentMutation.mutateAsync({
      entityType,
      entityId,
      body,
    });
  };

  if (selectedAnnouncement) {
    const commentKey = workStreamEntityKey(
      "ANNOUNCEMENT",
      selectedAnnouncement.id,
    );

    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          className="gap-2 px-0"
          onClick={() => setSelectedAnnouncementId(null)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to announcements
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle>{selectedAnnouncement.title}</CardTitle>
              <StatusBadge status={selectedAnnouncement.type} />
            </div>
            <CardDescription>
              {selectedAnnouncement.createdByName} ·{" "}
              {formatDateTime(selectedAnnouncement.createdAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RichContent content={selectedAnnouncement.message} />
            <div>
              <h3 className="mb-2 font-medium">Attachments</h3>
              <AttachmentList attachments={selectedAnnouncement.attachments} />
            </div>
            <CommentSection
              entityType="ANNOUNCEMENT"
              entityId={selectedAnnouncement.id}
              comments={data.commentsByEntity[commentKey] ?? []}
              profiles={profiles}
              currentUserId={user?.userId}
              onPost={(body) =>
                postComment("ANNOUNCEMENT", selectedAnnouncement.id, body)
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedDeliverable) {
    const commentKey = workStreamEntityKey(
      "DELIVERABLE",
      selectedDeliverable.id,
    );
    const history =
      data.submissionHistories[selectedDeliverable.id] ?? [];

    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          className="gap-2 px-0"
          onClick={() => setSelectedDeliverableId(null)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to deliverables
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle>{selectedDeliverable.title}</CardTitle>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={selectedDeliverable.type} />
                <StatusBadge
                  status={
                    selectedDeliverable.submissionOpen ? "ACTIVE" : "INACTIVE"
                  }
                />
              </div>
            </div>
            <CardDescription className="space-y-1">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due {formatDate(selectedDeliverable.dueDate)}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {getRemainingTime(selectedDeliverable.dueDate)}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RichContent content={selectedDeliverable.description} />
            <div>
              <h3 className="mb-2 font-medium">Reference files</h3>
              <AttachmentList attachments={selectedDeliverable.attachments} />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {selectedDeliverable.submissionOpen ? (
                <Button onClick={() => setSubmitOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Submit Deliverable
                </Button>
              ) : (
                <Button disabled>Submission Closed</Button>
              )}
              {!selectedDeliverable.submissionOpen && (
                <p className="text-sm text-muted-foreground">
                  {selectedDeliverable.submissionClosedReason === "PAST_DUE"
                    ? "The due date has passed."
                    : selectedDeliverable.submissionClosedReason === "APPROVED"
                      ? "This deliverable has been approved."
                      : "Submissions are not accepting new uploads."}
                </p>
              )}
            </div>

            <SegmentedControl
              value={deliverableTab}
              onChange={setDeliverableTab}
              options={[
                { value: "comments", label: "Comments" },
                { value: "history", label: "Submission History" },
              ]}
            />

            {deliverableTab === "comments" ? (
              <CommentSection
                entityType="DELIVERABLE"
                entityId={selectedDeliverable.id}
                comments={data.commentsByEntity[commentKey] ?? []}
                profiles={profiles}
                currentUserId={user?.userId}
                onPost={(body) =>
                  postComment("DELIVERABLE", selectedDeliverable.id, body)
                }
              />
            ) : (
              <div className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No submissions yet.
                  </p>
                ) : (
                  history.map((submission) => (
                    <div
                      key={submission.id}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          Version {submission.version}
                        </span>
                        <StatusBadge status={submission.status} />
                      </div>
                      <p className="text-muted-foreground">
                        {formatDateTime(submission.submittedAt)}
                      </p>
                      <a
                        href={submission.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-primary hover:underline"
                      >
                        View attachment
                      </a>
                      <SubmissionRemarks
                        remarks={submission.remarks}
                        feedback={submission.feedback}
                        grade={submission.grade}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit {selectedDeliverable.title}</DialogTitle>
              <DialogDescription>
                Upload your file (PDF, DOC, PPT, ZIP — max 10MB)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>File</Label>
                <Input
                  type="file"
                  onChange={(e) =>
                    setSubmitFile(e.target.files?.[0] ?? null)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Remarks (optional)</Label>
                <Textarea
                  value={submitRemarks}
                  onChange={(e) => setSubmitRemarks(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                className="w-full"
                disabled={submitMutation.isPending || !submitFile}
                onClick={() => {
                  if (!submitFile || !selectedDeliverableId) return;
                  submitMutation.mutate(
                    {
                      deliverableId: selectedDeliverableId,
                      file: submitFile,
                      remarks: submitRemarks || undefined,
                    },
                    {
                      onSuccess: () => {
                        setSubmitOpen(false);
                        setSubmitFile(null);
                        setSubmitRemarks("");
                      },
                    },
                  );
                }}
              >
                {submitMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Submit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Work Stream</h2>
          <p className="text-sm text-muted-foreground">
            Announcements and deliverables for {data.team.name}
          </p>
        </div>
        <PhaseFilter value={phaseFilter} onChange={setPhaseFilter} />
      </div>

      <SegmentedControl
        value={mainTab}
        onChange={(tab) => {
          setMainTab(tab);
          setSelectedAnnouncementId(null);
          setSelectedDeliverableId(null);
        }}
        options={[
          { value: "announcements", label: "Announcements" },
          { value: "deliverables", label: "Deliverables" },
        ]}
      />

      {mainTab === "announcements" ? (
        data.announcements.length === 0 ? (
          <EmptyState
            title="No announcements yet"
            description="Your supervisor has not published any announcements."
          />
        ) : (
          <div className="space-y-3">
            {data.announcements.map((item: WorkStreamAnnouncementItem) => (
              <Card
                key={item.id}
                className="cursor-pointer transition-all hover:border-primary/30 hover:shadow-md"
                onClick={() => setSelectedAnnouncementId(item.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Megaphone className="h-4 w-4 text-primary" />
                      {item.title}
                    </CardTitle>
                    <StatusBadge status={item.type} />
                  </div>
                  <CardDescription>
                    {item.createdByName} · {formatDate(item.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {item.preview}
                  </p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      {item.attachmentCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {item.commentCount}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : data.deliverables.length === 0 ? (
        <EmptyState
          title="No deliverables yet"
          description="Your supervisor has not assigned any deliverables."
        />
      ) : (
        <div className="space-y-3">
          {data.deliverables.map((item: WorkStreamDeliverableItem) => {
            const history = data.submissionHistories[item.id];
            return (
              <Card
                key={item.id}
                className="cursor-pointer transition-all hover:border-primary/30 hover:shadow-md"
                onClick={() => setSelectedDeliverableId(item.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Package className="h-4 w-4 text-primary" />
                      {item.title}
                    </CardTitle>
                    <StatusBadge status={item.type} />
                  </div>
                  <CardDescription>
                    Due {formatDate(item.dueDate)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    Submission:{" "}
                    {item.submissionOpen ? "Open" : "Closed"} ·{" "}
                    {submissionStatusLabel(item, history)}
                  </p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      {item.attachmentCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {item.commentCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Upload className="h-3 w-3" />
                      {item.submissionCount}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
