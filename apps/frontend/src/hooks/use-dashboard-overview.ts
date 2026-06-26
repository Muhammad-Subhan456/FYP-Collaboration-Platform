"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  dashboardService,
  type CoordinatorDashboardOverview,
  type DashboardOverview,
  type StudentDashboardOverview,
  type SupervisorDashboardOverview,
} from "@/services/dashboard.service";
import { studentService } from "@/services/student.service";
import { supervisorPageService } from "@/services/supervisor-page.service";
import { coordinatorPageService } from "@/services/coordinator-page.service";
import { useAuth } from "@/providers/auth-provider";

type OverviewByRole = {
  STUDENT: StudentDashboardOverview;
  SUPERVISOR: SupervisorDashboardOverview;
  COORDINATOR: CoordinatorDashboardOverview;
};

export function useDashboardOverview<R extends DashboardOverview["role"]>(
  expectedRole: R,
) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: [expectedRole.toLowerCase(), "dashboard", user?.userId],
    queryFn: () => {
      switch (expectedRole) {
        case "STUDENT":
          return studentService.getDashboard();
        case "SUPERVISOR":
          return supervisorPageService.getDashboard();
        case "COORDINATOR":
          return coordinatorPageService.getDashboard();
        default:
          return dashboardService.getOverview();
      }
    },
    enabled: !!user?.userId,
  });

  const roleMismatch =
    !!query.data && query.data.role !== expectedRole;

  useEffect(() => {
    if (roleMismatch && !query.isFetching && user?.userId) {
      void query.refetch();
    }
  }, [roleMismatch, query.isFetching, user?.userId, query.refetch]);

  const overview =
    query.data?.role === expectedRole
      ? (query.data as OverviewByRole[R])
      : undefined;

  const isResolving =
    query.isLoading ||
    query.isFetching ||
    roleMismatch ||
    !overview;

  return {
    ...query,
    overview,
    isResolving,
  };
}
