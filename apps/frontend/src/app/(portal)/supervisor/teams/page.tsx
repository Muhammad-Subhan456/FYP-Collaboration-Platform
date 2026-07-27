"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Eye, Users } from "lucide-react";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
import {
  ProfileAvatar,
  ProfileViewModal,
} from "@/components/profile/profile-view-modal";
import { ProposalDocumentDialog } from "@/components/proposal/proposal-document-dialog";
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
  teamId,
  membersByTeamId,
  profiles,
  onViewProfile,
}: {
  teamId: string;
  membersByTeamId: Record<string, TeamMember[]>;
  profiles: Record<string, UserProfile>;
  onViewProfile: (profile: UserProfile) => void;
}) {
  const members = membersByTeamId[teamId] ?? [];

  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No members found.</p>
    );
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

export default function SupervisorTeamsPage() {
  const searchParams = useSearchParams();
  const focusTeamId = searchParams.get("teamId");
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(
    focusTeamId,
  );
  const [viewProfile, setViewProfile] = useState<UserProfile | null>(null);
  const [viewProposalId, setViewProposalId] = useState<string | null>(null);

  const pageQuery = useSupervisorTeamsQuery();

  useEffect(() => {
    if (focusTeamId) {
      setExpandedTeamId(focusTeamId);
    }
  }, [focusTeamId]);

  useEffect(() => {
    if (!focusTeamId || !pageQuery.data) {
      return;
    }
    const el = document.getElementById(`team-${focusTeamId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusTeamId, pageQuery.data]);

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
      <ProfileViewModal
        profile={viewProfile}
        open={!!viewProfile}
        onOpenChange={(open) => {
          if (!open) setViewProfile(null);
        }}
      />
      <ProposalDocumentDialog
        proposalId={viewProposalId}
        open={!!viewProposalId}
        onOpenChange={(open) => {
          if (!open) setViewProposalId(null);
        }}
      />

      {proposals.length === 0 ? (
        <EmptyState
          title="No supervised teams"
          description="Accept a proposal to see teams here."
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
            const focused = focusTeamId === proposal.teamId;
            return (
              <Card
                key={proposal.id}
                id={`team-${proposal.teamId}`}
                className={focused ? "ring-2 ring-primary/30" : undefined}
              >
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
                      Team leader: {memberLabel(profiles, leaderId)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setViewProposalId(proposal.id)}
                    >
                      <Eye className="h-4 w-4" />
                      View Proposal
                    </Button>
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
                  </div>
                  {expanded && (
                    <TeamMembers
                      teamId={proposal.teamId}
                      membersByTeamId={membersByTeamId}
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
