import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { patchLocalIssueComment } from "@/lib/realtime/issue-cache";
import { teamIssueService } from "@/services/team-issue.service";
import { useAuth } from "@/providers/auth-provider";

export function useSupervisorTeamIssueCommentMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      issueId,
      body,
    }: {
      issueId: string;
      body: string;
    }) => teamIssueService.comment(issueId, body),
    onSuccess: (comment) => {
      if (user?.userId) {
        patchLocalIssueComment(
          queryClient,
          user.userId,
          user.role,
          user.workspaceId,
          comment,
        );
      }
      toast.success("Comment posted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
