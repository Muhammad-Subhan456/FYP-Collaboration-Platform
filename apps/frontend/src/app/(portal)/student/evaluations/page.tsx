"use client";

import Link from "next/link";
import { Calendar, ClipboardCheck, MapPin } from "lucide-react";

import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import {
  isDeepLinkFocused,
  useDeepLinkFocus,
} from "@/hooks/use-deep-link-focus";
import { useStudentEvaluationsQuery, isStudentQueryPending } from "@/queries/student";
import { cn } from "@/lib/utils";

export default function StudentEvaluationsPage() {
  const evaluationFocusId = useDeepLinkFocus("evaluationId");
  const pageQuery = useStudentEvaluationsQuery();

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
        description="Join a team to see scheduled evaluations."
        action={
          <Button asChild>
            <Link href="/student/team">Go to Team</Link>
          </Button>
        }
      />
    );
  }

  const evaluations = data.evaluations;
  const deliverableEvaluations = data.deliverableEvaluations ?? [];

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Deliverable evaluations</h2>
          <p className="text-sm text-muted-foreground">
            Progress on marking for your submitted work
          </p>
        </div>

        {deliverableEvaluations.length === 0 ? (
          <EmptyState
            title="No evaluations yet"
            description="You will see progress here after evaluators are assigned."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {deliverableEvaluations.map((item) => (
              <Card key={item.submissionId}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      {item.deliverableTitle}
                    </CardTitle>
                    <StatusBadge status={item.status} />
                  </div>
                  <CardDescription>
                    {item.phaseName ? `${item.phaseName} · ` : ""}
                    {item.templateTitle}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ClipboardCheck className="h-4 w-4" />
                    {item.submittedEvaluatorCount}/{item.evaluatorCount}{" "}
                    evaluator
                    {item.evaluatorCount === 1 ? "" : "s"} submitted
                  </div>
                  {item.status === "SUBMITTED" ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/student/results">View results</Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Scheduled events</h2>
          <p className="text-sm text-muted-foreground">
            Vivas and other events set by your coordinator
          </p>
        </div>

        {evaluations.length === 0 ? (
          <EmptyState
            title="No evaluations scheduled"
            description="Your coordinator will schedule these when ready."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {evaluations.map((item) => {
              const ev = item.evaluation;
              const isPast = new Date(ev.date) < new Date();
              return (
                <Card
                  key={item.id}
                  id={`focus-${ev.id}`}
                  className={cn(
                    "transition-all hover:shadow-md",
                    isDeepLinkFocused(evaluationFocusId, ev.id) &&
                      "border-primary ring-2 ring-primary/20",
                  )}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{ev.title}</CardTitle>
                      <StatusBadge status={isPast ? "INACTIVE" : "ACTIVE"} />
                    </div>
                    <CardDescription>
                      {ev.type.replace(/_/g, " ")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {formatDateTime(ev.date)}
                    </div>
                    {ev.venue ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {ev.venue}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
