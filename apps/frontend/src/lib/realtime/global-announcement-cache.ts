import type { QueryClient } from "@tanstack/react-query";

import { invalidateDashboard } from "@/lib/react-query";
import { invalidateCoordinatorAnnouncements } from "@/mutations/coordinator";

import type { RealtimeEventEnvelope } from "./types";

export interface RealtimeGlobalAnnouncementPayload {
  announcement: {
    id: string;
    workspaceId: string;
    title: string;
    message: string;
    audienceRoles: string[];
    attachmentCount: number;
    publishedAt: string;
  };
}

type DashboardRole = "STUDENT" | "SUPERVISOR" | "COORDINATOR" | "EVALUATOR";

function isDashboardRole(role: string): role is DashboardRole {
  return (
    role === "STUDENT" ||
    role === "SUPERVISOR" ||
    role === "COORDINATOR" ||
    role === "EVALUATOR"
  );
}

export function handleGlobalAnnouncementPublished(
  queryClient: QueryClient,
  role: string,
  _workspaceId: string | null,
  envelope: RealtimeEventEnvelope<RealtimeGlobalAnnouncementPayload>,
) {
  const incoming = envelope.payload.announcement;
  const normalizedRole = role.toUpperCase();
  const audienceRoles = incoming.audienceRoles.map((item) =>
    item.toUpperCase(),
  );

  if (
    normalizedRole !== "COORDINATOR" &&
    !audienceRoles.includes(normalizedRole)
  ) {
    return;
  }

  if (normalizedRole === "COORDINATOR") {
    void invalidateCoordinatorAnnouncements(queryClient);
    return;
  }

  if (isDashboardRole(normalizedRole)) {
    void invalidateDashboard(queryClient, normalizedRole);
  } else {
    void invalidateDashboard(queryClient);
  }
}
