import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";

import { AUTH_ROUTES, ONBOARDING_PREFIX, ROLE_ROUTES } from "@/constants/routes";
import type { JwtPayload, UserRole } from "@/types";

function getToken(request: NextRequest): string | null {
  return request.cookies.get("fyp_access_token")?.value ?? null;
}

function getRoleFromToken(token: string): UserRole | null {
  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (payload.exp * 1000 < Date.now()) return null;
    return payload.role;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = getToken(request);
  const role = token ? getRoleFromToken(token) : null;
  const isAuthenticated = !!role;

  if (AUTH_ROUTES.includes(pathname) && isAuthenticated && role) {
    return NextResponse.redirect(
      new URL(`${ROLE_ROUTES[role]}/dashboard`, request.url),
    );
  }

  const protectedPrefixes = [
    "/student",
    "/supervisor",
    "/coordinator",
    "/evaluator",
    "/super-admin",
  ];
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  const isOnboarding = pathname.startsWith(ONBOARDING_PREFIX);

  if ((isProtected || isOnboarding) && !isAuthenticated) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isProtected && role) {
    const expectedPrefix = ROLE_ROUTES[role];
    if (!pathname.startsWith(expectedPrefix)) {
      return NextResponse.redirect(
        new URL(`${expectedPrefix}/dashboard`, request.url),
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/student/:path*",
    "/supervisor/:path*",
    "/coordinator/:path*",
    "/evaluator/:path*",
    "/super-admin/:path*",
  ],
};
