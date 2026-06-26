"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Flag,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { getDisplayName } from "@/hooks/use-profiles";
import { useSupervisorPageQuery } from "@/hooks/use-supervisor-page";
import { supervisorPageService } from "@/services/supervisor-page.service";
import { supervisorService } from "@/services/supervisor.service";
import type { MilestoneWithTasks } from "@/services/student.service";
import type { MilestoneStatus, Task, TaskStatus } from "@/types/student";
import type { UserProfile } from "@/types/profile";

const MILESTONE_STATUSES: MilestoneStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
];

const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

function MilestoneTasks({
  milestoneId,
  tasks,
  teamMemberIds,
  profiles,
}: {
  milestoneId: string;
  tasks: Task[];
  teamMemberIds: string[];
  profiles: Record<string, UserProfile>;
}) {
  const queryClient = useQueryClient();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");

  const createTaskMutation = useMutation({
    mutationFn: supervisorService.createTask,
    onSuccess: () => {
      toast.success("Task created");
      queryClient.invalidateQueries({ queryKey: ["supervisor", "milestones"] });
      setTaskDialogOpen(false);
      setTaskTitle("");
      setTaskDescription("");
      setAssignedTo("");
      setTaskDueDate("");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      status,
    }: {
      taskId: string;
      status: TaskStatus;
    }) => supervisorService.updateTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supervisor", "milestones"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Tasks</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setTaskDialogOpen(true)}
          disabled={teamMemberIds.length === 0}
        >
          <Plus className="h-3.5 w-3.5" />
          Add task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tasks yet for this milestone.
        </p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  Assigned to{" "}
                  {getDisplayName(profiles, task.assignedTo)}
                  {task.dueDate
                    ? ` · Due ${formatDate(task.dueDate)}`
                    : ""}
                </p>
              </div>
              <Select
                value={task.status}
                onValueChange={(v) =>
                  updateTaskMutation.mutate({
                    taskId: task.id,
                    status: v as TaskStatus,
                  })
                }
                disabled={updateTaskMutation.isPending}
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
            </li>
          ))}
        </ul>
      )}

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add task</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!taskTitle.trim() || !assignedTo) {
                toast.error("Title and assignee are required");
                return;
              }
              createTaskMutation.mutate({
                milestoneId,
                title: taskTitle.trim(),
                description: taskDescription.trim() || undefined,
                assignedTo,
                dueDate: taskDueDate
                  ? new Date(taskDueDate).toISOString()
                  : undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="taskTitle">Title</Label>
              <Input
                id="taskTitle"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskDescription">Description (optional)</Label>
              <Textarea
                id="taskDescription"
                rows={2}
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMemberIds.map((id) => (
                    <SelectItem key={id} value={id}>
                      {getDisplayName(profiles, id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskDueDate">Due date (optional)</Label>
              <Input
                id="taskDueDate"
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTaskDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTaskMutation.isPending}>
                {createTaskMutation.isPending && (
                  <Loader2 className="animate-spin" />
                )}
                Create task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SupervisorMilestonesPage() {
  const queryClient = useQueryClient();
  const [selectedProposalId, setSelectedProposalId] = useState("");
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(
    null,
  );
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDescription, setMilestoneDescription] = useState("");
  const [milestoneDueDate, setMilestoneDueDate] = useState("");

  const pageQuery = useSupervisorPageQuery(
    "milestones",
    supervisorPageService.getMilestones,
  );

  const proposals = pageQuery.data?.proposals ?? [];
  const membersByTeamId = pageQuery.data?.membersByTeamId ?? {};
  const milestonesByProposalId = pageQuery.data?.milestonesByProposalId ?? {};
  const profiles = pageQuery.data?.profiles ?? {};

  const selectedProposal =
    proposals.find((p) => p.id === selectedProposalId) ?? proposals[0];

  const effectiveProposalId = selectedProposal?.id ?? "";
  const milestones =
    (milestonesByProposalId[effectiveProposalId] as MilestoneWithTasks[] | undefined) ??
    [];

  const teamMemberIds =
    (selectedProposal?.teamId
      ? membersByTeamId[selectedProposal.teamId]?.map((m) => m.authUserId)
      : undefined) ?? [];

  const createMilestoneMutation = useMutation({
    mutationFn: supervisorService.createMilestone,
    onSuccess: () => {
      toast.success("Milestone created");
      queryClient.invalidateQueries({ queryKey: ["supervisor", "milestones"] });
      queryClient.invalidateQueries({ queryKey: ["supervisor", "notifications"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      setMilestoneDialogOpen(false);
      setMilestoneTitle("");
      setMilestoneDescription("");
      setMilestoneDueDate("");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: ({
      milestoneId,
      status,
    }: {
      milestoneId: string;
      status: MilestoneStatus;
    }) => supervisorService.updateMilestoneStatus(milestoneId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supervisor", "milestones"] });
      queryClient.invalidateQueries({ queryKey: ["supervisor", "notifications"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (pageQuery.isLoading) return <DashboardSkeleton />;

  if (pageQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(pageQuery.error)}
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  if (proposals.length === 0) {
    return (
      <EmptyState
        title="No supervised teams"
        description="Milestones can be created once you supervise at least one team proposal."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Milestones & Tasks</h2>
          <p className="text-sm text-muted-foreground">
            Track project milestones and assign tasks to team members
          </p>
          <div className="w-full max-w-md space-y-1">
            <Label>Team / proposal</Label>
            <Select
              value={effectiveProposalId}
              onValueChange={setSelectedProposalId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select supervised team" />
              </SelectTrigger>
              <SelectContent>
                {proposals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          onClick={() => setMilestoneDialogOpen(true)}
          disabled={!effectiveProposalId}
        >
          <Plus className="h-4 w-4" />
          New milestone
        </Button>
      </div>

      {milestones.length === 0 ? (
        <EmptyState
          title="No milestones yet"
          description="Create milestones to break down the project for this team."
          action={
            <Button onClick={() => setMilestoneDialogOpen(true)}>
              <Flag className="h-4 w-4" />
              Create milestone
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {milestones.map((milestone) => {
            const expanded = expandedMilestoneId === milestone.id;
            return (
              <Card key={milestone.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {milestone.title}
                      </CardTitle>
                      <CardDescription>
                        Due {formatDate(milestone.dueDate)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={milestone.status}
                        onValueChange={(v) =>
                          updateMilestoneMutation.mutate({
                            milestoneId: milestone.id,
                            status: v as MilestoneStatus,
                          })
                        }
                        disabled={updateMilestoneMutation.isPending}
                      >
                        <SelectTrigger className="h-8 w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MILESTONE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExpandedMilestoneId(
                            expanded ? null : milestone.id,
                          )
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
                  <StatusBadge status={milestone.status} />
                  {expanded && (
                    <MilestoneTasks
                      milestoneId={milestone.id}
                      tasks={milestone.tasks}
                      teamMemberIds={teamMemberIds}
                      profiles={profiles}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create milestone</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!milestoneTitle.trim() || !milestoneDueDate) {
                toast.error("Title and due date are required");
                return;
              }
              createMilestoneMutation.mutate({
                proposalId: effectiveProposalId,
                title: milestoneTitle.trim(),
                description: milestoneDescription.trim() || undefined,
                dueDate: new Date(milestoneDueDate).toISOString(),
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="milestoneTitle">Title</Label>
              <Input
                id="milestoneTitle"
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                placeholder="SRS completion"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestoneDescription">
                Description (optional)
              </Label>
              <Textarea
                id="milestoneDescription"
                rows={3}
                value={milestoneDescription}
                onChange={(e) => setMilestoneDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestoneDueDate">Due date</Label>
              <Input
                id="milestoneDueDate"
                type="date"
                value={milestoneDueDate}
                onChange={(e) => setMilestoneDueDate(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMilestoneDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMilestoneMutation.isPending}
              >
                {createMilestoneMutation.isPending && (
                  <Loader2 className="animate-spin" />
                )}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
