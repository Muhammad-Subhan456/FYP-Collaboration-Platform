import type { QueryClient } from "@tanstack/react-query";

import {
  applyAnnouncementDeleted,
  applyAnnouncementSnapshot,
  applyDeliverableSnapshot,
  applySubmissionSnapshot,
  applyWorkStreamCommentEvent,
} from "../work-stream-cache";
import type {
  RealtimeAnnouncementDeletedPayload,
  RealtimeAnnouncementPayload,
  RealtimeDeliverablePayload,
  RealtimeEventEnvelope,
  RealtimeSubmissionPayload,
  RealtimeWorkstreamCommentPayload,
} from "../types";
import { RealtimeEvents } from "../types";

function teamIdFromEnvelope(envelope: RealtimeEventEnvelope) {
  if (envelope.scope.type === "team") {
    return envelope.scope.id;
  }
  const payload = envelope.payload as { teamId?: string };
  return payload.teamId ?? null;
}

export function handleWorkstreamEvent(
  queryClient: QueryClient,
  userId: string,
  role: string,
  envelope: RealtimeEventEnvelope,
) {
  const teamId = teamIdFromEnvelope(envelope);
  if (!teamId) {
    return;
  }

  switch (envelope.event) {
    case RealtimeEvents.WORKSTREAM_COMMENT_CREATED: {
      if (envelope.actorId === userId) {
        break;
      }
      const payload = envelope.payload as RealtimeWorkstreamCommentPayload;
      applyWorkStreamCommentEvent(
        queryClient,
        teamId,
        userId,
        role,
        payload.entityType,
        payload.entityId,
        payload.comment,
      );
      break;
    }
    case RealtimeEvents.ANNOUNCEMENT_CREATED:
    case RealtimeEvents.ANNOUNCEMENT_UPDATED: {
      const payload = envelope.payload as RealtimeAnnouncementPayload;
      applyAnnouncementSnapshot(
        queryClient,
        teamId,
        userId,
        role,
        payload.announcement,
      );
      break;
    }
    case RealtimeEvents.ANNOUNCEMENT_DELETED: {
      const payload = envelope.payload as RealtimeAnnouncementDeletedPayload;
      applyAnnouncementDeleted(
        queryClient,
        teamId,
        userId,
        role,
        payload.announcementId,
      );
      break;
    }
    case RealtimeEvents.DELIVERABLE_CREATED:
    case RealtimeEvents.DELIVERABLE_UPDATED:
    case RealtimeEvents.DELIVERABLE_DEADLINE_EXTENDED: {
      const payload = envelope.payload as RealtimeDeliverablePayload;
      applyDeliverableSnapshot(
        queryClient,
        teamId,
        userId,
        role,
        payload.deliverable,
      );
      break;
    }
    case RealtimeEvents.SUBMISSION_CREATED:
    case RealtimeEvents.SUBMISSION_REVIEWED: {
      const payload = envelope.payload as RealtimeSubmissionPayload;
      applySubmissionSnapshot(
        queryClient,
        teamId,
        userId,
        role,
        payload.deliverableId,
        payload.submission,
        {
          created: envelope.event === RealtimeEvents.SUBMISSION_CREATED,
          reviewed: envelope.event === RealtimeEvents.SUBMISSION_REVIEWED,
        },
      );
      break;
    }
    default:
      break;
  }
}
