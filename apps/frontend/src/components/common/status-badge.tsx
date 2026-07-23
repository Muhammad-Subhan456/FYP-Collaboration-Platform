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
  ASSIGNED: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  UNASSIGNED: "bg-slate-500/15 text-slate-600",
  IN_PROGRESS: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  OPEN: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  COMPLETE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  COMPLETED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  TODO: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  DONE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  GENERAL: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  DEADLINE: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  MEETING: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  WORKSHOP: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  VIVA: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  SRS: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  DESIGN: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  MID_VIVA: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  FINAL_REPORT: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  PRESENTATION: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400",
  OTHER: "bg-slate-500/15 text-slate-600",
  UPCOMING: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  DUE_SOON: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  OVERDUE: "bg-red-500/15 text-red-700 dark:text-red-400",
  CLOSED: "bg-slate-500/15 text-slate-600",
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
