import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { queryKeys, studentPageQueryOptions } from "@/lib/react-query";
import { studentService } from "@/services/student.service";
import { teamService } from "@/services/team.service";
import { useAuth } from "@/providers/auth-provider";

import { useStudentAuthQuery } from "./base";

export function useStudentTeamQuery() {
  return useStudentAuthQuery("team", studentService.getTeam);
}

export function useStudentWorkspaceSettingsQuery() {
  const { user } = useAuth();

  return useQuery({
    ...studentPageQueryOptions,
    queryKey: queryKeys.student.workspaceSettings(user?.workspaceId),
    queryFn: studentService.getWorkspaceSettings,
    enabled: !!user?.userId,
  });
}

export function useBrowseTeamsQuery(search: string, enabled: boolean) {
  const { user } = useAuth();

  return useQuery({
    ...studentPageQueryOptions,
    queryKey: queryKeys.teams.browse(search, user?.workspaceId),
    queryFn: () => teamService.searchTeams(search),
    enabled,
  });
}

export function useBrowseTeamDetailsQuery(teamId: string | null) {
  const { user } = useAuth();

  return useQuery({
    ...studentPageQueryOptions,
    queryKey: queryKeys.teams.browseDetails(teamId ?? "", user?.workspaceId),
    queryFn: () => teamService.getBrowseTeamDetails(teamId!),
    enabled: !!teamId,
  });
}

export function useStudentProposalQuery() {
  return useStudentAuthQuery("proposal", studentService.getProposal);
}

export function useStudentWorkStreamQuery(phaseId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    ...studentPageQueryOptions,
    queryKey: queryKeys.student.workStream(
      user?.userId,
      phaseId,
      user?.workspaceId,
    ),
    queryFn: () => studentService.getWorkStream(phaseId ?? undefined),
    enabled: !!user?.userId,
  });
}

export function useStudentMilestonesQuery() {
  return useStudentAuthQuery("milestones", studentService.getMilestones);
}

export function useStudentEvaluationsQuery() {
  return useStudentAuthQuery("evaluations", studentService.getEvaluations);
}

export function useStudentResultsQuery() {
  return useStudentAuthQuery("results", studentService.getResults);
}

export function useStudentProfileQuery() {
  const { user } = useAuth();

  return useQuery({
    ...studentPageQueryOptions,
    queryKey: queryKeys.student.profile(user?.userId, user?.workspaceId),
    queryFn: studentService.getProfile,
    enabled: !!user?.userId,
  });
}

export function useStudentNotificationsQuery(
  page: number,
  limit = 20,
  readFilter: import("@/services/notification.service").NotificationReadFilter = "all",
) {
  const { user } = useAuth();

  return useQuery({
    ...studentPageQueryOptions,
    queryKey: queryKeys.student.notificationsList(
      page,
      readFilter,
      user?.workspaceId,
    ),
    queryFn: () => studentService.getNotifications(page, limit, readFilter),
    enabled: !!user?.userId,
    placeholderData: keepPreviousData,
  });
}
