import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { queryKeys, studentPageQueryOptions } from "@/lib/react-query";
import {
  type StudentDashboardOverview,
} from "@/services/dashboard.service";
import { studentService } from "@/services/student.service";
import { useAuth } from "@/providers/auth-provider";

export function useStudentDashboardQuery() {
  const { user } = useAuth();

  const query = useQuery({
    ...studentPageQueryOptions,
    queryKey: queryKeys.student.dashboard(user?.userId),
    queryFn: studentService.getDashboard,
    enabled: !!user?.userId,
  });

  const roleMismatch =
    !!query.data && query.data.role !== "STUDENT";

  useEffect(() => {
    if (roleMismatch && !query.isFetching && user?.userId) {
      void query.refetch();
    }
  }, [roleMismatch, query.isFetching, user?.userId, query.refetch]);

  const overview =
    query.data?.role === "STUDENT"
      ? (query.data as StudentDashboardOverview)
      : undefined;

  /** Only block UI on first load — keep showing cached dashboard while refreshing. */
  const isResolving =
    query.isLoading || (roleMismatch && !overview);

  return {
    ...query,
    overview,
    isResolving,
  };
}
