import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { patchLocalIssueComment } from "@/lib/realtime/issue-cache";
import { teamIssueService } from "@/services/team-issue.service";
import { useAuth } from "@/providers/auth-provider";
import type {
  CompleteTeamIssueInput,
  CreateTeamIssueInput,
  UpdateTeamIssueInput,
} from "@/types/team-issue";

import { invalidateStudentMilestones } from "./invalidate";

export function useStudentCreateTeamIssueMutation(options?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTeamIssueInput) =>
      teamIssueService.create(input),
    onSuccess: () => {
      toast.success("Issue created");
      invalidateStudentMilestones(queryClient);
      options?.onSuccess?.();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useStudentUpdateTeamIssueMutation(options?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      issueId,
      input,
    }: {
      issueId: string;
      input: UpdateTeamIssueInput;
    }) => teamIssueService.update(issueId, input),
    onSuccess: () => {
      toast.success("Issue updated");
      invalidateStudentMilestones(queryClient);
      options?.onSuccess?.();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useStudentClaimTeamIssueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (issueId: string) => teamIssueService.claim(issueId),
    onSuccess: () => {
      toast.success("Issue claimed");
      invalidateStudentMilestones(queryClient);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useStudentReleaseTeamIssueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (issueId: string) => teamIssueService.release(issueId),
    onSuccess: () => {
      toast.success("Issue released");
      invalidateStudentMilestones(queryClient);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useStudentCompleteTeamIssueMutation(options?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      issueId,
      input,
    }: {
      issueId: string;
      input: CompleteTeamIssueInput;
    }) => teamIssueService.complete(issueId, input),
    onSuccess: () => {
      toast.success("Issue completed");
      invalidateStudentMilestones(queryClient);
      options?.onSuccess?.();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}

export function useStudentTeamIssueCommentMutation() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

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
          {
            ...comment,
            authorName:
              comment.authorName ?? profile?.fullName ?? undefined,
          },
        );
      }
      toast.success("Comment posted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
