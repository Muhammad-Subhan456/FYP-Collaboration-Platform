export { createQueryClient, queryDefaultOptions, portalPageQueryOptions, studentPageQueryOptions, supervisorPageQueryOptions, coordinatorPageQueryOptions } from "@/lib/react-query/query-client";
export { queryKeys } from "@/lib/react-query/query-keys";
export {
  clearAuthenticatedQueries,
  invalidateCoordinatorModule,
  invalidateDashboard,
  invalidateStudentModule,
  invalidateSupervisorModule,
} from "@/lib/react-query/invalidate";
