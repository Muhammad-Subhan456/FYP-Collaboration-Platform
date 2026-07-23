"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { IssueDetailPanel } from "@/components/team-issues/issue-detail-panel";
import { IssueListCard } from "@/components/team-issues/issue-list-card";
import { IssueStatusTabs } from "@/components/team-issues/issue-status-tabs";
import { TeamFilterSelect } from "@/components/work-stream/team-filter-select";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getErrorMessage } from "@/lib/axios";
import {
  filterIssuesByTab,
  type IssueStatusTab,
} from "@/lib/team-issue-helpers";
import { useSupervisorTeamIssueCommentMutation } from "@/mutations/supervisor";
import { useAuth } from "@/providers/auth-provider";
import {
  isSupervisorQueryInitialLoading,
  useSupervisorMilestonesQuery,
  useSupervisorTeamsQuery,
} from "@/queries/supervisor";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectSupervisorTeamFilterId,
  setSupervisorTeamFilterId,
} from "@/store/slices/work-stream-ui-slice";

export default function SupervisorMilestonesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const issueIdParam = searchParams.get("issueId");
  const dispatch = useAppDispatch();
  const teamFilterId = useAppSelector(selectSupervisorTeamFilterId);

  const teamsQuery = useSupervisorTeamsQuery();
  const teams = useMemo(() => {
    const proposals = teamsQuery.data?.proposals ?? [];
    return [
      ...new Map(
        proposals.map((p) => [
          p.teamId,
          { id: p.teamId, name: p.title },
        ]),
      ).values(),
    ];
  }, [teamsQuery.data?.proposals]);

  useEffect(() => {
    if (!teamFilterId && teams[0]?.id) {
      dispatch(setSupervisorTeamFilterId(teams[0].id));
    }
  }, [dispatch, teamFilterId, teams]);

  const pageQuery = useSupervisorMilestonesQuery(teamFilterId);
  const commentMutation = useSupervisorTeamIssueCommentMutation();

  const [filter, setFilter] = useState<IssueStatusTab>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (issueIdParam) {
      setSelectedId(issueIdParam);
    }
  }, [issueIdParam]);

  const issues = pageQuery.data?.issues ?? [];
  const profiles = pageQuery.data?.profiles ?? {};
  const summaries = pageQuery.data?.summaries;

  const filteredIssues = useMemo(
    () => filterIssuesByTab(issues, filter),
    [filter, issues],
  );

  const selectedIssue =
    issues.find((i) => i.id === selectedId) ?? filteredIssues[0] ?? null;

  if (
    isSupervisorQueryInitialLoading(pageQuery) ||
    teamsQuery.isPending
  ) {
    return <DashboardSkeleton />;
  }

  if (pageQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(pageQuery.error)}
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  if (teams.length === 0) {
    return (
      <EmptyState
        title="No supervised teams"
        description="Team tasks appear once you supervise a team."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="max-w-md">
            {teamFilterId && (
              <TeamFilterSelect
                teams={teams}
                selectedTeamId={teamFilterId}
                onChange={(id) => dispatch(setSupervisorTeamFilterId(id))}
                label="Team"
              />
            )}
          </div>
        </div>
      </div>

      {summaries && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Open
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {summaries.open}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In progress
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {summaries.inProgress ?? 0}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Recently completed
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {summaries.recentlyCompleted}
            </CardContent>
          </Card>
        </div>
      )}

      <IssueStatusTabs value={filter} onChange={setFilter} />

      {filteredIssues.length === 0 ? (
        <EmptyState
          title={`No ${filter.replace(/_/g, " ")} tasks`}
          description="Tasks created by the team appear here."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="space-y-2">
            {filteredIssues.map((issue) => (
              <IssueListCard
                key={issue.id}
                issue={issue}
                profiles={profiles}
                selected={selectedIssue?.id === issue.id}
                showInProgressDetails={filter === "in_progress"}
                onSelect={() => setSelectedId(issue.id)}
              />
            ))}
          </div>

          {selectedIssue && (
            <Card>
              <CardContent className="pt-6">
                <IssueDetailPanel
                  issue={selectedIssue}
                  profiles={profiles}
                  currentUserId={user?.userId}
                  readOnly
                  onComment={async (body) => {
                    await commentMutation.mutateAsync({
                      issueId: selectedIssue.id,
                      body,
                    });
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
