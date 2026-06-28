"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys, supervisorPageQueryOptions } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";

/** @deprecated Use specific hooks from @/queries/supervisor instead. */
export function useSupervisorPageQuery<T>(
  page: string,
  queryFn: () => Promise<T>,
  queryKeyExtra?: unknown,
) {
  const { user } = useAuth();

  return useQuery({
    ...supervisorPageQueryOptions,
    queryKey:
      queryKeyExtra !== undefined
        ? queryKeys.supervisor.page(page, user?.userId, queryKeyExtra)
        : queryKeys.supervisor.page(page, user?.userId),
    queryFn,
    enabled: !!user?.userId,
  });
}

export {
  useSupervisorAuthQuery,
  isSupervisorQueryPending,
  isSupervisorQueryInitialLoading,
  isSupervisorQueryRefreshing,
} from "@/queries/supervisor";
