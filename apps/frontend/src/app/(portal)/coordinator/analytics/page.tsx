"use client";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { ErrorState } from "@/components/common/state-blocks";
import { CoordinatorCharts } from "@/components/dashboard/coordinator-charts";
import { useCoordinatorPageQuery } from "@/hooks/use-coordinator-page";
import { getErrorMessage } from "@/lib/axios";
import { coordinatorPageService } from "@/services/coordinator-page.service";

export default function CoordinatorAnalyticsPage() {
  const pageQuery = useCoordinatorPageQuery(
    "analytics",
    coordinatorPageService.getAnalytics,
  );

  if (pageQuery.isLoading) return <DashboardSkeleton />;

  if (pageQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(pageQuery.error)}
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <CoordinatorCharts data={pageQuery.data ?? {}} />
    </div>
  );
}
