"use client";

import { useMemo, useState } from "react";
import { CalendarDays, List } from "lucide-react";

import { CalendarEventDialog } from "@/components/calendar/calendar-event-dialog";
import { CalendarMonthView } from "@/components/calendar/calendar-month-view";
import { CalendarScheduleList } from "@/components/calendar/calendar-schedule-list";
import { PhaseFilter } from "@/components/common/phase-filter";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toDayKey } from "@/lib/calendar/date-utils";
import { filterCalendarEventsByPhase } from "@/lib/calendar/map-events";
import type { CalendarEvent, CalendarViewMode } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

interface ProjectCalendarProps {
  events: CalendarEvent[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /** When false, status column is hidden (official academic calendar). */
  showStatus?: boolean;
  /** Optional subtitle under the schedule card title. */
  scheduleDescription?: string;
  /** Server already filtered by phase — hide client PhaseFilter. */
  hidePhaseFilter?: boolean;
  className?: string;
}

export function ProjectCalendar({
  events,
  isLoading,
  isError,
  onRetry,
  emptyTitle = "No deliverables on the calendar",
  emptyDescription = "Deliverables appear here once they are defined for this program.",
  showStatus = false,
  scheduleDescription = "Project deliverables ordered by due date.",
  hidePhaseFilter = false,
  className,
}: ProjectCalendarProps) {
  const now = new Date();
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [viewMode, setViewMode] = useState<CalendarViewMode>("schedule");
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredEvents = useMemo(
    () =>
      hidePhaseFilter
        ? events
        : filterCalendarEventsByPhase(events, phaseFilter),
    [events, hidePhaseFilter, phaseFilter],
  );

  const dayEvents = useMemo(() => {
    if (!selectedDayKey) return [];
    return filteredEvents.filter(
      (event) => event.dueDate && toDayKey(event.dueDate) === selectedDayKey,
    );
  }, [filteredEvents, selectedDayKey]);

  const openEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load calendar"
        message="Something went wrong while loading deliverables."
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {!hidePhaseFilter ? (
          <PhaseFilter
            value={phaseFilter}
            onChange={setPhaseFilter}
            className="w-full sm:w-[220px]"
          />
        ) : (
          <div />
        )}

        <div
          className="inline-flex rounded-lg border bg-card p-1"
          role="group"
          aria-label="Calendar view"
        >
          <Button
            type="button"
            size="sm"
            variant={viewMode === "schedule" ? "secondary" : "ghost"}
            className="gap-1.5"
            onClick={() => setViewMode("schedule")}
          >
            <List className="h-4 w-4" />
            Schedule
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "month" ? "secondary" : "ghost"}
            className="gap-1.5"
            onClick={() => setViewMode("month")}
          >
            <CalendarDays className="h-4 w-4" />
            Month
          </Button>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : viewMode === "schedule" ? (
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Project calendar</CardTitle>
            <CardDescription>{scheduleDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <CalendarScheduleList
              events={filteredEvents}
              onSelect={openEvent}
              showStatus={showStatus}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <CalendarMonthView
                events={filteredEvents}
                year={year}
                monthIndex={monthIndex}
                onMonthChange={(nextYear, nextMonth) => {
                  setYear(nextYear);
                  setMonthIndex(nextMonth);
                  setSelectedDayKey(null);
                }}
                onSelect={openEvent}
                selectedDayKey={selectedDayKey}
                onSelectDay={setSelectedDayKey}
              />
            </CardContent>
          </Card>

          {selectedDayKey ? (
            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">
                  {selectedDayKey}
                </CardTitle>
                <CardDescription>
                  {dayEvents.length === 0
                    ? "No deliverables due on this day."
                    : `${dayEvents.length} deliverable${dayEvents.length === 1 ? "" : "s"} due.`}
                </CardDescription>
              </CardHeader>
              {dayEvents.length > 0 ? (
                <CardContent>
                  <CalendarScheduleList
                    events={dayEvents}
                    onSelect={openEvent}
                    showStatus={showStatus}
                  />
                </CardContent>
              ) : null}
            </Card>
          ) : null}
        </div>
      )}

      <CalendarEventDialog
        event={selectedEvent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
