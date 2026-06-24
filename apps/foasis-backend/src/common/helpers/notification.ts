export async function sendNotification(payload: {
  authUserId: string;
  title: string;
  message: string;
  type: string;
  route: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  if (!process.env.NOTIFICATION_SERVICE_URL) {
    return;
  }

  try {
    await fetch(
      `${process.env.NOTIFICATION_SERVICE_URL}/notifications`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Api-Key':
            process.env.INTERNAL_API_KEY ?? '',
        },
        body: JSON.stringify(payload),
      },
    );
  } catch {
    // Non-blocking
  }
}
