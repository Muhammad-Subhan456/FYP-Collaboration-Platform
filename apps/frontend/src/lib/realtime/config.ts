function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function isLocalHost(url: string): boolean {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

/**
 * Socket.IO connects to origin + `/realtime` namespace (engine path `/socket.io`).
 * When REST is served under `/api` (Nginx), strip that prefix so WS stays on the page origin.
 */
function originFromApiUrl(apiUrl: string): string {
  if (apiUrl.startsWith("/")) {
    return typeof window !== "undefined" ? window.location.origin : "";
  }

  try {
    const parsed = new URL(apiUrl);
    const path = stripTrailingSlash(parsed.pathname);
    if (path === "/api" || path.endsWith("/api")) {
      return parsed.origin;
    }
    return stripTrailingSlash(`${parsed.origin}${path === "" ? "" : path}`);
  } catch {
    return apiUrl;
  }
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
    return originFromApiUrl(apiUrl);
  }

  // Common misconfiguration: REST via dev tunnel / remote host, WS still on localhost.
  if (isLocalHost(configuredWs) && !isLocalHost(apiUrl)) {
    return originFromApiUrl(apiUrl);
  }

  return configuredWs;
}
