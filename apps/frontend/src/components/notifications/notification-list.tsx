"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CheckCheck, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import {
  getNotificationIcon,
  isNotificationActionable,
  resolveNotificationHref,
} from "@/lib/notification-navigation";
import { useStudentNotificationMutations } from "@/mutations/student";
import { useCoordinatorNotificationMutations } from "@/mutations/coordinator";
import { useSupervisorNotificationMutations } from "@/mutations/supervisor";
import {
  isStudentQueryPending,
  useStudentNotificationsQuery,
} from "@/queries/student";
import {
  isCoordinatorQueryInitialLoading,
  useCoordinatorNotificationsQuery,
} from "@/queries/coordinator";
import {
  isSupervisorQueryInitialLoading,
  useSupervisorNotificationsQuery,
} from "@/queries/supervisor";
import { notificationService } from "@/services/notification.service";
import type { NotificationReadFilter } from "@/services/notification.service";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/student";
import type { PaginatedResponse } from "@/types";

interface NotificationListProps {
  fetchNotifications?: (
    page: number,
    limit: number,
    readFilter?: NotificationReadFilter,
  ) => Promise<PaginatedResponse<Notification>>;
  queryKeyPrefix?: string;
}

export function NotificationList({
  fetchNotifications = notificationService.getMyNotifications,
  queryKeyPrefix = "notifications",
}: NotificationListProps) {
  if (queryKeyPrefix === "student") {
    return <StudentNotificationsList />;
  }

  if (queryKeyPrefix === "supervisor") {
    return <SupervisorNotificationsList />;
  }

  if (queryKeyPrefix === "coordinator") {
    return <CoordinatorNotificationsList />;
  }

  return (
    <GenericNotificationsList
      fetchNotifications={fetchNotifications}
      queryKeyPrefix={queryKeyPrefix}
    />
  );
}

function StudentNotificationsList() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [readFilter, setReadFilter] =
    useState<NotificationReadFilter>("all");
  const notificationsQuery = useStudentNotificationsQuery(
    page,
    20,
    readFilter,
  );
  const { markReadMutation, markAllMutation } =
    useStudentNotificationMutations();

  const handleNotificationClick = async (notification: Notification) => {
    const href = resolveNotificationHref(notification);

    try {
      if (!notification.isRead) {
        await markReadMutation.mutateAsync(notification.id);
      }
    } catch {
      // Navigation should still proceed when mark-as-read fails.
    }

    if (href) {
      router.push(href);
    }
  };

  if (isStudentQueryPending(notificationsQuery)) {
    return <DashboardSkeleton />;
  }

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
    <NotificationListContent
      notifications={notifications}
      meta={meta}
      page={page}
      readFilter={readFilter}
      onReadFilterChange={(filter) => {
        setReadFilter(filter);
        setPage(1);
      }}
      onPageChange={setPage}
      onNotificationClick={handleNotificationClick}
      onMarkAll={() => markAllMutation.mutate()}
      isMarkAllPending={markAllMutation.isPending}
    />
  );
}

function SupervisorNotificationsList() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [readFilter, setReadFilter] =
    useState<NotificationReadFilter>("all");
  const notificationsQuery = useSupervisorNotificationsQuery(
    page,
    20,
    readFilter,
  );
  const { markReadMutation, markAllMutation } =
    useSupervisorNotificationMutations();

  const handleNotificationClick = async (notification: Notification) => {
    const href = resolveNotificationHref(notification);

    try {
      if (!notification.isRead) {
        await markReadMutation.mutateAsync(notification.id);
      }
    } catch {
      // Navigation should still proceed when mark-as-read fails.
    }

    if (href) {
      router.push(href);
    }
  };

  if (isSupervisorQueryInitialLoading(notificationsQuery)) {
    return <DashboardSkeleton />;
  }

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
    <NotificationListContent
      notifications={notifications}
      meta={meta}
      page={page}
      readFilter={readFilter}
      onReadFilterChange={(filter) => {
        setReadFilter(filter);
        setPage(1);
      }}
      onPageChange={setPage}
      onNotificationClick={handleNotificationClick}
      onMarkAll={() => markAllMutation.mutate()}
      isMarkAllPending={markAllMutation.isPending}
    />
  );
}

