"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Megaphone,
  MessageSquare,
  Package,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
import { AttachmentList } from "@/components/work-stream/attachment-list";
import { CommentSection } from "@/components/work-stream/comment-section";
import { RichContent } from "@/components/work-stream/rich-content";
import { SegmentedControl } from "@/components/work-stream/segmented-control";
import { TeamSelector } from "@/components/work-stream/team-selector";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { useAuth } from "@/providers/auth-provider";
import { useSupervisorPageQuery } from "@/hooks/use-supervisor-page";
import { uploadService } from "@/services/progress.service";
import { supervisorPageService } from "@/services/supervisor-page.service";
import { supervisorService } from "@/services/supervisor.service";
import { workStreamService } from "@/services/work-stream.service";
import type { DeliverableType, Submission } from "@/types/student";
import type {
  WorkStreamAnnouncementItem,
  WorkStreamComment,
  WorkStreamDeliverableItem,
} from "@/types/work-stream";
import { workStreamEntityKey } from "@/types/work-stream";

type MainTab = "announcements" | "deliverables";
type DeliverableTab = "comments" | "submissions";
type CreateMode = "announcement" | "deliverable" | null;

const ANNOUNCEMENT_TYPES = [
  "GENERAL",
  "DEADLINE",
  "MEETING",
  "WORKSHOP",
  "VIVA",
] as const;

const DELIVERABLE_TYPES: DeliverableType[] = [
  "SRS",
  "DESIGN",
  "MID_VIVA",
  "FINAL_REPORT",
  "PRESENTATION",
  "OTHER",
];

