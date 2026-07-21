"use client";

import { useQuery } from "@tanstack/react-query";

import { ErrorState } from "@/components/common/state-blocks";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { GlobalAnnouncementsCard } from "@/components/dashboard/global-announcements-card";
import { studentPageQueryOptions } from "@/lib/react-query";
import { sortGlobalAnnouncementsNewestFirst } from "@/lib/global-announcements";
import { getErrorMessage } from "@/lib/axios";
import { progressService } from "@/services/progress.service";

export default function StudentAnnouncementsPage() {
  const announcementsQuery = useQuery({
    ...studentPageQueryOptions,
    queryKey: ["global-announcements", "student", "list"],
    queryFn: progressService.getGlobalAnnouncements,
    select: (data) => sortGlobalAnnouncementsNewestFirst(data),
  });

  if (announcementsQuery.isPending) {
    return <DashboardSkeleton />;
  }

  if (announcementsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(announcementsQuery.error)}
        onRetry={() => announcementsQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <GlobalAnnouncementsCard
        announcements={announcementsQuery.data ?? []}
        emptyMessage="No program announcements yet."
        viewAllDialog
      />
    </div>
  );
}
