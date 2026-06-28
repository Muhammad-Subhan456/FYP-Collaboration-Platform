"use client";

import { useState } from "react";
import { Calendar, Loader2, MapPin, Plus, Video } from "lucide-react";
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
import { formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { useSupervisorCreateMeetingMutation } from "@/mutations/supervisor";
import {
  isSupervisorQueryInitialLoading,
  useSupervisorMeetingsQuery,
} from "@/queries/supervisor";

const MEETING_TYPES = [
  "WEEKLY",
  "VIVA",
  "WORKSHOP",
  "DISCUSSION",
  "OTHER",
] as const;

export default function SupervisorMeetingsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("WEEKLY");
  const [meetingDate, setMeetingDate] = useState("");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");

  const meetingsQuery = useSupervisorMeetingsQuery();

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("WEEKLY");
    setMeetingDate("");
    setLocation("");
    setMeetingLink("");
  };

  const createMutation = useSupervisorCreateMeetingMutation({
    onSuccess: () => {
      setDialogOpen(false);
      resetForm();
    },
  });

  if (isSupervisorQueryInitialLoading(meetingsQuery)) return <DashboardSkeleton />;

  if (meetingsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(meetingsQuery.error)}
        onRetry={() => meetingsQuery.refetch()}
      />
    );
  }

  const meetings = meetingsQuery.data ?? [];
  const now = Date.now();
  const upcoming = meetings.filter(
    (m) => new Date(m.meetingDate).getTime() >= now,
  );
  const past = meetings.filter(
    (m) => new Date(m.meetingDate).getTime() < now,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !meetingDate) {
      toast.error("Title and meeting date are required");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      meetingDate: new Date(meetingDate).toISOString(),
      location: location.trim() || undefined,
      meetingLink: meetingLink.trim() || undefined,
    });
  };

  const renderMeeting = (meeting: (typeof meetings)[number]) => (
    <Card key={meeting.id}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            {meeting.title}
          </CardTitle>
          <StatusBadge status={meeting.type} />
        </div>
        <CardDescription>
          {formatDateTime(meeting.meetingDate)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {meeting.description && <p>{meeting.description}</p>}
        {meeting.location && (
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {meeting.location}
          </p>
        )}
        {meeting.meetingLink && (
          <a
            href={meeting.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-primary hover:underline"
          >
            <Video className="h-3.5 w-3.5" />
            Join meeting
          </a>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Meetings</h2>
          <p className="text-sm text-muted-foreground">
            Schedule and manage meetings with your supervised teams
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Schedule meeting
        </Button>
      </div>

      {meetings.length === 0 ? (
        <EmptyState
          title="No meetings scheduled"
          description="Schedule your first meeting with supervised teams."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Calendar className="h-4 w-4" />
              Schedule meeting
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Upcoming
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {upcoming.map(renderMeeting)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Past
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {past.map(renderMeeting)}
              </div>
            </section>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule meeting</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Weekly progress review"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meetingDate">Date & time</Label>
              <Input
                id="meetingDate"
                type="datetime-local"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location (optional)</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Room 301, CS Building"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meetingLink">Meeting link (optional)</Label>
              <Input
                id="meetingLink"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/..."
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
                Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
