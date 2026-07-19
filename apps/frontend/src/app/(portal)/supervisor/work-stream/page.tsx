"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
import { PhaseFilter } from "@/components/common/phase-filter";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
import { AttachmentList } from "@/components/work-stream/attachment-list";
import { CommentSection } from "@/components/work-stream/comment-section";
import { SubmissionRemarks } from "@/components/work-stream/submission-remarks";
import { RichContent } from "@/components/work-stream/rich-content";
import { SegmentedControl } from "@/components/work-stream/segmented-control";
import { PublishTemplateDialog } from "@/components/supervisor/publish-template-dialog";
import { TemplateDetailsDialog } from "@/components/supervisor/template-details-dialog";
import { TeamFilterSelect } from "@/components/work-stream/team-filter-select";
import { TeamMultiSelect } from "@/components/work-stream/team-multi-select";
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
import { queryKeys } from "@/lib/react-query";
import { deliverableTemplateService } from "@/services/deliverable-template.service";
import type { DeliverableTemplate } from "@/types/phase";
import { formatDate, formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { useSupervisorWorkStreamMutations } from "@/mutations/supervisor";
import { useAuth } from "@/providers/auth-provider";
import {
  isSupervisorQueryInitialLoading,
  useSupervisorTeamsQuery,
  useSupervisorWorkStreamQuery,
} from "@/queries/supervisor";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectSupervisorTeamFilterId,
  setSupervisorTeamFilterId,
} from "@/store/slices/work-stream-ui-slice";
import type { DeliverableType, Submission } from "@/types/student";
import type {
  SupervisorWorkStreamTeam,
  WorkStreamAnnouncementItem,
  WorkStreamDeliverableItem,
} from "@/types/work-stream";
import { workStreamEntityKey } from "@/types/work-stream";

