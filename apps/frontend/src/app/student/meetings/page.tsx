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
import { getDisplayName, useProfilesLookup } from "@/hooks/use-profiles";
import {
  isDeepLinkFocused,
  useDeepLinkFocus,
} from "@/hooks/use-deep-link-focus";
import { progressService } from "@/services/progress.service";
import { teamService } from "@/services/team.service";
import { cn } from "@/lib/utils";

export default function StudentMeetingsPage() {
  const meetingFocusId = useDeepLinkFocus("meetingId");

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
  const supervisorIds = [...new Set(meetings.map((m) => m.supervisorId))];
  const profilesQuery = useProfilesLookup(supervisorIds);
  const now = Date.now();
  const upcoming = meetings.filter(
    (m) => new Date(m.meetingDate).getTime() >= now,
  );
  const past = meetings.filter(
    (m) => new Date(m.meetingDate).getTime() < now,
  );

  const renderMeeting = (meeting: (typeof meetings)[number]) => (
    <Card
      key={meeting.id}
      id={`focus-${meeting.id}`}
      className={cn(
        "transition-all",
        isDeepLinkFocused(meetingFocusId, meeting.id) &&
          "border-primary ring-2 ring-primary/20",
      )}
    >
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
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          Created by{" "}
          <span className="font-medium text-foreground">
            {getDisplayName(profilesQuery.data, meeting.supervisorId)}
          </span>
        </p>
        {meeting.description && <p>{meeting.description}</p>}
        {meeting.location && (
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {meeting.location}
          </p>
        )}
        {meeting.meetingLink && (
          <Button asChild className="w-full sm:w-auto">
            <a
              href={meeting.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Video className="h-4 w-4" />
              Join Meeting
            </a>
          </Button>
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
