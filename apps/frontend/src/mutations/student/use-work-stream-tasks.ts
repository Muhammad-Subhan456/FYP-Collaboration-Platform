import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/react-query";
import { progressService, uploadService } from "@/services/progress.service";
import { workStreamService } from "@/services/work-stream.service";
import { useAuth } from "@/providers/auth-provider";
import type { TaskStatus } from "@/types/student";
import type { WorkStreamEntityType } from "@/types/work-stream";

import {
  invalidateStudentMilestones,
  invalidateStudentTasks,
  invalidateStudentWorkStream,
} from "./invalidate";

type StudentTasksPageData = {
  tasks: Array<{ id: string; status: TaskStatus }>;
};

type StudentMilestonesPageData = {
  milestones: Array<{
    tasks: Array<{ id: string; status: TaskStatus }>;
  }>;
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

export function useStudentWorkStreamMutations() {
  const queryClient = useQueryClient();

  const commentMutation = useMutation({
    mutationFn: workStreamService.createComment,
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const submitMutation = useMutation({
    mutationFn: async ({
      deliverableId,
      file,
      remarks,
    }: {
      deliverableId: string;
      file: File;
      remarks?: string;
    }) => {
      const uploaded = await uploadService.uploadFile(file);
      return progressService.createSubmission({
        deliverableId,
        fileUrl: uploaded.fileUrl,
        remarks,
      });
    },
    onSuccess: () => {
      toast.success("Deliverable submitted");
      invalidateStudentWorkStream(queryClient);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return { commentMutation, submitMutation };
}

export function useStudentTaskStatusMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = queryKeys.student.tasks(user?.userId);

  return useMutation({
    mutationFn: ({
      taskId,
      status,
    }: {
      taskId: string;
      status: TaskStatus;
    }) => progressService.updateTaskStatus(taskId, status),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<StudentTasksPageData>(queryKey);
      if (previous) {
        queryClient.setQueryData<StudentTasksPageData>(queryKey, {
          ...previous,
          tasks: patchTaskStatus(previous.tasks, taskId, status),
        });
      }
      return { previous };
    },
    onSuccess: () => {
      toast.success("Task status updated");
      invalidateStudentTasks(queryClient);
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error(getErrorMessage(error));
    },
  });
}

export function useStudentMilestoneTaskStatusMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const milestonesKey = queryKeys.student.milestones(user?.userId);
  const tasksKey = queryKeys.student.tasks(user?.userId);

  return useMutation({
    mutationFn: ({
      taskId,
      status,
    }: {
      taskId: string;
      status: TaskStatus;
    }) => progressService.updateTaskStatus(taskId, status),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: milestonesKey });
      await queryClient.cancelQueries({ queryKey: tasksKey });

      const previousMilestones =
        queryClient.getQueryData<StudentMilestonesPageData>(milestonesKey);
      const previousTasks =
        queryClient.getQueryData<StudentTasksPageData>(tasksKey);

      if (previousMilestones) {
        queryClient.setQueryData<StudentMilestonesPageData>(milestonesKey, {
          ...previousMilestones,
          milestones: previousMilestones.milestones.map((milestone) => ({
            ...milestone,
            tasks: patchTaskStatus(milestone.tasks, taskId, status),
          })),
        });
      }

      if (previousTasks) {
        queryClient.setQueryData<StudentTasksPageData>(tasksKey, {
          ...previousTasks,
          tasks: patchTaskStatus(previousTasks.tasks, taskId, status),
        });
      }

      return { previousMilestones, previousTasks };
    },
    onSuccess: () => {
      toast.success("Task status updated");
      invalidateStudentMilestones(queryClient);
      void queryClient.invalidateQueries({ queryKey: queryKeys.student.tasks() });
    },
    onError: (error, _variables, context) => {
      if (context?.previousMilestones) {
        queryClient.setQueryData(milestonesKey, context.previousMilestones);
      }
      if (context?.previousTasks) {
        queryClient.setQueryData(tasksKey, context.previousTasks);
      }
      toast.error(getErrorMessage(error));
    },
  });
}

export type WorkStreamCommentInput = {
  entityType: WorkStreamEntityType;
  entityId: string;
  body: string;
};
