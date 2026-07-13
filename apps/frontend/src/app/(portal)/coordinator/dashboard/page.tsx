"use client";

import { FileText, Package, Users } from "lucide-react";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { GlobalAnnouncementsCard } from "@/components/dashboard/global-announcements-card";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { ErrorState } from "@/components/common/state-blocks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getErrorMessage } from "@/lib/axios";
import { useCoordinatorDashboardQuery } from "@/queries/coordinator";

const DASHBOARD_WIDGET_LIMIT = 3;

function KpiCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
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
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function CoordinatorDashboardPage() {
  const {
    overview,
    isResolving,
    isError,
    error,
    refetch,
  } = useCoordinatorDashboardQuery();

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

  const users = overview.users;
  const proposals = overview.proposals;
  const progress = overview.progress;
  const totalTeams = overview.totalTeams;

  const proposalTotal = proposals.total ?? proposals.totalProposals ?? 0;

  const totalUsers =
    (users.totalStudents ?? 0) +
    (users.totalSupervisors ?? 0) +
    (users.totalCoordinators ?? 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Users" value={totalUsers} icon={Users} />
        <KpiCard title="Total Teams" value={totalTeams} icon={Users} />
        <KpiCard
          title="Total Proposals"
          value={proposalTotal}
          icon={FileText}
        />
        <KpiCard
          title="Active Deliverables"
          value={progress.activeDeliverables ?? progress.totalDeliverables ?? 0}
          icon={Package}
        />
      </div>

      <GlobalAnnouncementsCard
        announcements={overview.globalAnnouncements}
        limit={DASHBOARD_WIDGET_LIMIT}
        viewAllDialog
      />
      <RecentActivityFeed
        recentActivity={overview.recentActivity}
        displayLimit={DASHBOARD_WIDGET_LIMIT}
        viewAllHref="/coordinator/notifications"
      />
    </div>
  );
}
