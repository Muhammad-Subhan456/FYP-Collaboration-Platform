import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { coordinatorPageQueryOptions, queryKeys } from "@/lib/react-query";
import { type CoordinatorDashboardOverview } from "@/services/dashboard.service";
import { coordinatorPageService } from "@/services/coordinator-page.service";
import { useAuth } from "@/providers/auth-provider";

export function useCoordinatorDashboardQuery() {
  const { user } = useAuth();

  const query = useQuery({
    ...coordinatorPageQueryOptions,
    queryKey: queryKeys.coordinator.dashboard(user?.userId, user?.workspaceId),
    queryFn: coordinatorPageService.getDashboard,
    enabled: !!user?.userId,
  });

  const roleMismatch =
    !!query.data && query.data.role !== "COORDINATOR";

  useEffect(() => {
    if (roleMismatch && !query.isFetching && user?.userId) {
      void query.refetch();
    }
  }, [roleMismatch, query.isFetching, user?.userId, query.refetch]);

  const overview =
    query.data?.role === "COORDINATOR"
      ? (query.data as CoordinatorDashboardOverview)
      : undefined;

  const isResolving =
    query.isLoading || (roleMismatch && !overview);

  return {
    ...query,
    overview,
    isResolving,
  };
}
