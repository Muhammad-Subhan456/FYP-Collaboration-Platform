"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getStoredToken } from "@/lib/auth";
import type { AuthMembershipCallbacks } from "@/lib/realtime/handlers/auth-membership";
import { connectRealtime, disconnectRealtime } from "@/lib/realtime/socket";
import { useAuth } from "@/providers/auth-provider";
import type { UserRole } from "@/types";

/**
 * Maintains a single authenticated WebSocket connection per logged-in user.
 * Server state updates flow into TanStack Query — never Redux.
 */
export function RealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, switchContext, logout } =
    useAuth();
  const queryClient = useQueryClient();
  const authCallbacksRef = useRef<AuthMembershipCallbacks>({
    onRoleUpdated: async () => undefined,
    onAccountDisabled: () => undefined,
  });

  authCallbacksRef.current = {
    onRoleUpdated: async ({
      workspaceId,
      role,
    }: {
      workspaceId: string;
      role: UserRole;
    }) => {
      await switchContext(workspaceId, role);
    },
    onAccountDisabled: () => {
      logout();
    },
  };

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || !user?.userId) {
      disconnectRealtime();
      return;
    }

    const token = getStoredToken();
    if (!token) {
      return;
    }

    const authCallbacks: AuthMembershipCallbacks = {
      onRoleUpdated: (input) => authCallbacksRef.current.onRoleUpdated(input),
      onAccountDisabled: () => authCallbacksRef.current.onAccountDisabled(),
    };

    connectRealtime(
      token,
      user.userId,
      user.role,
      user.workspaceId,
      queryClient,
      authCallbacks,
    );

    return () => {
      disconnectRealtime();
    };
  }, [
    isLoading,
    isAuthenticated,
    user?.userId,
    user?.role,
    user?.workspaceId,
    queryClient,
  ]);

  return children;
}
