import api from "@/lib/axios";
import type { PaginatedResponse } from "@/types";
import type { Notification } from "@/types/student";

export const notificationService = {
  getMyNotifications: async (page = 1, limit = 20) => {
    const res = await api.get<PaginatedResponse<Notification>>(
      "/notifications/me",
      { params: { page, limit } },
    );
    return res.data;
  },

  getUnreadCount: async () => {
    const res = await api.get<{ count: number }>("/notifications/unread-count");
    return res.data;
  },

  markAsRead: async (id: string) => {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  },

  markAllAsRead: async () => {
    const res = await api.patch("/notifications/read-all");
    return res.data;
  },
};
