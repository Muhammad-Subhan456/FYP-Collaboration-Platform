"use client";

import Link from "next/link";
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
import {
  isDeepLinkFocused,
  useDeepLinkFocus,
} from "@/hooks/use-deep-link-focus";
import { useStudentResultsQuery, isStudentQueryPending } from "@/queries/student";
import { cn } from "@/lib/utils";

export default function StudentResultsPage() {
  const resultFocusId = useDeepLinkFocus("resultId");
  const pageQuery = useStudentResultsQuery();

  if (isStudentQueryPending(pageQuery)) return <DashboardSkeleton />;

  if (pageQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(pageQuery.error)}
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  const data = pageQuery.data;
  if (!data?.team) {
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

  const results = data.results;

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
            <Card
              key={r.id}
              id={`focus-${r.id}`}
              className={cn(
                "transition-all hover:shadow-md",
                isDeepLinkFocused(resultFocusId, r.id) &&
                  "border-primary ring-2 ring-primary/20",
              )}
            >
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
