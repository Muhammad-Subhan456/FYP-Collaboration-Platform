"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";
import { workspaceService } from "@/services/workspace.service";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from "@/types/workspace";

export function useWorkspacesQuery(includeArchived = false) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.superAdmin.workspaces(includeArchived),
    queryFn: () => workspaceService.list(includeArchived),
    enabled: user?.role === "SUPER_ADMIN",
  });
}

export function useWorkspaceMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.superAdmin.all,
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateWorkspaceInput) =>
      workspaceService.create(data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateWorkspaceInput;
    }) => workspaceService.update(id, data),
    onSuccess: invalidate,
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => workspaceService.archive(id),
    onSuccess: invalidate,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => workspaceService.restore(id),
    onSuccess: invalidate,
  });

  return {
    createMutation,
    updateMutation,
    archiveMutation,
    restoreMutation,
  };
}
