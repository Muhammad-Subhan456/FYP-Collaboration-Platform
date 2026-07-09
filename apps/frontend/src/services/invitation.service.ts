import api from "@/lib/axios";
import type { UserRole } from "@/types";

export interface WorkspaceInvitation {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  status: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface CsvImportSummary {
  total: number;
  invited: number;
  skipped: number;
  invalid: number;
  rows: Array<{
    row: number;
    email: string;
    role: string;
    status: "invited" | "skipped" | "invalid";
    reason?: string;
  }>;
}

export const invitationService = {
  verify: async (token: string) => {
    const res = await api.get<{
      email: string;
      fullName: string | null;
      role: UserRole;
      workspaceName: string;
      expiresAt: string;
    }>("/invitations/verify", { params: { token } });
    return res.data;
  },

  accept: async (data: {
    token: string;
    fullName: string;
    password: string;
  }) => {
    const res = await api.post<{
      userId: string;
      email: string;
      workspaceId: string;
      role: UserRole;
    }>("/invitations/accept", data);
    return res.data;
  },
};

export const coordinatorUsersService = {
  listInvitations: async () => {
    const res = await api.get<WorkspaceInvitation[]>(
      "/coordinator/users/invitations",
    );
    return res.data;
  },

  invite: async (data: {
    email: string;
    fullName?: string;
    role: UserRole;
  }) => {
    const res = await api.post("/coordinator/users/invite", data);
    return res.data;
  },

  resendInvitation: async (invitationId: string) => {
    const res = await api.post(
      `/coordinator/users/invitations/${invitationId}/resend`,
    );
    return res.data;
  },

  importCsv: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<CsvImportSummary>(
      "/coordinator/users/import",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data;
  },
};
