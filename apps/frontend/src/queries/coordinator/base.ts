import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

import { coordinatorPageQueryOptions, queryKeys } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";

type CoordinatorQueryOptions<TData> = Omit<
  UseQueryOptions<TData, Error, TData, readonly unknown[]>,
  "queryKey" | "queryFn"
>;

export function useCoordinatorAuthQuery<TData>(
  page: string,
  queryFn: () => Promise<TData>,
  options?: CoordinatorQueryOptions<TData> & {
    queryKey?: readonly unknown[];
  },
): UseQueryResult<TData, Error> {
  const { user } = useAuth();
  const queryKey =
    options?.queryKey ?? queryKeys.coordinator.page(page, user?.userId);

  return useQuery({
    ...coordinatorPageQueryOptions,
    ...options,
    queryKey,
    queryFn,
    enabled: (options?.enabled ?? true) && !!user?.userId,
  });
}

export function isCoordinatorQueryInitialLoading<T>(
  query: Pick<UseQueryResult<T, Error>, "isLoading">,
) {
  return query.isLoading;
}

/** @deprecated Use isCoordinatorQueryInitialLoading */
export function isCoordinatorQueryPending<T>(
  query: Pick<UseQueryResult<T, Error>, "isLoading">,
) {
  return isCoordinatorQueryInitialLoading(query);
}

export function isCoordinatorQueryRefreshing<T>(
  query: Pick<UseQueryResult<T, Error>, "isFetching" | "isLoading">,
) {
  return query.isFetching && !query.isLoading;
}
