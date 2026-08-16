import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/axios";
import { getStoredToken } from "@/lib/auth";
import { queryKeys } from "@/lib/react-query";
import { reconnectRealtime } from "@/lib/realtime/socket";
import { useAuth } from "@/providers/auth-provider";
import { proposalService } from "@/services/proposal.service";
import { teamService } from "@/services/team.service";

import {
  invalidateStudentProposal,
  invalidateStudentTeam,
} from "./invalidate";

export function useStudentTeamMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidateTeam = () => invalidateStudentTeam(queryClient);

  const createMutation = useMutation({
    mutationFn: teamService.createTeam,
    onSuccess: () => {
      toast.success("Team created successfully!");
      invalidateTeam();

      // Reconnect so the leader joins team:{id} for deliverables/announcements.
      const token = getStoredToken();
      if (token && user?.userId) {
        reconnectRealtime(
          token,
          user.userId,
          user.role,
          user.workspaceId ?? null,
          queryClient,
        );
      }
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const joinMutation = useMutation({
    mutationFn: teamService.requestToJoin,
    onSuccess: () => {
      toast.success("Join request sent");
      invalidateTeam();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateTeamMutation = useMutation({
    mutationFn: teamService.updateTeam,
    onSuccess: () => {
      toast.success("Team updated");
      invalidateTeam();
      void queryClient.invalidateQueries({
        queryKey: queryKeys.student.proposal(),
      });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const approveMutation = useMutation({
    mutationFn: teamService.approveRequest,
    onSuccess: () => {
      toast.success("Request approved");
      invalidateTeam();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const rejectMutation = useMutation({
    mutationFn: teamService.rejectRequest,
    onSuccess: () => {
      toast.success("Request rejected");
      invalidateTeam();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const roleMutation = useMutation({
    mutationFn: ({
      memberId,
      teamRole,
    }: {
      memberId: string;
      teamRole: string;
    }) => teamService.updateMemberRole(memberId, teamRole),
    onSuccess: () => {
      toast.success("Team role updated");
      invalidateTeam();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => teamService.removeMember(memberId),
    onSuccess: () => {
      toast.success("Member removed from the team");
      invalidateTeam();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteTeamMutation = useMutation({
    mutationFn: teamService.deleteTeam,
    onSuccess: () => {
      toast.success("Team deleted");
      invalidateStudentProposal(queryClient);

      const token = getStoredToken();
      if (token && user?.userId) {
        reconnectRealtime(
          token,
          user.userId,
          user.role,
          user.workspaceId ?? null,
          queryClient,
        );
      }
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const leaveTeamMutation = useMutation({
    mutationFn: teamService.leaveTeam,
    onSuccess: () => {
      toast.success("You have left the team");
      invalidateStudentProposal(queryClient);

      const token = getStoredToken();
      if (token && user?.userId) {
        reconnectRealtime(
          token,
          user.userId,
          user.role,
          user.workspaceId ?? null,
          queryClient,
        );
      }
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return {
    createMutation,
    joinMutation,
    updateTeamMutation,
    approveMutation,
    rejectMutation,
    roleMutation,
    removeMemberMutation,
    deleteTeamMutation,
    leaveTeamMutation,
    invalidateTeam,
  };
}

export function useStudentProposalMutations() {
  const queryClient = useQueryClient();

  const invalidateProposal = () =>
    invalidateStudentProposal(queryClient);

  const requestMutation = useMutation({
    mutationFn: (supervisorId: string) =>
      proposalService.requestSupervisor(supervisorId),
    onSuccess: () => {
      const settings = queryClient
        .getQueriesData<{ supervisorRequestExpiryHours?: number }>({
          queryKey: ["student", "workspace-settings"],
        })
        .map(([, data]) => data)
        .find((data) => data?.supervisorRequestExpiryHours != null);
      const hours = settings?.supervisorRequestExpiryHours;

      toast.success(
        hours
          ? `Proposal submitted! The supervisor has ${hours} hour${hours === 1 ? "" : "s"} to respond.`
          : "Proposal submitted! The supervisor must respond before the request expires.",
      );
      invalidateProposal();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const ignoreInterestMutation = useMutation({
    mutationFn: (interestId: string) =>
      proposalService.ignoreInterest(interestId),
    onSuccess: () => {
      toast.success("Expression of interest dismissed.");
      invalidateProposal();
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return {
    requestMutation,
    ignoreInterestMutation,
    invalidateProposal,
  };
}
