"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { StatusBadge } from "@/components/common/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { portalPageQueryOptions, queryKeys } from "@/lib/react-query";
import { profileService } from "@/services/profile.service";
import { proposalService } from "@/services/proposal.service";
import type { UserProfile } from "@/types/profile";

interface SupervisorProfileModalProps {
  supervisorId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupervisorProfileModal({
  supervisorId,
  open,
  onOpenChange,
}: SupervisorProfileModalProps) {
  const profileQuery = useQuery({
    ...portalPageQueryOptions,
    queryKey: queryKeys.profiles.byId(supervisorId!),
    queryFn: () => profileService.getProfileById(supervisorId!),
    enabled: open && !!supervisorId,
  });

  const overviewQuery = useQuery({
    ...portalPageQueryOptions,
    queryKey: queryKeys.supervisor.overview(supervisorId!),
    queryFn: () => proposalService.getSupervisorOverview(supervisorId!),
    enabled: open && !!supervisorId,
  });

  const profile = profileQuery.data;
  const overview = overviewQuery.data;
  const loading = profileQuery.isLoading || overviewQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Supervisor Profile</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !profile ? (
          <p className="text-sm text-muted-foreground">
            Supervisor profile could not be loaded.
          </p>
        ) : (
          <SupervisorProfileContent
            profile={profile}
            overview={overview}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SupervisorProfileContent({
  profile,
  overview,
}: {
  profile: UserProfile;
  overview?: {
    supervisedProposals: Array<{
      id: string;
      title: string;
      domain: string;
      status: string;
      createdAt: string;
    }>;
    activeCount: number;
    approvedCount: number;
    totalCount: number;
  };
}) {
  const initials = profile.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          {profile.profilePicture && (
            <AvatarImage src={profile.profilePicture} alt={profile.fullName} />
          )}
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-xl font-semibold">{profile.fullName}</h3>
          {profile.designation && (
            <p className="text-sm text-muted-foreground">{profile.designation}</p>
          )}
          {profile.department && (
            <p className="text-sm text-muted-foreground">{profile.department}</p>
          )}
          {profile.email && (
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          )}
          {profile.facultyId && (
            <p className="text-xs text-muted-foreground">
              Faculty ID: {profile.facultyId}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        {profile.officeLocation && (
          <InfoRow label="Office" value={profile.officeLocation} />
        )}
        {profile.officeHours && (
          <InfoRow label="Office Hours" value={profile.officeHours} />
        )}
      </div>

      {profile.researchAreas?.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Research Areas</p>
          <div className="flex flex-wrap gap-1">
            {profile.researchAreas.map((area) => (
              <Badge key={area} variant="secondary">
                {area}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {profile.publications?.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Publications</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {profile.publications.map((pub) => (
              <li key={pub}>{pub}</li>
            ))}
          </ul>
        </div>
      )}

      {profile.biography && (
        <div>
          <p className="mb-1 text-sm font-medium">Biography</p>
          <p className="text-sm text-muted-foreground">{profile.biography}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-sm">
        {profile.linkedIn && (
          <a
            href={profile.linkedIn}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            LinkedIn
          </a>
        )}
        {profile.googleScholar && (
          <a
            href={profile.googleScholar}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Google Scholar
          </a>
        )}
      </div>

      {overview && (
        <div className="space-y-3 border-t pt-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              <strong>{overview.activeCount}</strong> active teams
            </span>
            <span>
              <strong>{overview.approvedCount}</strong> approved proposals
            </span>
            <span>
              <strong>{overview.totalCount}</strong> total supervised
            </span>
          </div>

          {overview.supervisedProposals.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Supervision History</p>
              <div className="space-y-2">
                {overview.supervisedProposals.slice(0, 5).map((proposal) => (
                  <div
                    key={proposal.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{proposal.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {proposal.domain} · {formatDate(proposal.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={proposal.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}
