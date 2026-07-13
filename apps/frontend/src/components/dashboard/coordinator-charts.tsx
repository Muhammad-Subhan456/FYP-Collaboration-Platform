"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Award,
  FileCheck,
  FileStack,
  Layers,
  Users,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CoordinatorAnalyticsData } from "@/services/coordinator-page.service";

const CHART_COLORS = ["#0f766e", "#0369a1", "#b45309", "#be123c", "#4338ca", "#15803d"];
const CHART_HEIGHT = 288;

function ChartContainer({ children }: { children: React.ReactNode }) {
  return <div className="h-[288px] w-full min-w-0">{children}</div>;
}

function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function toChartRows(
  record: Record<string, number>,
  labels: Record<string, string>,
) {
  return Object.entries(record)
    .map(([key, value]) => ({
      name: labels[key] ?? key,
      value,
      count: value,
    }))
    .filter((row) => row.value > 0);
}

const PROPOSAL_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_SUPERVISOR: "Awaiting supervisor",
  SUPERVISOR_ASSIGNED: "With supervisor",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  IGNORED: "Ignored",
};

const SUBMISSION_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  CHANGES_REQUIRED: "Changes required",
  APPROVED: "Approved",
  FINALIZED: "Finalized",
};

const EVALUATION_LABELS: Record<string, string> = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
};

const PHASE_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  PUBLISHED: "Published",
};

export function CoordinatorCharts({ data }: { data: CoordinatorAnalyticsData }) {
  const summary = data.summary ?? {
    totalTeams: 0,
    activePhases: 0,
    deliverableTemplates: 0,
    lockedTemplates: 0,
    activeDeliverables: 0,
    pendingEvaluations: 0,
    finalizedSubmissions: 0,
    publishedPhaseResults: 0,
  };
  const users = data.users ?? {};
  const templates = data.templates ?? { total: 0, locked: 0, unlocked: 0 };

  const userChartData = [
    { name: "Students", count: users.totalStudents ?? 0 },
    { name: "Supervisors", count: users.totalSupervisors ?? 0 },
    { name: "Coordinators", count: users.totalCoordinators ?? 0 },
    { name: "Evaluators", count: users.totalEvaluators ?? 0 },
  ];

  const proposalChartData = toChartRows(
    data.proposalsByStatus ?? {},
    PROPOSAL_LABELS,
  );
  const submissionChartData = Object.entries(data.submissionsByStatus ?? {}).map(
    ([key, count]) => ({
      name: SUBMISSION_LABELS[key] ?? key,
      count,
    }),
  );
  const evaluationChartData = Object.entries(
    data.evaluationsByStatus ?? {},
  ).map(([key, count]) => ({
    name: EVALUATION_LABELS[key] ?? key,
    count,
  }));
  const phaseChartData = toChartRows(data.phasesByStatus ?? {}, PHASE_LABELS);
  const templateChartData = [
    { name: "Available", count: templates.unlocked ?? 0 },
    { name: "Locked / published", count: templates.locked ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Program Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Live FOASIS workflow metrics for this workspace
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Teams"
          value={summary.totalTeams}
          hint="Active FYP teams"
          icon={Users}
        />
        <KpiCard
          title="Active phases"
          value={summary.activePhases}
          hint={`${summary.deliverableTemplates} deliverable templates`}
          icon={Layers}
        />
        <KpiCard
          title="Active deliverables"
          value={summary.activeDeliverables}
          hint={`${summary.finalizedSubmissions} finalized submissions`}
          icon={FileStack}
        />
        <KpiCard
          title="Pending evaluations"
          value={summary.pendingEvaluations}
          hint={`${summary.publishedPhaseResults} GPA/result rows`}
          icon={Award}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Membership distribution</CardTitle>
            <CardDescription>
              Active workspace roles across FOASIS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={userChartData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0f766e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proposal pipeline</CardTitle>
            <CardDescription>Current proposal workflow statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {proposalChartData.length > 0 ? (
              <ChartContainer>
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <PieChart>
                    <Pie
                      data={proposalChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {proposalChartData.map((entry, i) => (
                        <Cell
                          key={entry.name}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="flex h-[288px] items-center justify-center text-sm text-muted-foreground">
                No proposal data yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submission workflow</CardTitle>
            <CardDescription>
              Deliverable submissions by review state
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={submissionChartData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0369a1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evaluation assignments</CardTitle>
            <CardDescription>
              Deliverable evaluation progress for assigned evaluators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={evaluationChartData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#b45309" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phases</CardTitle>
            <CardDescription>Program phase configuration status</CardDescription>
          </CardHeader>
          <CardContent>
            {phaseChartData.length > 0 ? (
              <ChartContainer>
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <PieChart>
                    <Pie
                      data={phaseChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {phaseChartData.map((entry, i) => (
                        <Cell
                          key={entry.name}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="flex h-[288px] items-center justify-center text-sm text-muted-foreground">
                No phases configured yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deliverable templates</CardTitle>
            <CardDescription>
              Templates available for supervisors to publish to teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={templateChartData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4338ca" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <FileCheck className="h-3.5 w-3.5" />
              {templates.total} total · {templates.locked} locked after publish
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
