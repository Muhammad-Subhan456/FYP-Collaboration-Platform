"use client";

import { ExternalLink, Loader2, Users } from "lucide-react";

import { ProfileAvatar, ProfileViewModal } from "@/components/profile/profile-view-modal";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getDisplayName } from "@/hooks/use-profiles";
import { useBrowseTeamDetailsQuery } from "@/queries/student/use-pages";
import type { UserProfile } from "@/types/profile";
import type { Team } from "@/types/student";
import { useState } from "react";

interface BrowseTeamDetailsDialogProps {
  teamId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fallbackTeam?: Team | null;
  hasPendingRequest?: boolean;
  isJoining?: boolean;
  onRequestJoin?: (teamId: string) => void;
}

export function BrowseTeamDetailsDialog({
  teamId,
  open,
  onOpenChange,
  fallbackTeam,
  hasPendingRequest = false,
  isJoining = false,
  onRequestJoin,
}: BrowseTeamDetailsDialogProps) {
  const detailsQuery = useBrowseTeamDetailsQuery(open ? teamId : null);
  const [viewProfile, setViewProfile] = useState<UserProfile | null>(null);

  const team = detailsQuery.data?.team ?? fallbackTeam ?? null;
  const members = detailsQuery.data?.members ?? [];
  const profiles = detailsQuery.data?.profiles ?? {};
  const memberCount = detailsQuery.data?.memberCount ?? members.length;

  return (
    <>
      <ProfileViewModal
        profile={viewProfile}
        open={!!viewProfile}
        onOpenChange={(nextOpen) => !nextOpen && setViewProfile(null)}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {team?.name ?? "Team Details"}
            </DialogTitle>
            <DialogDescription>
              {team?.domain ?? "Review team information before requesting to join."}
            </DialogDescription>
          </DialogHeader>

          {detailsQuery.isLoading && !team ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !team ? (
            <p className="py-6 text-sm text-muted-foreground">
              Team details are unavailable.
            </p>
          ) : (
            <div className="space-y-6">
              <section className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium">Team Information</h3>
                  <StatusBadge status={team.isOpen ? "ACTIVE" : "INACTIVE"} />
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <InfoRow label="Domain" value={team.domain} />
                  <InfoRow
                    label="Capacity"
                    value={`${memberCount} / ${team.maxMembers} members`}
                  />
                </div>
              </section>

              <section className="space-y-3 rounded-lg border p-4">
                <h3 className="font-medium">Project Details</h3>
                {team.projectTitle ? (
                  <p className="text-sm font-medium">{team.projectTitle}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No project title provided yet.
                  </p>
                )}
                {team.projectAbstract ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {team.projectAbstract}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No project abstract provided yet.
                  </p>
                )}
                {team.proposalPdfUrl && (
                  <a
                    href={team.proposalPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    View proposal PDF
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </section>

              <section className="space-y-3 rounded-lg border p-4">
                <h3 className="font-medium">Team Members</h3>
                {detailsQuery.isLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No members listed yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {members.map((member) => {
                      const profile = profiles[member.authUserId];
                      const isLeader = member.authUserId === team.leaderId;

                      return (
                        <li
                          key={member.id}
                          className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <ProfileAvatar profile={profile} className="h-9 w-9" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {getDisplayName(profiles, member.authUserId)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {isLeader
                                  ? "Team Leader"
                                  : member.teamRole || "Member"}
                              </p>
                            </div>
                          </div>
                          {profile && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setViewProfile(profile)}
                            >
                              View Profile
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {onRequestJoin && teamId && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => onRequestJoin(teamId)}
                    disabled={hasPendingRequest || isJoining || !team.isOpen}
                  >
                    {isJoining && <Loader2 className="animate-spin" />}
                    {hasPendingRequest
                      ? "Request Sent"
                      : team.isOpen
                        ? "Request to Join"
                        : "Team Closed"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
