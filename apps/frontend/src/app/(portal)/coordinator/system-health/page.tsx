"use client";

import { CheckCircle2, Loader2, RefreshCw, Server, XCircle } from "lucide-react";

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
import { useCoordinatorPageQuery } from "@/hooks/use-coordinator-page";
import { coordinatorPageService } from "@/services/coordinator-page.service";

export default function CoordinatorSystemHealthPage() {
  const pageQuery = useCoordinatorPageQuery(
    "system-health",
    coordinatorPageService.getSystemHealth,
    { refetchInterval: 30_000 },
  );

  if (pageQuery.isLoading) return <DashboardSkeleton />;

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">System Health</h2>
          <p className="text-sm text-muted-foreground">
            Live status of the FOASIS backend and database
          </p>
        </div>
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
                  <StatusBadge
                    status={isHealthy ? "ACTIVE" : "REJECTED"}
                  />
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
