"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search, Users } from "lucide-react";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { getDisplayName, useProfilesLookup } from "@/hooks/use-profiles";
import { coordinatorService } from "@/services/coordinator.service";

function TeamMembers({ teamId }: { teamId: string }) {
  const membersQuery = useQuery({
    queryKey: ["coordinator", "team", teamId, "members"],
    queryFn: () => coordinatorService.getTeamMembers(teamId),
  });

  const memberIds = membersQuery.data?.map((m) => m.authUserId) ?? [];
  const profilesQuery = useProfilesLookup(memberIds);

  if (membersQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading members...</p>;
  }

  if ((membersQuery.data?.length ?? 0) === 0) {
    return <p className="text-sm text-muted-foreground">No members found.</p>;
  }

  return (
    <ul className="space-y-2">
      {membersQuery.data!.map((member) => (
        <li
          key={member.id}
          className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
        >
          <span>{getDisplayName(profilesQuery.data, member.authUserId)}</span>
          <span className="text-muted-foreground">
            Joined {formatDate(member.joinedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function CoordinatorTeamsPage() {
  const [search, setSearch] = useState("");
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const teamsQuery = useQuery({
    queryKey: ["coordinator", "teams"],
    queryFn: coordinatorService.getAllTeams,
  });

  const leaderIds = useMemo(
    () => teamsQuery.data?.map((t) => t.leaderId) ?? [],
    [teamsQuery.data],
  );
  const profilesQuery = useProfilesLookup(leaderIds);

  if (teamsQuery.isLoading) return <DashboardSkeleton />;

  if (teamsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(teamsQuery.error)}
        onRetry={() => teamsQuery.refetch()}
      />
    );
  }

  const teams = (teamsQuery.data ?? []).filter((team) => {
    const q = search.toLowerCase();
    return (
      team.name.toLowerCase().includes(q) ||
      team.domain.toLowerCase().includes(q) ||
      (team.description?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">All Teams</h2>
          <p className="text-sm text-muted-foreground">
            Browse every FYP team in the program
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {teams.length === 0 ? (
        <EmptyState
          title="No teams found"
          description={
            search
              ? "Try a different search term."
              : "Teams will appear here once students create them."
          }
        />
      ) : (
        <div className="space-y-4">
          {teams.map((team) => {
            const expanded = expandedTeamId === team.id;
            return (
              <Card key={team.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">{team.name}</span>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {team.domain} · Leader:{" "}
                        {getDisplayName(profilesQuery.data, team.leaderId)}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={team.isOpen ? "ACTIVE" : "INACTIVE"} />
                      <span className="text-xs text-muted-foreground">
                        Max {team.maxMembers}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {team.description && (
                    <p className="text-sm text-muted-foreground">{team.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Created {formatDate(team.createdAt)}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTeamId(expanded ? null : team.id)
                    }
                    className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    {expanded ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Hide members
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        View members
                      </>
                    )}
                  </button>
                  {expanded && <TeamMembers teamId={team.id} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
