"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ExternalLink, Package } from "lucide-react";

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
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { progressService } from "@/services/progress.service";
import { teamService } from "@/services/team.service";

export default function StudentDeliverablesPage() {
  const teamQuery = useQuery({
    queryKey: ["team", "my-team"],
    queryFn: teamService.getMyTeam,
  });

  const deliverablesQuery = useQuery({
    queryKey: ["deliverables", "for-my-team"],
    queryFn: progressService.getDeliverablesForMyTeam,
    enabled: !!teamQuery.data,
  });

  if (teamQuery.isLoading) return <DashboardSkeleton />;

  if (!teamQuery.data) {
    return (
      <EmptyState
        title="No team yet"
        description="Join a team to see deliverables from your supervisor."
        action={
          <Button asChild>
            <Link href="/student/team">Go to Team</Link>
          </Button>
        }
      />
    );
  }

  if (deliverablesQuery.isLoading) return <DashboardSkeleton />;

  if (deliverablesQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(deliverablesQuery.error)}
        onRetry={() => deliverablesQuery.refetch()}
      />
    );
  }

  const deliverables = deliverablesQuery.data ?? [];
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Your Deliverables</h2>
          <p className="text-sm text-muted-foreground">
            Assigned by your supervisor — submit before the due date
          </p>
        </div>
        <Button asChild>
          <Link href="/student/submissions">Submit Work</Link>
        </Button>
      </div>

      {deliverables.length === 0 ? (
        <EmptyState
          title="No deliverables yet"
          description="Your supervisor hasn't assigned any deliverables. Check back later."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {deliverables.map((d) => {
            const isOverdue = new Date(d.dueDate) < now;
            return (
              <Card
                key={d.id}
                className="transition-all hover:border-primary/30 hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{d.title}</CardTitle>
                        <CardDescription>{d.type.replace(/_/g, " ")}</CardDescription>
                      </div>
                    </div>
                    <StatusBadge status={d.isActive ? "ACTIVE" : "INACTIVE"} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {d.description}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className={isOverdue ? "font-medium text-destructive" : ""}>
                      Due {formatDate(d.dueDate)}
                      {isOverdue && " (overdue)"}
                    </span>
                  </div>
                  {d.attachmentUrl && (
                    <a
                      href={d.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Reference attachment
                    </a>
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
