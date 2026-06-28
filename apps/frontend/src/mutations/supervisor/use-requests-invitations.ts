import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { proposalService } from "@/services/proposal.service";
import type { InvitationBrowseTarget } from "@/services/supervisor-page.service";

import {
  invalidateSupervisorInvitations,
  invalidateSupervisorRequests,
} from "./invalidate";

export function useSupervisorRequestMutations() {
  const queryClient = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: (proposalId: string) =>
      proposalService.approveProposal(proposalId),
    onSuccess: () => {
      toast.success("Proposal accepted — you are now assigned as supervisor");
      invalidateSupervisorRequests(queryClient);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      proposalId,
      reason,
    }: {
      proposalId: string;
      reason: string;
    }) => proposalService.rejectProposal(proposalId, reason),
    onSuccess: () => {
      toast.success("Proposal rejected");
      invalidateSupervisorRequests(queryClient);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return { acceptMutation, rejectMutation };
}

export function useSupervisorInviteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (target: InvitationBrowseTarget) => {
      if (target.kind === "proposal" && target.proposalId) {
        return proposalService.inviteProposal(target.proposalId);
      }
      return proposalService.inviteTeam(target.teamId);
    },
    onSuccess: () => {
      toast.success("Interest expressed");
      invalidateSupervisorInvitations(queryClient);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
}
