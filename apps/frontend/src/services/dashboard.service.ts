import api from "@/lib/axios";

export const dashboardService = {
  getStudent: async () => {
    const res = await api.get("/dashboard/student");
    return res.data;
  },

  getSupervisor: async () => {
    const res = await api.get("/dashboard/supervisor");
    return res.data;
  },

  getCoordinator: async () => {
    const res = await api.get("/dashboard/coordinator");
    return res.data;
  },
};
