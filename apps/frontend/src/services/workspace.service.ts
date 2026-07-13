import api from "@/lib/axios";
import type { SystemHealthResponse } from "@/types/coordinator";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  Workspace,
} from "@/types/workspace";

export const workspaceService = {
  list: async (includeArchived = false) => {
    const res = await api.get<Workspace[]>(
      "/super-admin/workspaces",
      { params: { includeArchived } },
    );
    return res.data;
  },

  create: async (data: CreateWorkspaceInput) => {
    const res = await api.post<Workspace>(
      "/super-admin/workspaces",
      data,
    );
    return res.data;
  },

  update: async (id: string, data: UpdateWorkspaceInput) => {
    const res = await api.patch<Workspace>(
      `/super-admin/workspaces/${id}`,
      data,
    );
    return res.data;
  },

  archive: async (id: string) => {
    const res = await api.post<Workspace>(
      `/super-admin/workspaces/${id}/archive`,
    );
    return res.data;
  },

  restore: async (id: string) => {
    const res = await api.post<Workspace>(
      `/super-admin/workspaces/${id}/restore`,
    );
    return res.data;
  },

  getSystemHealth: async () => {
    const res = await api.get<SystemHealthResponse>(
      "/super-admin/system-health",
    );
    return res.data;
  },
};
