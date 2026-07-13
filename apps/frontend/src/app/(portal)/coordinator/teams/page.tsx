"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Eye, Search, Users } from "lucide-react";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
import {
  ProfileAvatar,
  ProfileViewModal,
} from "@/components/profile/profile-view-modal";
import { Button } from "@/components/ui/button";
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
import {
  isCoordinatorQueryInitialLoading,
  useCoordinatorTeamsQuery,
} from "@/queries/coordinator";
import type { TeamMember } from "@/types/student";
import type { UserProfile } from "@/types/profile";

function memberLabel(
  profiles: Record<string, UserProfile>,
  authUserId: string,
) {
  const profile = profiles[authUserId];
  const name = getDisplayName(profiles, authUserId);
  const registration = profile?.registrationNumber?.trim();
  return registration ? `${name} — ${registration}` : name;
}

function TeamMembers({
  members,
  profiles,
  onViewProfile,
}: {
  members: TeamMember[];
  profiles: Record<string, UserProfile>;
  onViewProfile: (profile: UserProfile) => void;
}) {
  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">No members found.</p>;
  }

  return (
    <ul className="space-y-2">
      {members.map((member) => {
        const profile = profiles[member.authUserId];
        return (
          <li
            key={member.id}
            className="flex flex-col gap-3 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <ProfileAvatar profile={profile} className="h-9 w-9 shrink-0" />
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {memberLabel(profiles, member.authUserId)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Joined {formatDate(member.joinedAt)}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0"
              disabled={!profile}
              onClick={() => profile && onViewProfile(profile)}
            >
              <Eye className="h-4 w-4" />
              View Profile
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

export default function CoordinatorTeamsPage() {
  const [search, setSearch] = useState("");
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [viewProfile, setViewProfile] = useState<UserProfile | null>(null);

  const pageQuery = useCoordinatorTeamsQuery();

  if (isCoordinatorQueryInitialLoading(pageQuery)) return <DashboardSkeleton />;

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
      (team.projectTitle?.toLowerCase().includes(q) ?? false) ||
      (team.projectAbstract?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <ProfileViewModal
        profile={viewProfile}
        open={!!viewProfile}
        onOpenChange={(open) => {
          if (!open) setViewProfile(null);
        }}
      />

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
                        {memberLabel(profiles, team.leaderId)}
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
                  {team.projectTitle && (
                    <p className="text-sm font-medium">{team.projectTitle}</p>
                  )}
                  {team.projectAbstract && (
                    <p className="text-sm text-muted-foreground">
                      {team.projectAbstract}
                    </p>
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
                    <TeamMembers
                      members={members}
                      profiles={profiles}
                      onViewProfile={setViewProfile}
                    />
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
