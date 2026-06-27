import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  PENDING_SUPERVISOR: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  SUPERVISOR_ASSIGNED: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  APPROVED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  REJECTED: "bg-red-500/15 text-red-700 dark:text-red-400",
  SUBMITTED: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  CHANGES_REQUIRED: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  ACCEPTED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  IGNORED: "bg-slate-500/15 text-slate-600",
  CANCELLED: "bg-slate-500/15 text-slate-600",
  ACTIVE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  INACTIVE: "bg-slate-500/15 text-slate-600",
  IN_PROGRESS: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  COMPLETED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  TODO: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  DONE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = status.replace(/_/g, " ");
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-0 font-medium capitalize",
        statusStyles[status] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {label}
    </Badge>
  );
}
