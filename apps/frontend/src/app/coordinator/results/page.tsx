"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Award } from "lucide-react";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { coordinatorService } from "@/services/coordinator.service";

export default function CoordinatorResultsPage() {
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const teamsQuery = useQuery({
    queryKey: ["coordinator", "teams"],
    queryFn: coordinatorService.getAllTeams,
  });

  const resultsQuery = useQuery({
    queryKey: ["coordinator", "results", selectedTeamId],
    queryFn: () => coordinatorService.getResultsForTeam(selectedTeamId),
    enabled: !!selectedTeamId,
  });

  if (teamsQuery.isLoading) return <DashboardSkeleton />;

  if (teamsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(teamsQuery.error)}
        onRetry={() => teamsQuery.refetch()}
      />
    );
  }

  const teams = teamsQuery.data ?? [];
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Evaluation Results</h2>
        <p className="text-sm text-muted-foreground">
          View published marks in read-only mode. Only assigned panel evaluators
          can enter or update marks.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select team</CardTitle>
          <CardDescription>
            Choose a team to view their evaluation results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedTeamId || undefined}
            onValueChange={setSelectedTeamId}
          >
            <SelectTrigger className="w-full sm:max-w-md">
              <SelectValue placeholder="Select a team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} ({t.domain})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!selectedTeamId ? (
        <EmptyState
          title="No team selected"
          description="Select a team above to view their evaluation results."
        />
      ) : resultsQuery.isLoading ? (
        <DashboardSkeleton />
      ) : resultsQuery.isError ? (
        <ErrorState
          message={getErrorMessage(resultsQuery.error)}
          onRetry={() => resultsQuery.refetch()}
        />
      ) : (resultsQuery.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="No results for this team"
          description={`${selectedTeam?.name ?? "This team"} has no published results yet.`}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resultsQuery.data!.map((r) => (
            <Card key={r.id} className="transition-all hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{r.evaluation.title}</CardTitle>
                <CardDescription>
                  {r.evaluation.type.replace(/_/g, " ")} ·{" "}
                  {formatDate(r.evaluation.date)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{r.marks}</p>
                    <p className="text-xs text-muted-foreground">out of 100</p>
                  </div>
                </div>
                {r.comments && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {r.comments}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
