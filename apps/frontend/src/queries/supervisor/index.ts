import { queryKeys } from "@/lib/react-query";

export {
  useSupervisorAuthQuery,
  isSupervisorQueryPending,
  isSupervisorQueryInitialLoading,
  isSupervisorQueryRefreshing,
} from "./base";
export { useSupervisorDashboardQuery } from "./use-dashboard";
export {
  useSupervisorEvaluationsQuery,
  useSupervisorInvitationsQuery,
  useSupervisorMilestonesQuery,
  useSupervisorNotificationsQuery,
  useSupervisorProfileQuery,
  useSupervisorRequestsQuery,
  useSupervisorTeamsQuery,
  useSupervisorWorkStreamQuery,
} from "./use-pages";

import { useSupervisorAuthQuery } from "./base";

/** @deprecated Use specific hooks from @/queries/supervisor instead. */
export function useSupervisorPageQuery<TData>(
  page: string,
  queryFn: () => Promise<TData>,
  queryKeyExtra?: unknown,
) {
  const queryKey =
    queryKeyExtra !== undefined
      ? queryKeys.supervisor.page(page, undefined, queryKeyExtra)
      : queryKeys.supervisor.page(page);

  return useSupervisorAuthQuery(page, queryFn, { queryKey });
}
