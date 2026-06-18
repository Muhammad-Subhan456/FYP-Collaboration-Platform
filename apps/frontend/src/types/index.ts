export type UserRole = "STUDENT" | "SUPERVISOR" | "COORDINATOR";

export type Department = "CS" | "SE" | "IT" | "AI" | "DS";

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  exp: number;
  iat: number;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
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
