"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Search, Send } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { getDisplayName, useProfilesLookup } from "@/hooks/use-profiles";
import { proposalService } from "@/services/proposal.service";

export default function SupervisorInvitationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const proposalsQuery = useQuery({
    queryKey: ["proposals", "available"],
    queryFn: proposalService.getAvailableProposals,
  });

  const invitationsQuery = useQuery({
    queryKey: ["proposals", "supervisor-invitations"],
    queryFn: proposalService.getSupervisorInvitations,
  });

  const leaderIds = useMemo(() => {
    const fromProposals =
      proposalsQuery.data?.map((p) => p.teamLeaderAuthUserId) ?? [];
    const fromInvitations =
      invitationsQuery.data?.map(
        (i) => i.proposal.teamLeaderAuthUserId,
      ) ?? [];
    return [...fromProposals, ...fromInvitations].filter(
      (id): id is string => !!id,
    );
  }, [proposalsQuery.data, invitationsQuery.data]);

  const profilesQuery = useProfilesLookup(leaderIds);

  const inviteMutation = useMutation({
    mutationFn: proposalService.inviteProposal,
    onSuccess: () => {
      toast.success("Invitation sent");
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (proposalsQuery.isLoading || invitationsQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (proposalsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(proposalsQuery.error)}
        onRetry={() => proposalsQuery.refetch()}
      />
    );
  }

  const invitedProposalIds = new Set(
    (invitationsQuery.data ?? []).map((i) => i.proposalId),
  );

  const filteredProposals = (proposalsQuery.data ?? []).filter((p) => {
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.domain.toLowerCase().includes(q)
    );
  });

  const profiles = profilesQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Invitations</h2>
        <p className="text-sm text-muted-foreground">
          Invite teams to accept you as their supervisor
        </p>
      </div>

      <Tabs defaultValue="browse">
        <TabsList>
          <TabsTrigger value="browse">Browse Proposals</TabsTrigger>
          <TabsTrigger value="sent">Sent Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title or domain..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filteredProposals.length === 0 ? (
            <EmptyState
              title="No proposals available"
              description="There are no open proposals to invite at the moment."
            />
          ) : (
            <div className="space-y-3">
              {filteredProposals.map((proposal) => {
                const alreadyInvited = invitedProposalIds.has(proposal.id);
                const leaderId = proposal.teamLeaderAuthUserId;
                return (
                  <Card key={proposal.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-base">
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
                        size="sm"
                        disabled={alreadyInvited || inviteMutation.isPending}
                        onClick={() => inviteMutation.mutate(proposal.id)}
                      >
                        {inviteMutation.isPending ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        {alreadyInvited ? "Invitation Sent" : "Send Invitation"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-3">
          {(invitationsQuery.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="No invitations sent"
              description="Browse proposals and send invitations to teams."
            />
          ) : (
            invitationsQuery.data!.map((invitation) => (
              <Card key={invitation.id}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium">
                      {invitation.proposal.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Sent {formatDate(invitation.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={invitation.status} />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
