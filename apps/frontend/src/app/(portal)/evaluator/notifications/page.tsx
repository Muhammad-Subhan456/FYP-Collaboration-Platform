"use client";

import { NotificationList } from "@/components/notifications/notification-list";
import { evaluatorPageService } from "@/services/evaluator-page.service";

export default function EvaluatorNotificationsPage() {
  return (
    <NotificationList
      fetchNotifications={evaluatorPageService.getNotifications}
      queryKeyPrefix="evaluator"
    />
  );
}
