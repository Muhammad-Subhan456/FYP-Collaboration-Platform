"use client";

import { useState } from "react";
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
import { useSupervisorInviteMutation } from "@/mutations/supervisor";
import type { InvitationBrowseTarget } from "@/services/supervisor-page.service";
import {
  isSupervisorQueryInitialLoading,
  useSupervisorInvitationsQuery,
} from "@/queries/supervisor";

export default function SupervisorInvitationsPage() {
  const [search, setSearch] = useState("");
  const [invitingKey, setInvitingKey] = useState<string | null>(null);

  const pageQuery = useSupervisorInvitationsQuery();
  const inviteMutation = useSupervisorInviteMutation();

  if (isSupervisorQueryInitialLoading(pageQuery)) {
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

  const handleInvite = (target: InvitationBrowseTarget) => {
    setInvitingKey(target.inviteKey);
    inviteMutation.mutate(target, {
      onSettled: () => setInvitingKey(null),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Browse Teams</h2>
        <p className="text-sm text-muted-foreground">
          Express interest in teams you would like to supervise. Teams submit
          proposals to you — you accept or reject from Proposal Reviews.
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
          <TabsTrigger value="sent">Expressed Interest</TabsTrigger>
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
                const alreadySent = target.invitationSent;
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
                          onClick={() => handleInvite(target)}
                        >
                          {isSending ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          {alreadySent
                            ? "Interest Sent"
                            : canSend
                              ? "Show Interest"
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
