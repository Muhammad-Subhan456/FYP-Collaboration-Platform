"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin } from "lucide-react";

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

export default function StudentEvaluationsPage() {
  const teamQuery = useQuery({
    queryKey: ["team", "my-team"],
    queryFn: teamService.getMyTeam,
  });

  const evaluationsQuery = useQuery({
    queryKey: ["evaluations", "my"],
    queryFn: progressService.getMyEvaluations,
    enabled: !!teamQuery.data,
  });

  if (teamQuery.isLoading) return <DashboardSkeleton />;

  if (!teamQuery.data) {
    return (
      <EmptyState
        title="No team yet"
        description="Join a team to see scheduled evaluations."
        action={
          <Button asChild>
            <Link href="/student/team">Go to Team</Link>
          </Button>
        }
      />
    );
  }

  if (evaluationsQuery.isLoading) return <DashboardSkeleton />;

  if (evaluationsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(evaluationsQuery.error)}
        onRetry={() => evaluationsQuery.refetch()}
      />
    );
  }

  const evaluations = evaluationsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Upcoming Evaluations</h2>
        <p className="text-sm text-muted-foreground">
          Scheduled viva and evaluation events for your team
        </p>
      </div>

      {evaluations.length === 0 ? (
        <EmptyState
          title="No evaluations scheduled"
          description="Your coordinator will schedule evaluations when the time comes."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {evaluations.map((item) => {
            const ev = item.evaluation;
            const isPast = new Date(ev.date) < new Date();
            return (
              <Card key={item.id} className="transition-all hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{ev.title}</CardTitle>
                    <StatusBadge status={isPast ? "INACTIVE" : "ACTIVE"} />
                  </div>
                  <CardDescription>
                    {ev.type.replace(/_/g, " ")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatDateTime(ev.date)}
                  </div>
                  {ev.venue && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {ev.venue}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
