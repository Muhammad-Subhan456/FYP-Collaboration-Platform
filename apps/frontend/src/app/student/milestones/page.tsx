"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, ChevronUp, Flag } from "lucide-react";
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
import { useAuth } from "@/providers/auth-provider";
import { progressService } from "@/services/progress.service";
import { proposalService } from "@/services/proposal.service";
import { teamService } from "@/services/team.service";
import type { Task, TaskStatus } from "@/types/student";

const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

function MilestoneTasks({ milestoneId }: { milestoneId: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const tasksQuery = useQuery({
    queryKey: ["tasks", "milestone", milestoneId],
    queryFn: () => progressService.getMilestoneTasks(milestoneId),
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
      queryClient.invalidateQueries({
        queryKey: ["tasks", "milestone", milestoneId],
      });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (tasksQuery.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading tasks...</p>
    );
  }

  const tasks = tasksQuery.data ?? [];

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tasks assigned for this milestone.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task: Task) => {
        const isMine = task.assignedTo === user?.userId;
        return (
          <li
            key={task.id}
            className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-medium">{task.title}</p>
              {task.description && (
                <p className="text-xs text-muted-foreground">
                  {task.description}
                </p>
              )}
              {task.dueDate && (
                <p className="text-xs text-muted-foreground">
                  Due {formatDate(task.dueDate)}
                </p>
              )}
            </div>
            {isMine ? (
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
            ) : (
              <StatusBadge status={task.status} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function StudentMilestonesPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const teamQuery = useQuery({
    queryKey: ["team", "my-team"],
    queryFn: teamService.getMyTeam,
  });

  const proposalQuery = useQuery({
    queryKey: ["proposal", "my"],
    queryFn: proposalService.getMyProposal,
    enabled: !!teamQuery.data,
  });

  const milestonesQuery = useQuery({
    queryKey: ["milestones", proposalQuery.data?.id],
    queryFn: () => progressService.getMilestones(proposalQuery.data!.id),
    enabled: !!proposalQuery.data?.id,
  });

  if (teamQuery.isLoading || proposalQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (!teamQuery.data) {
    return (
      <EmptyState
        title="No team yet"
        description="Join a team to view project milestones."
        action={
          <Button asChild>
            <Link href="/student/team">Go to Team</Link>
          </Button>
        }
      />
    );
  }

  if (!proposalQuery.data) {
    return (
      <EmptyState
        title="No proposal yet"
        description="Create a team proposal to view milestones from your supervisor."
        action={
          <Button asChild>
            <Link href="/student/proposal">Go to Proposal</Link>
          </Button>
        }
      />
    );
  }

  if (!proposalQuery.data.assignedSupervisorId) {
    return (
      <EmptyState
        title="No supervisor assigned"
        description="Milestones appear once a supervisor is assigned to your team."
      />
    );
  }

  if (milestonesQuery.isLoading) return <DashboardSkeleton />;

  if (milestonesQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(milestonesQuery.error)}
        onRetry={() => milestonesQuery.refetch()}
      />
    );
  }

  const milestones = milestonesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Project Milestones</h2>
        <p className="text-sm text-muted-foreground">
          Milestones and tasks for {proposalQuery.data.title}
        </p>
      </div>

      {milestones.length === 0 ? (
        <EmptyState
          title="No milestones yet"
          description="Your supervisor has not created milestones for your project."
        />
      ) : (
        <div className="space-y-4">
          {milestones.map((milestone) => {
            const expanded = expandedId === milestone.id;
            return (
              <Card key={milestone.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Flag className="h-4 w-4 text-primary" />
                        {milestone.title}
                      </CardTitle>
                      <CardDescription>
                        Due {formatDate(milestone.dueDate)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={milestone.status} />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExpandedId(expanded ? null : milestone.id)
                        }
                      >
                        {expanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        Tasks
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {milestone.description && (
                    <p className="text-sm text-muted-foreground">
                      {milestone.description}
                    </p>
                  )}
                  {expanded && (
                    <MilestoneTasks milestoneId={milestone.id} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
