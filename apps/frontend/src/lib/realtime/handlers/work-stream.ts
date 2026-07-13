import type { QueryClient } from "@tanstack/react-query";

import {
  applyAnnouncementDeleted,
  applyAnnouncementSnapshot,
  applyDeliverableDeleted,
  applyDeliverableSnapshot,
  applySubmissionSnapshot,
  applyWorkStreamCommentEvent,
} from "../work-stream-cache";
import type {
  RealtimeAnnouncementDeletedPayload,
  RealtimeAnnouncementPayload,
  RealtimeDeliverableDeletedPayload,
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

function invalidateCoordinatorSubmissionQueues(queryClient: QueryClient) {
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "finalized-submissions"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "submission-overview"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "submission-evaluations"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["coordinator", "submissions"],
  });
}

export function handleWorkstreamEvent(
  queryClient: QueryClient,
  userId: string,
  role: string,
  workspaceId: string | null,
  envelope: RealtimeEventEnvelope,
) {
  const teamId = teamIdFromEnvelope(envelope);

  switch (envelope.event) {
    case RealtimeEvents.WORKSTREAM_COMMENT_CREATED: {
      if (!teamId || envelope.actorId === userId) {
        break;
      }
      const payload = envelope.payload as RealtimeWorkstreamCommentPayload;
      applyWorkStreamCommentEvent(
        queryClient,
        teamId,
        userId,
        role,
        workspaceId,
        payload.entityType,
        payload.entityId,
        payload.comment,
      );
      break;
    }
    case RealtimeEvents.ANNOUNCEMENT_CREATED:
    case RealtimeEvents.ANNOUNCEMENT_UPDATED: {
      if (!teamId) break;
      const payload = envelope.payload as RealtimeAnnouncementPayload;
      applyAnnouncementSnapshot(
        queryClient,
        teamId,
        userId,
        role,
        workspaceId,
        payload.announcement,
      );
      break;
    }
    case RealtimeEvents.ANNOUNCEMENT_DELETED: {
      if (!teamId) break;
      const payload = envelope.payload as RealtimeAnnouncementDeletedPayload;
      applyAnnouncementDeleted(
        queryClient,
        teamId,
        userId,
        role,
        workspaceId,
        payload.announcementId,
      );
      break;
    }
    case RealtimeEvents.DELIVERABLE_CREATED:
    case RealtimeEvents.DELIVERABLE_UPDATED:
    case RealtimeEvents.DELIVERABLE_DEADLINE_EXTENDED: {
      if (!teamId) break;
      const payload = envelope.payload as RealtimeDeliverablePayload;
      applyDeliverableSnapshot(
        queryClient,
        teamId,
        userId,
        role,
        workspaceId,
        payload.deliverable,
      );
      break;
    }
    case RealtimeEvents.DELIVERABLE_DELETED: {
      if (!teamId) break;
      const payload = envelope.payload as RealtimeDeliverableDeletedPayload;
      applyDeliverableDeleted(
        queryClient,
        teamId,
        userId,
        role,
        workspaceId,
        payload.deliverableId,
      );
      break;
    }
    case RealtimeEvents.SUBMISSION_CREATED:
    case RealtimeEvents.SUBMISSION_REVIEWED: {
      if (!teamId) break;
      const payload = envelope.payload as RealtimeSubmissionPayload;
      applySubmissionSnapshot(
        queryClient,
        teamId,
        userId,
        role,
        workspaceId,
        payload.deliverableId,
        payload.submission,
        {
          created: envelope.event === RealtimeEvents.SUBMISSION_CREATED,
          reviewed: envelope.event === RealtimeEvents.SUBMISSION_REVIEWED,
        },
      );
      break;
    }
    case RealtimeEvents.SUBMISSION_FINALIZED: {
      const payload = envelope.payload as RealtimeSubmissionPayload;
      if (teamId) {
        applySubmissionSnapshot(
          queryClient,
          teamId,
          userId,
          role,
          workspaceId,
          payload.deliverableId,
          payload.submission,
          { reviewed: true },
        );
      }
      invalidateCoordinatorSubmissionQueues(queryClient);
      void queryClient.invalidateQueries({
        queryKey: ["supervisor", "work-stream"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["student", "work-stream"],
      });
      break;
    }
    default:
      break;
  }
}
