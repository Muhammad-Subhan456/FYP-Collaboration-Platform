"use client";

import { useState } from "react";
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
import { getDisplayName } from "@/hooks/use-profiles";
import { useCoordinatorPageQuery } from "@/hooks/use-coordinator-page";
import { coordinatorPageService } from "@/services/coordinator-page.service";
import type { TeamMember } from "@/types/student";
import type { UserProfile } from "@/types/profile";

function TeamMembers({
  members,
  profiles,
}: {
  members: TeamMember[];
  profiles: Record<string, UserProfile>;
}) {
  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">No members found.</p>;
  }

  return (
    <ul className="space-y-2">
      {members.map((member) => (
        <li
          key={member.id}
          className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
        >
          <span>{getDisplayName(profiles, member.authUserId)}</span>
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

  const pageQuery = useCoordinatorPageQuery(
    "teams",
    coordinatorPageService.getTeams,
  );

  if (pageQuery.isLoading) return <DashboardSkeleton />;

  if (pageQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(pageQuery.error)}
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  const { teams: allTeams, membersByTeamId, profiles } = pageQuery.data ?? {
    teams: [],
    membersByTeamId: {},
    profiles: {},
  };

  const teams = allTeams.filter((team) => {
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
            const members = membersByTeamId[team.id] ?? [];
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
                        {getDisplayName(profiles, team.leaderId)}
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
                  {expanded && (
                    <TeamMembers members={members} profiles={profiles} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
