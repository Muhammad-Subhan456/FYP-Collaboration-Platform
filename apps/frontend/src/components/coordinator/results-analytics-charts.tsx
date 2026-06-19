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

const CHART_COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b"];
const CHART_HEIGHT = 260;

export interface ResultOverviewRow {
  evaluationId: string;
  evaluationTitle: string;
  teamId: string;
  marks: number | null;
  evaluated: boolean;
}

function ChartContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[260px] w-full min-w-0">{children}</div>
  );
}

export function ResultsAnalyticsCharts({
  rows,
  teamNameById,
}: {
  rows: ResultOverviewRow[];
  teamNameById: Map<string, string>;
}) {
  const evaluatedRows = rows.filter((row) => row.evaluated && row.marks !== null);
  const marks = evaluatedRows.map((row) => row.marks as number);
  const average =
    marks.length > 0
      ? Math.round(
          marks.reduce((sum, value) => sum + value, 0) / marks.length,
        )
      : 0;
  const highest = marks.length > 0 ? Math.max(...marks) : 0;
  const lowest = marks.length > 0 ? Math.min(...marks) : 0;
  const completionRate =
    rows.length > 0
      ? Math.round((evaluatedRows.length / rows.length) * 100)
      : 0;

  const evaluationGroups = rows.reduce<
    Record<string, { total: number; evaluated: number }>
  >((acc, row) => {
    if (!acc[row.evaluationTitle]) {
      acc[row.evaluationTitle] = { total: 0, evaluated: 0 };
    }
    acc[row.evaluationTitle].total += 1;
    if (row.evaluated) {
      acc[row.evaluationTitle].evaluated += 1;
    }
    return acc;
  }, {});

  const completionChartData = Object.entries(evaluationGroups).map(
    ([name, stats]) => ({
      name,
      rate: Math.round((stats.evaluated / stats.total) * 100),
    }),
  );

  const marksByEvaluation = evaluatedRows.reduce<Record<string, number[]>>(
    (acc, row) => {
      if (!acc[row.evaluationTitle]) {
        acc[row.evaluationTitle] = [];
      }
      acc[row.evaluationTitle].push(row.marks as number);
      return acc;
    },
    {},
  );

  const averageMarksChartData = Object.entries(marksByEvaluation).map(
    ([name, values]) => ({
      name,
      average: Math.round(
        values.reduce((sum, value) => sum + value, 0) / values.length,
      ),
    }),
  );

  const topTeams = [...evaluatedRows]
    .sort((a, b) => (b.marks ?? 0) - (a.marks ?? 0))
    .slice(0, 5)
    .map((row) => ({
      name: teamNameById.get(row.teamId) ?? "Unknown Team",
      marks: row.marks ?? 0,
    }));

  const summaryCards = [
    { label: "Average Marks", value: average },
    { label: "Highest Marks", value: highest },
    { label: "Lowest Marks", value: lowest },
    { label: "Completion Rate", value: `${completionRate}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-3xl">{card.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average Marks by Evaluation</CardTitle>
            <CardDescription>Mean score across evaluated teams</CardDescription>
          </CardHeader>
          <CardContent>
            {averageMarksChartData.length > 0 ? (
              <ChartContainer>
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <BarChart data={averageMarksChartData}>
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="average" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                No evaluated results yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evaluation Completion Rate</CardTitle>
            <CardDescription>Percentage of teams with published marks</CardDescription>
          </CardHeader>
          <CardContent>
            {completionChartData.length > 0 ? (
              <ChartContainer>
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <PieChart>
                    <Pie
                      data={completionChartData}
                      dataKey="rate"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {completionChartData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                No evaluation assignments yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top Performing Teams</CardTitle>
            <CardDescription>Highest marks across all evaluations</CardDescription>
          </CardHeader>
          <CardContent>
            {topTeams.length > 0 ? (
              <ChartContainer>
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <BarChart data={topTeams}>
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="marks" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                No marks recorded yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
