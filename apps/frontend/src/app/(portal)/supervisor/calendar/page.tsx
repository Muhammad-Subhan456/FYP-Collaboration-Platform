"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { ProjectCalendar } from "@/components/calendar/project-calendar";
import { queryKeys } from "@/lib/react-query";
import { mapTemplatesToCalendarEvents } from "@/lib/calendar/map-events";
import { useAuth } from "@/providers/auth-provider";
import { deliverableTemplateService } from "@/services/deliverable-template.service";

export default function SupervisorCalendarPage() {
  const { user } = useAuth();

  const templatesQuery = useQuery({
    queryKey: queryKeys.deliverableTemplates.list(undefined, user?.workspaceId),
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
      scheduleDescription="Official program schedule from the coordinator's deliverable templates."
      emptyTitle="No scheduled deliverables"
      emptyDescription="When the coordinator defines deliverables with due dates, they will appear on this calendar."
    />
  );
}
