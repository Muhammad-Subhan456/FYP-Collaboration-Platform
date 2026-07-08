import type { QueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";

import { queryKeys } from "@/lib/react-query";

import {
  handleIssueCommentCreated,
  handleIssueSnapshotEvent,
} from "./handlers/issue";
import { handleNotificationCreated } from "./handlers/notification";
import { handleProposalEvent } from "./handlers/proposal";
import { handleTeamEvent } from "./handlers/team";
import { handleWorkstreamEvent } from "./handlers/work-stream";
import {
  ISSUE_SNAPSHOT_EVENTS,
  PROPOSAL_EVENTS,
  RealtimeEvents,
  TEAM_EVENTS,
  WORKSTREAM_EVENTS,
} from "./types";

export function registerRealtimeHandlers(
  socket: Socket,
  queryClient: QueryClient,
  userId: string,
  role: string,
) {
  socket.on(RealtimeEvents.NOTIFICATION_CREATED, (envelope) => {
    handleNotificationCreated(queryClient, userId, role, envelope);
  });

  for (const eventName of ISSUE_SNAPSHOT_EVENTS) {
    socket.on(eventName, (envelope) => {
      handleIssueSnapshotEvent(queryClient, userId, role, envelope);
    });
  }

  socket.on(RealtimeEvents.ISSUE_COMMENT_CREATED, (envelope) => {
    handleIssueCommentCreated(queryClient, userId, role, envelope);
  });

  for (const eventName of WORKSTREAM_EVENTS) {
    socket.on(eventName, (envelope) => {
      handleWorkstreamEvent(queryClient, userId, role, envelope);
    });
  }

  for (const eventName of PROPOSAL_EVENTS) {
    socket.on(eventName, (envelope) => {
      handleProposalEvent(queryClient, userId, role, envelope);
    });
  }

  for (const eventName of TEAM_EVENTS) {
    socket.on(eventName, (envelope) => {
      handleTeamEvent(queryClient, userId, role, envelope);
    });
  }

  socket.on("connect", () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.unreadCount(userId),
    });
  });
}

export function unregisterRealtimeHandlers(socket: Socket) {
  socket.removeAllListeners(RealtimeEvents.NOTIFICATION_CREATED);

  for (const eventName of ISSUE_SNAPSHOT_EVENTS) {
    socket.removeAllListeners(eventName);
  }

  socket.removeAllListeners(RealtimeEvents.ISSUE_COMMENT_CREATED);

  for (const eventName of WORKSTREAM_EVENTS) {
    socket.removeAllListeners(eventName);
  }

  for (const eventName of PROPOSAL_EVENTS) {
    socket.removeAllListeners(eventName);
  }

  for (const eventName of TEAM_EVENTS) {
    socket.removeAllListeners(eventName);
  }

  socket.removeAllListeners("connect");
}
