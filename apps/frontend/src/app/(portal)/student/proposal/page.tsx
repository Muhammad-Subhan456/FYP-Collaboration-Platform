"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Check,
  FileText,
  Loader2,
  Mail,
  Send,
  User,
  X,
} from "lucide-react";

import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { StatusBadge } from "@/components/common/status-badge";

import { SupervisorProfileModal } from "@/components/profile/supervisor-profile-modal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { getDisplayName } from "@/hooks/use-profiles";
import { useStudentPageQuery } from "@/hooks/use-student-page";
import { proposalService } from "@/services/proposal.service";
import { studentService } from "@/services/student.service";
import { useAuth } from "@/providers/auth-provider";
import type { SupervisorInvitation } from "@/types/supervisor";
import { useState } from "react";

const proposalSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  domain: z.string().min(2, "Domain is required"),
  abstract: z.string().min(20, "Abstract must be at least 20 characters"),
});

type ProposalForm = z.infer<typeof proposalSchema>;

export default function StudentProposalPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const pageQuery = useStudentPageQuery(
    "proposal",
    studentService.getProposal,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProposalForm>({
    resolver: zodResolver(proposalSchema),
  });

  const pageData = pageQuery.data;
  const team = pageData?.team ?? null;
  const proposal = pageData?.proposal ?? null;
  const invitations = pageData?.invitations ?? [];
  const supervisors = pageData?.supervisors ?? [];
  const profiles = pageData?.profiles;

  const resubmitForm = useForm<ProposalForm>({
    resolver: zodResolver(proposalSchema),
    values: proposal
      ? {
          title: proposal.title,
          domain: proposal.domain,
          abstract: proposal.abstract,
        }
      : undefined,
  });

  const createMutation = useMutation({
    mutationFn: (data: ProposalForm) =>
      proposalService.createProposal({
        ...data,
        teamId: team!.id,
      }),
    onSuccess: () => {
      toast.success("Proposal created!");
      queryClient.invalidateQueries({ queryKey: ["student", "proposal"] });
      queryClient.invalidateQueries({ queryKey: ["proposal"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const requestMutation = useMutation({
    mutationFn: () =>
      proposalService.requestSupervisor(
        proposal!.id,
        selectedSupervisor,
      ),
    onSuccess: () => {
      toast.success("Supervisor request sent!");
      queryClient.invalidateQueries({ queryKey: ["student", "proposal"] });
      queryClient.invalidateQueries({ queryKey: ["proposal"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const acceptInvitationMutation = useMutation({
    mutationFn: (invitationId: string) =>
      proposalService.acceptInvitation(invitationId),
    onSuccess: () => {
      toast.success("Supervisor invitation accepted!");
      queryClient.invalidateQueries({ queryKey: ["student", "proposal"] });
      queryClient.invalidateQueries({ queryKey: ["proposal"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setRespondingId(null);
    },
    onError: (e) => {
      toast.error(getErrorMessage(e));
      setRespondingId(null);
    },
  });

  const rejectInvitationMutation = useMutation({
    mutationFn: (invitationId: string) =>
      proposalService.rejectInvitation(invitationId),
    onSuccess: () => {
      toast.success("Supervisor invitation declined.");
      queryClient.invalidateQueries({ queryKey: ["student", "proposal"] });
      queryClient.invalidateQueries({ queryKey: ["proposal", "invitations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setRespondingId(null);
    },
    onError: (e) => {
      toast.error(getErrorMessage(e));
      setRespondingId(null);
    },
  });

  const resubmitMutation = useMutation({
    mutationFn: (data: ProposalForm) => proposalService.resubmitProposal(data),
    onSuccess: () => {
      toast.success("Proposal revised and resubmitted!");
      queryClient.invalidateQueries({ queryKey: ["student", "proposal"] });
      queryClient.invalidateQueries({ queryKey: ["proposal"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const supervisorId = proposal?.assignedSupervisorId;
  const supervisorName = supervisorId
    ? getDisplayName(profiles, supervisorId)
    : null;

  const isTeamLeader = !!user && !!team && team.leaderId === user.userId;

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
        description="You need to be part of a team before creating a proposal."
        action={
          <Button asChild>
            <Link href="/student/team">Go to Team</Link>
          </Button>
        }
      />
    );
  }

  if (!proposal) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Create Proposal
          </CardTitle>
          <CardDescription>
            Submit your FYP project proposal for your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((data) => createMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                placeholder="Smart Campus Management System"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                placeholder="Web Development, AI, IoT..."
                {...register("domain")}
              />
              {errors.domain && (
                <p className="text-sm text-destructive">{errors.domain.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="abstract">Abstract</Label>
              <Textarea
                id="abstract"
                rows={5}
                placeholder="Describe your project idea, objectives, and methodology..."
                {...register("abstract")}
              />
              {errors.abstract && (
                <p className="text-sm text-destructive">{errors.abstract.message}</p>
              )}
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="animate-spin" />}
              Submit Proposal
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  const canRequestSupervisor =
    !proposal.assignedSupervisorId &&
    proposal.status !== "APPROVED" &&
    proposal.status !== "REJECTED";

  const pendingInvitations = invitations.filter(
    (inv) => inv.status === "PENDING",
  );

  const handleAcceptInvitation = (invitationId: string) => {
    setRespondingId(invitationId);
    acceptInvitationMutation.mutate(invitationId);
  };

  const handleRejectInvitation = (invitationId: string) => {
    setRespondingId(invitationId);
    rejectInvitationMutation.mutate(invitationId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{proposal.title}</CardTitle>
              <CardDescription>{proposal.domain}</CardDescription>
            </div>
            <StatusBadge status={proposal.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="mb-1 text-sm font-medium">Abstract</h4>
            <p className="text-sm text-muted-foreground">{proposal.abstract}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Created {formatDate(proposal.createdAt)}
          </p>
          {supervisorName && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Supervisor: {supervisorName}
              {proposal.assignedSupervisorId && (
                <Button
                  type="button"
                  variant="link"
                  className="ml-2 h-auto p-0"
                  onClick={() => setViewProfileId(proposal.assignedSupervisorId!)}
                >
                  View profile
                </Button>
              )}
            </p>
          )}
          {proposal.status === "REJECTED" && proposal.reviewFeedback && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <h4 className="mb-1 text-sm font-medium text-destructive">
                Supervisor Feedback
              </h4>
              <p className="text-sm text-muted-foreground">
                {proposal.reviewFeedback}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {proposal.status === "REJECTED" && isTeamLeader && (
        <Card>
          <CardHeader>
            <CardTitle>Revise & Resubmit Proposal</CardTitle>
            <CardDescription>
              Update your proposal based on supervisor feedback and resubmit for review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={resubmitForm.handleSubmit((data) =>
                resubmitMutation.mutate(data),
              )}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Project Title</Label>
                <Input {...resubmitForm.register("title")} />
                {resubmitForm.formState.errors.title && (
                  <p className="text-sm text-destructive">
                    {resubmitForm.formState.errors.title.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Domain</Label>
                <Input {...resubmitForm.register("domain")} />
                {resubmitForm.formState.errors.domain && (
                  <p className="text-sm text-destructive">
                    {resubmitForm.formState.errors.domain.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Abstract</Label>
                <Textarea rows={5} {...resubmitForm.register("abstract")} />
                {resubmitForm.formState.errors.abstract && (
                  <p className="text-sm text-destructive">
                    {resubmitForm.formState.errors.abstract.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={resubmitMutation.isPending}>
                {resubmitMutation.isPending && (
                  <Loader2 className="animate-spin" />
                )}
                Resubmit Proposal
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {(invitations.length > 0 || pendingInvitations.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Supervisor Invitations
            </CardTitle>
            <CardDescription>
              {isTeamLeader
                ? "Review invitations from supervisors interested in supervising your team."
                : "Invitations sent to your team. Only the team leader can accept or decline."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No supervisor invitations yet.
              </p>
            ) : (
              invitations.map((invitation) => (
                <InvitationRow
                  key={invitation.id}
                  invitation={invitation}
                  supervisorName={getDisplayName(
                    profiles,
                    invitation.supervisorId,
                  )}
                  supervisorProfile={
                    profiles?.[invitation.supervisorId]
                  }
                  isTeamLeader={isTeamLeader}
                  isResponding={respondingId === invitation.id}
                  onViewProfile={() => setViewProfileId(invitation.supervisorId)}
                  onAccept={() => handleAcceptInvitation(invitation.id)}
                  onReject={() => handleRejectInvitation(invitation.id)}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {canRequestSupervisor && pendingInvitations.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Request Supervisor
            </CardTitle>
            <CardDescription>
              Select a supervisor and send a supervision request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={selectedSupervisor}
              onValueChange={setSelectedSupervisor}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a supervisor" />
              </SelectTrigger>
              <SelectContent>
                {supervisors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.fullName} — {s.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => requestMutation.mutate()}
              disabled={!selectedSupervisor || requestMutation.isPending}
            >
              {requestMutation.isPending && (
                <Loader2 className="animate-spin" />
              )}
              Send Request
            </Button>
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

function InvitationRow({
  invitation,
  supervisorName,
  supervisorProfile,
  isTeamLeader,
  isResponding,
  onViewProfile,
  onAccept,
  onReject,
}: {
  invitation: SupervisorInvitation;
  supervisorName: string;
  supervisorProfile?: {
    department?: string | null;
    designation?: string | null;
    email?: string | null;
  };
  isTeamLeader: boolean;
  isResponding: boolean;
  onViewProfile: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const isPending = invitation.status === "PENDING";

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{supervisorName}</span>
          <StatusBadge status={invitation.status} />
        </div>
        {supervisorProfile?.designation && (
          <p className="text-sm text-muted-foreground">
            {supervisorProfile.designation}
            {supervisorProfile.department
              ? ` · ${supervisorProfile.department}`
              : ""}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Invited {formatDate(invitation.createdAt)}
        </p>
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-sm"
          onClick={onViewProfile}
        >
          View supervisor profile
        </Button>
      </div>

      {isPending && isTeamLeader ? (
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            onClick={onAccept}
            disabled={isResponding}
          >
            {isResponding ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={isResponding}
          >
            {isResponding ? (
              <Loader2 className="animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            Decline
          </Button>
        </div>
      ) : isPending ? (
        <p className="text-sm text-muted-foreground">
          Awaiting team leader response
        </p>
      ) : null}
    </div>
  );
}
