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

function dashboardRouteForRole(role: string): string {
  switch (role) {
    case 'SUPERVISOR':
      return '/supervisor/dashboard';
    case 'COORDINATOR':
      return '/coordinator/dashboard';
    case 'EVALUATOR':
      return '/evaluator/dashboard';
    case 'SUPER_ADMIN':
      return '/super-admin/workspaces';
    default:
      return '/student/dashboard';
  }
}

export function buildRoleNotification(
  authUserId: string,
  role: string,
  title: string,
  message: string,
  type: string,
): NotificationPayload {
  return buildNotification({
    authUserId,
    title,
    message,
    type,
    route: dashboardRouteForRole(role),
  });
}
