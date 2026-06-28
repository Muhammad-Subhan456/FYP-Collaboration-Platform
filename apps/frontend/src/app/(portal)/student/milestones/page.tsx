"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp, Flag } from "lucide-react";
import {
  useStudentMilestonesQuery,
  isStudentQueryPending,
} from "@/queries/student";
import { useStudentMilestoneTaskStatusMutation } from "@/mutations/student";

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
import type { Task, TaskStatus } from "@/types/student";

const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

function MilestoneTasks({ tasks }: { tasks: Task[] }) {
  const { user } = useAuth();
  const updateMutation = useStudentMilestoneTaskStatusMutation();

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tasks assigned for this milestone.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => {
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

  const pageQuery = useStudentMilestonesQuery();

  if (isStudentQueryPending(pageQuery)) return <DashboardSkeleton />;

  if (pageQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(pageQuery.error)}
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  const data = pageQuery.data;
  if (!data?.team) {
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

  if (!data.proposal) {
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

  if (!data.proposal.assignedSupervisorId) {
    return (
      <EmptyState
        title="No supervisor assigned"
        description="Milestones appear once a supervisor is assigned to your team."
      />
    );
  }

  const milestones = data.milestones;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Project Milestones</h2>
        <p className="text-sm text-muted-foreground">
          Milestones and tasks for {data.proposal.title}
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
                    <MilestoneTasks tasks={milestone.tasks ?? []} />
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
