import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { supervisorService } from "@/services/supervisor.service";

import { invalidateSupervisorEvaluations } from "./invalidate";

export function useSupervisorEvaluationResultMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      existingResultId?: string;
      evaluationId: string;
      teamId: string;
      marks: number;
      comments?: string;
    }) =>
      data.existingResultId
        ? supervisorService.updateEvaluationResult(data.existingResultId, {
            marks: data.marks,
            comments: data.comments,
          })
        : supervisorService.submitEvaluationResult(data.evaluationId, {
            teamId: data.teamId,
            marks: data.marks,
            comments: data.comments,
          }),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.existingResultId ? "Marks updated" : "Marks submitted",
      );
      invalidateSupervisorEvaluations(queryClient);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
