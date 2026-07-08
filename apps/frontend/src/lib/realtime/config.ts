function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Resolves the Socket.IO server origin (no namespace path).
 * Defaults to the REST API host so WS and HTTP stay aligned.
 */
export function getRealtimeServerUrl(): string {
  const apiUrl = stripTrailingSlash(
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
  );

  const configuredWs = process.env.NEXT_PUBLIC_WS_URL
    ? stripTrailingSlash(process.env.NEXT_PUBLIC_WS_URL)
    : null;

  if (!configuredWs) {
    return apiUrl;
  }

  // Common misconfiguration: REST via dev tunnel / remote host, WS still on localhost.
  const apiIsLocal =
    apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1");
  const wsIsLocal =
    configuredWs.includes("localhost") ||
    configuredWs.includes("127.0.0.1");

  if (wsIsLocal && !apiIsLocal) {
    return apiUrl;
  }

  return configuredWs;
}
