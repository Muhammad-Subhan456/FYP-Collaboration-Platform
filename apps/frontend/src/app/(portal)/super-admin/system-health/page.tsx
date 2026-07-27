"use client";

import { CheckCircle2, Loader2, RefreshCw, Server, Users, XCircle } from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { ErrorState } from "@/components/common/state-blocks";
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
import { useSystemHealthQuery } from "@/queries/super-admin/use-system-health";

const ROLE_COLORS: Record<string, string> = {
  STUDENT: "#0f766e",
  SUPERVISOR: "#1d4ed8",
  COORDINATOR: "#b45309",
  EVALUATOR: "#7c3aed",
};

export default function SuperAdminSystemHealthPage() {
  const pageQuery = useSystemHealthQuery();

  if (pageQuery.isLoading && !pageQuery.data) return <DashboardSkeleton />;

  if (pageQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(pageQuery.error)}
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  const health = pageQuery.data!;
  const services = health.services ?? [];
  const healthyCount = services.filter((s) => s.status === "ok").length;
  const registeredUsers = health.registeredUsers ?? 0;
  const chartData = (health.usersByRole ?? []).map((row) => ({
    name: row.role,
    value: row.count,
    color: ROLE_COLORS[row.role] ?? "#64748b",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <Button
          variant="outline"
          onClick={() => pageQuery.refetch()}
          disabled={pageQuery.isFetching}
        >
          {pageQuery.isFetching ? (
            <Loader2 className="animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="h-4 w-4" />
              Platform overview
            </CardTitle>
            <CardDescription>
              Last checked {formatDateTime(health.timestamp)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <StatusBadge
              status={health.status === "ok" ? "ACTIVE" : "CHANGES_REQUIRED"}
            />
            <span className="text-sm text-muted-foreground">
              {healthyCount} of {services.length} services healthy
            </span>
            <span className="text-sm text-muted-foreground">
              Backend: {health.service}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Registered users
            </CardTitle>
            <CardDescription>
              Total accounts across all workspaces
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mx-auto h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={
                      chartData.length > 0
                        ? chartData
                        : [{ name: "Users", value: registeredUsers || 1, color: "#0f766e" }]
                    }
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={72}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {(chartData.length > 0
                      ? chartData
                      : [{ name: "Users", value: registeredUsers || 1, color: "#0f766e" }]
                    ).map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value}`, "Users"]}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-semibold tabular-nums">
                  {registeredUsers}
                </span>
                <span className="text-xs text-muted-foreground">total</span>
              </div>
            </div>
            {chartData.length > 0 ? (
              <ul className="mt-4 space-y-1 text-sm">
                {chartData.map((row) => (
                  <li
                    key={row.name}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      {row.name}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
          const isHealthy = service.status === "ok";
          return (
            <Card key={service.name}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span>{service.name}</span>
                  {isHealthy ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={isHealthy ? "ACTIVE" : "REJECTED"} />
                </div>
                {service.database && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Database</span>
                    <span className="font-medium capitalize">
                      {service.database}
                    </span>
                  </div>
                )}
                {service.timestamp && (
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(service.timestamp)}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
