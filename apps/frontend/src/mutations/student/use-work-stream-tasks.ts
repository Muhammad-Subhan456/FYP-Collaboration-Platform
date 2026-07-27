import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { patchLocalWorkStreamComment } from "@/lib/realtime/work-stream-cache";
import { progressService, uploadService } from "@/services/progress.service";
import { workStreamService } from "@/services/work-stream.service";
import { useAuth } from "@/providers/auth-provider";
import type { WorkStreamEntityType } from "@/types/work-stream";

import { invalidateStudentWorkStream } from "./invalidate";

export function useStudentWorkStreamMutations() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  const commentMutation = useMutation({
    mutationFn: workStreamService.createComment,
    onSuccess: (comment, variables) => {
      if (user?.userId && comment.teamId) {
        patchLocalWorkStreamComment(queryClient, user.userId, user.role, user.workspaceId, {
          entityType: variables.entityType,
          entityId: variables.entityId,
          teamId: comment.teamId,
          comment: {
            ...comment,
            authorName:
              comment.authorName ?? profile?.fullName ?? undefined,
          },
        });
      }
      toast.success("Comment posted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const submitMutation = useMutation({
    mutationFn: async ({
      deliverableId,
      files,
      remarks,
    }: {
      deliverableId: string;
      files: File[];
      remarks?: string;
    }) => {
      const attachments: Array<{ fileUrl: string; fileName: string }> = [];
      for (const file of files) {
        const uploaded = await uploadService.uploadFile(file);
        attachments.push({
          fileUrl: uploaded.fileUrl,
          fileName: file.name,
        });
      }
      return progressService.createSubmission({
        deliverableId,
        fileUrl: attachments[0]!.fileUrl,
        attachments,
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

export type WorkStreamCommentInput = {
  entityType: WorkStreamEntityType;
  entityId: string;
  body: string;
};
