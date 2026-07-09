import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

import { queryKeys, studentPageQueryOptions } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";

type StudentQueryOptions<TData> = Omit<
  UseQueryOptions<TData, Error, TData, readonly unknown[]>,
  "queryKey" | "queryFn"
>;

export function useStudentAuthQuery<TData>(
  page: string,
  queryFn: () => Promise<TData>,
  options?: StudentQueryOptions<TData> & {
    queryKey?: readonly unknown[];
  },
): UseQueryResult<TData, Error> {
  const { user } = useAuth();
  const queryKey =
    options?.queryKey ??
    queryKeys.student.page(page, user?.userId, user?.workspaceId);

  return useQuery({
    ...studentPageQueryOptions,
    ...options,
    queryKey,
    queryFn,
    enabled: (options?.enabled ?? true) && !!user?.userId,
  });
}

/**
 * True only on the first fetch when no cached data exists yet.
 * Do NOT use isFetching here — background refetches should keep showing cached UI.
 */
export function isStudentQueryInitialLoading<T>(
  query: Pick<UseQueryResult<T, Error>, "isLoading">,
) {
  return query.isLoading;
}

/** @deprecated Use isStudentQueryInitialLoading */
export function isStudentQueryPending<T>(
  query: Pick<UseQueryResult<T, Error>, "isLoading">,
) {
  return isStudentQueryInitialLoading(query);
}

export function isStudentQueryRefreshing<T>(
  query: Pick<UseQueryResult<T, Error>, "isFetching" | "isLoading">,
) {
  return query.isFetching && !query.isLoading;
}
