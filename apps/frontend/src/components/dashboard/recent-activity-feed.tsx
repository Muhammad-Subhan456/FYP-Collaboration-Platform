"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";

import { ScrollableFeed } from "@/components/common/scrollable-feed";
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
  recentActivity?: {
    notifications: PaginatedResponse<Notification>;
    activityLogs: ActivityLog[];
  };
}

export function RecentActivityFeed({
  fetchLimit = 20,
  className,
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

  const items = [...notificationItems, ...activityItems].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const isLoading =
    !recentActivity &&
    (notificationsQuery.isLoading || activityQuery.isLoading);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading activity...</p>
        ) : items.length > 0 ? (
          <ScrollableFeed>
            {items.map((item) => (
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
            ))}
          </ScrollableFeed>
        ) : (
          <p className="text-sm text-muted-foreground">
            No recent activity yet. Updates will appear here as you use FOASIS.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
