"use client";

import { CheckSquare, Inbox, Package, Users } from "lucide-react";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { DashboardInsights } from "@/components/dashboard/dashboard-insights";
import { GlobalAnnouncementsCard } from "@/components/dashboard/global-announcements-card";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { ErrorState } from "@/components/common/state-blocks";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getErrorMessage } from "@/lib/axios";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import { pluralize } from "@/lib/format";

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
  } = useDashboardOverview("SUPERVISOR");

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
  const deliverables = overview.deliverables;
  const pendingRequests = overview.pendingRequests;
  const supervisedTeams = overview.supervisedTeams;
  const teamCount =
    supervisedTeams.length ||
    stats.supervisedTeams ||
    stats.activeTeams ||
    0;

  const insightLines: string[] = [
    `You supervise ${pluralize(teamCount, "team")}.`,
  ];
  if ((stats.pendingReviews ?? 0) > 0) {
    insightLines.push(
      `${pluralize(stats.pendingReviews, "submission")} require review.`,
    );
  }
  if (pendingRequests.length > 0) {
    insightLines.push(
      `${pluralize(pendingRequests.length, "proposal request")} awaiting your response.`,
    );
  }

  return (
    <div className="space-y-6">
      <DashboardInsights lines={insightLines} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Teams"
          value={teamCount}
          icon={Users}
        />
        <StatCard
          title="Deliverables"
          value={deliverables.length}
          icon={Package}
        />
        <StatCard
          title="Pending Reviews"
          value={stats.pendingReviews ?? 0}
          icon={CheckSquare}
        />
        <StatCard
          title="Pending Requests"
          value={pendingRequests.length}
          icon={Inbox}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Supervised Teams</CardTitle>
            <CardDescription>Teams currently under your supervision</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {supervisedTeams.length > 0 ? (
              supervisedTeams.slice(0, 5).map((p) => (
                <div key={p.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{p.title}</p>
                  <p className="text-muted-foreground">{p.domain}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No supervised teams yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Proposal Requests</CardTitle>
            <CardDescription>Students awaiting your approval</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.length > 0 ? (
              pendingRequests.slice(0, 5).map((r) => (
                <div key={r.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{r.proposal?.title ?? "Proposal request"}</p>
                  <Badge variant="warning" className="mt-1">
                    Pending
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Deliverables</CardTitle>
            <CardDescription>Recently created deliverables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {deliverables.length > 0 ? (
              deliverables.slice(0, 5).map((d) => (
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

      <GlobalAnnouncementsCard announcements={overview.globalAnnouncements} />
      <RecentActivityFeed recentActivity={overview.recentActivity} />
    </div>
  );
}
