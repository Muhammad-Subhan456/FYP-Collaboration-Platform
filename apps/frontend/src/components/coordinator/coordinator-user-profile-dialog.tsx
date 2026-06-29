"use client";

import { ExternalLink, Loader2 } from "lucide-react";

import { ProfileAvatar } from "@/components/profile/profile-view-modal";
import { StatusBadge } from "@/components/common/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { useCoordinatorUserDetailQuery } from "@/queries/coordinator";
import type { AuthUserRecord } from "@/types/profile";
import type { UserProfile } from "@/types/profile";
import type {
  CoordinatorUserDetail,
  CoordinatorUserIssue,
} from "@/types/coordinator";

interface CoordinatorUserProfileDialogProps {
  user: AuthUserRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoordinatorUserProfileDialog({
  user,
  open,
  onOpenChange,
}: CoordinatorUserProfileDialogProps) {
  const detailQuery = useCoordinatorUserDetailQuery(user, open && !!user);

  const detail = detailQuery.data;
  const profile = detail?.profile;
  const displayName = profile?.fullName ?? user?.fullName ?? "User";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>

        {detailQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : detailQuery.isError ? (
          <p className="text-sm text-destructive">
            {getErrorMessage(detailQuery.error)}
          </p>
        ) : user && detail ? (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <ProfileAvatar profile={profile} className="h-16 w-16" />
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-semibold">{displayName}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge status={user.role} />
                  <StatusBadge
                    status={user.isActive ? "ACTIVE" : "INACTIVE"}
                  />
                  {profile?.profileType && (
                    <StatusBadge status={profile.profileType} />
                  )}
                </div>
              </div>
            </div>

            <Section title="Account">
              <Row label="User ID" value={user.id} mono />
              <Row label="Email" value={user.email} />
              <Row label="Platform role" value={user.role} />
              <Row
                label="Account status"
                value={user.isActive ? "Active" : "Disabled"}
              />
              <Row label="Registered" value={formatDate(user.createdAt)} />
              {profile && (
                <>
                  <Row
                    label="Profile updated"
                    value={formatDateTime(profile.updatedAt)}
                  />
                  <Row
                    label="Profile created"
                    value={formatDateTime(profile.createdAt)}
                  />
                </>
              )}
            </Section>

            {profile ? (
              <>
                <Separator />
                {profile.profileType === "STUDENT" && (
                  <StudentProfileSections profile={profile} />
                )}
                {profile.profileType === "SUPERVISOR" && (
                  <SupervisorProfileSections profile={profile} />
                )}
                {profile.profileType === "COORDINATOR" && (
                  <CoordinatorProfileSections profile={profile} />
                )}
              </>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                This user has not completed their FOASIS profile yet.
              </p>
            )}

            {user.role === "STUDENT" && (
              <>
                <Separator />
                <TeamSection detail={detail} />
                <IssuesSection issues={detail.issues} />
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  mono,
  href,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  href?: boolean;
}) {
  if (!value) return null;

  return (
    <div className="text-sm">
      <p className="font-medium text-muted-foreground">{label}</p>
      {href ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 break-all text-primary hover:underline"
        >
          {value}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      ) : (
        <p className={mono ? "break-all font-mono text-xs" : "break-words"}>
          {value}
        </p>
      )}
    </div>
  );
}

function TagList({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="sm:col-span-2">
      <p className="mb-1 text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function StudentProfileSections({ profile }: { profile: UserProfile }) {
  return (
    <Section title="Student profile">
      <Row label="Full name" value={profile.fullName} />
      <Row label="Profile email" value={profile.email} />
      <Row label="Registration number" value={profile.registrationNumber} />
      <Row label="Department" value={profile.department} />
      <Row label="Batch" value={profile.batch} />
      <Row label="Degree program" value={profile.degreeProgram} />
      <Row
        label="Semester"
        value={
          profile.semester != null ? String(profile.semester) : undefined
        }
      />
      <Row label="Bio" value={profile.bio} />
      <TagList label="Skills" items={profile.skills} />
      <TagList label="Interests" items={profile.interests} />
      <Row label="GitHub" value={profile.github} href />
      <Row label="LinkedIn" value={profile.linkedIn} href />
    </Section>
  );
}

function SupervisorProfileSections({ profile }: { profile: UserProfile }) {
  return (
    <Section title="Supervisor profile">
      <Row label="Full name" value={profile.fullName} />
      <Row label="Profile email" value={profile.email} />
      <Row label="Faculty ID" value={profile.facultyId} />
      <Row label="Department" value={profile.department} />
      <Row label="Designation" value={profile.designation} />
      <Row label="Office location" value={profile.officeLocation} />
      <Row label="Office hours" value={profile.officeHours} />
      <Row label="Biography" value={profile.biography} />
      <TagList label="Research areas" items={profile.researchAreas} />
      <TagList label="Publications" items={profile.publications} />
      <Row label="LinkedIn" value={profile.linkedIn} href />
      <Row label="Google Scholar" value={profile.googleScholar} href />
    </Section>
  );
}

function CoordinatorProfileSections({ profile }: { profile: UserProfile }) {
  return (
    <Section title="Coordinator profile">
      <Row label="Full name" value={profile.fullName} />
      <Row label="Profile email" value={profile.email} />
      <Row label="Faculty ID" value={profile.facultyId} />
      <Row label="Department" value={profile.department} />
      <Row label="Designation" value={profile.designation} />
      <Row label="Coordinator role" value={profile.coordinatorRole} />
      <Row label="Office location" value={profile.officeLocation} />
      <Row label="Contact information" value={profile.contactInformation} />
      <Row label="Biography" value={profile.biography} />
    </Section>
  );
}

function TeamSection({ detail }: { detail: CoordinatorUserDetail }) {
  const { team } = detail;
  if (!team) {
    return (
      <section className="space-y-2">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Team
        </h4>
        <p className="text-sm text-muted-foreground">
          Not a member of any team.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Team
      </h4>
      <div className="rounded-lg border p-4 text-sm">
        <p className="font-medium">{team.team.name}</p>
        <p className="text-muted-foreground">{team.team.domain}</p>
        {team.team.projectTitle && (
          <p className="mt-2 font-medium">{team.team.projectTitle}</p>
        )}
        {team.team.projectAbstract && (
          <p className="mt-1 text-muted-foreground">{team.team.projectAbstract}</p>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Row
            label="Members"
            value={`${team.memberCount} / ${team.team.maxMembers}`}
          />
          <Row
            label="Team role"
            value={team.membership.teamRole ?? "No role assigned"}
          />
          <Row
            label="Joined team"
            value={formatDate(team.membership.joinedAt)}
          />
          <Row
            label="Position"
            value={team.isLeader ? "Team leader" : "Member"}
          />
          <Row
            label="Team status"
            value={team.team.isOpen ? "Open" : "Closed"}
          />
        </div>
      </div>
    </section>
  );
}

function IssuesSection({ issues }: { issues: CoordinatorUserIssue[] }) {
  return (
    <section className="space-y-3">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Assigned issues
      </h4>
      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No issues assigned.</p>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => (
            <div key={issue.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{issue.title}</p>
                <StatusBadge status={issue.status} />
              </div>
              {issue.description && (
                <p className="mt-1 text-muted-foreground">{issue.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
