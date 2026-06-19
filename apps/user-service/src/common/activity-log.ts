export async function logActivity(
  authUserId: string,
  title: string,
  description?: string,
): Promise<void> {
  if (!process.env.PROGRESS_SERVICE_URL) {
    return;
  }

  try {
    await fetch(
      `${process.env.PROGRESS_SERVICE_URL}/activity-logs/internal`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Api-Key':
            process.env.INTERNAL_API_KEY ?? '',
        },
        body: JSON.stringify({
          authUserId,
          title,
          description,
        }),
      },
    );
  } catch {
    // Non-blocking
  }
}