export default function SupervisorWorkStreamPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [mainTab, setMainTab] = useState<MainTab>("announcements");
  const [filterTeamIds, setFilterTeamIds] = useState<string[]>([]);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<
    string | null
  >(null);
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<
    string | null
  >(null);
  const [deliverableTab, setDeliverableTab] =
    useState<DeliverableTab>("submissions");
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [editAnnouncement, setEditAnnouncement] =
    useState<WorkStreamAnnouncementItem | null>(null);
  const [editDeliverable, setEditDeliverable] =
    useState<WorkStreamDeliverableItem | null>(null);
  const [createTeamIds, setCreateTeamIds] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [localComments, setLocalComments] = useState<
    Record<string, WorkStreamComment[]>
  >({});

  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formType, setFormType] = useState("GENERAL");
  const [formDueDate, setFormDueDate] = useState("");
  const [formDeliverableType, setFormDeliverableType] =
    useState<DeliverableType>("SRS");

  const [reviewTarget, setReviewTarget] = useState<Submission | null>(null);
  const [reviewStatus, setReviewStatus] = useState<
    "APPROVED" | "CHANGES_REQUIRED"
  >("APPROVED");
  const [reviewFeedback, setReviewFeedback] = useState("");

  const filterKey =
    filterTeamIds.length > 0 ? filterTeamIds.join(",") : "all";

  const pageQuery = useSupervisorPageQuery(
    "work-stream",
    () =>
      supervisorPageService.getWorkStream(
        filterTeamIds.length > 0 ? filterTeamIds : undefined,
      ),
    filterKey,
  );

  useEffect(() => {
    if (searchParams.get("tab") === "deliverables") {
      setMainTab("deliverables");
    }
  }, [searchParams]);

  useEffect(() => {
    if (pageQuery.data?.teams.length && createTeamIds.length === 0) {
      setCreateTeamIds(pageQuery.data.teams.map((team) => team.id));
    }
  }, [pageQuery.data?.teams, createTeamIds.length]);

  useEffect(() => {
    if (pageQuery.data?.commentsByEntity) {
      setLocalComments(pageQuery.data.commentsByEntity);
    }
  }, [pageQuery.data?.commentsByEntity]);

  const invalidateWorkStream = () => {
    queryClient.invalidateQueries({ queryKey: ["supervisor", "work-stream"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const uploadAttachments = async () => {
    const uploaded = [];
    for (const file of pendingFiles) {
      const result = await uploadService.uploadFile(file);
      uploaded.push({ fileUrl: result.fileUrl, fileName: file.name });
    }
    return uploaded;
  };

  const createAnnouncementMutation = useMutation({
    mutationFn: async () => {
      const attachments = await uploadAttachments();
      return supervisorService.createAnnouncement({
        title: formTitle.trim(),
        message: formBody.trim(),
        type: formType,
        dueDate: formDueDate
          ? new Date(formDueDate).toISOString()
          : undefined,
        teamIds: createTeamIds,
        attachments,
      });
    },
    onSuccess: () => {
      toast.success("Announcement published");
      resetForm();
      invalidateWorkStream();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: async () => {
      if (!editAnnouncement) return;
      const attachments =
        pendingFiles.length > 0 ? await uploadAttachments() : undefined;
      return supervisorService.updateAnnouncement(editAnnouncement.id, {
        title: formTitle.trim(),
        message: formBody.trim(),
        type: formType,
        dueDate: formDueDate
          ? new Date(formDueDate).toISOString()
          : undefined,
        attachments,
      });
    },
    onSuccess: () => {
      toast.success("Announcement updated");
      resetForm();
      invalidateWorkStream();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const createDeliverableMutation = useMutation({
    mutationFn: async () => {
      const attachments = await uploadAttachments();
      return supervisorService.createDeliverable({
        title: formTitle.trim(),
        description: formBody.trim(),
        type: formDeliverableType,
        dueDate: new Date(formDueDate).toISOString(),
        teamIds: createTeamIds,
        attachments,
      });
    },
    onSuccess: () => {
      toast.success("Deliverable created");
      resetForm();
      invalidateWorkStream();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateDeliverableMutation = useMutation({
    mutationFn: async () => {
      if (!editDeliverable) return;
      const attachments =
        pendingFiles.length > 0 ? await uploadAttachments() : undefined;
      return supervisorService.updateDeliverable(editDeliverable.id, {
        title: formTitle.trim(),
        description: formBody.trim(),
        type: formDeliverableType,
        dueDate: formDueDate
          ? new Date(formDueDate).toISOString()
          : undefined,
        attachments,
      });
    },
    onSuccess: () => {
      toast.success("Deliverable updated");
      resetForm();
      invalidateWorkStream();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: (id: string) => supervisorService.deleteAnnouncement(id),
    onSuccess: () => {
      toast.success("Announcement deleted");
      setSelectedAnnouncementId(null);
      invalidateWorkStream();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteDeliverableMutation = useMutation({
    mutationFn: (id: string) => supervisorService.deleteDeliverable(id),
    onSuccess: () => {
      toast.success("Deliverable removed");
      setSelectedDeliverableId(null);
      invalidateWorkStream();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const toggleSubmissionsMutation = useMutation({
    mutationFn: ({
      id,
      submissionsOpen,
    }: {
      id: string;
      submissionsOpen: boolean;
    }) => supervisorService.updateDeliverable(id, { submissionsOpen }),
    onSuccess: () => {
      toast.success("Submission settings updated");
      invalidateWorkStream();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      supervisorService.reviewSubmission(reviewTarget!.id, {
        status: reviewStatus,
        feedback: reviewFeedback || undefined,
      }),
    onSuccess: () => {
      toast.success("Review submitted");
      setReviewTarget(null);
      setReviewFeedback("");
      invalidateWorkStream();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const commentMutation = useMutation({
    mutationFn: workStreamService.createComment,
    onSuccess: (comment, variables) => {
      const key = workStreamEntityKey(
        variables.entityType,
        variables.entityId,
      );
      setLocalComments((prev) => ({
        ...prev,
        [key]: [...(prev[key] ?? []), comment],
      }));
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const resetForm = () => {
    setCreateMode(null);
    setEditAnnouncement(null);
    setEditDeliverable(null);
    setFormTitle("");
    setFormBody("");
    setFormType("GENERAL");
    setFormDueDate("");
    setFormDeliverableType("SRS");
    setPendingFiles([]);
    if (pageQuery.data?.teams) {
      setCreateTeamIds(pageQuery.data.teams.map((team) => team.id));
    }
  };

  const openCreate = (mode: CreateMode) => {
    resetForm();
    setCreateMode(mode);
  };

  const openEditAnnouncement = (item: WorkStreamAnnouncementItem) => {
    setEditAnnouncement(item);
    setCreateMode("announcement");
    setFormTitle(item.title);
    setFormBody(item.message);
    setFormType(item.type);
    setFormDueDate(item.dueDate ? item.dueDate.slice(0, 10) : "");
    setPendingFiles([]);
  };

  const openEditDeliverable = (item: WorkStreamDeliverableItem) => {
    setEditDeliverable(item);
    setCreateMode("deliverable");
    setFormTitle(item.title);
    setFormBody(item.description);
    setFormDeliverableType(item.type as DeliverableType);
    setFormDueDate(item.dueDate.slice(0, 10));
    setPendingFiles([]);
  };

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

  if (pageQuery.isLoading || pageQuery.isPending || !pageQuery.data) {
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

  const data = pageQuery.data;
  const profiles = data.profiles ?? {};

  const postComment = async (
    entityType: "ANNOUNCEMENT" | "DELIVERABLE",
    entityId: string,
    body: string,
  ) => {
    await commentMutation.mutateAsync({ entityType, entityId, body });
  };

  const renderCreateDialog = () => (
    <Dialog
      open={createMode !== null}
      onOpenChange={(open) => !open && resetForm()}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editAnnouncement || editDeliverable
              ? "Edit"
              : "Create"}{" "}
            {createMode === "announcement" ? "Announcement" : "Deliverable"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!editAnnouncement && !editDeliverable && (
            <TeamSelector
              teams={data.teams}
              selectedTeamIds={createTeamIds}
              onChange={setCreateTeamIds}
              label="Assign to teams"
            />
          )}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>
              {createMode === "announcement" ? "Message" : "Description"}
            </Label>
            <Textarea
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
              rows={5}
              placeholder="Supports plain text and URLs. HTML is rendered when included."
            />
          </div>
          {createMode === "announcement" ? (
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANNOUNCEMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formDeliverableType}
                onValueChange={(v) =>
                  setFormDeliverableType(v as DeliverableType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERABLE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>{createMode === "announcement" ? "Related date (optional)" : "Due date"}</Label>
            <Input
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Attachments</Label>
            <Input
              type="file"
              multiple
              onChange={(e) =>
                setPendingFiles(Array.from(e.target.files ?? []))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={
              !formTitle.trim() ||
              !formBody.trim() ||
              (createMode === "deliverable" && !formDueDate) ||
              (!editAnnouncement &&
                !editDeliverable &&
                createTeamIds.length === 0) ||
              createAnnouncementMutation.isPending ||
              createDeliverableMutation.isPending ||
              updateAnnouncementMutation.isPending ||
              updateDeliverableMutation.isPending
            }
            onClick={() => {
              if (createMode === "announcement") {
                if (editAnnouncement) {
                  updateAnnouncementMutation.mutate();
                } else {
                  createAnnouncementMutation.mutate();
                }
              } else if (createMode === "deliverable") {
                if (editDeliverable) {
                  updateDeliverableMutation.mutate();
                } else {
                  createDeliverableMutation.mutate();
                }
              }
            }}
          >
            {(createAnnouncementMutation.isPending ||
              createDeliverableMutation.isPending ||
              updateAnnouncementMutation.isPending ||
              updateDeliverableMutation.isPending) && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (selectedAnnouncement) {
    const commentKey = workStreamEntityKey(
      "ANNOUNCEMENT",
      selectedAnnouncement.id,
    );

    return (
      <div className="space-y-6">
        {renderCreateDialog()}
        <Button
          variant="ghost"
          className="gap-2 px-0"
          onClick={() => setSelectedAnnouncementId(null)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>{selectedAnnouncement.title}</CardTitle>
                {selectedAnnouncement.teamName && (
                  <CardDescription>
                    Team: {selectedAnnouncement.teamName}
                  </CardDescription>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => openEditAnnouncement(selectedAnnouncement)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    deleteAnnouncementMutation.mutate(selectedAnnouncement.id)
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <RichContent content={selectedAnnouncement.message} />
            <AttachmentList attachments={selectedAnnouncement.attachments} />
            <CommentSection
              entityType="ANNOUNCEMENT"
              entityId={selectedAnnouncement.id}
              comments={localComments[commentKey] ?? []}
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
    const submissions =
      data.submissionsByDeliverable[selectedDeliverable.id] ?? [];

    return (
      <div className="space-y-6">
        {renderCreateDialog()}
        <Button
          variant="ghost"
          className="gap-2 px-0"
          onClick={() => setSelectedDeliverableId(null)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle>{selectedDeliverable.title}</CardTitle>
                <CardDescription>
                  {selectedDeliverable.teamName
                    ? `Team: ${selectedDeliverable.teamName} · `
                    : ""}
                  Due {formatDate(selectedDeliverable.dueDate)}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditDeliverable(selectedDeliverable)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toggleSubmissionsMutation.mutate({
                      id: selectedDeliverable.id,
                      submissionsOpen: !selectedDeliverable.submissionsOpen,
                    })
                  }
                >
                  {selectedDeliverable.submissionsOpen
                    ? "Close submissions"
                    : "Reopen submissions"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    deleteDeliverableMutation.mutate(selectedDeliverable.id)
                  }
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <RichContent content={selectedDeliverable.description} />
            <AttachmentList attachments={selectedDeliverable.attachments} />

            <SegmentedControl
              value={deliverableTab}
              onChange={setDeliverableTab}
              options={[
                { value: "comments", label: "Comments" },
                { value: "submissions", label: "Submissions" },
              ]}
            />

            {deliverableTab === "comments" ? (
              <CommentSection
                entityType="DELIVERABLE"
                entityId={selectedDeliverable.id}
                comments={localComments[commentKey] ?? []}
                profiles={profiles}
                currentUserId={user?.userId}
                onPost={(body) =>
                  postComment("DELIVERABLE", selectedDeliverable.id, body)
                }
              />
            ) : submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No submissions yet for this deliverable.
              </p>
            ) : (
              <div className="space-y-3">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">
                        v{submission.version} ·{" "}
                        {data.teamNameById[submission.teamId] ??
                          submission.teamId}
                      </span>
                      <StatusBadge status={submission.status} />
                    </div>
                    <p className="text-muted-foreground">
                      {formatDateTime(submission.submittedAt)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <a
                          href={submission.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View file
                        </a>
                      </Button>
                      {submission.status === "SUBMITTED" && (
                        <Button
                          size="sm"
                          onClick={() => setReviewTarget(submission)}
                        >
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={!!reviewTarget}
          onOpenChange={(open) => !open && setReviewTarget(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review submission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Decision</Label>
                <Select
                  value={reviewStatus}
                  onValueChange={(v) =>
                    setReviewStatus(v as "APPROVED" | "CHANGES_REQUIRED")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPROVED">Accept</SelectItem>
                    <SelectItem value="CHANGES_REQUIRED">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  rows={4}
                  placeholder="Feedback for the team"
                />
              </div>
              <Button
                className="w-full"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate()}
              >
                {reviewMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Submit review
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderCreateDialog()}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Work Stream</h2>
          <p className="text-sm text-muted-foreground">
            Manage announcements, deliverables, and reviews
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => openCreate("announcement")}
          >
            <Plus className="h-4 w-4" />
            Announcement
          </Button>
          <Button onClick={() => openCreate("deliverable")}>
            <Plus className="h-4 w-4" />
            Deliverable
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <TeamSelector
          teams={data.teams}
          selectedTeamIds={filterTeamIds}
          onChange={setFilterTeamIds}
          label="Filter by team"
        />

        <div className="space-y-4">
          <SegmentedControl
            value={mainTab}
            onChange={setMainTab}
            options={[
              { value: "announcements", label: "Announcements" },
              { value: "deliverables", label: "Deliverables" },
            ]}
          />

          {mainTab === "announcements" ? (
            data.announcements.length === 0 ? (
              <EmptyState title="No announcements" description="Create one for your teams." />
            ) : (
              <div className="space-y-3">
                {data.announcements.map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:border-primary/30"
                    onClick={() => setSelectedAnnouncementId(item.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Megaphone className="h-4 w-4 text-primary" />
                        {item.title}
                      </CardTitle>
                      <CardDescription>
                        {item.teamName ? `${item.teamName} · ` : ""}
                        {formatDate(item.createdAt)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {item.preview}
                      </p>
                      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
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
            <EmptyState title="No deliverables" description="Create deliverables for your teams." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {data.deliverables.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:border-primary/30"
                  onClick={() => setSelectedDeliverableId(item.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Package className="h-4 w-4 text-primary" />
                      {item.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {item.teamName ? `${item.teamName} · ` : ""}
                      Due {formatDate(item.dueDate)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {item.latestSubmissionStatus
                      ? `Latest: ${item.latestSubmissionStatus}`
                      : "No submissions yet"}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
