import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";
import { coordinatorPageService } from "@/services/coordinator-page.service";
import { deliverableTemplateService } from "@/services/deliverable-template.service";
import { phaseService } from "@/services/phase.service";
import { submissionEvaluationService } from "@/services/submission-evaluation.service";
import { ALL_FILTER_VALUE } from "@/types/evaluation-filters";

export function useResultsFilterOptions(phaseId = ALL_FILTER_VALUE) {
  const { user } = useAuth();
  const resolvedPhaseId =
    phaseId === ALL_FILTER_VALUE ? undefined : phaseId;

  const phasesQuery = useQuery({
    queryKey: queryKeys.phases.list(user?.workspaceId),
    queryFn: () => phaseService.list("ACTIVE"),
    enabled: !!user?.workspaceId,
  });

  const templatesQuery = useQuery({
    queryKey: queryKeys.deliverableTemplates.list(
      resolvedPhaseId,
      user?.workspaceId,
    ),
    queryFn: () => deliverableTemplateService.list(resolvedPhaseId),
    enabled: !!user?.workspaceId,
  });

  const teamsQuery = useQuery({
    queryKey: queryKeys.coordinator.teams(user?.userId, user?.workspaceId),
    queryFn: coordinatorPageService.getTeams,
    enabled: !!user?.workspaceId,
  });

  const usersQuery = useQuery({
    queryKey: queryKeys.coordinator.users(user?.userId, user?.workspaceId),
    queryFn: coordinatorPageService.getUsers,
    enabled: !!user?.workspaceId,
  });

  const evaluatorsQuery = useQuery({
    queryKey: queryKeys.coordinator.evaluators(user?.workspaceId),
    queryFn: submissionEvaluationService.listEvaluators,
    enabled: !!user?.workspaceId,
  });

  const supervisors = (usersQuery.data ?? []).filter(
    (record) => record.role === "SUPERVISOR",
  );
  const students = (usersQuery.data ?? []).filter(
    (record) => record.role === "STUDENT",
  );

  return {
    phases: phasesQuery.data ?? [],
    templates: templatesQuery.data ?? [],
    teams: teamsQuery.data?.teams ?? [],
    supervisors,
    students,
    evaluators: evaluatorsQuery.data ?? [],
    isLoading:
      phasesQuery.isLoading ||
      templatesQuery.isLoading ||
      teamsQuery.isLoading ||
      usersQuery.isLoading ||
      evaluatorsQuery.isLoading,
  };
}

export function useSupervisorResultsFilterOptions(phaseId = ALL_FILTER_VALUE) {
  const { user } = useAuth();
  const resolvedPhaseId =
    phaseId === ALL_FILTER_VALUE ? undefined : phaseId;

  const phasesQuery = useQuery({
    queryKey: queryKeys.phases.list(user?.workspaceId),
    queryFn: () => phaseService.list("ACTIVE"),
    enabled: !!user?.workspaceId,
  });

  const teamsQuery = useQuery({
    queryKey: queryKeys.supervisor.teams(user?.userId, user?.workspaceId),
    queryFn: async () => {
      const { supervisorPageService } = await import(
        "@/services/supervisor-page.service"
      );
      const data = await supervisorPageService.getTeams();
      return data.proposals.map((proposal) => ({
        id: proposal.teamId,
        name: proposal.title,
      }));
    },
    enabled: !!user?.workspaceId,
  });

  const templatesQuery = useQuery({
    queryKey: queryKeys.deliverableTemplates.list(
      resolvedPhaseId,
      user?.workspaceId,
    ),
    queryFn: () => deliverableTemplateService.list(resolvedPhaseId),
    enabled: !!user?.workspaceId,
  });

  return {
    phases: phasesQuery.data ?? [],
    teams: teamsQuery.data ?? [],
    templates: templatesQuery.data ?? [],
    isLoading:
      phasesQuery.isLoading ||
      teamsQuery.isLoading ||
      templatesQuery.isLoading,
  };
}
