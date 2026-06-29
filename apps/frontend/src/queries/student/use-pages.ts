import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { queryKeys, studentPageQueryOptions } from "@/lib/react-query";
import { studentService } from "@/services/student.service";
import { teamService } from "@/services/team.service";
import { useAuth } from "@/providers/auth-provider";

import { useStudentAuthQuery } from "./base";

export function useStudentTeamQuery() {
  return useStudentAuthQuery("team", studentService.getTeam);
}

export function useBrowseTeamsQuery(search: string, enabled: boolean) {
  return useQuery({
    ...studentPageQueryOptions,
    queryKey: queryKeys.teams.browse(search),
    queryFn: () => teamService.searchTeams(search),
    enabled,
  });
}

export function useStudentProposalQuery() {
  return useStudentAuthQuery("proposal", studentService.getProposal);
}

export function useStudentWorkStreamQuery() {
  return useStudentAuthQuery("work-stream", studentService.getWorkStream);
}

export function useStudentTasksQuery() {
  return useStudentAuthQuery("tasks", studentService.getTasks);
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
    queryKey: queryKeys.student.profile(user?.userId),
    queryFn: studentService.getProfile,
    enabled: !!user?.userId,
  });
}

export function useStudentNotificationsQuery(page: number, limit = 20) {
  const { user } = useAuth();

  return useQuery({
    ...studentPageQueryOptions,
    queryKey: queryKeys.student.notificationsList(page),
    queryFn: () => studentService.getNotifications(page, limit),
    enabled: !!user?.userId,
    placeholderData: keepPreviousData,
  });
}
