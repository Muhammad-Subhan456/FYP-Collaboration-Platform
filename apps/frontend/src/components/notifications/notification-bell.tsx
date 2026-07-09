"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import {
  getNotificationIcon,
  isNotificationActionable,
  resolveNotificationHref,
} from "@/lib/notification-navigation";
import {
  useUnreadNotifications,
  useUnreadNotificationsPreview,
} from "@/hooks/use-unread-notifications";
import { useAuth } from "@/providers/auth-provider";
import { notificationService } from "@/services/notification.service";
import { queryKeys } from "@/lib/react-query";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import type { Notification } from "@/types/student";

interface NotificationBellProps {
  role: UserRole;
}

function getNotificationPath(role: UserRole) {
  return `/${role.toLowerCase()}/notifications`;
}

export function NotificationBell({ role }: NotificationBellProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const unreadCountQuery = useUnreadNotifications();
  const previewQuery = useUnreadNotificationsPreview();
  const unreadCount = unreadCountQuery.data?.count ?? 0;
  const notifications = previewQuery.data?.data ?? [];

  const handleNotificationClick = async (notification: Notification) => {
    const href = resolveNotificationHref(notification);

    try {
      if (!notification.isRead) {
        await notificationService.markAsRead(notification.id);
        void queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.unreadCount(
            user?.userId,
            user?.workspaceId,
          ),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.unreadPreview(
            user?.userId,
            user?.workspaceId,
          ),
        });
        void queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey[1] === "me" &&
            (user?.workspaceId == null ||
              query.queryKey.includes(user.workspaceId)),
        });
      }
    } catch {
      // Continue navigation even if mark-as-read fails.
    }

    if (href) {
      router.push(href);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center px-1 text-[10px]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="font-medium">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount} unread
            </p>
          </div>
          <Button variant="link" className="h-auto px-0 text-xs" asChild>
            <Link href={getNotificationPath(role)}>View all</Link>
          </Button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {previewQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No unread notifications
            </p>
          ) : (
            <ul className="divide-y">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification);
                const actionable = isNotificationActionable(notification);

                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                        actionable && "cursor-pointer",
                      )}
                      onClick={() =>
                        actionable && handleNotificationClick(notification)
                      }
                      disabled={!actionable}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-snug">
                            {notification.title}
                          </p>
                          {actionable && (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatDateTime(notification.createdAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
