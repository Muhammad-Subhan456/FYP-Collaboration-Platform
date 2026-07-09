import api from "@/lib/axios";
import type { PaginatedResponse } from "@/types";
import type {
  CreateDeliverableTemplateInput,
  DeliverableTemplate,
  PublishDeliverableTemplateInput,
  UpdateDeliverableTemplateInput,
} from "@/types/phase";
import type { Deliverable, Submission } from "@/types/student";

export const deliverableTemplateService = {
  list: async (phaseId?: string) => {
    const res = await api.get<DeliverableTemplate[]>(
      "/deliverable-templates",
      { params: phaseId ? { phaseId } : undefined },
    );
    return res.data;
  },

  get: async (id: string) => {
    const res = await api.get<DeliverableTemplate>(
      `/deliverable-templates/${id}`,
    );
    return res.data;
  },

  create: async (data: CreateDeliverableTemplateInput) => {
    const res = await api.post<DeliverableTemplate>(
      "/deliverable-templates",
      data,
    );
    return res.data;
  },

  update: async (id: string, data: UpdateDeliverableTemplateInput) => {
    const res = await api.patch<DeliverableTemplate>(
      `/deliverable-templates/${id}`,
      data,
    );
    return res.data;
  },

  remove: async (id: string) => {
    const res = await api.delete(`/deliverable-templates/${id}`);
    return res.data;
  },

  publish: async (data: PublishDeliverableTemplateInput) => {
    const res = await api.post<Deliverable | Deliverable[]>(
      "/deliverables/publish-template",
      data,
    );
    return res.data;
  },

  getFinalizedSubmissions: async (phaseId?: string, page = 1, limit = 20) => {
    const res = await api.get<PaginatedResponse<Submission>>(
      "/submissions/finalized",
      { params: { phaseId, page, limit } },
    );
    return res.data;
  },
};
