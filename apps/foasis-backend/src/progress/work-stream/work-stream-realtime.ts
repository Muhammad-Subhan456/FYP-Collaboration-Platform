import type {
  Announcement,
  Deliverable,
  Submission,
  WorkStreamComment,
} from '@prisma/client';

import type {
  AnnouncementWire,
  DeliverableWire,
  SubmissionWire,
  WorkstreamCommentWire,
} from '../../domain-events/domain-event.types';

function previewText(text: string, max = 160) {
  const plain = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= max) {
    return plain;
  }

  return `${plain.slice(0, max).trim()}…`;
}

export function serializeWorkstreamComment(
  comment: WorkStreamComment,
): WorkstreamCommentWire {
  return {
    id: comment.id,
    authUserId: comment.authUserId,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  };
}

export function serializeAnnouncement(
  announcement: Announcement,
  extras?: {
    createdByName?: string;
    teamName?: string | null;
    attachmentCount?: number;
    commentCount?: number;
  },
): AnnouncementWire {
  return {
    id: announcement.id,
    supervisorId: announcement.supervisorId,
    teamId: announcement.teamId,
    title: announcement.title,
    message: announcement.message,
    type: announcement.type,
    dueDate: announcement.dueDate?.toISOString() ?? null,
    createdAt: announcement.createdAt.toISOString(),
    preview: previewText(announcement.message),
    createdByName: extras?.createdByName,
    teamName: extras?.teamName ?? null,
    attachmentCount: extras?.attachmentCount ?? 0,
    commentCount: extras?.commentCount ?? 0,
  };
}

export function serializeDeliverable(
  deliverable: Deliverable,
  extras?: {
    teamName?: string | null;
    attachmentCount?: number;
    commentCount?: number;
    latestSubmissionStatus?: string | null;
    submissionCount?: number;
    submissionOpen?: boolean;
    submissionClosedReason?: string | null;
  },
): DeliverableWire {
  return {
    id: deliverable.id,
    supervisorId: deliverable.supervisorId,
    teamId: deliverable.teamId,
    title: deliverable.title,
    description: deliverable.description,
    type: deliverable.type,
    dueDate: deliverable.dueDate.toISOString(),
    attachmentUrl: deliverable.attachmentUrl,
    isActive: deliverable.isActive,
    submissionsOpen: deliverable.submissionsOpen,
    createdAt: deliverable.createdAt.toISOString(),
    preview: previewText(deliverable.description),
    teamName: extras?.teamName ?? null,
    attachmentCount: extras?.attachmentCount ?? 0,
    commentCount: extras?.commentCount ?? 0,
    latestSubmissionStatus: extras?.latestSubmissionStatus ?? null,
    submissionCount: extras?.submissionCount ?? 0,
    submissionOpen: extras?.submissionOpen,
    submissionClosedReason: extras?.submissionClosedReason ?? null,
  };
}

export function serializeSubmission(
  submission: Submission,
): SubmissionWire {
  return {
    id: submission.id,
    deliverableId: submission.deliverableId,
    teamId: submission.teamId,
    version: submission.version,
    fileUrl: submission.fileUrl,
    remarks: submission.remarks,
    status: submission.status,
    feedback: submission.feedback,
    grade: submission.grade,
    submittedAt: submission.submittedAt.toISOString(),
    finalizedAt: submission.finalizedAt
      ? submission.finalizedAt.toISOString()
      : null,
  };
}
