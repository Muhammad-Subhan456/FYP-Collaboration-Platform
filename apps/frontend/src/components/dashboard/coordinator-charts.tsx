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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CHART_COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];
const CHART_HEIGHT = 288;

interface CoordinatorChartData {
  users?: {
    totalStudents?: number;
    totalSupervisors?: number;
    totalCoordinators?: number;
  };
  proposals?: {
    pending?: number;
    approved?: number;
    rejected?: number;
    total?: number;
    totalProposals?: number;
    assignedProposals?: number;
  };
  progress?: {
    pendingSubmissions?: number;
    approvedSubmissions?: number;
    rejectedSubmissions?: number;
  };
}

function ChartContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[288px] w-full min-w-0">
      {children}
    </div>
  );
}

export function CoordinatorCharts({ data }: { data: CoordinatorChartData }) {
  const users = data.users ?? {};
  const proposals = data.proposals ?? {};
  const progress = data.progress ?? {};

  const proposalChartData = [
    {
      name: "Pending review",
      value: proposals.pending ?? proposals.assignedProposals ?? 0,
    },
    { name: "Approved", value: proposals.approved ?? 0 },
    { name: "Rejected", value: proposals.rejected ?? 0 },
  ].filter((d) => d.value > 0);

  const submissionChartData = [
    { name: "Pending", count: progress.pendingSubmissions ?? 0 },
    { name: "Approved", count: progress.approvedSubmissions ?? 0 },
    { name: "Rejected", count: progress.rejectedSubmissions ?? 0 },
  ];

  const userChartData = [
    { name: "Students", count: users.totalStudents ?? 0 },
    { name: "Supervisors", count: users.totalSupervisors ?? 0 },
    { name: "Coordinators", count: users.totalCoordinators ?? 0 },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>User Distribution</CardTitle>
          <CardDescription>Students, supervisors, coordinators</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={userChartData}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proposal Status</CardTitle>
          <CardDescription>Distribution by approval status</CardDescription>
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

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Submission Statistics</CardTitle>
          <CardDescription>Review status across all submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={submissionChartData}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
