import { jwtDecode } from "jwt-decode";

import type { AuthUser, JwtPayload, UserRole } from "@/types";

export const TOKEN_KEY = "fyp_access_token";
export const TOKEN_COOKIE = "fyp_access_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Cookie lifetime follows the JWT `exp` claim (set by backend JWT_EXPIRES_IN). */
export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  const payload = decodeToken(token);
  const maxAgeSeconds = payload?.exp
    ? Math.max(0, payload.exp - Math.floor(Date.now() / 1000))
    : 0;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
}

export function getRoleFromToken(token: string): UserRole | null {
  const payload = decodeToken(token);
  return payload?.role ?? null;
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

export function bootstrapAuthUser(): AuthUser | null {
  const token = getStoredToken();
  if (!token || isTokenExpired(token)) {
    clearStoredToken();
    return null;
  }

  const payload = decodeToken(token);
  if (!payload) {
    clearStoredToken();
    return null;
  }

  return {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
    workspaceId: payload.workspaceId ?? null,
  };
}

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case "STUDENT":
      return "/student/dashboard";
    case "SUPERVISOR":
      return "/supervisor/dashboard";
    case "COORDINATOR":
      return "/coordinator/dashboard";
    case "EVALUATOR":
      return "/evaluator/dashboard";
    case "SUPER_ADMIN":
      return "/super-admin/workspaces";
    default:
      return "/auth/login";
  }
}
