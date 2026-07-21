"use client";

import { useQuery } from "@tanstack/react-query";

import { ErrorState } from "@/components/common/state-blocks";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { GlobalAnnouncementsCard } from "@/components/dashboard/global-announcements-card";
import { portalPageQueryOptions } from "@/lib/react-query";
import { getErrorMessage } from "@/lib/axios";
import { progressService } from "@/services/progress.service";

export default function SupervisorAnnouncementsPage() {
  const announcementsQuery = useQuery({
    ...portalPageQueryOptions,
    queryKey: ["global-announcements", "supervisor", "list"],
    queryFn: progressService.getGlobalAnnouncements,
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
