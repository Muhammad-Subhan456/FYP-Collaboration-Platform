export { useStudentAuthQuery, isStudentQueryPending, isStudentQueryInitialLoading, isStudentQueryRefreshing } from "./base";
export { useStudentDashboardQuery } from "./use-dashboard";
export {
  useBrowseTeamsQuery,
  useStudentEvaluationsQuery,
  useStudentMeetingsQuery,
  useStudentMilestonesQuery,
  useStudentNotificationsQuery,
  useStudentProfileQuery,
  useStudentProposalQuery,
  useStudentResultsQuery,
  useStudentTasksQuery,
  useStudentTeamQuery,
  useStudentWorkStreamQuery,
} from "./use-pages";

import { useStudentAuthQuery } from "./base";

/** @deprecated Use specific hooks from @/queries/student instead. */
export function useStudentPageQuery<TData>(
  page: string,
  queryFn: () => Promise<TData>,
) {
  return useStudentAuthQuery(page, queryFn);
}
