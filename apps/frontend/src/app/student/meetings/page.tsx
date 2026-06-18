"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Video } from "lucide-react";

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
import { formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { progressService } from "@/services/progress.service";
import { teamService } from "@/services/team.service";

export default function StudentMeetingsPage() {
  const teamQuery = useQuery({
    queryKey: ["team", "my-team"],
    queryFn: teamService.getMyTeam,
  });

  const meetingsQuery = useQuery({
    queryKey: ["meetings", "for-my-team"],
    queryFn: progressService.getMeetingsForMyTeam,
    enabled: !!teamQuery.data,
  });

  if (teamQuery.isLoading) return <DashboardSkeleton />;

  if (!teamQuery.data) {
    return (
      <EmptyState
        title="No team yet"
        description="Join a team to see supervisor meetings."
        action={
          <Button asChild>
            <Link href="/student/team">Go to Team</Link>
          </Button>
        }
      />
    );
  }

  if (meetingsQuery.isLoading) return <DashboardSkeleton />;

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
      <div>
        <h2 className="text-lg font-semibold">Team Meetings</h2>
        <p className="text-sm text-muted-foreground">
          Meetings scheduled by your supervisor
        </p>
      </div>

      {meetings.length === 0 ? (
        <EmptyState
          title="No meetings scheduled"
          description="Your supervisor has not scheduled any meetings yet."
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
              <h3 className="text-sm font-medium text-muted-foreground">Past</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {past.map(renderMeeting)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
