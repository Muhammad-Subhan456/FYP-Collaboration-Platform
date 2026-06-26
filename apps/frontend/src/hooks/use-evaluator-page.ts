"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";

export function useEvaluatorPageQuery<T>(
  page: string,
  queryFn: () => Promise<T>,
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["evaluator", page, user?.userId],
    queryFn,
    enabled: !!user?.userId,
  });
}
