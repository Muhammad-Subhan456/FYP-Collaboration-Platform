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

  const data = dashboardQuery.data;
  const panelCount = data?.panels?.length ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Evaluator Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You are assigned to {panelCount} evaluation panel
          {panelCount === 1 ? "" : "s"}. Review assigned panels and submit
          results from the evaluations section.
        </CardContent>
      </Card>

      <GlobalAnnouncementsCard
        announcements={data?.globalAnnouncements ?? []}
        emptyMessage="No program announcements for evaluators yet."
      />
    </div>
  );
}
