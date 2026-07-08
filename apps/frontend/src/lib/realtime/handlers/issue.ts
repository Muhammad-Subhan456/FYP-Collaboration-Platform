import type { QueryClient } from "@tanstack/react-query";

import {
  applyIssueComment,
  applyIssueSnapshot,
  patchTeamIssueCaches,
} from "../issue-cache";
import type {
  RealtimeEventEnvelope,
  RealtimeIssueCommentPayload,
  RealtimeIssueSnapshotPayload,
} from "../types";

function shouldSkipSelfEvent(actorId: string | undefined, userId: string) {
  return !!actorId && actorId === userId;
}

function teamIdFromEnvelope(envelope: RealtimeEventEnvelope) {
  if (envelope.scope.type === "team") {
    return envelope.scope.id;
  }

  const payload = envelope.payload as { teamId?: string };
  return payload.teamId ?? null;
}

export function handleIssueSnapshotEvent(
  queryClient: QueryClient,
  userId: string,
  role: string,
  envelope: RealtimeEventEnvelope<RealtimeIssueSnapshotPayload>,
) {
  if (shouldSkipSelfEvent(envelope.actorId, userId)) {
    return;
  }

  const teamId = teamIdFromEnvelope(envelope);
  if (!teamId) {
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[realtime:issues] snapshot", envelope.event, teamId);
  }

  const snapshot = envelope.payload.issue;

  patchTeamIssueCaches(queryClient, teamId, userId, role, (issues) =>
    applyIssueSnapshot(issues, snapshot),
  );
}

export function handleIssueCommentCreated(
  queryClient: QueryClient,
  userId: string,
  role: string,
  envelope: RealtimeEventEnvelope<RealtimeIssueCommentPayload>,
) {
  // Do not skip the actor — their mutation invalidation may not refetch in time.
  // applyIssueComment is idempotent (dedupes by comment/activity id).
  const { issueId, teamId, comment, activity } = envelope.payload;

  patchTeamIssueCaches(queryClient, teamId, userId, role, (issues) =>
    applyIssueComment(issues, issueId, comment, activity),
    { skipDashboard: true },
  );
}
