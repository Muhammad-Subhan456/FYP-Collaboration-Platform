"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, Package, Users } from "lucide-react";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { DashboardInsights } from "@/components/dashboard/dashboard-insights";
import { GlobalAnnouncementsCard } from "@/components/dashboard/global-announcements-card";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { ErrorState } from "@/components/common/state-blocks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dashboardService } from "@/services/dashboard.service";
import { coordinatorService } from "@/services/coordinator.service";
import { pluralize } from "@/lib/format";

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
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard", "coordinator"],
    queryFn: dashboardService.getCoordinator,
  });

  const globalAnnouncementsQuery = useQuery({
    queryKey: ["global-announcements"],
    queryFn: coordinatorService.getGlobalAnnouncements,
  });

  if (isLoading) return <DashboardSkeleton />;

  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load dashboard"}
        onRetry={() => refetch()}
      />
    );
  }

  const users = data?.users ?? {};
  const proposals = data?.proposals ?? {};
  const progress = data?.progress ?? {};
  const totalTeams = data?.totalTeams ?? 0;

  const proposalTotal = proposals.total ?? proposals.totalProposals ?? 0;
  const proposalPending = proposals.pending ?? proposals.assignedProposals ?? 0;

  const totalUsers =
    (users.totalStudents ?? 0) +
    (users.totalSupervisors ?? 0) +
    (users.totalCoordinators ?? 0);

  const insightLines: string[] = [
    `Managing ${pluralize(totalUsers, "registered user")} across the program.`,
    `${pluralize(totalTeams, "team")} currently active.`,
  ];
  if ((proposalPending ?? 0) > 0) {
    insightLines.push(
      `${pluralize(proposalPending, "proposal")} pending your review.`,
    );
  }
  if ((progress.pendingSubmissions ?? 0) > 0) {
    insightLines.push(
      `${pluralize(progress.pendingSubmissions, "submission")} awaiting review.`,
    );
  }

  return (
    <div className="space-y-6">
      <DashboardInsights lines={insightLines} />

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
          value={progress.activeDeliverables ?? 0}
          icon={Package}
        />
      </div>

      <GlobalAnnouncementsCard announcements={globalAnnouncementsQuery.data} />
      <RecentActivityFeed />
    </div>
  );
}
