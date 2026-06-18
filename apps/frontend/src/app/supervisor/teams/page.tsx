"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, ChevronUp, Users } from "lucide-react";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
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
import { proposalService } from "@/services/proposal.service";
import { teamService } from "@/services/team.service";

function TeamMembers({ teamId }: { teamId: string }) {
  const membersQuery = useQuery({
    queryKey: ["team", teamId, "members"],
    queryFn: () => teamService.getTeamMembers(teamId),
  });

  const memberIds = membersQuery.data?.map((m) => m.authUserId) ?? [];
  const profilesQuery = useProfilesLookup(memberIds);

  if (membersQuery.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading members...</p>
    );
  }

  if ((membersQuery.data?.length ?? 0) === 0) {
    return (
      <p className="text-sm text-muted-foreground">No members found.</p>
    );
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

export default function SupervisorTeamsPage() {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const proposalsQuery = useQuery({
    queryKey: ["proposals", "supervised"],
    queryFn: proposalService.getSupervisedProposals,
  });

  const leaderIds =
    proposalsQuery.data
      ?.map((p) => p.teamLeaderAuthUserId)
      .filter((id): id is string => !!id) ?? [];
  const profilesQuery = useProfilesLookup(leaderIds);

  if (proposalsQuery.isLoading) return <DashboardSkeleton />;

  if (proposalsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(proposalsQuery.error)}
        onRetry={() => proposalsQuery.refetch()}
      />
    );
  }

  const proposals = proposalsQuery.data ?? [];
  const profiles = profilesQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Supervised Teams</h2>
        <p className="text-sm text-muted-foreground">
          Teams you are currently supervising
        </p>
      </div>

      {proposals.length === 0 ? (
        <EmptyState
          title="No supervised teams"
          description="Accept supervision requests or invitations to see teams here."
          action={
            <Button asChild variant="outline">
              <Link href="/supervisor/requests">View Requests</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => {
            const expanded = expandedTeamId === proposal.teamId;
            const leaderId = proposal.teamLeaderAuthUserId;
            return (
              <Card key={proposal.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        {proposal.title}
                      </CardTitle>
                      <CardDescription>{proposal.domain}</CardDescription>
                    </div>
                    <StatusBadge status={proposal.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {proposal.abstract}
                  </p>
                  {leaderId && (
                    <p className="text-sm text-muted-foreground">
                      Team leader: {getDisplayName(profiles, leaderId)}
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedTeamId(
                        expanded ? null : proposal.teamId,
                      )
                    }
                  >
                    {expanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    {expanded ? "Hide Members" : "View Members"}
                  </Button>
                  {expanded && <TeamMembers teamId={proposal.teamId} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
