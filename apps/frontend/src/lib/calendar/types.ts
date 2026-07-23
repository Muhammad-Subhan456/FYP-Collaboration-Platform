export type CalendarEventStatus =
  | "UPCOMING"
  | "DUE_SOON"
  | "OVERDUE"
  | "COMPLETE"
  | "CHANGES_REQUIRED"
  | "CLOSED";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  /** ISO date string; null when no due date is set on a template. */
  dueDate: string | null;
  phaseId: string | null;
  phaseName: string | null;
  type?: string | null;
  status?: CalendarEventStatus | null;
  /** Optional deep link (e.g. student work stream). */
  href?: string;
  /** Short label describing whose deadline is shown. */
  dueDateLabel?: string;
}

export type CalendarViewMode = "schedule" | "month";
