import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { queryKeys, supervisorPageQueryOptions } from "@/lib/react-query";
import { type SupervisorDashboardOverview } from "@/services/dashboard.service";
import { supervisorPageService } from "@/services/supervisor-page.service";
import { useAuth } from "@/providers/auth-provider";

export function useSupervisorDashboardQuery() {
  const { user } = useAuth();

  const query = useQuery({
    ...supervisorPageQueryOptions,
    queryKey: queryKeys.supervisor.dashboard(user?.userId),
    queryFn: supervisorPageService.getDashboard,
    enabled: !!user?.userId,
  });

  const roleMismatch =
    !!query.data && query.data.role !== "SUPERVISOR";

  useEffect(() => {
    if (roleMismatch && !query.isFetching && user?.userId) {
      void query.refetch();
    }
  }, [roleMismatch, query.isFetching, user?.userId, query.refetch]);

  const overview =
    query.data?.role === "SUPERVISOR"
      ? (query.data as SupervisorDashboardOverview)
      : undefined;

  const isResolving =
    query.isLoading || (roleMismatch && !overview);

  return {
    ...query,
    overview,
    isResolving,
  };
}
