import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { coordinatorPageQueryOptions, queryKeys } from "@/lib/react-query";
import { coordinatorPageService } from "@/services/coordinator-page.service";
import { coordinatorService } from "@/services/coordinator.service";
import type { AuthUserRecord } from "@/types/profile";
import { useAuth } from "@/providers/auth-provider";

import { useCoordinatorAuthQuery } from "./base";

export function useCoordinatorAnalyticsQuery() {
  return useCoordinatorAuthQuery(
    "analytics",
    coordinatorPageService.getAnalytics,
  );
}

export function useCoordinatorUsersQuery() {
  return useCoordinatorAuthQuery("users", coordinatorPageService.getUsers);
}

export function useCoordinatorTeamsQuery() {
  return useCoordinatorAuthQuery("teams", coordinatorPageService.getTeams);
}

export function useCoordinatorProposalsQuery() {
  return useCoordinatorAuthQuery(
    "proposals",
    coordinatorPageService.getProposals,
  );
}

export function useCoordinatorEvaluationsQuery() {
  return useCoordinatorAuthQuery(
    "evaluations",
    coordinatorPageService.getEvaluations,
  );
}

export function useCoordinatorResultsQuery() {
  return useCoordinatorAuthQuery("results", coordinatorPageService.getResults);
}

export function useCoordinatorAnnouncementsQuery() {
  return useCoordinatorAuthQuery(
    "announcements",
    coordinatorPageService.getAnnouncements,
  );
}

export function useCoordinatorSystemHealthQuery() {
  const { user } = useAuth();

  return useQuery({
    ...coordinatorPageQueryOptions,
    staleTime: 0,
    queryKey: queryKeys.coordinator.systemHealth(user?.userId),
    queryFn: coordinatorPageService.getSystemHealth,
    enabled: !!user?.userId,
    refetchInterval: 30_000,
  });
}

export function useCoordinatorProfileQuery() {
  const { user } = useAuth();

  return useQuery({
    ...coordinatorPageQueryOptions,
    queryKey: queryKeys.coordinator.profile(user?.userId),
    queryFn: coordinatorPageService.getProfile,
    enabled: !!user?.userId,
  });
}

export function useCoordinatorNotificationsQuery(
  page: number,
  limit = 20,
  readFilter: import("@/services/notification.service").NotificationReadFilter = "all",
) {
  const { user } = useAuth();

  return useQuery({
    ...coordinatorPageQueryOptions,
    queryKey: queryKeys.coordinator.notificationsList(page, readFilter),
    queryFn: () =>
      coordinatorPageService.getNotifications(page, limit, readFilter),
    enabled: !!user?.userId,
    placeholderData: keepPreviousData,
  });
}

export function useCoordinatorUserDetailQuery(
  user: AuthUserRecord | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    ...coordinatorPageQueryOptions,
    queryKey: queryKeys.coordinator.userDetail(user?.id ?? ""),
    queryFn: () => coordinatorService.getUserDetail(user!),
    enabled: enabled && !!user,
  });
}

export function useCoordinatorEvaluatorOverviewQuery() {
  return useQuery({
    ...coordinatorPageQueryOptions,
    queryKey: queryKeys.coordinator.evaluatorOverview(),
    queryFn: coordinatorService.getEvaluatorOverview,
  });
}

export function useCoordinatorAllTeamsQuery() {
  return useQuery({
    ...coordinatorPageQueryOptions,
    queryKey: queryKeys.coordinator.allTeams(),
    queryFn: coordinatorService.getAllTeams,
  });
}
