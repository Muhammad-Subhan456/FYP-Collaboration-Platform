"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  addMonths,
  buildMonthGrid,
  formatMonthYear,
  isToday,
  toDayKey,
} from "@/lib/calendar/date-utils";
import type { CalendarEvent } from "@/lib/calendar/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface CalendarMonthViewProps {
  events: CalendarEvent[];
  year: number;
  monthIndex: number;
  onMonthChange: (year: number, monthIndex: number) => void;
  onSelect: (event: CalendarEvent) => void;
  selectedDayKey?: string | null;
  onSelectDay?: (dayKey: string) => void;
}

export function CalendarMonthView({
  events,
  year,
  monthIndex,
  onMonthChange,
  onSelect,
  selectedDayKey,
  onSelectDay,
}: CalendarMonthViewProps) {
  const days = useMemo(
    () => buildMonthGrid(year, monthIndex),
    [year, monthIndex],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      if (!event.dueDate) continue;
      const key = toDayKey(event.dueDate);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const go = (delta: number) => {
    const next = addMonths(year, monthIndex, delta);
    onMonthChange(next.year, next.monthIndex);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight">
          {formatMonthYear(year, monthIndex)}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous month"
            onClick={() => go(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const now = new Date();
              onMonthChange(now.getFullYear(), now.getMonth());
            }}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next month"
            onClick={() => go(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="px-1 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr">
          {days.map((day) => {
            const inMonth = day.getMonth() === monthIndex;
            const key = toDayKey(day);
            const dayEvents = eventsByDay.get(key) ?? [];
            const selected = selectedDayKey === key;
            const today = isToday(day);

            return (
              <div
                key={key}
                className={cn(
                  "min-h-[4.5rem] border-b border-r p-1 sm:min-h-[5.5rem] sm:p-1.5",
                  !inMonth && "bg-muted/20 text-muted-foreground",
                  selected && "bg-accent/40",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectDay?.(key)}
                  className={cn(
                    "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    today && "bg-primary text-primary-foreground hover:bg-primary/90",
                  )}
                  aria-label={key}
                >
                  {day.getDate()}
                </button>

                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelect(event)}
                      className={cn(
                        "block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium leading-tight",
                        "bg-primary/10 text-foreground hover:bg-primary/20",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:text-[11px]",
                      )}
                      title={event.title}
                    >
                      {event.title}
                    </button>
                  ))}
                  {dayEvents.length > 2 ? (
                    <button
                      type="button"
                      onClick={() => onSelectDay?.(key)}
                      className="px-1 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      +{dayEvents.length - 2} more
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
