export { useStudentAuthQuery, isStudentQueryPending, isStudentQueryInitialLoading, isStudentQueryRefreshing } from "./base";
export { useStudentDashboardQuery } from "./use-dashboard";
export {
  useBrowseTeamsQuery,
  useBrowseTeamDetailsQuery,
  useStudentEvaluationsQuery,
  useStudentMilestonesQuery,
  useStudentNotificationsQuery,
  useStudentProfileQuery,
  useStudentProposalQuery,
  useStudentResultsQuery,
  useStudentTeamQuery,
  useStudentWorkspaceSettingsQuery,
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
