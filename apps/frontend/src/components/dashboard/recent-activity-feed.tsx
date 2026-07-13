"use client";

import Link from "next/link";
import { Activity } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { useRecentActivityFeedQuery } from "@/queries/shared";
import type { ActivityLog, Notification } from "@/types/student";
import type { PaginatedResponse } from "@/types";

interface RecentActivityFeedProps {
  fetchLimit?: number;
  className?: string;
  /** When set, only the first N merged items are shown. */
  displayLimit?: number;
  viewAllHref?: string;
  recentActivity?: {
    notifications: PaginatedResponse<Notification>;
    activityLogs: ActivityLog[];
  };
}

export function RecentActivityFeed({
  fetchLimit = 20,
  className,
  displayLimit,
  viewAllHref,
  recentActivity,
}: RecentActivityFeedProps) {
  const { notificationsQuery, activityQuery } = useRecentActivityFeedQuery(
    fetchLimit,
    !recentActivity,
  );

  const notificationItems =
    (recentActivity?.notifications.data ??
      notificationsQuery.data?.data)?.map((item) => ({
      id: `notification-${item.id}`,
      title: item.title,
      description: item.message,
      createdAt: item.createdAt,
    })) ?? [];

  const activityItems =
    (recentActivity?.activityLogs ?? activityQuery.data)?.map((item) => ({
      id: `activity-${item.id}`,
      title: item.title,
      description: item.description ?? "",
      createdAt: item.createdAt,
    })) ?? [];

  const allItems = [...notificationItems, ...activityItems].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const items =
    typeof displayLimit === "number"
      ? allItems.slice(0, displayLimit)
      : allItems;

  const isLoading =
    !recentActivity &&
    (notificationsQuery.isLoading || activityQuery.isLoading);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
        {viewAllHref ? (
          <Button variant="ghost" size="sm" className="shrink-0" asChild>
            <Link href={viewAllHref}>View all</Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading activity...</p>
        ) : items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">{item.title}</p>
                {item.description && (
                  <p className="line-clamp-2 text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDateTime(item.createdAt)}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No recent activity yet. Updates will appear here as you use FOASIS.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
