import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { teamIssueService } from "@/services/team-issue.service";

import { invalidateSupervisorMilestones } from "./invalidate";

export function useSupervisorTeamIssueCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      issueId,
      body,
    }: {
      issueId: string;
      body: string;
    }) => teamIssueService.comment(issueId, body),
    onSuccess: () => {
      invalidateSupervisorMilestones(queryClient);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
