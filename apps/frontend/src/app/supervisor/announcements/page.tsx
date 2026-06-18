"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Megaphone, Plus } from "lucide-react";
import { toast } from "sonner";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
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
import { formatDate, formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { supervisorService } from "@/services/supervisor.service";

const ANNOUNCEMENT_TYPES = [
  "GENERAL",
  "DEADLINE",
  "MEETING",
  "WORKSHOP",
  "VIVA",
] as const;

export default function SupervisorAnnouncementsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<string>("GENERAL");
  const [dueDate, setDueDate] = useState("");

  const announcementsQuery = useQuery({
    queryKey: ["announcements", "my"],
    queryFn: supervisorService.getMyAnnouncements,
  });

  const createMutation = useMutation({
    mutationFn: supervisorService.createAnnouncement,
    onSuccess: () => {
      toast.success("Announcement published to your supervised teams");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      setDialogOpen(false);
      setTitle("");
      setMessage("");
      setType("GENERAL");
      setDueDate("");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (announcementsQuery.isLoading) return <DashboardSkeleton />;

  if (announcementsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(announcementsQuery.error)}
        onRetry={() => announcementsQuery.refetch()}
      />
    );
  }

  const announcements = announcementsQuery.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      message: message.trim(),
      type,
      dueDate: dueDate
        ? new Date(dueDate).toISOString()
        : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Announcements</h2>
          <p className="text-sm text-muted-foreground">
            Share updates with all teams you supervise
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New announcement
        </Button>
      </div>

      {announcements.length === 0 ? (
        <EmptyState
          title="No announcements yet"
          description="Publish your first announcement for supervised teams."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Megaphone className="h-4 w-4" />
              Create announcement
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Megaphone className="h-4 w-4 text-primary" />
                    {item.title}
                  </CardTitle>
                  <StatusBadge status={item.type} />
                </div>
                <CardDescription>
                  Posted {formatDateTime(item.createdAt)}
                  {item.dueDate
                    ? ` · Related date ${formatDate(item.dueDate)}`
                    : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {item.message}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New announcement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message for supervised teams..."
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANNOUNCEMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Related date (optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
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
