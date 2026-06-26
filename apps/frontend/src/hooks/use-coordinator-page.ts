"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";

export function useCoordinatorPageQuery<T>(
  page: string,
  queryFn: () => Promise<T>,
  options?: Pick<UseQueryOptions<T>, "refetchInterval" | "staleTime">,
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["coordinator", page, user?.userId],
    queryFn,
    enabled: !!user?.userId,
    ...options,
  });
}
