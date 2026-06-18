import api from "@/lib/axios";
import type { AuthUserRecord } from "@/types/profile";
import type { UserRole } from "@/types";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}

export const authService = {
  login: async (data: LoginInput) => {
    const res = await api.post<{ accessToken: string }>("/auth/login", data);
    return res.data;
  },

  register: async (data: RegisterInput) => {
    const res = await api.post("/auth/register", data);
    return res.data;
  },

  listSupervisors: async () => {
    const res = await api.get<
      Array<{ id: string; fullName: string; email: string }>
    >("/auth/supervisors");
    return res.data;
  },

  listUsers: async () => {
    const res = await api.get<AuthUserRecord[]>("/auth/users");
    return res.data;
  },

  updateUserRole: async (userId: string, role: UserRole) => {
    const res = await api.patch<AuthUserRecord>(
      `/auth/users/${userId}/role`,
      { role },
    );
    return res.data;
  },

  updateUserStatus: async (userId: string, isActive: boolean) => {
    const res = await api.patch<AuthUserRecord>(
      `/auth/users/${userId}/status`,
      { isActive },
    );
    return res.data;
  },
};
