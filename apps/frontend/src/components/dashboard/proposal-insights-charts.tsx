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
import { Layers, Sparkles, Target, Trophy } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sdgLabel } from "@/constants/proposal";
import type { ProposalInsights } from "@/services/coordinator-page.service";

const CHART_COLORS = [
  "#0f766e",
  "#0369a1",
  "#b45309",
  "#be123c",
  "#4338ca",
  "#15803d",
];
const CHART_HEIGHT = 288;

function truncate(text: string, max = 22) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function InsightKpi({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string | number;
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
        <div className="truncate text-2xl font-bold" title={String(value)}>
          {value}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <p className="flex h-[288px] items-center justify-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}

export function ProposalInsightsCharts({
  insights,
}: {
  insights: ProposalInsights;
}) {
  const { domains, sdgs, crossAnalysis } = insights;

  const domainBars = domains.perDomain.slice(0, 10).map((row) => ({
    name: truncate(row.domain),
    full: row.domain,
    count: row.count,
  }));

  const sdgBars = [...sdgs.perSdg]
    .sort((a, b) => a.sdg - b.sdg)
    .map((row) => ({
      name: `SDG ${row.sdg}`,
      full: sdgLabel(row.sdg),
      count: row.count,
    }));

  const diversityData = [
    { name: "Single-domain", value: domains.singleDomainProjects },
    { name: "Multi-domain", value: domains.multiDomainProjects },
  ].filter((row) => row.value > 0);

  const crossBars = crossAnalysis.map((row) => ({
    name: `${truncate(row.domain, 16)} · SDG ${row.sdg}`,
    full: `${row.domain} × ${sdgLabel(row.sdg)}`,
    count: row.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Proposal Insights</h2>
        <p className="text-sm text-muted-foreground">
          Project domains & Sustainable Development Goals across{" "}
          {insights.totalProposals} proposal
          {insights.totalProposals === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InsightKpi
          title="Most popular domain"
          value={domains.mostPopular ?? "—"}
          hint={`${domains.projectsWithDomains} projects with a domain`}
          icon={Trophy}
        />
        <InsightKpi
          title="Most selected SDG"
          value={sdgs.mostSelected ? `SDG ${sdgs.mostSelected}` : "—"}
          hint={
            sdgs.mostSelected ? sdgLabel(sdgs.mostSelected) : "No SDGs selected"
          }
          icon={Target}
        />
        <InsightKpi
          title="Multi-domain projects"
          value={domains.multiDomainProjects}
          hint={`Avg ${domains.avgDomainsPerProject} domains / project`}
          icon={Layers}
        />
        <InsightKpi
          title="SDG engagement"
          value={sdgs.projectsWithSdgs}
          hint={`Avg ${sdgs.avgSdgsPerProject} SDGs / project`}
          icon={Sparkles}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Projects per domain</CardTitle>
            <CardDescription>
              Top project domains (Other specified: {domains.otherCount})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {domainBars.length > 0 ? (
              <div className="h-[288px] w-full min-w-0">
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <BarChart
                    layout="vertical"
                    data={domainBars}
                    margin={{ left: 8, right: 16 }}
                  >
                    <XAxis type="number" allowDecimals={false} fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      fontSize={11}
                    />
                    <Tooltip
                      formatter={(value) => [value, "Projects"]}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.full ?? ""
                      }
                    />
                    <Bar dataKey="count" fill="#0f766e" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="No domain data yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SDG distribution</CardTitle>
            <CardDescription>
              Projects contributing to each Sustainable Development Goal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sdgBars.length > 0 ? (
              <div className="h-[288px] w-full min-w-0">
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <BarChart data={sdgBars}>
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip
                      formatter={(value) => [value, "Projects"]}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.full ?? ""
                      }
                    />
                    <Bar dataKey="count" fill="#0369a1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="No SDG data yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Domain diversity</CardTitle>
            <CardDescription>
              Single-domain vs multi-domain projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {diversityData.length > 0 ? (
              <div className="h-[288px] w-full min-w-0">
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <PieChart>
                    <Pie
                      data={diversityData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {diversityData.map((entry, i) => (
                        <Cell
                          key={entry.name}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="No domain data yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top domain × SDG pairs</CardTitle>
            <CardDescription>
              Most common domain and SDG combinations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {crossBars.length > 0 ? (
              <div className="h-[288px] w-full min-w-0">
                <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                  <BarChart
                    layout="vertical"
                    data={crossBars}
                    margin={{ left: 8, right: 16 }}
                  >
                    <XAxis type="number" allowDecimals={false} fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={160}
                      fontSize={10}
                    />
                    <Tooltip
                      formatter={(value) => [value, "Projects"]}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.full ?? ""
                      }
                    />
                    <Bar dataKey="count" fill="#4338ca" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="No cross-analysis data yet." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
