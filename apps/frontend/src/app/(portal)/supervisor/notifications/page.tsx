"use client";

import { NotificationList } from "@/components/notifications/notification-list";
import { supervisorPageService } from "@/services/supervisor-page.service";

export default function SupervisorNotificationsPage() {
  return (
    <NotificationList
      fetchNotifications={supervisorPageService.getNotifications}
      queryKeyPrefix="supervisor"
    />
  );
}
