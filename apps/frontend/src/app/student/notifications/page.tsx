"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { notificationService } from "@/services/notification.service";
import { cn } from "@/lib/utils";

export default function StudentNotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const notificationsQuery = useQuery({
    queryKey: ["notifications", "me", page],
    queryFn: () => notificationService.getMyNotifications(page, 20),
  });

  const markReadMutation = useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const markAllMutation = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (notificationsQuery.isLoading) return <DashboardSkeleton />;

  if (notificationsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(notificationsQuery.error)}
        onRetry={() => notificationsQuery.refetch()}
      />
    );
  }

  const { data: notifications, meta } = notificationsQuery.data!;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground">
            {meta.total} total · Page {meta.page} of {meta.totalPages || 1}
          </p>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            {markAllMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="You're all caught up! New alerts will appear here."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-sm",
                !n.isRead && "border-primary/30 bg-primary/5",
              )}
              onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
            >
              <CardContent className="flex gap-4 p-4">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    n.isRead ? "bg-muted" : "bg-primary/10",
                  )}
                >
                  <Bell
                    className={cn(
                      "h-4 w-4",
                      n.isRead ? "text-muted-foreground" : "text-primary",
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("font-medium", !n.isRead && "text-foreground")}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
