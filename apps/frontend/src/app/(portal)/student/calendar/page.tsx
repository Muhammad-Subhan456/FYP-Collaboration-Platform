"use client";

import { useMemo } from "react";

import { ProjectCalendar } from "@/components/calendar/project-calendar";
import { EmptyState } from "@/components/common/state-blocks";
import {
  isStudentQueryPending,
  useStudentWorkStreamQuery,
} from "@/queries/student";
import { mapWorkStreamDeliverablesToCalendarEvents } from "@/lib/calendar/map-events";

export default function StudentCalendarPage() {
  const workStreamQuery = useStudentWorkStreamQuery(null);

  const events = useMemo(
    () =>
      mapWorkStreamDeliverablesToCalendarEvents(
        workStreamQuery.data?.deliverables ?? [],
      ),
    [workStreamQuery.data?.deliverables],
  );

  if (!isStudentQueryPending(workStreamQuery) && !workStreamQuery.data?.team) {
    return (
      <EmptyState
        title="No team yet"
        description="Join or create a team to see deliverable deadlines on your calendar."
      />
    );
  }

  return (
    <ProjectCalendar
      events={events}
      isLoading={isStudentQueryPending(workStreamQuery)}
      isError={workStreamQuery.isError}
      onRetry={() => void workStreamQuery.refetch()}
      showStatus
      scheduleDescription="Deadlines that apply to your team, ordered by due date."
      emptyTitle="No deliverables yet"
      emptyDescription="When the coordinator publishes deliverables, they will appear here with the due date that applies to you."
    />
  );
}
