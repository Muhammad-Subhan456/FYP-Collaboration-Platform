"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { ErrorState } from "@/components/common/state-blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";
import { submissionEvaluationService } from "@/services/submission-evaluation.service";
import type { StudentEvaluationScoreInput } from "@/types/submission-evaluation";
import { getDisplayName, useProfilesLookup } from "@/hooks/use-profiles";

type StudentScoreState = {
  studentId: string;
  remarks: string;
  criterionScores: Record<string, number>;
};

export default function EvaluatorEvaluationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const evaluationId = params.id;

  const evaluationQuery = useQuery({
    queryKey: queryKeys.evaluator.evaluationDetail(
      evaluationId,
      user?.workspaceId,
    ),
    queryFn: () => submissionEvaluationService.getEvaluation(evaluationId),
    enabled: !!evaluationId && !!user?.workspaceId,
  });

  const [scores, setScores] = useState<StudentScoreState[]>([]);

  const evaluation = evaluationQuery.data;
  const studentIds = evaluation?.teamMembers.map((m) => m.authUserId) ?? [];
  const profilesQuery = useProfilesLookup(studentIds);
  const rubricCriteria = evaluation?.template.rubricCriteria ?? [];

  useEffect(() => {
    if (!evaluation) return;

    setScores(
      evaluation.teamMembers.map((member) => {
        const existing = evaluation.studentScores.find(
          (score) => score.studentId === member.authUserId,
        );

        const criterionScores = Object.fromEntries(
          evaluation.template.rubricCriteria.map((criterion) => [
            criterion.id,
            existing?.criterionScores.find(
              (item) => item.rubricCriterionId === criterion.id,
            )?.marksAwarded ?? 0,
          ]),
        );

        return {
          studentId: member.authUserId,
          remarks: existing?.remarks ?? "",
          criterionScores,
        };
      }),
    );
  }, [evaluation]);

  const buildPayload = (): { studentScores: StudentEvaluationScoreInput[] } => ({
    studentScores: scores.map((studentScore) => {
      const criterionScores = Object.entries(
        studentScore.criterionScores,
      ).map(([rubricCriterionId, marksAwarded]) => ({
        rubricCriterionId,
        marksAwarded,
      }));
      const totalMarks = criterionScores.reduce(
        (sum, item) => sum + item.marksAwarded,
        0,
      );

      return {
        studentId: studentScore.studentId,
        totalMarks,
        remarks: studentScore.remarks,
        criterionScores,
      };
    }),
  });

  const draftMutation = useMutation({
    mutationFn: () =>
      submissionEvaluationService.saveDraft(evaluationId, buildPayload()),
    onSuccess: () => {
      toast.success("Draft saved");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.evaluator.evaluationDetail(evaluationId),
      });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      submissionEvaluationService.submitEvaluation(
        evaluationId,
        buildPayload(),
      ),
    onSuccess: () => {
      toast.success("Evaluation submitted");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.evaluator.evaluations(),
      });
      router.push("/evaluator/evaluations");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const isReadOnly = evaluation?.isReadOnly ?? false;

  const totalByStudentId = useMemo(() => {
    const totals = new Map<string, number>();
    for (const studentScore of scores) {
      totals.set(
        studentScore.studentId,
        Object.values(studentScore.criterionScores).reduce(
          (sum, value) => sum + value,
          0,
        ),
      );
    }
    return totals;
  }, [scores]);

  const updateCriterionScore = (
    studentId: string,
    criterionId: string,
    value: number,
  ) => {
    setScores((current) =>
      current.map((item) =>
        item.studentId === studentId
          ? {
              ...item,
              criterionScores: {
                ...item.criterionScores,
                [criterionId]: value,
              },
            }
          : item,
      ),
    );
  };

  const updateRemarks = (studentId: string, remarks: string) => {
    setScores((current) =>
      current.map((item) =>
        item.studentId === studentId ? { ...item, remarks } : item,
      ),
    );
  };

  if (evaluationQuery.isLoading) return <DashboardSkeleton />;

  if (evaluationQuery.isError || !evaluation) {
    return (
      <ErrorState
        message={getErrorMessage(evaluationQuery.error)}
        onRetry={() => evaluationQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/evaluator/evaluations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            {evaluation.deliverable.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {evaluation.deliverable.phase?.name} · Max{" "}
            {evaluation.template.totalMarks} marks ·{" "}
            {evaluation.template.weightagePercent}% of phase
          </p>
        </div>
        <Badge className="ml-auto">{evaluation.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submission</CardTitle>
          <CardDescription>
            Review the submitted file before scoring each student.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a
              href={evaluation.submission.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View submitted file (v{evaluation.submission.version})
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marking sheet</CardTitle>
          <CardDescription>
            Enter marks for each criterion. Totals update as you go.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table minWidth={960}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Student</TableHead>
                <TableHead>Criterion</TableHead>
                <TableHead>Maximum marks</TableHead>
                <TableHead>Awarded marks</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.map((studentScore) => {
                const studentName = getDisplayName(
                  profilesQuery.data,
                  studentScore.studentId,
                );
                const total =
                  totalByStudentId.get(studentScore.studentId) ?? 0;
                const rowCount = rubricCriteria.length;

                return rubricCriteria.map((criterion, criterionIndex) => (
                  <TableRow
                    key={`${studentScore.studentId}:${criterion.id}`}
                    className="align-top"
                  >
                    {criterionIndex === 0 ? (
                      <TableCell
                        className="font-medium"
                        rowSpan={rowCount}
                      >
                        {studentName}
                      </TableCell>
                    ) : null}
                    <TableCell>{criterion.title}</TableCell>
                    <TableCell className="tabular-nums">
                      {criterion.maxMarks}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={criterion.maxMarks}
                        disabled={isReadOnly}
                        className="h-8 w-24"
                        value={
                          studentScore.criterionScores[criterion.id] ?? 0
                        }
                        onChange={(event) =>
                          updateCriterionScore(
                            studentScore.studentId,
                            criterion.id,
                            Number(event.target.value),
                          )
                        }
                      />
                    </TableCell>
                    {criterionIndex === 0 ? (
                      <>
                        <TableCell
                          className="font-medium tabular-nums"
                          rowSpan={rowCount}
                        >
                          {total}/{evaluation.template.totalMarks}
                        </TableCell>
                        <TableCell rowSpan={rowCount}>
                          <Textarea
                            disabled={isReadOnly}
                            className="min-h-[96px]"
                            value={studentScore.remarks}
                            onChange={(event) =>
                              updateRemarks(
                                studentScore.studentId,
                                event.target.value,
                              )
                            }
                          />
                        </TableCell>
                      </>
                    ) : null}
                  </TableRow>
                ));
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!isReadOnly ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={draftMutation.isPending || submitMutation.isPending}
            onClick={() => draftMutation.mutate()}
          >
            {draftMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save draft
          </Button>
          <Button
            disabled={draftMutation.isPending || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Submit evaluation
          </Button>
        </div>
      ) : null}
    </div>
  );
}
