"use client";

import Link from "next/link";
import {
  Calendar,
  FileText,
  Megaphone,
  Package,
  Users,
  Video,
} from "lucide-react";

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
import { DashboardInsights } from "@/components/dashboard/dashboard-insights";
import { GlobalAnnouncementsCard } from "@/components/dashboard/global-announcements-card";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { ScrollableFeed } from "@/components/common/scrollable-feed";
import { formatDate, formatDateTime, pluralize } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";

function formatProposalStatus(status?: string | null) {
  if (!status) return "None";
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_SUPERVISOR: "Pending",
    SUPERVISOR_ASSIGNED: "Supervisor set",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="min-w-0">
        <div
          className="truncate text-lg font-bold leading-tight sm:text-2xl"
          title={String(value)}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

export default function StudentDashboardPage() {
  const {
    overview: data,
    isResolving,
    isError,
    error,
    refetch,
  } = useDashboardOverview("STUDENT");

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
  const stats = data.stats;
  const team = data.team;
  const proposal = data.proposal;
  const deliverables = data.deliverables;
  const evaluations = data.evaluations;
  const memberCount = data.teamMembers.length;
  const supervisorName = data.supervisor?.fullName ?? null;

  const insightLines: string[] = [];
  if (proposal?.status === "APPROVED") {
    insightLines.push("Your proposal is approved.");
  } else if (proposal) {
    insightLines.push(
      `Your proposal status: ${proposal.status.replace(/_/g, " ").toLowerCase()}.`,
    );
  }
  const nextDeliverable = [...deliverables]
    .filter((d) => d.dueDate)
    .sort(
      (a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )[0];
  if (nextDeliverable?.dueDate) {
    const days = Math.ceil(
      (new Date(nextDeliverable.dueDate).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );
    insightLines.push(
      `Next deliverable "${nextDeliverable.title}" due in ${pluralize(Math.max(days, 0), "day")}.`,
    );
  }
  const nextEvaluation = [...evaluations]
    .filter((e) => e.evaluation?.date)
    .sort(
      (a, b) =>
        new Date(a.evaluation.date).getTime() -
        new Date(b.evaluation.date).getTime(),
    )[0];
  if (nextEvaluation?.evaluation) {
    insightLines.push(
      `${nextEvaluation.evaluation.title} scheduled for ${formatDate(nextEvaluation.evaluation.date)}.`,
    );
  }
  const latestGlobalAnnouncement = data.globalAnnouncements[0];
  if (latestGlobalAnnouncement) {
    insightLines.push(
      `Program announcement: ${latestGlobalAnnouncement.title}`,
    );
  }

  return (
    <div className="space-y-6">
      <DashboardInsights lines={insightLines} />

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Team Members" value={memberCount} icon={Users} />
        <StatCard
          title="Proposal Status"
          value={formatProposalStatus(proposal?.status)}
          icon={FileText}
        />
        <StatCard
          title="Deliverables"
          value={stats.upcomingDeliverables ?? deliverables.length}
          icon={Package}
        />
        <StatCard
          title="Evaluations"
          value={stats.upcomingEvaluations ?? evaluations.length}
          icon={Calendar}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Team Information</CardTitle>
              <CardDescription>Your current FYP team</CardDescription>
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
            {proposal ? (
              <div className="space-y-2">
                <p className="truncate font-medium" title={proposal.title}>
                  {proposal.title}
                </p>
                <StatusBadge status={proposal.status} />
                {supervisorName && (
                  <p
                    className="text-sm text-muted-foreground break-words"
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
                title="No proposal"
                description="Submit a proposal once your team is ready."
                action={
                  team ? (
                    <Button size="sm" asChild>
                      <Link href="/student/proposal">Create Proposal</Link>
                    </Button>
                  ) : undefined
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deliverables</CardTitle>
            <CardDescription>From your supervisor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {deliverables.length > 0 ? (
              deliverables.slice(0, 5).map((d) => (
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
          <CardHeader>
            <CardTitle>Upcoming Evaluations</CardTitle>
            <CardDescription>Scheduled evaluation events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {evaluations.length > 0 ? (
              evaluations.slice(0, 5).map((item) => (
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
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Team Announcements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.announcements.length > 0 ? (
              <ScrollableFeed>
                {data.announcements.map((a) => (
                  <div key={a.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{a.title}</p>
                    <p className="line-clamp-2 text-muted-foreground">{a.message}</p>
                  </div>
                ))}
              </ScrollableFeed>
            ) : (
              <p className="text-sm text-muted-foreground">No announcements.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.meetings.length > 0 ? (
              <ScrollableFeed>
                {data.meetings.map((m) => (
                  <div key={m.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{m.title}</p>
                    <p className="text-muted-foreground">
                      {formatDateTime(m.meetingDate)}
                    </p>
                  </div>
                ))}
              </ScrollableFeed>
            ) : (
              <p className="text-sm text-muted-foreground">No meetings scheduled.</p>
            )}
          </CardContent>
        </Card>

        <RecentActivityFeed
          className="lg:col-span-2"
          recentActivity={data.recentActivity}
        />
      </div>
    </div>
  );
}
