import { QueryClient, type DefaultOptions } from "@tanstack/react-query";

/** How long cached data is treated as fresh (no background refetch on mount). */
const STALE_TIME_MS = 5 * 60 * 1000;
/** How long inactive query data stays in memory after unmount. */
const GC_TIME_MS = 15 * 60 * 1000;

export const queryDefaultOptions: DefaultOptions = {
  queries: {
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    /**
     * Rely on staleTime + targeted invalidation after mutations.
     * `true` refetches stale queries every time a page mounts, which
     * causes visible reloads when navigating the portal.
     */
    refetchOnMount: false,
  },
  mutations: {
    retry: 0,
  },
};

/** Tighter defaults for aggregated portal page queries. */
export const studentPageQueryOptions = {
  staleTime: STALE_TIME_MS,
  gcTime: GC_TIME_MS,
  refetchOnMount: false as const,
  refetchOnWindowFocus: false as const,
};

/** Shared portal page cache defaults (student, supervisor, coordinator). */
export const portalPageQueryOptions = studentPageQueryOptions;

export const supervisorPageQueryOptions = portalPageQueryOptions;

export const coordinatorPageQueryOptions = portalPageQueryOptions;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: queryDefaultOptions,
  });
}
