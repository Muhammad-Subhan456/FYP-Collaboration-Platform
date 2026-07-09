"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import {
  clearStoredToken,
  decodeToken,
  getDashboardPath,
  getStoredToken,
  isTokenExpired,
  setStoredToken,
} from "@/lib/auth";
import { clearAuthenticatedQueries } from "@/lib/react-query";
import { authService } from "@/services/auth.service";
import { profileService } from "@/services/profile.service";
import { getOnboardingPath } from "@/constants/navigation";
import type { AuthContextOption, AuthUser, UserRole } from "@/types";

export const CONTEXT_SELECTION_TOKEN_KEY = "fyp_context_selection_token";
export const CONTEXT_OPTIONS_KEY = "fyp_context_options";

export function getStoredContextOptions(): AuthContextOption[] {
  const raw = sessionStorage.getItem(CONTEXT_OPTIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AuthContextOption[];
  } catch {
    return [];
  }
}

export function useAuthSession() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const clearUserQueries = useCallback(() => {
    clearAuthenticatedQueries(queryClient);
  }, [queryClient]);

  const completeSession = useCallback(
    async (accessToken: string) => {
      setStoredToken(accessToken);
      const payload = decodeToken(accessToken);
      if (!payload) {
        throw new Error("Invalid token received");
      }

      const authUser: AuthUser = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        workspaceId: payload.workspaceId ?? null,
      };

      clearAuthenticatedQueries(queryClient);

      if (authUser.role === "SUPER_ADMIN") {
        router.push(getDashboardPath(authUser.role));
        return authUser;
      }

      try {
        const profile = await profileService.getMyProfile();
        if (!profile) {
          router.push(getOnboardingPath(authUser.role));
          return authUser;
        }
      } catch {
        router.push(getOnboardingPath(authUser.role));
        return authUser;
      }

      router.push(getDashboardPath(authUser.role));
      return authUser;
    },
    [queryClient, router],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authService.login({ email, password });

      if (response.requiresContextSelection && response.selectionToken) {
        sessionStorage.setItem(
          CONTEXT_SELECTION_TOKEN_KEY,
          response.selectionToken,
        );
        sessionStorage.setItem(
          CONTEXT_OPTIONS_KEY,
          JSON.stringify(response.contexts ?? []),
        );
        router.push("/auth/select-context");
        return;
      }

      if (!response.accessToken) {
        throw new Error("Login failed");
      }

      await completeSession(response.accessToken);
    },
    [completeSession, router],
  );

  const selectContext = useCallback(
    async (workspaceId: string, role: UserRole) => {
      const selectionToken = sessionStorage.getItem(
        CONTEXT_SELECTION_TOKEN_KEY,
      );

      if (!selectionToken) {
        throw new Error("Session expired. Please sign in again.");
      }

      const { accessToken } = await authService.selectContext({
        selectionToken,
        workspaceId,
        role,
      });

      sessionStorage.removeItem(CONTEXT_SELECTION_TOKEN_KEY);
      sessionStorage.removeItem(CONTEXT_OPTIONS_KEY);
      await completeSession(accessToken);
    },
    [completeSession],
  );

  const switchContext = useCallback(
    async (workspaceId: string, role: UserRole) => {
      const { accessToken } = await authService.switchContext({
        workspaceId,
        role,
      });
      await completeSession(accessToken);
    },
    [completeSession],
  );

  return {
    login,
    selectContext,
    switchContext,
    completeSession,
    clearUserQueries,
  };
}