type MainTab = "announcements" | "deliverables" | "templates";
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
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const filterTeamId = useAppSelector(selectSupervisorTeamFilterId);

  const [mainTab, setMainTab] = useState<MainTab>("announcements");
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
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [publishTemplate, setPublishTemplate] =
    useState<DeliverableTemplate | null>(null);
  const [detailsTemplateId, setDetailsTemplateId] = useState<string | null>(
    null,
  );

  const [teamAssignError, setTeamAssignError] = useState<string | undefined>();

  const teamsQuery = useSupervisorTeamsQuery();

  const allSupervisedTeams = useMemo<SupervisorWorkStreamTeam[]>(() => {
    const proposals = teamsQuery.data?.proposals ?? [];
    const byId = new Map<string, SupervisorWorkStreamTeam>();

    for (const proposal of proposals) {
      if (!byId.has(proposal.teamId)) {
        byId.set(proposal.teamId, {
          id: proposal.teamId,
          name: proposal.title,
          projectTitle: proposal.title,
        });
      }
    }

    return [...byId.values()];
  }, [teamsQuery.data?.proposals]);

  useEffect(() => {
    if (allSupervisedTeams.length > 0 && !filterTeamId) {
      dispatch(setSupervisorTeamFilterId(allSupervisedTeams[0].id));
    }
  }, [allSupervisedTeams, dispatch, filterTeamId]);

  const filterKey = filterTeamId ?? "pending";

  const pageQuery = useSupervisorWorkStreamQuery(
    filterTeamId,
    phaseFilter === "all" ? null : phaseFilter,
  );

  const templatesQuery = useQuery({
    queryKey: queryKeys.deliverableTemplates.list(
      phaseFilter === "all" ? undefined : phaseFilter,
      user?.workspaceId,
    ),
    queryFn: () =>
      deliverableTemplateService.list(
        phaseFilter === "all" ? undefined : phaseFilter,
      ),
    enabled: !!user?.workspaceId,
  });

  const resetForm = () => {
    setCreateMode(null);
    setEditAnnouncement(null);
    setEditDeliverable(null);
    setTeamAssignError(undefined);
    setFormTitle("");
    setFormBody("");
    setFormType("GENERAL");
    setFormDueDate("");
    setFormDeliverableType("SRS");
    setPendingFiles([]);
    setCreateTeamIds([]);
  };

  const {
    createAnnouncementMutation,
    updateAnnouncementMutation,
    createDeliverableMutation,
    updateDeliverableMutation,
    deleteAnnouncementMutation,
    deleteDeliverableMutation,
    toggleSubmissionsMutation,
    reviewMutation,
    finalizeMutation,
    unfinalizeMutation,
    commentMutation,
  } = useSupervisorWorkStreamMutations({
    onFormSuccess: resetForm,
    onAnnouncementDeleted: () => setSelectedAnnouncementId(null),
    onDeliverableDeleted: () => setSelectedDeliverableId(null),
    onReviewSuccess: () => {
      setReviewTarget(null);
      setReviewFeedback("");
    },
  });

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "deliverables") {
      setMainTab("deliverables");
    }
    if (tab === "templates") {
      setMainTab("templates");
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

  if (teamsQuery.isLoading || (filterTeamId && isSupervisorQueryInitialLoading(pageQuery))) {
    return <DashboardSkeleton />;
  }

  if (teamsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(teamsQuery.error)}
        onRetry={() => teamsQuery.refetch()}
      />
    );
  }

  if (allSupervisedTeams.length === 0) {
    return (
      <EmptyState
        title="No supervised teams"
        description="Assign teams before managing the work stream."
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

  if (!pageQuery.data) {
    return (
      <ErrorState
        message="Failed to load work stream."
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  const data = pageQuery.data;
  const profiles = data.profiles ?? {};

  const openCreate = (mode: CreateMode) => {
    resetForm();
    setCreateTeamIds(allSupervisedTeams.map((team) => team.id));
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

  const renderCreateDialog = () => (
    <Dialog
      open={createMode !== null}
      onOpenChange={(open) => !open && resetForm()}
    >
      <DialogContent
        className="flex max-h-[90vh] flex-col overflow-hidden"
        onPointerDownOutside={(event) => {
          if (
            (event.target as HTMLElement).closest("[data-team-multi-select]")
          ) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (
            (event.target as HTMLElement).closest("[data-team-multi-select]")
          ) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {editAnnouncement || editDeliverable
              ? "Edit"
              : "Create"}{" "}
            {createMode === "announcement" ? "Announcement" : "Deliverable"}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div
            className={cn(
              "space-y-4",
              !editAnnouncement && !editDeliverable && "pb-52",
            )}
          >
          {!editAnnouncement && !editDeliverable && (
            <TeamMultiSelect
              teams={allSupervisedTeams}
              selectedTeamIds={createTeamIds}
              onChange={(teamIds) => {
                setCreateTeamIds(teamIds);
                if (teamIds.length > 0) {
                  setTeamAssignError(undefined);
                }
              }}
              label="Assign to teams"
              error={teamAssignError}
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
        </div>
        <DialogFooter className="shrink-0">
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
              if (
                !editAnnouncement &&
                !editDeliverable &&
                createTeamIds.length === 0
              ) {
                setTeamAssignError("Select at least one team.");
                return;
              }

              if (createMode === "announcement") {
                const payload = {
                  title: formTitle.trim(),
                  message: formBody.trim(),
                  type: formType,
                  dueDate: formDueDate
                    ? new Date(formDueDate).toISOString()
                    : undefined,
                  teamIds: createTeamIds,
                  pendingFiles,
                };
                if (editAnnouncement) {
                  updateAnnouncementMutation.mutate({
                    id: editAnnouncement.id,
                    ...payload,
                  });
                } else {
                  createAnnouncementMutation.mutate(payload);
                }
              } else if (createMode === "deliverable") {
                const payload = {
                  title: formTitle.trim(),
                  description: formBody.trim(),
                  type: formDeliverableType,
                  dueDate: new Date(formDueDate).toISOString(),
                  teamIds: createTeamIds,
                  pendingFiles,
                };
                if (editDeliverable) {
                  updateDeliverableMutation.mutate({
                    id: editDeliverable.id,
                    ...payload,
                  });
                } else {
                  createDeliverableMutation.mutate(payload);
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
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedAnnouncement.type} />
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
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={selectedDeliverable.type} />
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
                comments={data.commentsByEntity[commentKey] ?? []}
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
                      {submission.status === "APPROVED" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={finalizeMutation.isPending}
                          onClick={() =>
                            finalizeMutation.mutate(submission.id)
                          }
                        >
                          Finalize
                        </Button>
                      )}
                      {submission.status === "FINALIZED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={unfinalizeMutation.isPending}
                          onClick={() =>
                            unfinalizeMutation.mutate(submission.id)
                          }
                        >
                          Unfinalize
                        </Button>
                      )}
                    </div>
                    <SubmissionRemarks
                      remarks={submission.remarks}
                      feedback={submission.feedback}
                      grade={submission.grade}
                    />
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
                onClick={() =>
                  reviewMutation.mutate({
                    submissionId: reviewTarget!.id,
                    status: reviewStatus,
                    feedback: reviewFeedback || undefined,
                  })
                }
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
        </div>
      </div>

      <PublishTemplateDialog
        open={!!publishTemplate}
        onOpenChange={(open) => !open && setPublishTemplate(null)}
        template={publishTemplate}
        teams={allSupervisedTeams}
        onPublished={() => {
          void pageQuery.refetch();
          void templatesQuery.refetch();
        }}
      />

      <TemplateDetailsDialog
        templateId={detailsTemplateId}
        open={!!detailsTemplateId}
        onOpenChange={(open) => {
          if (!open) setDetailsTemplateId(null);
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-3">
          <TeamFilterSelect
            teams={allSupervisedTeams}
            selectedTeamId={filterTeamId ?? allSupervisedTeams[0].id}
            onChange={(teamId) => dispatch(setSupervisorTeamFilterId(teamId))}
            label="Filter by team"
          />
          <PhaseFilter value={phaseFilter} onChange={setPhaseFilter} />
        </div>

        <div className="space-y-4">
          <SegmentedControl
            value={mainTab}
            onChange={setMainTab}
            options={[
              { value: "announcements", label: "Announcements" },
              { value: "templates", label: "Templates" },
              { value: "deliverables", label: "Deliverables" },
            ]}
          />

          {mainTab === "templates" ? (
            <div className="space-y-3">
              {(templatesQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No deliverable templates available yet.
                </p>
              ) : (
                (templatesQuery.data ?? []).map((template) => (
                  <Card key={template.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{template.title}</CardTitle>
                      <CardDescription>
                        {template.phase?.name} · {template.totalMarks} marks ·{" "}
                        {template.rubricCriteria.length} criteria
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailsTemplateId(template.id)}
                        >
                          View details
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setPublishTemplate(template)}
                        >
                          Publish to teams
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : mainTab === "announcements" ? (
            data.announcements.length === 0 ? (
              <EmptyState title="No announcements" description="Create one for your teams." />
            ) : (
              <div className="space-y-3">
                {data.announcements.map((item) => (
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
            <div className="space-y-3">
              {data.deliverables.map((item) => (
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
                    <CardDescription className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {item.teamName ? `${item.teamName} · ` : ""}
                      Due {formatDate(item.dueDate)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      {item.latestSubmissionStatus
                        ? `Latest: ${item.latestSubmissionStatus}`
                        : "No submissions yet"}
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
                        <Package className="h-3 w-3" />
                        {item.submissionCount}
                      </span>
                    </div>
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
