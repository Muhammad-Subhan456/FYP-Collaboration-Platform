"use client";

import Link from "next/link";
import { Megaphone } from "lucide-react";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GlobalAnnouncementsCard } from "@/components/dashboard/global-announcements-card";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { useStudentDashboardQuery } from "@/queries/student";

const DASHBOARD_WIDGET_LIMIT = 3;

export default function StudentDashboardPage() {
  const {
    overview: data,
    isResolving,
    isError,
    error,
    refetch,
  } = useStudentDashboardQuery();

  if (isResolving) return <DashboardSkeleton />;

  if (isError) {
    return (
      <ErrorState
        message={getErrorMessage(error)}
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) {
    return (
      <ErrorState
        message="Failed to load dashboard."
        onRetry={() => refetch()}
      />
    );
  }

  const team = data.team;
  const proposal = data.proposal;
  // Backend already returns top 3; keep a defensive client cap.
  const deliverables = data.deliverables.slice(0, DASHBOARD_WIDGET_LIMIT);
  const deliverableEvaluations = (
    data.deliverableEvaluations ?? []
  ).slice(0, DASHBOARD_WIDGET_LIMIT);
  const legacyEvaluations = data.evaluations.slice(0, DASHBOARD_WIDGET_LIMIT);
  const teamAnnouncements = data.announcements.slice(0, DASHBOARD_WIDGET_LIMIT);
  const memberCount = data.teamMembers.length;
  const supervisorName = data.supervisor?.fullName ?? null;

  const showDeliverableEvaluations = deliverableEvaluations.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Team Information</CardTitle>
              <CardDescription>Your project team</CardDescription>
            </div>
            {team && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/student/team">Manage</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {team ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{team.name}</span>
                  <StatusBadge status={team.isOpen ? "ACTIVE" : "INACTIVE"} />
                </div>
                <p className="text-sm text-muted-foreground">{team.domain}</p>
                <p className="text-sm text-muted-foreground">
                  {memberCount} / {team.maxMembers} members
                </p>
              </div>
            ) : (
              <EmptyState
                title="No team yet"
                description="Create or join a team to get started."
                action={
                  <Button size="sm" asChild>
                    <Link href="/student/team">Go to Team</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle>Proposal</CardTitle>
              <CardDescription>Your project proposal status</CardDescription>
            </div>
            {team && (
              <Button variant="ghost" size="sm" className="shrink-0" asChild>
                <Link href="/student/proposal">View</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="min-w-0">
            {proposal || team?.projectTitle ? (
              <div className="space-y-2">
                <p
                  className="truncate font-medium"
                  title={team?.projectTitle ?? proposal?.title}
                >
                  {team?.projectTitle ?? proposal?.title}
                </p>
                <StatusBadge status={proposal?.status ?? "DRAFT"} />
                {supervisorName && (
                  <p
                    className="break-words text-sm text-muted-foreground"
                    title={supervisorName}
                  >
                    Supervisor:{" "}
                    <span className="font-medium text-foreground">
                      {supervisorName}
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <EmptyState
                title="Team profile incomplete"
                description="Complete your team profile before sending a proposal."
                action={
                  team ? (
                    <Button size="sm" asChild>
                      <Link href="/student/team">Complete Team Profile</Link>
                    </Button>
                  ) : undefined
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Upcoming Deliverables</CardTitle>
              <CardDescription>From your supervisor</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0" asChild>
              <Link href="/student/work-stream?tab=deliverables">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {deliverables.length > 0 ? (
              deliverables.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <span className="font-medium">{d.title}</span>
                  <span className="text-muted-foreground">
                    {d.dueDate ? formatDate(d.dueDate) : "—"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No deliverables assigned yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Upcoming Evaluations</CardTitle>
              <CardDescription>
                Upcoming marking and viva dates
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0" asChild>
              <Link href="/student/evaluations">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {showDeliverableEvaluations ? (
              deliverableEvaluations.map((item) => (
                <div
                  key={item.submissionId}
                  className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{item.deliverableTitle}</p>
                    <p className="text-muted-foreground">
                      {item.phaseName ? `${item.phaseName} · ` : ""}
                      {item.templateTitle}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))
            ) : legacyEvaluations.length > 0 ? (
              legacyEvaluations.map((item) => (
                <div key={item.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{item.evaluation.title}</p>
                  <p className="text-muted-foreground">
                    {formatDate(item.evaluation.date)}
                    {item.evaluation.venue ? ` · ${item.evaluation.venue}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No evaluations scheduled.
              </p>
            )}
          </CardContent>
        </Card>

        <GlobalAnnouncementsCard
          announcements={data.globalAnnouncements}
          limit={DASHBOARD_WIDGET_LIMIT}
          viewAllDialog
        />

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4" />
              Team Announcements
            </CardTitle>
            <Button variant="ghost" size="sm" className="shrink-0" asChild>
              <Link href="/student/work-stream?tab=announcements">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamAnnouncements.length > 0 ? (
              teamAnnouncements.map((a) => (
                <div key={a.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{a.title}</p>
                  <p className="line-clamp-2 text-muted-foreground">{a.message}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No announcements.</p>
            )}
          </CardContent>
        </Card>

        <RecentActivityFeed
          className="lg:col-span-2"
          recentActivity={data.recentActivity}
          displayLimit={DASHBOARD_WIDGET_LIMIT}
          viewAllHref="/student/notifications"
        />
      </div>
    </div>
  );
}
