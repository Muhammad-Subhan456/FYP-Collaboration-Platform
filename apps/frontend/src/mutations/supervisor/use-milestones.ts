import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/react-query";
import { supervisorService } from "@/services/supervisor.service";
import { useAuth } from "@/providers/auth-provider";
import type { MilestoneStatus, TaskStatus } from "@/types/student";

import { invalidateSupervisorMilestones } from "./invalidate";

type SupervisorMilestonesPageData = {
  milestonesByProposalId: Record<
    string,
    Array<{
      id: string;
      status: MilestoneStatus;
      tasks: Array<{ id: string; status: TaskStatus }>;
    }>
  >;
};

function patchTaskStatus<T extends { id: string; status: TaskStatus }>(
  tasks: T[],
  taskId: string,
  status: TaskStatus,
) {
  return tasks.map((task) =>
    task.id === taskId ? { ...task, status } : task,
  );
}

export function useSupervisorCreateMilestoneMutation(options?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: supervisorService.createMilestone,
    onSuccess: () => {
      toast.success("Milestone created");
      invalidateSupervisorMilestones(queryClient);
      options?.onSuccess?.();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useSupervisorUpdateMilestoneStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      milestoneId,
      status,
    }: {
      milestoneId: string;
      status: MilestoneStatus;
    }) => supervisorService.updateMilestoneStatus(milestoneId, status),
    onSuccess: () => {
      invalidateSupervisorMilestones(queryClient);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useSupervisorCreateTaskMutation(options?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: supervisorService.createTask,
    onSuccess: () => {
      toast.success("Task created");
      invalidateSupervisorMilestones(queryClient);
      options?.onSuccess?.();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useSupervisorUpdateTaskStatusMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = queryKeys.supervisor.milestones(user?.userId);

  return useMutation({
    mutationFn: ({
      taskId,
      status,
    }: {
      taskId: string;
      status: TaskStatus;
    }) => supervisorService.updateTaskStatus(taskId, status),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<SupervisorMilestonesPageData>(queryKey);

      if (previous) {
        queryClient.setQueryData<SupervisorMilestonesPageData>(queryKey, {
          ...previous,
          milestonesByProposalId: Object.fromEntries(
            Object.entries(previous.milestonesByProposalId).map(
              ([proposalId, milestones]) => [
                proposalId,
                milestones.map((milestone) => ({
                  ...milestone,
                  tasks: patchTaskStatus(milestone.tasks, taskId, status),
                })),
              ],
            ),
          ),
        });
      }

      return { previous };
    },
    onSuccess: () => {
      invalidateSupervisorMilestones(queryClient);
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(getErrorMessage(error));
    },
  });
}
