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

export function useSupervisorMilestonesQuery(
  teamId?: string | null,
  enabled = true,
) {
  const { user } = useAuth();
  const filterKey = teamId ?? "pending";

  return useQuery({
    ...supervisorPageQueryOptions,
    queryKey: queryKeys.supervisor.milestones(
      user?.userId,
      filterKey,
      user?.workspaceId,
    ),
    queryFn: () => supervisorPageService.getMilestones(teamId!),
    enabled: !!user?.userId && !!teamId && enabled,
  });
}

export function useSupervisorWorkStreamQuery(
  teamId?: string | null,
  phaseId?: string | null,
  enabled = true,
) {
  const { user } = useAuth();
  const filterKey = teamId ?? "pending";
  const phaseKey = phaseId ?? "all";

  return useQuery({
    ...supervisorPageQueryOptions,
    queryKey: queryKeys.supervisor.workStream(
      user?.userId,
      filterKey,
      phaseKey,
      user?.workspaceId,
    ),
    queryFn: () =>
      supervisorPageService.getWorkStream(
        teamId!,
        phaseId ?? undefined,
      ),
    enabled: !!user?.userId && !!teamId && enabled,
  });
}

export function useSupervisorProfileQuery() {
  const { user } = useAuth();

  return useQuery({
    ...supervisorPageQueryOptions,
    queryKey: queryKeys.supervisor.profile(user?.userId, user?.workspaceId),
    queryFn: supervisorPageService.getProfile,
    enabled: !!user?.userId,
  });
}

export function useSupervisorNotificationsQuery(
  page: number,
  limit = 20,
  readFilter: import("@/services/notification.service").NotificationReadFilter = "all",
) {
  const { user } = useAuth();

  return useQuery({
    ...supervisorPageQueryOptions,
    queryKey: queryKeys.supervisor.notificationsList(
      page,
      readFilter,
      user?.workspaceId,
    ),
    queryFn: () =>
      supervisorPageService.getNotifications(page, limit, readFilter),
    enabled: !!user?.userId,
    placeholderData: keepPreviousData,
  });
}