function CoordinatorNotificationsList() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [readFilter, setReadFilter] =
    useState<NotificationReadFilter>("all");
  const notificationsQuery = useCoordinatorNotificationsQuery(
    page,
    20,
    readFilter,
  );
  const { markReadMutation, markAllMutation } =
    useCoordinatorNotificationMutations();

  const handleNotificationClick = async (notification: Notification) => {
    const href = resolveNotificationHref(notification);

    try {
      if (!notification.isRead) {
        await markReadMutation.mutateAsync(notification.id);
      }
    } catch {
      // Navigation should still proceed when mark-as-read fails.
    }

    if (href) {
      router.push(href);
    }
  };

  if (isCoordinatorQueryInitialLoading(notificationsQuery)) {
    return <DashboardSkeleton />;
  }

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
    <NotificationListContent
      notifications={notifications}
      meta={meta}
      page={page}
      readFilter={readFilter}
      onReadFilterChange={(filter) => {
        setReadFilter(filter);
        setPage(1);
      }}
      onPageChange={setPage}
      onNotificationClick={handleNotificationClick}
      onMarkAll={() => markAllMutation.mutate()}
      isMarkAllPending={markAllMutation.isPending}
    />
  );
}

function GenericNotificationsList({
  fetchNotifications,
  queryKeyPrefix,
}: Required<Pick<NotificationListProps, "fetchNotifications" | "queryKeyPrefix">>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [readFilter, setReadFilter] =
    useState<NotificationReadFilter>("all");

  const notificationsQuery = useQuery({
    queryKey: [queryKeyPrefix, "me", page, readFilter, user?.workspaceId ?? null],
    queryFn: () => fetchNotifications(page, 20, readFilter),
    placeholderData: keepPreviousData,
  });

  const markReadMutation = useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const markAllMutation = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleNotificationClick = async (notification: Notification) => {
    const href = resolveNotificationHref(notification);

    try {
      if (!notification.isRead) {
        await markReadMutation.mutateAsync(notification.id);
      }
    } catch {
      // Navigation should still proceed when mark-as-read fails.
    }

    if (href) {
      router.push(href);
    }
  };

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
    <NotificationListContent
      notifications={notifications}
      meta={meta}
      page={page}
      readFilter={readFilter}
      onReadFilterChange={(filter) => {
        setReadFilter(filter);
        setPage(1);
      }}
      onPageChange={setPage}
      onNotificationClick={handleNotificationClick}
      onMarkAll={() => markAllMutation.mutate()}
      isMarkAllPending={markAllMutation.isPending}
    />
  );
}

interface NotificationListContentProps {
  notifications: Notification[];
  meta: PaginatedResponse<Notification>["meta"];
  page: number;
  readFilter: NotificationReadFilter;
  onReadFilterChange: (filter: NotificationReadFilter) => void;
  onPageChange: (page: number) => void;
  onNotificationClick: (notification: Notification) => void;
  onMarkAll: () => void;
  isMarkAllPending: boolean;
}

function NotificationListContent({
  notifications,
  meta,
  page,
  readFilter,
  onReadFilterChange,
  onPageChange,
  onNotificationClick,
  onMarkAll,
  isMarkAllPending,
}: NotificationListContentProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
            onClick={onMarkAll}
            disabled={isMarkAllPending}
          >
            {isMarkAllPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Mark all read
          </Button>
        )}
      </div>

      <Tabs
        value={readFilter}
        onValueChange={(value) =>
          onReadFilterChange(value as NotificationReadFilter)
        }
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="read">Read</TabsTrigger>
        </TabsList>
      </Tabs>

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="You're all caught up! New alerts will appear here."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification);
            const actionable = isNotificationActionable(notification);

            return (
              <Card
                key={notification.id}
                className={cn(
                  "transition-all",
                  actionable && "cursor-pointer hover:shadow-sm",
                  !notification.isRead && "border-primary/30 bg-primary/5",
                )}
                onClick={() =>
                  actionable && onNotificationClick(notification)
                }
              >
                <CardContent className="flex gap-4 p-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      notification.isRead ? "bg-muted" : "bg-primary/10",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        notification.isRead
                          ? "text-muted-foreground"
                          : "text-primary",
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "font-medium",
                          !notification.isRead && "text-foreground",
                        )}
                      >
                        {notification.title}
                      </p>
                      <div className="flex shrink-0 items-center gap-2">
                        {!notification.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                        {actionable && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
