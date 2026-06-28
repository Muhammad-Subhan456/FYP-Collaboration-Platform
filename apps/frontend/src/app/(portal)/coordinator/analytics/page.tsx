"use client";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { ErrorState } from "@/components/common/state-blocks";
import { CoordinatorCharts } from "@/components/dashboard/coordinator-charts";
import {
  isCoordinatorQueryInitialLoading,
  useCoordinatorAnalyticsQuery,
} from "@/queries/coordinator";
import { getErrorMessage } from "@/lib/axios";

export default function CoordinatorAnalyticsPage() {
  const pageQuery = useCoordinatorAnalyticsQuery();

  if (isCoordinatorQueryInitialLoading(pageQuery)) return <DashboardSkeleton />;

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
