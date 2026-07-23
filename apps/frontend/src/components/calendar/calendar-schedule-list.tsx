"use client";

import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import type { CalendarEvent } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

interface CalendarScheduleListProps {
  events: CalendarEvent[];
  onSelect: (event: CalendarEvent) => void;
  showStatus?: boolean;
}

export function CalendarScheduleList({
  events,
  onSelect,
  showStatus = false,
}: CalendarScheduleListProps) {
  const scheduled = events.filter((event) => event.dueDate);
  const unscheduled = events.filter((event) => !event.dueDate);

  return (
    <div className="space-y-6">
      <Table minWidth={640} maxHeight="min(70vh, 36rem)">
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">No.</TableHead>
            <TableHead>Deliverable</TableHead>
            <TableHead className="w-[8.5rem]">Phase</TableHead>
            <TableHead className="w-[9.5rem]">Due date</TableHead>
            {showStatus ? (
              <TableHead className="w-[8.5rem]">Status</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {scheduled.map((event, index) => (
            <TableRow
              key={event.id}
              className="cursor-pointer"
              onClick={() => onSelect(event)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(event);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`View details for ${event.title}`}
            >
              <TableCell className="font-medium text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell>
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-foreground">{event.title}</p>
                  {event.description.trim() ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {event.description}
                    </p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                {event.phaseName ? (
                  <Badge variant="secondary" className="font-normal">
                    {event.phaseName}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap font-medium">
                {event.dueDate ? formatDate(event.dueDate) : "—"}
              </TableCell>
              {showStatus ? (
                <TableCell>
                  {event.status ? (
                    <StatusBadge status={event.status} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {unscheduled.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            No due date set
          </h3>
          <ul className="divide-y rounded-lg border bg-card">
            {unscheduled.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelect(event)}
                  className={cn(
                    "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors",
                    "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{event.title}</span>
                    {event.phaseName ? (
                      <Badge variant="secondary" className="font-normal">
                        {event.phaseName}
                      </Badge>
                    ) : null}
                  </div>
                  {event.description.trim() ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {event.description}
                    </p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
