"use client";

import { useQuery } from "@tanstack/react-query";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { ErrorState } from "@/components/common/state-blocks";
import { CoordinatorCharts } from "@/components/dashboard/coordinator-charts";
import { dashboardService } from "@/services/dashboard.service";

export default function CoordinatorAnalyticsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard", "coordinator"],
    queryFn: dashboardService.getCoordinator,
  });

  if (isLoading) return <DashboardSkeleton />;

  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load analytics"}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <CoordinatorCharts data={data ?? {}} />
    </div>
  );
}
