"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";
import { workspaceService } from "@/services/workspace.service";

export function useSystemHealthQuery() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.superAdmin.systemHealth(),
    queryFn: workspaceService.getSystemHealth,
    enabled: user?.role === "SUPER_ADMIN",
    staleTime: 0,
    refetchInterval: 30_000,
  });
}
