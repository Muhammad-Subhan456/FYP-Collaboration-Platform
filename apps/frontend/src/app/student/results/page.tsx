"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Award, Calendar } from "lucide-react";

import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { progressService } from "@/services/progress.service";
import { teamService } from "@/services/team.service";

export default function StudentResultsPage() {
  const teamQuery = useQuery({
    queryKey: ["team", "my-team"],
    queryFn: teamService.getMyTeam,
  });

  const resultsQuery = useQuery({
    queryKey: ["evaluation-results", "my"],
    queryFn: progressService.getMyResults,
    enabled: !!teamQuery.data,
  });

  if (teamQuery.isLoading) return <DashboardSkeleton />;

  if (!teamQuery.data) {
    return (
      <EmptyState
        title="No team yet"
        description="Join a team to view evaluation results."
        action={
          <Button asChild>
            <Link href="/student/team">Go to Team</Link>
          </Button>
        }
      />
    );
  }

  if (resultsQuery.isLoading) return <DashboardSkeleton />;

  if (resultsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(resultsQuery.error)}
        onRetry={() => resultsQuery.refetch()}
      />
    );
  }

  const results = resultsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Evaluation Results</h2>
        <p className="text-sm text-muted-foreground">
          Marks and feedback from your evaluations
        </p>
      </div>

      {results.length === 0 ? (
        <EmptyState
          title="No results yet"
          description="Results will appear here after your evaluations are completed."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
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
                  <p className="mt-3 text-sm text-muted-foreground">{r.comments}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
