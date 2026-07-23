"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { ProjectCalendar } from "@/components/calendar/project-calendar";
import { queryKeys } from "@/lib/react-query";
import { mapTemplatesToCalendarEvents } from "@/lib/calendar/map-events";
import { useAuth } from "@/providers/auth-provider";
import { deliverableTemplateService } from "@/services/deliverable-template.service";

export default function CoordinatorCalendarPage() {
  const { user } = useAuth();

  const templatesQuery = useQuery({
    queryKey: queryKeys.coordinator.deliverableTemplates(
      undefined,
      user?.workspaceId,
    ),
    queryFn: () => deliverableTemplateService.list(),
    enabled: !!user?.workspaceId,
  });

  const events = useMemo(
    () => mapTemplatesToCalendarEvents(templatesQuery.data ?? []),
    [templatesQuery.data],
  );

  return (
    <ProjectCalendar
      events={events}
      isLoading={templatesQuery.isPending}
      isError={templatesQuery.isError}
      onRetry={() => void templatesQuery.refetch()}
      scheduleDescription="Master project calendar generated from deliverable templates."
      emptyTitle="No deliverables on the calendar"
      emptyDescription="Create deliverable templates with due dates to build the official program schedule."
    />
  );
}
