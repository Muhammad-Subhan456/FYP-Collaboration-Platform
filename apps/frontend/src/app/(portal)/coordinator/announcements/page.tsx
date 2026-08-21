"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Megaphone, Paperclip, Plus, X } from "lucide-react";
import { toast } from "sonner";

import {
  AnnouncementAudiencePicker,
  formatAudienceRoles,
  type AnnouncementAudienceRole,
} from "@/components/coordinator/announcement-audience-picker";
import { AnnouncementAudienceUserPicker } from "@/components/coordinator/announcement-audience-user-picker";
import { AttachmentList } from "@/components/work-stream/attachment-list";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/react-query";
import { gaTrace } from "@/lib/realtime/ga-trace";
import { datetimeLocalToIso } from "@/lib/validation/announcement";
import { useCoordinatorCreateAnnouncementMutation } from "@/mutations/coordinator";
import {
  isCoordinatorQueryInitialLoading,
  useCoordinatorAnnouncementsQuery,
} from "@/queries/coordinator";
import { useAuth } from "@/providers/auth-provider";
import { coordinatorPageService } from "@/services/coordinator-page.service";
import { uploadService } from "@/services/progress.service";
import type { WorkStreamAttachment } from "@/types/work-stream";

const ANNOUNCEMENT_TYPES = [
  { value: "GENERAL", label: "General" },
  { value: "DEADLINE", label: "Deadline" },
  { value: "MEETING", label: "Meeting" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "VIVA", label: "Viva" },
] as const;

export default function CoordinatorAnnouncementsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<string>("GENERAL");
  const [audienceRoles, setAudienceRoles] = useState<
    AnnouncementAudienceRole[]
  >(["STUDENT", "SUPERVISOR", "EVALUATOR"]);
  const [audienceUserIds, setAudienceUserIds] = useState<string[]>([]);
  const [publishAt, setPublishAt] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pageQuery = useCoordinatorAnnouncementsQuery();
  const { user } = useAuth();

  const workspaceUsersQuery = useQuery({
    queryKey: queryKeys.coordinator.users(user?.userId, user?.workspaceId),
    queryFn: coordinatorPageService.getUsers,
    enabled: !!user?.workspaceId && dialogOpen,
  });

  useEffect(() => {
    const announcements = pageQuery.data ?? [];
    gaTrace("14-component-render", {
      queryKey: ["coordinator", "announcements", user?.userId, user?.workspaceId],
      cacheLength: announcements.length,
      announcementIds: announcements.map((item) => item.id),
      isFetching: pageQuery.isFetching,
      isStale: pageQuery.isStale,
    });
  }, [pageQuery.data, pageQuery.isFetching, pageQuery.isStale, user?.userId, user?.workspaceId]);

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setType("GENERAL");
    setAudienceRoles(["STUDENT", "SUPERVISOR", "EVALUATOR"]);
    setAudienceUserIds([]);
    setPublishAt("");
    setPendingFiles([]);
  };

  const createMutation = useCoordinatorCreateAnnouncementMutation({
    onSuccess: () => {
      setDialogOpen(false);
      resetForm();
    },
  });

  if (isCoordinatorQueryInitialLoading(pageQuery)) return <DashboardSkeleton />;

  if (pageQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(pageQuery.error)}
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  const announcements = pageQuery.data ?? [];
  const audienceUsers = (workspaceUsersQuery.data ?? []).filter(
    (member) =>
      member.role === "STUDENT" ||
      member.role === "SUPERVISOR" ||
      member.role === "EVALUATOR",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    setUploading(true);
    try {
      const attachments: Array<{ fileUrl: string; fileName: string }> = [];
      for (const file of pendingFiles) {
        const uploaded = await uploadService.uploadFile(file);
        attachments.push({
          fileUrl: uploaded.fileUrl,
          fileName: file.name,
        });
      }

      createMutation.mutate({
        title: title.trim(),
        message: message.trim(),
        type,
        audienceRoles,
        audienceUserIds,
        publishAt: publishAt ? datetimeLocalToIso(publishAt) : undefined,
        attachments,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New announcement
        </Button>
      </div>

      {announcements.length === 0 ? (
        <EmptyState
          title="No announcements yet"
          description="Create your first program announcement."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create announcement
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Megaphone className="h-4 w-4 text-primary" />
                    {item.title}
                  </CardTitle>
                  {item.type ? (
                    <Badge variant="secondary">{item.type}</Badge>
                  ) : null}
                </div>
                <CardDescription>
                  {formatDateTime(
                    item.publishAt ?? item.publishedAt ?? item.createdAt,
                  )}
                  {item.audienceRoles?.length
                    ? ` · ${formatAudienceRoles(item.audienceRoles)}`
                    : null}
                  {item.audienceUserIds?.length
                    ? ` · ${item.audienceUserIds.length} individual${item.audienceUserIds.length === 1 ? "" : "s"}`
                    : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {item.message}
                </p>
                {item.attachments && item.attachments.length > 0 ? (
                  <AttachmentList
                    attachments={item.attachments as WorkStreamAttachment[]}
                  />
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" closeOnOutsideClick={false}>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>New workspace announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
              <Textarea
                placeholder="Message (links are supported)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Announcement type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ANNOUNCEMENT_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <AnnouncementAudiencePicker
                value={audienceRoles}
                onChange={setAudienceRoles}
              />
              <AnnouncementAudienceUserPicker
                users={audienceUsers}
                selectedIds={audienceUserIds}
                onChange={setAudienceUserIds}
                isLoading={workspaceUsersQuery.isLoading}
              />
              <div className="space-y-2">
                <Label htmlFor="publishAt">Display date &amp; time (optional)</Label>
                <Input
                  id="publishAt"
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Shown on the announcement card only. Publishing is always
                  immediate.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Attachments</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) {
                      setPendingFiles((current) => [...current, ...files]);
                    }
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                  Add files
                </Button>
                {pendingFiles.length > 0 ? (
                  <ul className="space-y-2">
                    {pendingFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                      >
                        <span className="truncate">{file.name}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setPendingFiles((current) =>
                              current.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || uploading}
              >
                {(createMutation.isPending || uploading) && (
                  <Loader2 className="animate-spin" />
                )}
                Publish
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
