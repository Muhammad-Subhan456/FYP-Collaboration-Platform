import { jwtDecode } from "jwt-decode";

import type { JwtPayload, UserRole } from "@/types";

export const TOKEN_KEY = "fyp_access_token";
export const TOKEN_COOKIE = "fyp_access_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=900; SameSite=Lax`;
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

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case "STUDENT":
      return "/student/dashboard";
    case "SUPERVISOR":
      return "/supervisor/dashboard";
    case "COORDINATOR":
      return "/coordinator/dashboard";
    default:
      return "/auth/login";
  }
}
