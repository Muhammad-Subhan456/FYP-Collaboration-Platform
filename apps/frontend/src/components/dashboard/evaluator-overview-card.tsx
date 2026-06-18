"use client";

import { useQuery } from "@tanstack/react-query";
import { UserCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDisplayName, useProfilesLookup } from "@/hooks/use-profiles";
import { coordinatorService } from "@/services/coordinator.service";

export function EvaluatorOverviewCard() {
  const overviewQuery = useQuery({
    queryKey: ["coordinator", "evaluator-overview"],
    queryFn: coordinatorService.getEvaluatorOverview,
  });

  const teamsQuery = useQuery({
    queryKey: ["coordinator", "teams"],
    queryFn: coordinatorService.getAllTeams,
  });

  const evaluatorIds =
    overviewQuery.data?.map((entry) => entry.evaluatorId) ?? [];
  const profilesQuery = useProfilesLookup(evaluatorIds);

  const teamNameById = new Map(
    (teamsQuery.data ?? []).map((team) => [team.id, team.name]),
  );

  const overview = overviewQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCheck className="h-4 w-4" />
          Evaluator Assignments
        </CardTitle>
        <CardDescription>
          Teams assigned to each panel evaluator across all evaluations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {overviewQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading assignments...</p>
        ) : overview.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No evaluator assignments yet. Create panels and assign teams in
            Evaluations.
          </p>
        ) : (
          overview.map((entry) => (
            <div key={entry.evaluatorId} className="rounded-lg border p-3">
              <p className="font-medium">
                {getDisplayName(profilesQuery.data, entry.evaluatorId)}
              </p>
              {entry.teams.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  No teams assigned yet.
                </p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {entry.teams.map((team) => (
                    <li key={`${entry.evaluatorId}-${team.teamId}-${team.evaluationId}`}>
                      {teamNameById.get(team.teamId) ?? "Unknown Team"} ·{" "}
                      {team.evaluationTitle} (Room {team.panelRoom})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
