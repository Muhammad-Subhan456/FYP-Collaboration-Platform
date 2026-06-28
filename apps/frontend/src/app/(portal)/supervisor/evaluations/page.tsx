"use client";

import { useState } from "react";
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
import { useSupervisorEvaluationResultMutation } from "@/mutations/supervisor";
import {
  isSupervisorQueryInitialLoading,
  useSupervisorEvaluationsQuery,
} from "@/queries/supervisor";
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
  const [marks, setMarks] = useState(
    existingResult ? String(existingResult.marks) : "",
  );
  const [comments, setComments] = useState(existingResult?.comments ?? "");

  const submitMutation = useSupervisorEvaluationResultMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const marksNum = Number(marks);
    if (Number.isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
      toast.error("Marks must be between 0 and 100");
      return;
    }
    submitMutation.mutate({
      existingResultId: existingResult?.id,
      evaluationId,
      teamId,
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
  const pageQuery = useSupervisorEvaluationsQuery();

  if (isSupervisorQueryInitialLoading(pageQuery)) {
    return <DashboardSkeleton />;
  }

  if (pageQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(pageQuery.error)}
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  const panels = pageQuery.data?.panels ?? [];
  const teamNameById = pageQuery.data?.teamNameById ?? {};
  const results = pageQuery.data?.results ?? [];

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
                        teamNameById[assignment.teamId] ?? "Unknown Team"
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
