"use client";

import { User } from "lucide-react";

import { PriorityBadge } from "@/components/team-issues/priority-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { getDisplayName } from "@/hooks/use-profiles";
import { formatDateTime } from "@/lib/format";
import {
  getIssueLastActivityAt,
  getIssueStartedAt,
} from "@/lib/team-issue-helpers";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/profile";
import type { TeamIssue } from "@/types/team-issue";

interface IssueListCardProps {
  issue: TeamIssue;
  profiles: Record<string, UserProfile>;
  selected?: boolean;
  showInProgressDetails?: boolean;
  onSelect: () => void;
}

export function IssueListCard({
  issue,
  profiles,
  selected = false,
  showInProgressDetails = false,
  onSelect,
}: IssueListCardProps) {
  const startedAt = getIssueStartedAt(issue);
  const lastActivityAt = getIssueLastActivityAt(issue);
  const assigneeName = issue.assignedToId
    ? getDisplayName(profiles, issue.assignedToId)
    : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/40",
        selected && "border-primary bg-muted/30",
      )}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <StatusBadge status={issue.status} />
        <PriorityBadge priority={issue.priority} />
      </div>

      <p className="font-medium">{issue.title}</p>

      {showInProgressDetails && issue.status === "IN_PROGRESS" ? (
        <div className="mt-2 space-y-1.5">
          {assigneeName && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <User className="h-3.5 w-3.5 shrink-0" />
              {assigneeName}
            </p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {startedAt && (
              <span>Started {formatDateTime(startedAt)}</span>
            )}
            <span>Last activity {formatDateTime(lastActivityAt)}</span>
          </div>
        </div>
      ) : (
        assigneeName && (
          <p className="mt-1 text-xs text-muted-foreground">{assigneeName}</p>
        )
      )}
    </button>
  );
}
