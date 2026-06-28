import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { coordinatorService } from "@/services/coordinator.service";
import { pluralize } from "@/lib/format";

import { invalidateCoordinatorEvaluations } from "./invalidate";

export function useCoordinatorEvaluationMutations(options?: {
  onCreateEvaluationSuccess?: () => void;
  onCreatePanelSuccess?: () => void;
  onAddEvaluatorSuccess?: () => void;
  onAssignTeamsSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  const invalidate = () => invalidateCoordinatorEvaluations(queryClient);

  const createEvalMutation = useMutation({
    mutationFn: coordinatorService.createEvaluation,
    onSuccess: () => {
      toast.success("Evaluation created");
      invalidate();
      options?.onCreateEvaluationSuccess?.();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const createPanelMutation = useMutation({
    mutationFn: coordinatorService.createEvaluationPanel,
    onSuccess: () => {
      toast.success("Panel created");
      invalidate();
      options?.onCreatePanelSuccess?.();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const addEvaluatorMutation = useMutation({
    mutationFn: ({
      panelId,
      evaluatorId,
      role,
    }: {
      panelId: string;
      evaluatorId: string;
      role?: string;
    }) => coordinatorService.addPanelEvaluator(panelId, { evaluatorId, role }),
    onSuccess: () => {
      toast.success("Evaluator added");
      invalidate();
      options?.onAddEvaluatorSuccess?.();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const assignTeamsMutation = useMutation({
    mutationFn: ({
      evaluationId,
      teamIds,
      panelId,
    }: {
      evaluationId: string;
      teamIds: string[];
      panelId?: string;
    }) =>
      coordinatorService.assignTeamsToEvaluation(evaluationId, {
        teamIds,
        panelId,
      }),
    onSuccess: (_, vars) => {
      toast.success(
        `${pluralize(vars.teamIds.length, "team")} assigned to evaluation`,
      );
      invalidate();
      options?.onAssignTeamsSuccess?.();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return {
    createEvalMutation,
    createPanelMutation,
    addEvaluatorMutation,
    assignTeamsMutation,
  };
}
