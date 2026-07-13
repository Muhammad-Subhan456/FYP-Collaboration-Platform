import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { patchLocalWorkStreamComment } from "@/lib/realtime/work-stream-cache";
import { uploadService } from "@/services/progress.service";
import { supervisorService } from "@/services/supervisor.service";
import { workStreamService } from "@/services/work-stream.service";
import { useAuth } from "@/providers/auth-provider";
import type { DeliverableType } from "@/types/student";

import { invalidateSupervisorWorkStream } from "./invalidate";

type AttachmentInput = { fileUrl: string; fileName: string };

async function uploadFiles(files: File[]): Promise<AttachmentInput[]> {
  const uploaded: AttachmentInput[] = [];
  for (const file of files) {
    const result = await uploadService.uploadFile(file);
    uploaded.push({ fileUrl: result.fileUrl, fileName: file.name });
  }
  return uploaded;
}

export type SupervisorAnnouncementInput = {
  title: string;
  message: string;
  type: string;
  dueDate?: string;
  teamIds: string[];
  pendingFiles: File[];
};

export type SupervisorAnnouncementUpdateInput = {
  id: string;
  title: string;
  message: string;
  type: string;
  dueDate?: string;
  pendingFiles: File[];
};

export type SupervisorDeliverableInput = {
  title: string;
  description: string;
  type: DeliverableType;
  dueDate: string;
  teamIds: string[];
  pendingFiles: File[];
};

export type SupervisorDeliverableUpdateInput = {
  id: string;
  title: string;
  description: string;
  type: DeliverableType;
  dueDate: string;
  pendingFiles: File[];
};

export function useSupervisorWorkStreamMutations(options?: {
  onFormSuccess?: () => void;
  onAnnouncementDeleted?: () => void;
  onDeliverableDeleted?: () => void;
  onReviewSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidate = () => invalidateSupervisorWorkStream(queryClient);

  const createAnnouncementMutation = useMutation({
    mutationFn: async (input: SupervisorAnnouncementInput) => {
      const attachments = await uploadFiles(input.pendingFiles);
      return supervisorService.createAnnouncement({
        title: input.title,
        message: input.message,
        type: input.type,
        dueDate: input.dueDate,
        teamIds: input.teamIds,
        attachments,
      });
    },
    onSuccess: () => {
      toast.success("Announcement published");
      options?.onFormSuccess?.();
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: async (input: SupervisorAnnouncementUpdateInput) => {
      const attachments =
        input.pendingFiles.length > 0
          ? await uploadFiles(input.pendingFiles)
          : undefined;
      return supervisorService.updateAnnouncement(input.id, {
        title: input.title,
        message: input.message,
        type: input.type,
        dueDate: input.dueDate,
        attachments,
      });
    },
    onSuccess: () => {
      toast.success("Announcement updated");
      options?.onFormSuccess?.();
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const createDeliverableMutation = useMutation({
    mutationFn: async (input: SupervisorDeliverableInput) => {
      const attachments = await uploadFiles(input.pendingFiles);
      return supervisorService.createDeliverable({
        title: input.title,
        description: input.description,
        type: input.type,
        dueDate: input.dueDate,
        teamIds: input.teamIds,
        attachments,
      });
    },
    onSuccess: () => {
      toast.success("Deliverable created");
      options?.onFormSuccess?.();
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateDeliverableMutation = useMutation({
    mutationFn: async (input: SupervisorDeliverableUpdateInput) => {
      const attachments =
        input.pendingFiles.length > 0
          ? await uploadFiles(input.pendingFiles)
          : undefined;
      return supervisorService.updateDeliverable(input.id, {
        title: input.title,
        description: input.description,
        type: input.type,
        dueDate: input.dueDate,
        attachments,
      });
    },
    onSuccess: () => {
      toast.success("Deliverable updated");
      options?.onFormSuccess?.();
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: (id: string) => supervisorService.deleteAnnouncement(id),
    onSuccess: () => {
      toast.success("Announcement deleted");
      options?.onAnnouncementDeleted?.();
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteDeliverableMutation = useMutation({
    mutationFn: (id: string) => supervisorService.deleteDeliverable(id),
    onSuccess: () => {
      toast.success("Deliverable removed");
      options?.onDeliverableDeleted?.();
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const toggleSubmissionsMutation = useMutation({
    mutationFn: ({
      id,
      submissionsOpen,
    }: {
      id: string;
      submissionsOpen: boolean;
    }) => supervisorService.updateDeliverable(id, { submissionsOpen }),
    onSuccess: () => {
      toast.success("Submission settings updated");
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      submissionId,
      status,
      feedback,
    }: {
      submissionId: string;
      status: "APPROVED" | "CHANGES_REQUIRED";
      feedback?: string;
    }) =>
      supervisorService.reviewSubmission(submissionId, {
        status,
        feedback,
      }),
    onSuccess: () => {
      toast.success("Review submitted");
      options?.onReviewSuccess?.();
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const finalizeMutation = useMutation({
    mutationFn: (submissionId: string) =>
      supervisorService.finalizeSubmission(submissionId),
    onSuccess: () => {
      toast.success("Submission finalized and forwarded to coordinator");
      options?.onReviewSuccess?.();
      invalidate();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const commentMutation = useMutation({
    mutationFn: workStreamService.createComment,
    onSuccess: (comment, variables) => {
      if (user?.userId && comment.teamId) {
        patchLocalWorkStreamComment(queryClient, user.userId, user.role, user.workspaceId, {
          entityType: variables.entityType,
          entityId: variables.entityId,
          teamId: comment.teamId,
          comment,
        });
      }
      toast.success("Comment posted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return {
    createAnnouncementMutation,
    updateAnnouncementMutation,
    createDeliverableMutation,
    updateDeliverableMutation,
    deleteAnnouncementMutation,
    deleteDeliverableMutation,
    toggleSubmissionsMutation,
    reviewMutation,
    finalizeMutation,
    commentMutation,
    invalidateWorkStream: invalidate,
  };
}
