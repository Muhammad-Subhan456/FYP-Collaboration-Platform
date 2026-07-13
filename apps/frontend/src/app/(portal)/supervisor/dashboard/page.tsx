"use client";

import Link from "next/link";
import { CheckSquare, Inbox, Package, Users } from "lucide-react";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { GlobalAnnouncementsCard } from "@/components/dashboard/global-announcements-card";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { ErrorState } from "@/components/common/state-blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getErrorMessage } from "@/lib/axios";
import { useSupervisorDashboardQuery } from "@/queries/supervisor";

const DASHBOARD_WIDGET_LIMIT = 3;

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function SupervisorDashboardPage() {
  const {
    overview,
    isResolving,
    isError,
    error,
    refetch,
  } = useSupervisorDashboardQuery();

  if (isResolving) return <DashboardSkeleton />;

  if (isError) {
    return (
      <ErrorState
        message={getErrorMessage(error)}
        onRetry={() => refetch()}
      />
    );
  }

  if (!overview) {
    return (
      <ErrorState
        message="Failed to load dashboard."
        onRetry={() => refetch()}
      />
    );
  }

  const stats = overview.stats;
  const deliverables = overview.deliverables.slice(0, DASHBOARD_WIDGET_LIMIT);
  const pendingRequests = overview.pendingRequests.slice(
    0,
    DASHBOARD_WIDGET_LIMIT,
  );
  const supervisedTeams = overview.supervisedTeams.slice(
    0,
    DASHBOARD_WIDGET_LIMIT,
  );
  const teamCount =
    overview.supervisedTeams.length ||
    stats.supervisedTeams ||
    stats.activeTeams ||
    0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Teams" value={teamCount} icon={Users} />
        <StatCard
          title="Deliverables"
          value={overview.deliverables.length}
          icon={Package}
        />
        <StatCard
          title="Pending Reviews"
          value={stats.pendingReviews ?? 0}
          icon={CheckSquare}
        />
        <StatCard
          title="Pending Requests"
          value={overview.pendingRequests.length}
          icon={Inbox}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Supervised Teams</CardTitle>
              <CardDescription>
                Teams currently under your supervision
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0" asChild>
              <Link href="/supervisor/teams">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {supervisedTeams.length > 0 ? (
              supervisedTeams.map((team) => (
                <Link
                  key={team.id}
                  href={`/supervisor/teams?teamId=${encodeURIComponent(team.teamId)}`}
                  className="block rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
                >
                  <p className="font-medium">{team.title}</p>
                  <p className="text-muted-foreground">{team.domain}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No supervised teams yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Pending Proposal Requests</CardTitle>
              <CardDescription>Students awaiting your approval</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0" asChild>
              <Link href="/supervisor/requests">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.length > 0 ? (
              pendingRequests.map((r) => (
                <Link
                  key={r.id}
                  href="/supervisor/requests"
                  className="block rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
                >
                  <p className="font-medium">
                    {r.proposal?.title ?? "Proposal request"}
                  </p>
                  <Badge variant="warning" className="mt-1">
                    Pending
                  </Badge>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No pending requests.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Your Deliverables</CardTitle>
              <CardDescription>Recently created deliverables</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0" asChild>
              <Link href="/supervisor/work-stream?tab=deliverables">
                View all
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {deliverables.length > 0 ? (
              deliverables.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <span className="font-medium">{d.title}</span>
                  <Badge variant={d.isActive ? "success" : "secondary"}>
                    {d.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No deliverables created yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <GlobalAnnouncementsCard
        announcements={overview.globalAnnouncements}
        limit={DASHBOARD_WIDGET_LIMIT}
        viewAllDialog
      />
      <RecentActivityFeed
        recentActivity={overview.recentActivity}
        displayLimit={DASHBOARD_WIDGET_LIMIT}
        viewAllHref="/supervisor/notifications"
      />
    </div>
  );
}
