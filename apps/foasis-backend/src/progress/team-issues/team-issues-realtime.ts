import type {
  TeamIssue,
  TeamIssueActivity,
  TeamIssueComment,
} from '@prisma/client';

import type {
  IssueActivityWire,
  IssueCommentWire,
  IssueSnapshotWire,
} from '../../domain-events/domain-event.types';

type IssueWithRelations = TeamIssue & {
  comments?: TeamIssueComment[];
  activities?: TeamIssueActivity[];
};

export function serializeComment(
  comment: TeamIssueComment,
): IssueCommentWire {
  return {
    id: comment.id,
    issueId: comment.issueId,
    teamId: comment.teamId,
    authUserId: comment.authUserId,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  };
}

export function serializeActivity(
  activity: TeamIssueActivity,
): IssueActivityWire {
  return {
    id: activity.id,
    issueId: activity.issueId,
    teamId: activity.teamId,
    actorId: activity.actorId,
    type: activity.type,
    description: activity.description,
    createdAt: activity.createdAt.toISOString(),
  };
}

export function serializeIssueSnapshot(
  issue: IssueWithRelations,
): IssueSnapshotWire {
  return {
    id: issue.id,
    teamId: issue.teamId,
    title: issue.title,
    description: issue.description,
    priority: issue.priority,
    labels: issue.labels,
    status: issue.status,
    assignedToId: issue.assignedToId,
    githubPrUrl: issue.githubPrUrl,
    githubCommitUrl: issue.githubCommitUrl,
    createdById: issue.createdById,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    completedAt: issue.completedAt?.toISOString() ?? null,
    comments: issue.comments?.map(serializeComment) ?? [],
    activities: issue.activities?.map(serializeActivity) ?? [],
  };
}
