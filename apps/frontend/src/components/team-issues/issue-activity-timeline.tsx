"use client";

import { formatDateTime } from "@/lib/format";
import { sortActivitiesNewestFirst } from "@/lib/team-issue-helpers";
import type { TeamIssueActivity } from "@/types/team-issue";

export function IssueActivityTimeline({
  activities,
}: {
  activities: TeamIssueActivity[];
}) {
  const sorted = sortActivitiesNewestFirst(
    activities.filter((activity) => activity.type !== "COMMENTED"),
  );

  if (!sorted.length) {
    return (
      <p className="text-sm text-muted-foreground">No activity yet.</p>
    );
  }

  return (
    <ol className="space-y-2 border-l-2 border-muted pl-4">
      {sorted.map((activity) => (
        <li key={activity.id} className="relative text-sm">
          <span className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-primary" />
          <p>{activity.description ?? activity.type.replace(/_/g, " ")}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(activity.createdAt)}
          </p>
        </li>
      ))}
    </ol>
  );
}
