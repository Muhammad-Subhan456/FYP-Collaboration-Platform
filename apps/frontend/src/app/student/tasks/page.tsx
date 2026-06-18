"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { progressService } from "@/services/progress.service";
import { teamService } from "@/services/team.service";
import type { Task, TaskStatus } from "@/types/student";

const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

export default function StudentTasksPage() {
  const queryClient = useQueryClient();

  const teamQuery = useQuery({
    queryKey: ["team", "my-team"],
    queryFn: teamService.getMyTeam,
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks", "my"],
    queryFn: progressService.getMyTasks,
    enabled: !!teamQuery.data,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      taskId,
      status,
    }: {
      taskId: string;
      status: TaskStatus;
    }) => progressService.updateTaskStatus(taskId, status),
    onSuccess: () => {
      toast.success("Task status updated");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (teamQuery.isLoading) return <DashboardSkeleton />;

  if (!teamQuery.data) {
    return (
      <EmptyState
        title="No team yet"
        description="Join a team to receive assigned tasks from your supervisor."
        action={
          <Button asChild>
            <Link href="/student/team">Go to Team</Link>
          </Button>
        }
      />
    );
  }

  if (tasksQuery.isLoading) return <DashboardSkeleton />;

  if (tasksQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(tasksQuery.error)}
        onRetry={() => tasksQuery.refetch()}
      />
    );
  }

  const tasks = tasksQuery.data ?? [];
  const active = tasks.filter((t) => t.status !== "DONE");
  const completed = tasks.filter((t) => t.status === "DONE");

  const renderTask = (task: Task) => (
    <Card key={task.id}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckSquare className="h-4 w-4 text-primary" />
            {task.title}
          </CardTitle>
          <Select
            value={task.status}
            onValueChange={(v) =>
              updateMutation.mutate({
                taskId: task.id,
                status: v as TaskStatus,
              })
            }
            disabled={updateMutation.isPending}
          >
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {task.dueDate && (
          <CardDescription>Due {formatDate(task.dueDate)}</CardDescription>
        )}
      </CardHeader>
      {task.description && (
        <CardContent>
          <p className="text-sm text-muted-foreground">{task.description}</p>
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">My Tasks</h2>
        <p className="text-sm text-muted-foreground">
          Tasks assigned to you by your supervisor
        </p>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks assigned"
          description="When your supervisor assigns milestone tasks to you, they will appear here."
          action={
            <Button asChild variant="outline">
              <Link href="/student/milestones">View milestones</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Active
                </h3>
                <StatusBadge status="IN_PROGRESS" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {active.map(renderTask)}
              </div>
            </section>
          )}
          {completed.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Completed
                </h3>
                <StatusBadge status="DONE" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {completed.map(renderTask)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
