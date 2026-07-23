import type { DeliverableTemplate } from "@/types/phase";
import type { WorkStreamDeliverableItem } from "@/types/work-stream";

import type { CalendarEvent, CalendarEventStatus } from "./types";

const DUE_SOON_MS = 7 * 24 * 60 * 60 * 1000;

function deriveStudentStatus(
  dueDate: string,
  latestSubmissionStatus: string | null,
  submissionClosedReason: string | null,
): CalendarEventStatus {
  if (
    latestSubmissionStatus === "FINALIZED" ||
    latestSubmissionStatus === "APPROVED" ||
    latestSubmissionStatus === "SUBMITTED"
  ) {
    return "COMPLETE";
  }
  if (latestSubmissionStatus === "CHANGES_REQUIRED") {
    return "CHANGES_REQUIRED";
  }

  const due = new Date(dueDate).getTime();
  const now = Date.now();
  if (Number.isNaN(due)) return "UPCOMING";
  if (due < now) return "OVERDUE";
  if (due - now <= DUE_SOON_MS) return "DUE_SOON";
  if (submissionClosedReason === "CLOSED" || submissionClosedReason === "INACTIVE") {
    return "CLOSED";
  }
  return "UPCOMING";
}

/** Official academic calendar from coordinator deliverable templates. */
export function mapTemplatesToCalendarEvents(
  templates: DeliverableTemplate[],
): CalendarEvent[] {
  return templates
    .map((template) => ({
      id: template.id,
      title: template.title,
      description: template.description ?? "",
      dueDate: template.dueDate ?? null,
      phaseId: template.phaseId ?? template.phase?.id ?? null,
      phaseName: template.phase?.name ?? null,
      type: template.type ?? null,
      status: null,
      dueDateLabel: "Coordinator due date",
    }))
    .sort(compareCalendarEvents);
}

/**
 * Student calendar from published deliverables.
 * `dueDate` is already the effective deadline (supervisor override or
 * coordinator fallback applied at publish / extend time).
 */
export function mapWorkStreamDeliverablesToCalendarEvents(
  deliverables: Array<
    WorkStreamDeliverableItem & {
      phaseId?: string | null;
      phase?: { id: string; name: string } | null;
    }
  >,
): CalendarEvent[] {
  return deliverables
    .filter((item) => item.isActive)
    .map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description ?? "",
      dueDate: item.dueDate,
      phaseId: item.phaseId ?? item.phase?.id ?? null,
      phaseName: item.phase?.name ?? null,
      type: item.type ?? null,
      status: deriveStudentStatus(
        item.dueDate,
        item.latestSubmissionStatus,
        item.submissionClosedReason,
      ),
      href: `/student/work-stream?tab=deliverables&deliverableId=${item.id}`,
      dueDateLabel: "Your due date",
    }))
    .sort(compareCalendarEvents);
}

function compareCalendarEvents(a: CalendarEvent, b: CalendarEvent): number {
  if (!a.dueDate && !b.dueDate) return a.title.localeCompare(b.title);
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  const byDate = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  if (byDate !== 0) return byDate;
  return a.title.localeCompare(b.title);
}

export function filterCalendarEventsByPhase(
  events: CalendarEvent[],
  phaseId: string,
): CalendarEvent[] {
  if (!phaseId || phaseId === "all") return events;
  return events.filter((event) => event.phaseId === phaseId);
}
