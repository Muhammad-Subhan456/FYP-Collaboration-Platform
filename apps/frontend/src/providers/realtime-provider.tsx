"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getStoredToken } from "@/lib/auth";
import { connectRealtime, disconnectRealtime } from "@/lib/realtime/socket";
import { useAuth } from "@/providers/auth-provider";

/**
 * Maintains a single authenticated WebSocket connection per logged-in user.
 * Server state updates flow into TanStack Query — never Redux.
 */
export function RealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

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

    connectRealtime(token, user.userId, user.role, queryClient);

    return () => {
      disconnectRealtime();
    };
  }, [isLoading, isAuthenticated, user?.userId, user?.role, queryClient]);

  return children;
}
