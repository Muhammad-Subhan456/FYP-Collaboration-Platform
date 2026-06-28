import api from "@/lib/axios";
import type { WorkStreamComment, WorkStreamEntityType } from "@/types/work-stream";

export const workStreamService = {
  createComment: async (data: {
    entityType: WorkStreamEntityType;
    entityId: string;
    body: string;
  }) => {
    const res = await api.post<WorkStreamComment>(
      "/work-stream/comments",
      data,
    );
    return res.data;
  },
};
