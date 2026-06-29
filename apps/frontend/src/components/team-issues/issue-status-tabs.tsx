"use client";

import { cn } from "@/lib/utils";
import {
  ISSUE_STATUS_TABS,
  type IssueStatusTab,
} from "@/lib/team-issue-helpers";

interface IssueStatusTabsProps {
  value: IssueStatusTab;
  onChange: (tab: IssueStatusTab) => void;
  className?: string;
}

export function IssueStatusTabs({
  value,
  onChange,
  className,
}: IssueStatusTabsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {ISSUE_STATUS_TABS.map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm transition-colors",
            value === key
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-background hover:bg-muted",
          )}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
