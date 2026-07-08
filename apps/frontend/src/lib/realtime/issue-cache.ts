import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query";
import type {
  StudentMilestonesPageData,
  SupervisorMilestonesPageData,
  TeamIssue,
  TeamIssueActivity,
  TeamIssueComment,
  TeamIssuePriority,
  TeamIssueStatus,
  TeamIssueSummaries,
} from "@/types/team-issue";

import {
  syncStudentIssueStats,
  syncSupervisorIssueStats,
} from "./dashboard-cache";
import type { RealtimeIssueSnapshot } from "./types";

const isDev = process.env.NODE_ENV === "development";

function log(...args: unknown[]) {
  if (isDev) {
    console.info("[realtime:issues]", ...args);
  }
}

function buildSummaries(
  issues: TeamIssue[],
  userId: string,
): TeamIssueSummaries {
  const open = issues.filter((issue) => issue.status === "OPEN").length;
  const inProgress = issues.filter(
    (issue) => issue.status === "IN_PROGRESS",
  ).length;
  const recentlyCompleted = issues.filter((issue) => {
    if (issue.status !== "COMPLETED" || !issue.completedAt) {
      return false;
    }
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return new Date(issue.completedAt).getTime() >= weekAgo;
  }).length;
  const assignedToMe = issues.filter(
    (issue) =>
      issue.assignedToId === userId && issue.status === "IN_PROGRESS",
  ).length;

  return { open, inProgress, recentlyCompleted, assignedToMe };
}

function wireToTeamIssue(snapshot: RealtimeIssueSnapshot): TeamIssue {
  return {
    ...snapshot,
    priority: snapshot.priority as TeamIssuePriority,
    status: snapshot.status as TeamIssueStatus,
    labels: snapshot.labels ?? [],
    comments: snapshot.comments ?? [],
    activities: snapshot.activities ?? [],
  };
}

function upsertIssue(issues: TeamIssue[], incoming: TeamIssue): TeamIssue[] {
  const index = issues.findIndex((issue) => issue.id === incoming.id);

  if (index === -1) {
    return [incoming, ...issues];
  }

  const next = [...issues];
  next[index] = incoming;
  return next;
}

function patchStudentMilestones(
  queryClient: QueryClient,
  teamId: string,
  userId: string,
  role: string,
  updateIssues: (issues: TeamIssue[]) => TeamIssue[],
  options?: { skipDashboard?: boolean },
) {
  const queryKey = queryKeys.student.milestones(userId);
  const existing = queryClient.getQueryData<StudentMilestonesPageData>(queryKey);

  if (!existing) {
    log("no student milestones cache — invalidating", queryKey);
    void queryClient.invalidateQueries({ queryKey });
    return;
  }

  if (!existing.team?.id || existing.team.id !== teamId) {
    log("student team mismatch — skip", {
      cachedTeamId: existing.team?.id,
      eventTeamId: teamId,
    });
    return;
  }

  let summaries: TeamIssueSummaries | null = null;

  queryClient.setQueryData<StudentMilestonesPageData>(queryKey, (current) => {
    if (!current?.team?.id || current.team.id !== teamId) {
      return current;
    }

    const issues = updateIssues(current.issues);
    summaries = buildSummaries(issues, userId);
    return {
      ...current,
      issues,
      summaries,
    };
  });

  if (role === "STUDENT" && !options?.skipDashboard && summaries) {
    syncStudentIssueStats(queryClient, userId, summaries);
  }
}

function patchSupervisorMilestones(
  queryClient: QueryClient,
  teamId: string,
  userId: string,
  role: string,
  updateIssues: (issues: TeamIssue[]) => TeamIssue[],
  options?: { skipDashboard?: boolean },
) {
  let patched = false;
  let summaries: TeamIssueSummaries | null = null;

  queryClient.setQueriesData<SupervisorMilestonesPageData>(
    {
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === "supervisor" &&
        query.queryKey[1] === "milestones" &&
        query.queryKey[2] === userId,
    },
    (current) => {
      if (!current || current.selectedTeamId !== teamId) {
        return current;
      }

      patched = true;
      const issues = updateIssues(current.issues);
      summaries = buildSummaries(issues, userId);
      return {
        ...current,
        issues,
        summaries,
      };
    },
  );

  if (!patched) {
    log("no matching supervisor milestones cache for team", teamId);
  }

  if (role === "SUPERVISOR" && !options?.skipDashboard && summaries) {
    syncSupervisorIssueStats(queryClient, userId, summaries);
  }
}

export function patchTeamIssueCaches(
  queryClient: QueryClient,
  teamId: string,
  userId: string,
  role: string,
  updateIssues: (issues: TeamIssue[]) => TeamIssue[],
  options?: { skipDashboard?: boolean },
) {
  patchStudentMilestones(
    queryClient,
    teamId,
    userId,
    role,
    updateIssues,
    options,
  );
  patchSupervisorMilestones(
    queryClient,
    teamId,
    userId,
    role,
    updateIssues,
    options,
  );
}

export function applyIssueSnapshot(
  issues: TeamIssue[],
  snapshot: RealtimeIssueSnapshot,
): TeamIssue[] {
  return upsertIssue(issues, wireToTeamIssue(snapshot));
}

export function applyIssueComment(
  issues: TeamIssue[],
  issueId: string,
  comment: TeamIssueComment,
  activity?: TeamIssueActivity,
): TeamIssue[] {
  const index = issues.findIndex((issue) => issue.id === issueId);
  if (index === -1) {
    return issues;
  }

  const issue = issues[index];
  const comments = [...(issue.comments ?? [])];
  if (!comments.some((item) => item.id === comment.id)) {
    comments.push(comment);
  }

  let activities = issue.activities ?? [];
  if (activity && !activities.some((item) => item.id === activity.id)) {
    activities = [activity, ...activities];
  }

  const next = [...issues];
  next[index] = {
    ...issue,
    comments,
    activities,
    updatedAt: comment.createdAt,
  };
  return next;
}

/** Immediate cache update after the current user posts a comment (before WS round-trip). */
export function patchLocalIssueComment(
  queryClient: QueryClient,
  userId: string,
  role: string,
  comment: TeamIssueComment,
) {
  patchTeamIssueCaches(
    queryClient,
    comment.teamId,
    userId,
    role,
    (issues) => applyIssueComment(issues, comment.issueId, comment),
    { skipDashboard: true },
  );
}
