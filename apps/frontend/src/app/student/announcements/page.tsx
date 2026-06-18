"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";

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
import { formatDate, formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { progressService } from "@/services/progress.service";
import { teamService } from "@/services/team.service";

export default function StudentAnnouncementsPage() {
  const teamQuery = useQuery({
    queryKey: ["team", "my-team"],
    queryFn: teamService.getMyTeam,
  });

  const announcementsQuery = useQuery({
    queryKey: ["announcements", "for-my-team"],
    queryFn: progressService.getAnnouncementsForMyTeam,
    enabled: !!teamQuery.data,
  });

  if (teamQuery.isLoading) return <DashboardSkeleton />;

  if (!teamQuery.data) {
    return (
      <EmptyState
        title="No team yet"
        description="Join a team to receive supervisor announcements."
        action={
          <Button asChild>
            <Link href="/student/team">Go to Team</Link>
          </Button>
        }
      />
    );
  }

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Team Announcements</h2>
        <p className="text-sm text-muted-foreground">
          Updates from your supervisor for {teamQuery.data.name}
        </p>
      </div>

      {announcements.length === 0 ? (
        <EmptyState
          title="No announcements yet"
          description="Your supervisor has not published any team announcements."
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
    </div>
  );
}
