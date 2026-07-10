"use client";

import { useQuery } from "@tanstack/react-query";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { ErrorState } from "@/components/common/state-blocks";
import { GlobalAnnouncementsCard } from "@/components/dashboard/global-announcements-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";
import { evaluatorPageService } from "@/services/evaluator-page.service";
import type { GlobalAnnouncement } from "@/types/coordinator";

export default function EvaluatorDashboardPage() {
  const { user } = useAuth();

  const dashboardQuery = useQuery({
    queryKey: queryKeys.evaluator.dashboard(user?.workspaceId),
    queryFn: evaluatorPageService.getDashboard,
    enabled: !!user?.workspaceId,
  });

  if (dashboardQuery.isLoading) return <DashboardSkeleton />;
  if (dashboardQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(dashboardQuery.error)}
        onRetry={() => dashboardQuery.refetch()}
      />
    );
  }

  const data = dashboardQuery.data as {
    pendingCount?: number;
    submittedCount?: number;
    globalAnnouncements?: GlobalAnnouncement[];
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending evaluations</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {data?.pendingCount ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Submitted evaluations</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {data?.submittedCount ?? 0}
          </CardContent>
        </Card>
      </div>

      <GlobalAnnouncementsCard
        announcements={data?.globalAnnouncements ?? []}
        emptyMessage="No program announcements for evaluators yet."
      />
    </div>
  );
}
