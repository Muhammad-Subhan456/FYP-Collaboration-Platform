"use client";

import { NotificationList } from "@/components/notifications/notification-list";
import { coordinatorPageService } from "@/services/coordinator-page.service";

export default function CoordinatorNotificationsPage() {
  return (
    <NotificationList
      fetchNotifications={coordinatorPageService.getNotifications}
      queryKeyPrefix="coordinator"
    />
  );
}
