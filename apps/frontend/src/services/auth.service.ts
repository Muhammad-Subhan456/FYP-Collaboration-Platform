import api from "@/lib/axios";
import type {
  AuthContextOption,
  LoginResponse,
  RegisterResponse,
  UserRole,
} from "@/types";
import type { AuthUserRecord } from "@/types/profile";

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
    const res = await api.post<LoginResponse>("/auth/login", data);
    return res.data;
  },

  selectContext: async (data: {
    selectionToken: string;
    workspaceId: string;
    role: UserRole;
  }) => {
    const res = await api.post<{ accessToken: string }>(
      "/auth/select-context",
      data,
    );
    return res.data;
  },

  switchContext: async (data: {
    workspaceId: string;
    role: UserRole;
  }) => {
    const res = await api.post<{ accessToken: string }>(
      "/auth/switch-context",
      data,
    );
    return res.data;
  },

  listContexts: async () => {
    const res = await api.get<AuthContextOption[]>("/auth/contexts");
    return res.data;
  },

  forgotPassword: async (email: string) => {
    const res = await api.post<{ message: string }>(
      "/auth/forgot-password",
      { email },
    );
    return res.data;
  },

  resetPassword: async (token: string, password: string) => {
    const res = await api.post<{ message: string }>(
      "/auth/reset-password",
      { token, password },
    );
    return res.data;
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string,
  ) => {
    const res = await api.post<{ message: string; accessToken: string }>(
      "/auth/change-password",
      { currentPassword, newPassword },
    );
    return res.data;
  },

  register: async (data: RegisterInput) => {
    const res = await api.post<RegisterResponse>("/auth/register", data);
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
