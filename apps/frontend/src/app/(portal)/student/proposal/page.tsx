"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  ExternalLink,
  FileText,
  History,
  Loader2,
  Mail,
  Send,
  User,
  X,
} from "lucide-react";
import { useState } from "react";

import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { StatusBadge } from "@/components/common/status-badge";
import { SupervisorBrowseCard } from "@/components/proposal/supervisor-browse-card";
import { SupervisorProfileModal } from "@/components/profile/supervisor-profile-modal";
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
import { useStudentPageQuery } from "@/hooks/use-student-page";
import { proposalService } from "@/services/proposal.service";
import { studentService } from "@/services/student.service";
import { useAuth } from "@/providers/auth-provider";
import type { SupervisorInvitation } from "@/types/supervisor";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function resolveFileUrl(url: string) {
  return url.startsWith("http") ? url : `${apiBase}${url}`;
}

export default function StudentProposalPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [sendingSupervisorId, setSendingSupervisorId] = useState<string | null>(
    null,
  );

  const pageQuery = useStudentPageQuery(
    "proposal",
    studentService.getProposal,
  );

  const pageData = pageQuery.data;
  const team = pageData?.team ?? null;
  const proposal = pageData?.proposal ?? null;
  const interests = pageData?.interests ?? pageData?.invitations ?? [];
  const supervisors = pageData?.supervisors ?? [];
  const requestHistory = pageData?.requestHistory ?? [];
  const pendingSupervisorId = pageData?.pendingSupervisorId ?? null;
  const hasPendingProposal = pageData?.hasPendingProposal ?? false;
  const isWorkflowLocked = pageData?.isWorkflowLocked ?? false;
  const isProfileComplete = pageData?.isProfileComplete ?? false;
  const profiles = pageData?.profiles;

  const invalidateProposal = () => {
    queryClient.invalidateQueries({ queryKey: ["student", "proposal"] });
    queryClient.invalidateQueries({ queryKey: ["student", "team"] });
    queryClient.invalidateQueries({ queryKey: ["proposal"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const requestMutation = useMutation({
    mutationFn: (supervisorId: string) =>
      proposalService.requestSupervisor(supervisorId),
    onSuccess: () => {
      toast.success(
        "Proposal submitted! The supervisor has 5 minutes to respond.",
      );
      invalidateProposal();
      setSendingSupervisorId(null);
    },
    onError: (e) => {
      toast.error(getErrorMessage(e));
      setSendingSupervisorId(null);
    },
  });

  const ignoreInterestMutation = useMutation({
    mutationFn: (interestId: string) =>
      proposalService.ignoreInterest(interestId),
    onSuccess: () => {
      toast.success("Expression of interest dismissed.");
      invalidateProposal();
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setRespondingId(null);
    },
    onError: (e) => {
      toast.error(getErrorMessage(e));
      setRespondingId(null);
    },
  });

  const supervisorId = proposal?.assignedSupervisorId;
  const supervisorName = supervisorId
    ? getDisplayName(profiles, supervisorId)
    : null;

  const isTeamLeader = !!user && !!team && team.leaderId === user.userId;

  const workflowStatus = proposal?.status ?? "DRAFT";

  const canSubmitProposal =
    isProfileComplete &&
    !isWorkflowLocked &&
    !proposal?.assignedSupervisorId &&
    !hasPendingProposal;

  const handleSendProposal = (targetSupervisorId: string) => {
    setSendingSupervisorId(targetSupervisorId);
    requestMutation.mutate(targetSupervisorId);
  };

  const handleIgnoreInterest = (interestId: string) => {
    setRespondingId(interestId);
    ignoreInterestMutation.mutate(interestId);
  };

  if (pageQuery.isLoading) return <DashboardSkeleton />;

  if (pageQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(pageQuery.error)}
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  if (!team) {
    return (
      <EmptyState
        title="Join a team first"
        description="You need to be part of a team before sending a proposal."
        action={
          <Button asChild>
            <Link href="/student/team">Go to Team</Link>
          </Button>
        }
      />
    );
  }

  if (!isTeamLeader) {
    return (
      <EmptyState
        title="Awaiting team leader"
        description="Only the team leader can send proposal requests to supervisors."
      />
    );
  }

  return (
    <div className="space-y-6">
      {!isProfileComplete && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertCircle className="h-5 w-5" />
              Team Profile Incomplete
            </CardTitle>
            <CardDescription>
              Your Team Profile is incomplete. Please complete your project
              information before sending a proposal to a supervisor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/student/team">Complete Team Profile</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {team.projectTitle || "Project Proposal"}
              </CardTitle>
              <CardDescription>{team.domain}</CardDescription>
            </div>
            <StatusBadge status={workflowStatus} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {team.projectAbstract && (
            <div>
              <h4 className="mb-1 text-sm font-medium">Abstract</h4>
              <p className="text-sm text-muted-foreground">
                {team.projectAbstract}
              </p>
            </div>
          )}
          {team.proposalPdfUrl && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={resolveFileUrl(team.proposalPdfUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                View Proposal PDF
              </a>
            </Button>
          )}
          {proposal && (
            <p className="text-xs text-muted-foreground">
              Proposal record created {formatDate(proposal.createdAt)}
            </p>
          )}
          {isWorkflowLocked && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Proposal workflow is locked after supervisor acceptance. Project
              information can only be edited from the Team page before
              acceptance.
            </p>
          )}
          {supervisorName && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Supervisor: {supervisorName}
              {proposal?.assignedSupervisorId && (
                <Button
                  type="button"
                  variant="link"
                  className="ml-2 h-auto p-0"
                  onClick={() =>
                    setViewProfileId(proposal.assignedSupervisorId!)
                  }
                >
                  View profile
                </Button>
              )}
            </p>
          )}
          {proposal?.status === "REJECTED" && proposal.reviewFeedback && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <h4 className="mb-1 text-sm font-medium text-destructive">
                Supervisor Feedback
              </h4>
              <p className="text-sm text-muted-foreground">
                {proposal.reviewFeedback}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Update your team profile on the Team page, then return here to
                send a new supervision request.
              </p>
              <Button asChild className="mt-3" variant="outline" size="sm">
                <Link href="/student/team">Update Team Profile</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {requestHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Proposal Request History
            </CardTitle>
            <CardDescription>
              Previous supervision requests sent by your team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {requestHistory.map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {getDisplayName(profiles, request.supervisorId)}
                    </span>
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sent {formatDate(request.createdAt)}
                    {request.status === "IGNORED" && request.resolvedAt && (
                      <> · Ignored {formatDate(request.resolvedAt)}</>
                    )}
                  </p>
                  {request.status === "REJECTED" && request.rejectionReason && (
                    <p className="mt-1 text-muted-foreground">
                      Reason: {request.rejectionReason}
                    </p>
                  )}
                </div>
                {request.status === "PENDING" && request.expiresAt && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Expires {formatDate(request.expiresAt)}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {hasPendingProposal && pendingSupervisorId && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle>Proposal Pending Review</CardTitle>
            <CardDescription>
              Waiting for{" "}
              {getDisplayName(profiles, pendingSupervisorId)} to accept or
              reject your proposal
              {proposal?.pendingExpiresAt && (
                <> · expires {formatDate(proposal.pendingExpiresAt)}</>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {interests.length > 0 && !isWorkflowLocked && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Supervisor Interest
              </CardTitle>
              <CardDescription>
                Supervisors who expressed interest in supervising your project.
                Send a proposal to proceed — only the supervisor can accept or
                reject.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {interests.map((interest) => (
                <InterestRow
                  key={interest.id}
                  interest={interest}
                  supervisorName={getDisplayName(
                    profiles,
                    interest.supervisorId,
                  )}
                  supervisorProfile={profiles?.[interest.supervisorId]}
                  isResponding={respondingId === interest.id}
                  canSendProposal={canSubmitProposal}
                  isPendingToAnother={
                    hasPendingProposal &&
                    pendingSupervisorId !== interest.supervisorId
                  }
                  isPendingToSelf={
                    hasPendingProposal &&
                    pendingSupervisorId === interest.supervisorId
                  }
                  isSending={sendingSupervisorId === interest.supervisorId}
                  sendDisabled={requestMutation.isPending}
                  onViewProfile={() =>
                    setViewProfileId(interest.supervisorId)
                  }
                  onSendProposal={() =>
                    handleSendProposal(interest.supervisorId)
                  }
                  onIgnore={() => handleIgnoreInterest(interest.id)}
                />
              ))}
            </CardContent>
          </Card>
        )}

      {canSubmitProposal && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Browse Supervisors
            </CardTitle>
            <CardDescription>
              Compare supervisor profiles and submit your proposal. Each
              submission expires in 5 minutes if not reviewed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {supervisors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No supervisors available right now.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {supervisors.map((supervisor) => (
                  <SupervisorBrowseCard
                    key={supervisor.id}
                    supervisor={supervisor}
                    profile={profiles?.[supervisor.id]}
                    isSending={sendingSupervisorId === supervisor.id}
                    disabled={requestMutation.isPending}
                    onViewProfile={() => setViewProfileId(supervisor.id)}
                    onSendRequest={() => handleSendProposal(supervisor.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <SupervisorProfileModal
        supervisorId={viewProfileId}
        open={!!viewProfileId}
        onOpenChange={(open) => {
          if (!open) setViewProfileId(null);
        }}
      />
    </div>
  );
}

function InterestRow({
  interest,
  supervisorName,
  supervisorProfile,
  isResponding,
  canSendProposal,
  isPendingToAnother,
  isPendingToSelf,
  isSending,
  sendDisabled,
  onViewProfile,
  onSendProposal,
  onIgnore,
}: {
  interest: SupervisorInvitation;
  supervisorName: string;
  supervisorProfile?: {
    department?: string | null;
    designation?: string | null;
    email?: string | null;
  };
  isResponding: boolean;
  canSendProposal: boolean;
  isPendingToAnother: boolean;
  isPendingToSelf: boolean;
  isSending: boolean;
  sendDisabled: boolean;
  onViewProfile: () => void;
  onSendProposal: () => void;
  onIgnore: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{supervisorName}</span>
          <StatusBadge status="PENDING" />
        </div>
        <p className="text-sm text-muted-foreground">
          {supervisorName} is interested in supervising your project.
        </p>
        {supervisorProfile?.designation && (
          <p className="text-sm text-muted-foreground">
            {supervisorProfile.designation}
            {supervisorProfile.department
              ? ` · ${supervisorProfile.department}`
              : ""}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Expressed interest {formatDate(interest.createdAt)}
        </p>
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-sm"
          onClick={onViewProfile}
        >
          View supervisor profile
        </Button>
        {isPendingToAnother && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Waiting for current proposal outcome.
          </p>
        )}
        {isPendingToSelf && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Proposal submitted — awaiting supervisor response.
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {canSendProposal && !isPendingToAnother && !isPendingToSelf && (
          <Button
            size="sm"
            onClick={onSendProposal}
            disabled={isSending || sendDisabled}
          >
            {isSending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send Proposal
          </Button>
        )}
        {!isPendingToSelf && (
          <Button
            size="sm"
            variant="outline"
            onClick={onIgnore}
            disabled={isResponding}
          >
            {isResponding ? (
              <Loader2 className="animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            Ignore
          </Button>
        )}
      </div>
    </div>
  );
}
