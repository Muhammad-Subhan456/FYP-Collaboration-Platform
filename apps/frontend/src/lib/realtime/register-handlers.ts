import type { QueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";

import { queryKeys } from "@/lib/react-query";

import { handleGlobalAnnouncementPublished } from "./global-announcement-cache";
import {
  handleAuthMembershipEvent,
  type AuthMembershipCallbacks,
} from "./handlers/auth-membership";
import { handleConfigEvent } from "./handlers/config";
import {
  handleEvaluationEvent,
  invalidateEvaluationCachesOnReconnect,
} from "./handlers/evaluation";
import {
  handleIssueCommentCreated,
  handleIssueSnapshotEvent,
} from "./handlers/issue";
import { handleNotificationCreated } from "./handlers/notification";
import { handleProposalEvent } from "./handlers/proposal";
import { handleTeamEvent } from "./handlers/team";
import { handleWorkstreamEvent } from "./handlers/work-stream";
import {
  AUTH_MEMBERSHIP_EVENTS,
  CONFIG_EVENTS,
  EVALUATION_EVENTS,
  ISSUE_SNAPSHOT_EVENTS,
  PROPOSAL_EVENTS,
  RealtimeEvents,
  TEAM_EVENTS,
  WORKSTREAM_EVENTS,
} from "./types";

function invalidateOnReconnect(
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null,
) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.notifications.unreadCount(userId, workspaceId),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.notifications.unreadPreview(userId, workspaceId),
  });

  // Role-scoped catch-up — avoid invalidating every portal's caches for one user.
  if (role === "STUDENT") {
    void queryClient.invalidateQueries({ queryKey: ["student"] });
  } else if (role === "SUPERVISOR") {
    void queryClient.invalidateQueries({ queryKey: ["supervisor"] });
  } else if (role === "COORDINATOR") {
    void queryClient.invalidateQueries({ queryKey: ["coordinator"] });
    void queryClient.invalidateQueries({ queryKey: ["phases"] });
    void queryClient.invalidateQueries({ queryKey: ["deliverable-templates"] });
  } else if (role === "EVALUATOR") {
    void queryClient.invalidateQueries({ queryKey: ["evaluator"] });
  }

  invalidateEvaluationCachesOnReconnect(queryClient, workspaceId);
}

export function registerRealtimeHandlers(
  socket: Socket,
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null,
  authCallbacks?: AuthMembershipCallbacks | null,
) {
  socket.on(RealtimeEvents.NOTIFICATION_CREATED, (envelope) => {
    handleNotificationCreated(
      queryClient,
      userId,
      role,
      workspaceId,
      envelope,
    );
  });

  for (const eventName of ISSUE_SNAPSHOT_EVENTS) {
    socket.on(eventName, (envelope) => {
      handleIssueSnapshotEvent(
        queryClient,
        userId,
        role,
        workspaceId,
        envelope,
      );
    });
  }

  socket.on(RealtimeEvents.ISSUE_COMMENT_CREATED, (envelope) => {
    handleIssueCommentCreated(
      queryClient,
      userId,
      role,
      workspaceId,
      envelope,
    );
  });

  for (const eventName of WORKSTREAM_EVENTS) {
    socket.on(eventName, (envelope) => {
      handleWorkstreamEvent(
        queryClient,
        userId,
        role,
        workspaceId,
        envelope,
      );
    });
  }

  for (const eventName of CONFIG_EVENTS) {
    socket.on(eventName, (envelope) => {
      handleConfigEvent(queryClient, userId, role, workspaceId, envelope);
    });
  }

  for (const eventName of PROPOSAL_EVENTS) {
    socket.on(eventName, (envelope) => {
      handleProposalEvent(
        queryClient,
        userId,
        role,
        workspaceId,
        envelope,
      );
    });
  }

  for (const eventName of TEAM_EVENTS) {
    socket.on(eventName, (envelope) => {
      handleTeamEvent(queryClient, userId, role, workspaceId, envelope);
    });
  }

  for (const eventName of EVALUATION_EVENTS) {
    socket.on(eventName, (envelope) => {
      handleEvaluationEvent(
        queryClient,
        userId,
        role,
        workspaceId,
        envelope,
      );
    });
  }

  for (const eventName of AUTH_MEMBERSHIP_EVENTS) {
    socket.on(eventName, (envelope) => {
      handleAuthMembershipEvent(
        queryClient,
        userId,
        role,
        workspaceId,
        envelope,
        authCallbacks,
      );
    });
  }

  socket.on(RealtimeEvents.GLOBAL_ANNOUNCEMENT_PUBLISHED, (envelope) => {
    handleGlobalAnnouncementPublished(
      queryClient,
      role,
      workspaceId,
      envelope,
    );
  });

  // Catch up only after a reconnect — not on the initial connect (queries already load).
  socket.on("connect", () => {
    const sock = socket as Socket & { __foasisConnectedOnce?: boolean };
    if (!sock.__foasisConnectedOnce) {
      sock.__foasisConnectedOnce = true;
      return;
    }
    invalidateOnReconnect(queryClient, userId, role, workspaceId);
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

  for (const eventName of CONFIG_EVENTS) {
    socket.removeAllListeners(eventName);
  }

  for (const eventName of PROPOSAL_EVENTS) {
    socket.removeAllListeners(eventName);
  }

  for (const eventName of TEAM_EVENTS) {
    socket.removeAllListeners(eventName);
  }

  for (const eventName of EVALUATION_EVENTS) {
    socket.removeAllListeners(eventName);
  }

  for (const eventName of AUTH_MEMBERSHIP_EVENTS) {
    socket.removeAllListeners(eventName);
  }

  socket.removeAllListeners(RealtimeEvents.GLOBAL_ANNOUNCEMENT_PUBLISHED);

  socket.removeAllListeners("connect");
}
