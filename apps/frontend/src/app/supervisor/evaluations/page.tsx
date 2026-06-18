"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Calendar, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { supervisorService } from "@/services/supervisor.service";
import { teamService } from "@/services/team.service";
import type { EvaluationResult } from "@/types/student";

function TeamMarksForm({
  evaluationId,
  teamId,
  teamName,
  existingResult,
}: {
  evaluationId: string;
  teamId: string;
  teamName: string;
  existingResult?: EvaluationResult;
}) {
  const queryClient = useQueryClient();
  const [marks, setMarks] = useState(
    existingResult ? String(existingResult.marks) : "",
  );
  const [comments, setComments] = useState(existingResult?.comments ?? "");

  const submitMutation = useMutation({
    mutationFn: (data: { marks: number; comments?: string }) =>
      existingResult
        ? supervisorService.updateEvaluationResult(existingResult.id, data)
        : supervisorService.submitEvaluationResult(evaluationId, {
            teamId,
            ...data,
          }),
    onSuccess: () => {
      toast.success(existingResult ? "Marks updated" : "Marks submitted");
      queryClient.invalidateQueries({
        queryKey: ["supervisor", "evaluation-panels"],
      });
      queryClient.invalidateQueries({
        queryKey: ["supervisor", "evaluation-results"],
      });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const marksNum = Number(marks);
    if (Number.isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
      toast.error("Marks must be between 0 and 100");
      return;
    }
    submitMutation.mutate({
      marks: marksNum,
      comments: comments.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <div>
        <p className="font-medium">{teamName}</p>
        {existingResult && (
          <p className="text-xs text-muted-foreground">
            Previously submitted — you can update marks
          </p>
        )}
      </div>
      <Input
        type="number"
        min={0}
        max={100}
        step={0.5}
        placeholder="Marks (0–100)"
        value={marks}
        onChange={(e) => setMarks(e.target.value)}
      />
      <Textarea
        placeholder="Comments (optional)"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        rows={2}
      />
      <Button type="submit" size="sm" disabled={submitMutation.isPending}>
        {submitMutation.isPending ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {existingResult ? "Update marks" : "Submit marks"}
      </Button>
    </form>
  );
}

export default function SupervisorEvaluationsPage() {
  const panelsQuery = useQuery({
    queryKey: ["supervisor", "evaluation-panels"],
    queryFn: supervisorService.getMyEvaluationPanels,
  });

  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: teamService.getAllTeams,
  });

  const teamIds = useMemo(
    () =>
      [
        ...new Set(
          (panelsQuery.data ?? []).flatMap(
            (panel) => panel.assignments?.map((a) => a.teamId) ?? [],
          ),
        ),
      ],
    [panelsQuery.data],
  );

  const resultsQuery = useQuery({
    queryKey: ["supervisor", "evaluation-results", teamIds.join(",")],
    queryFn: async () => {
      const allResults = await Promise.all(
        teamIds.map((teamId) => supervisorService.getResultsForTeam(teamId)),
      );
      return allResults.flat();
    },
    enabled: teamIds.length > 0,
  });

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const team of teamsQuery.data ?? []) {
      map.set(team.id, team.name);
    }
    return map;
  }, [teamsQuery.data]);

  if (panelsQuery.isLoading || teamsQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (panelsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(panelsQuery.error)}
        onRetry={() => panelsQuery.refetch()}
      />
    );
  }

  const panels = panelsQuery.data ?? [];
  const results = resultsQuery.data ?? [];

  const getResult = (evaluationId: string, teamId: string) =>
    results.find((r) => r.evaluationId === evaluationId && r.teamId === teamId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Evaluation Marks</h2>
        <p className="text-sm text-muted-foreground">
          Enter or update marks for teams assigned to your evaluation panels
        </p>
      </div>

      {panels.length === 0 ? (
        <EmptyState
          title="No evaluation panels assigned"
          description="The coordinator will add you as a panel evaluator when evaluations are scheduled."
        />
      ) : (
        <div className="space-y-4">
          {panels.map((panel) => (
            <Card key={panel.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {panel.evaluation?.title ?? "Evaluation panel"}
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Room {panel.room}</span>
                  {panel.evaluation?.date && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(panel.evaluation.date)}
                      </span>
                    </>
                  )}
                  {panel.scheduledAt && (
                    <>
                      <span>·</span>
                      <span>{formatDateTime(panel.scheduledAt)}</span>
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(panel.assignments?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No teams assigned to this panel yet.
                  </p>
                ) : (
                  panel.assignments!.map((assignment) => (
                    <TeamMarksForm
                      key={assignment.id}
                      evaluationId={panel.evaluationId}
                      teamId={assignment.teamId}
                      teamName={
                        teamNameById.get(assignment.teamId) ?? "Unknown Team"
                      }
                      existingResult={getResult(
                        panel.evaluationId,
                        assignment.teamId,
                      )}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
