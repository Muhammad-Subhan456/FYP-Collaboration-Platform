"use client";

import Link from "next/link";
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
import { getDisplayName } from "@/hooks/use-profiles";
import {
  useSupervisorTeamsQuery,
  isSupervisorQueryInitialLoading,
} from "@/queries/supervisor";
import type { TeamMember } from "@/types/student";
import type { UserProfile } from "@/types/profile";

function TeamMembers({
  teamId,
  membersByTeamId,
  profiles,
}: {
  teamId: string;
  membersByTeamId: Record<string, TeamMember[]>;
  profiles: Record<string, UserProfile>;
}) {
  const members = membersByTeamId[teamId] ?? [];

  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No members found.</p>
    );
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

export default function SupervisorTeamsPage() {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const pageQuery = useSupervisorTeamsQuery();

  if (isSupervisorQueryInitialLoading(pageQuery)) return <DashboardSkeleton />;

  if (pageQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(pageQuery.error)}
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  const proposals = pageQuery.data?.proposals ?? [];
  const membersByTeamId = pageQuery.data?.membersByTeamId ?? {};
  const profiles = pageQuery.data?.profiles ?? {};

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
                  {expanded && (
                    <TeamMembers
                      teamId={proposal.teamId}
                      membersByTeamId={membersByTeamId}
                      profiles={profiles}
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
