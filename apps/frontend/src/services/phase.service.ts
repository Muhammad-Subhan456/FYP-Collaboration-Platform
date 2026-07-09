import api from "@/lib/axios";

import type {
  CreatePhaseInput,
  Phase,
  PhaseStatus,
  UpdatePhaseInput,
} from "@/types/phase";

export const phaseService = {
  list: async (status?: PhaseStatus) => {
    const res = await api.get<Phase[]>("/phases", {
      params: status ? { status } : undefined,
    });
    return res.data;
  },

  get: async (id: string) => {
    const res = await api.get<Phase>(`/phases/${id}`);
    return res.data;
  },

  create: async (data: CreatePhaseInput) => {
    const res = await api.post<Phase>("/phases", data);
    return res.data;
  },

  update: async (id: string, data: UpdatePhaseInput) => {
    const res = await api.patch<Phase>(`/phases/${id}`, data);
    return res.data;
  },

  remove: async (id: string) => {
    const res = await api.delete(`/phases/${id}`);
    return res.data;
  },
};
