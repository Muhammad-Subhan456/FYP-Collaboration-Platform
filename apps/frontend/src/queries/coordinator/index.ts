import { queryKeys } from "@/lib/react-query";

export {
  useCoordinatorAuthQuery,
  isCoordinatorQueryPending,
  isCoordinatorQueryInitialLoading,
  isCoordinatorQueryRefreshing,
} from "./base";
export { useCoordinatorDashboardQuery } from "./use-dashboard";
export {
  useCoordinatorAnalyticsQuery,
  useCoordinatorAnnouncementsQuery,
  useCoordinatorEvaluationsQuery,
  useCoordinatorEvaluatorOverviewQuery,
  useCoordinatorAllTeamsQuery,
  useCoordinatorNotificationsQuery,
  useCoordinatorProfileQuery,
  useCoordinatorProposalsQuery,
  useCoordinatorResultsQuery,
  useCoordinatorSystemHealthQuery,
  useCoordinatorTeamsQuery,
  useCoordinatorUserDetailQuery,
  useCoordinatorUsersQuery,
} from "./use-pages";

import { useCoordinatorAuthQuery } from "./base";

/** @deprecated Use specific hooks from @/queries/coordinator instead. */
export function useCoordinatorPageQuery<TData>(
  page: string,
  queryFn: () => Promise<TData>,
  options?: { refetchInterval?: number; staleTime?: number },
) {
  return useCoordinatorAuthQuery(page, queryFn, options);
}
