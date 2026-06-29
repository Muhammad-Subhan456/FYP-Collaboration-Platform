import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { progressService, uploadService } from "@/services/progress.service";
import { workStreamService } from "@/services/work-stream.service";
import type { WorkStreamEntityType } from "@/types/work-stream";

import { invalidateStudentWorkStream } from "./invalidate";

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

export type WorkStreamCommentInput = {
  entityType: WorkStreamEntityType;
  entityId: string;
  body: string;
};
