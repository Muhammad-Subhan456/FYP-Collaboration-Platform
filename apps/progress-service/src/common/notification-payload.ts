export interface NotificationPayload {
  authUserId: string;
  title: string;
  message: string;
  type: string;
  entityType?: string;
  entityId?: string;
  route: string;
}

export function buildNotification(
  payload: NotificationPayload,
): NotificationPayload {
  return payload;
}
