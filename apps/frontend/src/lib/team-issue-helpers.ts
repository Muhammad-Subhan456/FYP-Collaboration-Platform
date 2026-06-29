import type { TeamIssue } from "@/types/team-issue";

export function getIssueStartedAt(issue: TeamIssue): string | null {
  if (issue.status !== "IN_PROGRESS") {
    return null;
  }

  const claimed = [...(issue.activities ?? [])]
    .filter((activity) => activity.type === "CLAIMED")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];

  return claimed?.createdAt ?? issue.updatedAt;
}

export function getIssueLastActivityAt(issue: TeamIssue): string {
  const timestamps = [
    issue.updatedAt,
    ...(issue.activities?.map((activity) => activity.createdAt) ?? []),
    ...(issue.comments?.map((comment) => comment.createdAt) ?? []),
  ];

  return timestamps.reduce((latest, current) =>
    new Date(current).getTime() > new Date(latest).getTime()
      ? current
      : latest,
  );
}

export function sortActivitiesNewestFirst<T extends { createdAt: string }>(
  activities: T[],
): T[] {
  return [...activities].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export const ISSUE_STATUS_TABS = [
  ["open", "Open"],
  ["in_progress", "In progress"],
  ["completed", "Completed"],
] as const;

export type IssueStatusTab = (typeof ISSUE_STATUS_TABS)[number][0];

export function filterIssuesByTab(
  issues: TeamIssue[],
  tab: IssueStatusTab,
): TeamIssue[] {
  switch (tab) {
    case "open":
      return issues.filter((issue) => issue.status === "OPEN");
    case "in_progress":
      return issues.filter((issue) => issue.status === "IN_PROGRESS");
    case "completed":
      return issues.filter((issue) => issue.status === "COMPLETED");
    default:
      return issues;
  }
}
