import type { QueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";

import { getRealtimeServerUrl } from "./config";
import { gaTrace } from "./ga-trace";
import type { AuthMembershipCallbacks } from "./handlers/auth-membership";
import {
  registerRealtimeHandlers,
  unregisterRealtimeHandlers,
} from "./register-handlers";

let socket: Socket | null = null;
let activeUserId: string | null = null;
let activeWorkspaceId: string | null = null;

const isDev = process.env.NODE_ENV === "development";

function log(...args: unknown[]) {
  if (isDev) {
    console.info("[realtime]", ...args);
  }
}

export function getRealtimeSocket() {
  return socket;
}

export function connectRealtime(
  token: string,
  userId: string,
  role: string,
  workspaceId: string | null | undefined,
  queryClient: QueryClient,
  authCallbacks?: AuthMembershipCallbacks | null,
) {
  const normalizedWorkspaceId = workspaceId ?? null;
  const needsNewSocket =
    !socket?.connected ||
    activeUserId !== userId ||
    activeWorkspaceId !== normalizedWorkspaceId;

  if (needsNewSocket) {
    disconnectRealtime();

    const url = getRealtimeServerUrl();
    log("connecting", { url, userId, role, workspaceId: normalizedWorkspaceId });

    socket = io(`${url}/realtime`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
      timeout: 20_000,
    });

    activeUserId = userId;
    activeWorkspaceId = normalizedWorkspaceId;

    socket.on("connect", () => {
      gaTrace("5-socket-connected", {
        socketId: socket?.id ?? null,
        userId,
        role,
        workspaceId: normalizedWorkspaceId,
      });
      log("socket connected", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      log("socket disconnected", reason);
    });

    socket.on("connect_error", (error) => {
      console.warn("[realtime] connection error:", error.message);
    });

    socket.on("realtime.connected", (payload: { userId: string; rooms: string[] }) => {
      gaTrace("7-room-join", {
        socketId: socket?.id ?? null,
        userId: payload.userId,
        rooms: payload.rooms,
      });
      log("authenticated", payload);
      const hasTeamRoom = payload.rooms.some((room) => room.startsWith("team:"));
      if (!hasTeamRoom && role === "STUDENT") {
        console.warn(
          "[realtime] No team room joined — issue board live updates will not work until you are on a team.",
        );
      }
    });

    socket.on("realtime.error", (payload: { message?: string }) => {
      console.warn("[realtime] server error:", payload?.message ?? payload);
    });
  }

  // Always refresh handlers so queryClient / auth closures stay current.
  if (socket) {
    gaTrace("6-socket-id", { socketId: socket.id ?? null, userId, role, workspaceId: normalizedWorkspaceId });
    unregisterRealtimeHandlers(socket);
    registerRealtimeHandlers(
      socket,
      queryClient,
      userId,
      role,
      normalizedWorkspaceId,
      authCallbacks,
    );
  }

  return socket;
}

export function disconnectRealtime() {
  if (socket) {
    unregisterRealtimeHandlers(socket);
    socket.removeAllListeners("connect");
    socket.removeAllListeners("disconnect");
    socket.removeAllListeners("connect_error");
    socket.removeAllListeners("realtime.connected");
    socket.removeAllListeners("realtime.error");
    socket.disconnect();
    socket = null;
    activeUserId = null;
    activeWorkspaceId = null;
  }
}
