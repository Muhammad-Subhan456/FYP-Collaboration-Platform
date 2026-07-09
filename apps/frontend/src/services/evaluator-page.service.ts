import api from "@/lib/axios";
import type { NotificationReadFilter } from "@/services/notification.service";
import type { PaginatedResponse } from "@/types";
import type { GlobalAnnouncement } from "@/types/coordinator";
import type { Notification } from "@/types/student";

export const evaluatorPageService = {
  getDashboard: async () => {
    const res = await api.get<{
      panels: unknown[];
      teamNameById: Record<string, string>;
      recentNotifications: PaginatedResponse<Notification>;
      globalAnnouncements: GlobalAnnouncement[];
    }>("/evaluator/dashboard");
    return res.data;
  },

  getEvaluations: async () => {
    const res = await api.get("/evaluator/evaluations");
    return res.data;
  },

  getResults: async () => {
    const res = await api.get("/evaluator/results");
    return res.data;
  },

  getNotifications: async (
    page = 1,
    limit = 20,
    readFilter: NotificationReadFilter = "all",
  ) => {
    const isRead =
      readFilter === "unread"
        ? false
        : readFilter === "read"
          ? true
          : undefined;
    const res = await api.get<PaginatedResponse<Notification>>(
      "/evaluator/notifications",
      {
        params: {
          page,
          limit,
          ...(isRead === undefined ? {} : { isRead }),
        },
      },
    );
    return res.data;
  },

  getProfile: async () => {
    const res = await api.get("/evaluator/profile");
    return res.data;
  },
};
