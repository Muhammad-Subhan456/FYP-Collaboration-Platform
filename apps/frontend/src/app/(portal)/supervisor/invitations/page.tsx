"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Search, Send } from "lucide-react";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
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
import {
  supervisorPageService,
  type InvitationBrowseTarget,
} from "@/services/supervisor-page.service";

export default function SupervisorInvitationsPage() {
  const [search, setSearch] = useState("");
  const [invitingKey, setInvitingKey] = useState<string | null>(null);
  const [sentInviteKeys, setSentInviteKeys] = useState<Set<string>>(
    () => new Set(),
  );

  const pageQuery = useSupervisorPageQuery(
    "invitations",
    supervisorPageService.getInvitations,
  );

  const inviteMutation = useMutation({
    mutationFn: async (target: InvitationBrowseTarget) => {
      if (target.kind === "proposal" && target.proposalId) {
        return proposalService.inviteProposal(target.proposalId);
      }
      return proposalService.inviteTeam(target.teamId);
    },
    onMutate: (target) => {
      setInvitingKey(target.inviteKey);
    },
    onSuccess: (_, target) => {
      toast.success("Invitation sent");
      setSentInviteKeys((prev) => new Set(prev).add(target.inviteKey));
    },
    onError: (e) => toast.error(getErrorMessage(e)),
    onSettled: () => {
      setInvitingKey(null);
    },
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

  const browseTargets = pageQuery.data?.browseTargets ?? [];
  const invitations = pageQuery.data?.invitations ?? [];
  const profiles = pageQuery.data?.profiles;
  const atCapacity = pageQuery.data?.atCapacity ?? false;

  const filteredTargets = browseTargets.filter((target) => {
    const q = search.toLowerCase();
    return (
      target.teamName.toLowerCase().includes(q) ||
      target.domain.toLowerCase().includes(q) ||
      (target.title?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Invitations</h2>
        <p className="text-sm text-muted-foreground">
          Invite available teams to accept you as their supervisor
        </p>
        {atCapacity && (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            You are supervising the maximum of 3 teams and cannot send new
            invitations.
          </p>
        )}
      </div>

      <Tabs defaultValue="browse">
        <TabsList>
          <TabsTrigger value="browse">Browse Teams</TabsTrigger>
          <TabsTrigger value="sent">Sent Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by team, title, or domain..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filteredTargets.length === 0 ? (
            <EmptyState
              title="No teams available"
              description="There are no teams available for invitations right now."
            />
          ) : (
            <div className="space-y-3">
              {filteredTargets.map((target) => {
                const leaderId = target.teamLeaderAuthUserId;
                const isSending = invitingKey === target.inviteKey;
                const alreadySent =
                  target.invitationSent ||
                  sentInviteKeys.has(target.inviteKey);
                const canSend =
                  target.canInvite && !alreadySent && !atCapacity;

                return (
                  <Card key={target.inviteKey}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-base">
                            {target.title || target.teamName}
                          </CardTitle>
                          <CardDescription>
                            {target.teamName} · {target.domain}
                          </CardDescription>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            target.availability === "AVAILABLE"
                              ? "border-emerald-500/40 text-emerald-700"
                              : "border-slate-500/40 text-muted-foreground"
                          }
                        >
                          {target.availability === "AVAILABLE"
                            ? "Available"
                            : "Unavailable"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {target.abstract && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {target.abstract}
                        </p>
                      )}
                      {leaderId && (
                        <p className="text-sm text-muted-foreground">
                          Team leader: {getDisplayName(profiles, leaderId)}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">
                          {target.availability === "AVAILABLE"
                            ? "Available"
                            : "Unavailable"}
                        </span>
                        <Button
                          size="sm"
                          disabled={!canSend || isSending}
                          onClick={() => inviteMutation.mutate(target)}
                        >
                          {isSending ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          {alreadySent
                            ? "Invitation Sent"
                            : canSend
                              ? "Send Invitation"
                              : "Unavailable"}
                        </Button>
                      </div>
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
              description="Browse teams and send invitations to teams that are available."
            />
          ) : (
            invitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium">
                      {invitation.proposal?.title ?? "Team invitation"}
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
