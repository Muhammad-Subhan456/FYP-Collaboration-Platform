"use client";

import { NotificationList } from "@/components/notifications/notification-list";
import { studentService } from "@/services/student.service";

export default function StudentNotificationsPage() {
  return (
    <NotificationList
      fetchNotifications={studentService.getNotifications}
      queryKeyPrefix="student"
    />
  );
}
