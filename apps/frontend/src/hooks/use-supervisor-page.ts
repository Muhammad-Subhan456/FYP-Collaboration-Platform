"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";

export function useSupervisorPageQuery<T>(
  page: string,
  queryFn: () => Promise<T>,
  queryKeyExtra?: unknown,
) {
  const { user } = useAuth();

  return useQuery({
    queryKey:
      queryKeyExtra !== undefined
        ? ["supervisor", page, user?.userId, queryKeyExtra]
        : ["supervisor", page, user?.userId],
    queryFn,
    enabled: !!user?.userId,
  });
}
