"use client";

/**
 * @deprecated Use role-specific dashboard hooks instead:
 * - useStudentDashboardQuery from @/queries/student
 * - useSupervisorDashboardQuery from @/queries/supervisor
 * - useCoordinatorDashboardQuery from @/queries/coordinator
 */
export {
  useStudentDashboardQuery as useStudentDashboardOverview,
} from "@/queries/student";
export {
  useSupervisorDashboardQuery as useSupervisorDashboardOverview,
} from "@/queries/supervisor";
export {
  useCoordinatorDashboardQuery as useCoordinatorDashboardOverview,
} from "@/queries/coordinator";
