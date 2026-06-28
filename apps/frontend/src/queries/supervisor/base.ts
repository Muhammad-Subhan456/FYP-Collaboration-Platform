import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

import { queryKeys, supervisorPageQueryOptions } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";

type SupervisorQueryOptions<TData> = Omit<
  UseQueryOptions<TData, Error, TData, readonly unknown[]>,
  "queryKey" | "queryFn"
>;

export function useSupervisorAuthQuery<TData>(
  page: string,
  queryFn: () => Promise<TData>,
  options?: SupervisorQueryOptions<TData> & {
    queryKey?: readonly unknown[];
  },
): UseQueryResult<TData, Error> {
  const { user } = useAuth();
  const queryKey =
    options?.queryKey ?? queryKeys.supervisor.page(page, user?.userId);

  return useQuery({
    ...supervisorPageQueryOptions,
    ...options,
    queryKey,
    queryFn,
    enabled: (options?.enabled ?? true) && !!user?.userId,
  });
}

export function isSupervisorQueryInitialLoading<T>(
  query: Pick<UseQueryResult<T, Error>, "isLoading">,
) {
  return query.isLoading;
}

/** @deprecated Use isSupervisorQueryInitialLoading */
export function isSupervisorQueryPending<T>(
  query: Pick<UseQueryResult<T, Error>, "isLoading">,
) {
  return isSupervisorQueryInitialLoading(query);
}

export function isSupervisorQueryRefreshing<T>(
  query: Pick<UseQueryResult<T, Error>, "isFetching" | "isLoading">,
) {
  return query.isFetching && !query.isLoading;
}
