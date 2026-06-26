"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { getDisplayName } from "@/hooks/use-profiles";
import { useSupervisorPageQuery } from "@/hooks/use-supervisor-page";
import { proposalService } from "@/services/proposal.service";
import { supervisorPageService } from "@/services/supervisor-page.service";

export default function SupervisorInvitationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const pageQuery = useSupervisorPageQuery(
    "invitations",
    supervisorPageService.getInvitations,
  );

  const inviteMutation = useMutation({
    mutationFn: proposalService.inviteProposal,
    onSuccess: () => {
      toast.success("Invitation sent");
      queryClient.invalidateQueries({ queryKey: ["supervisor", "invitations"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (pageQuery.isLoading) {
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

  const availableProposals = pageQuery.data?.availableProposals ?? [];
  const invitations = pageQuery.data?.invitations ?? [];
  const profiles = pageQuery.data?.profiles;

  const invitedProposalIds = new Set(invitations.map((i) => i.proposalId));

  const filteredProposals = availableProposals.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.domain.toLowerCase().includes(q)
    );
  });

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
          {invitations.length === 0 ? (
            <EmptyState
              title="No invitations sent"
              description="Browse proposals and send invitations to teams."
            />
          ) : (
            invitations.map((invitation) => (
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
