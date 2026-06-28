/**
 * TanStack Query mutation hooks by portal role.
 * Use targeted invalidation helpers from each role's invalidate module.
 */

export {
  clearAuthenticatedQueries,
  invalidateCoordinatorModule,
  invalidateDashboard,
  invalidateStudentModule,
  invalidateSupervisorModule,
} from "@/lib/react-query";

export * from "./student";
export * from "./supervisor";
export * from "./coordinator";
