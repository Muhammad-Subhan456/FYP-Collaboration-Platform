"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TeamIssuePriority } from "@/types/team-issue";

const priorityStyles: Record<TeamIssuePriority, string> = {
  LOW: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  MEDIUM: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  HIGH: "bg-red-500/15 text-red-700 dark:text-red-400",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TeamIssuePriority;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-0 font-medium capitalize",
        priorityStyles[priority],
        className,
      )}
    >
      {priority.toLowerCase()}
    </Badge>
  );
}
