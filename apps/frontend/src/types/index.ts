export type UserRole =
  | "STUDENT"
  | "SUPERVISOR"
  | "COORDINATOR"
  | "EVALUATOR"
  | "SUPER_ADMIN";

export type Department = "CS" | "SE" | "IT" | "AI" | "DS";

export interface AuthContextOption {
  workspaceId: string;
  workspaceName: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  workspaceId?: string | null;
  exp: number;
  iat: number;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  workspaceId?: string | null;
}

export interface LoginResponse {
  accessToken?: string;
  requiresContextSelection?: boolean;
  selectionToken?: string;
  contexts?: AuthContextOption[];
}

export interface RegisterResponse {
  message: string;
  userId: string;
}

export type { UserProfile, AuthUserRecord, ProfileType } from "./profile";

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
}
