import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { queryKeys, supervisorPageQueryOptions } from "@/lib/react-query";
import { supervisorPageService } from "@/services/supervisor-page.service";
import { useAuth } from "@/providers/auth-provider";

import { useSupervisorAuthQuery } from "./base";

export function useSupervisorTeamsQuery() {
  return useSupervisorAuthQuery("teams", supervisorPageService.getTeams);
}

export function useSupervisorRequestsQuery() {
  return useSupervisorAuthQuery("requests", supervisorPageService.getRequests);
}

export function useSupervisorInvitationsQuery() {
  return useSupervisorAuthQuery(
    "invitations",
    supervisorPageService.getInvitations,
  );
}

export function useSupervisorMilestonesQuery() {
  return useSupervisorAuthQuery(
    "milestones",
    supervisorPageService.getMilestones,
  );
}

export function useSupervisorEvaluationsQuery() {
  return useSupervisorAuthQuery(
    "evaluations",
    supervisorPageService.getEvaluations,
  );
}

export function useSupervisorWorkStreamQuery(
  teamId?: string | null,
  enabled = true,
) {
  const { user } = useAuth();
  const filterKey = teamId ?? "pending";

  return useQuery({
    ...supervisorPageQueryOptions,
    queryKey: queryKeys.supervisor.workStream(user?.userId, filterKey),
    queryFn: () => supervisorPageService.getWorkStream(teamId!),
    enabled: !!user?.userId && !!teamId && enabled,
  });
}

export function useSupervisorProfileQuery() {
  const { user } = useAuth();

  return useQuery({
    ...supervisorPageQueryOptions,
    queryKey: queryKeys.supervisor.profile(user?.userId),
    queryFn: supervisorPageService.getProfile,
    enabled: !!user?.userId,
  });
}

export function useSupervisorNotificationsQuery(page: number, limit = 20) {
  const { user } = useAuth();

  return useQuery({
    ...supervisorPageQueryOptions,
    queryKey: queryKeys.supervisor.notificationsList(page),
    queryFn: () => supervisorPageService.getNotifications(page, limit),
    enabled: !!user?.userId,
    placeholderData: keepPreviousData,
  });
}
