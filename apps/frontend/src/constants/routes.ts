import type { UserRole } from "@/types";

export const ROLE_ROUTES: Record<UserRole, string> = {
  STUDENT: "/student",
  SUPERVISOR: "/supervisor",
  COORDINATOR: "/coordinator",
};

const PUBLIC_ROUTES = ["/auth/login", "/auth/register"];
export const ONBOARDING_PREFIX = "/auth/onboarding";

export const AUTH_ROUTES = ["/auth/login", "/auth/register"];
