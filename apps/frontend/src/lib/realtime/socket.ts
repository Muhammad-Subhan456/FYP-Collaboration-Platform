import type { QueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";

import { getRealtimeServerUrl } from "./config";
import {
  registerRealtimeHandlers,
  unregisterRealtimeHandlers,
} from "./register-handlers";

let socket: Socket | null = null;
let activeUserId: string | null = null;

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
  queryClient: QueryClient,
) {
  const needsNewSocket =
    !socket?.connected || activeUserId !== userId;

  if (needsNewSocket) {
    disconnectRealtime();

    const url = getRealtimeServerUrl();
    log("connecting", { url, userId, role });

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

    socket.on("connect", () => {
      log("socket connected", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      log("socket disconnected", reason);
    });

    socket.on("connect_error", (error) => {
      console.warn("[realtime] connection error:", error.message);
    });

    socket.on("realtime.connected", (payload: { userId: string; rooms: string[] }) => {
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

  // Always refresh handlers so queryClient closures stay current.
  if (socket) {
    unregisterRealtimeHandlers(socket);
    registerRealtimeHandlers(socket, queryClient, userId, role);
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
  }
}
