"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Check,
  ExternalLink,
  FileText,
  History,
  Loader2,
  Mail,
  Send,
  User,
  X,
} from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { getDisplayName } from "@/hooks/use-profiles";
import { useStudentPageQuery } from "@/hooks/use-student-page";
import { proposalService } from "@/services/proposal.service";
import { uploadService } from "@/services/progress.service";
import { studentService } from "@/services/student.service";
import { useAuth } from "@/providers/auth-provider";
import type { SupervisorInvitation } from "@/types/supervisor";
import { useRef, useState } from "react";

const proposalSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  domain: z.string().min(2, "Domain is required"),
  abstract: z.string().min(20, "Abstract must be at least 20 characters"),
});

type ProposalForm = z.infer<typeof proposalSchema>;

export default function StudentProposalPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [sendingSupervisorId, setSendingSupervisorId] = useState<string | null>(
    null,
  );
  const [proposalPdfUrl, setProposalPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const pageQuery = useStudentPageQuery(
    "proposal",
    studentService.getProposal,
  );

  const pageData = pageQuery.data;
  const team = pageData?.team ?? null;
  const proposal = pageData?.proposal ?? null;
  const invitations = pageData?.invitations ?? [];
  const supervisors = pageData?.supervisors ?? [];
  const requestHistory = pageData?.requestHistory ?? [];
  const activePendingRequest = pageData?.activePendingRequest ?? null;
  const isWorkflowLocked = pageData?.isWorkflowLocked ?? false;
  const profiles = pageData?.profiles;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProposalForm>({
    resolver: zodResolver(proposalSchema),
    values: team
      ? {
          title: team.projectTitle ?? "",
          domain: team.domain ?? "",
          abstract: team.projectAbstract ?? "",
        }
      : undefined,
  });

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
        proposalPdfUrl: proposalPdfUrl!,
      }),
    onSuccess: () => {
      toast.success("Proposal created!");
      queryClient.invalidateQueries({ queryKey: ["student", "proposal"] });
      queryClient.invalidateQueries({ queryKey: ["student", "team"] });
      queryClient.invalidateQueries({ queryKey: ["proposal"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const requestMutation = useMutation({
    mutationFn: (supervisorId: string) =>
      proposalService.requestSupervisor(proposal!.id, supervisorId),
    onSuccess: () => {
      toast.success("Supervisor request sent! Supervisor has 5 minutes to respond.");
      queryClient.invalidateQueries({ queryKey: ["student", "proposal"] });
      queryClient.invalidateQueries({ queryKey: ["proposal"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setSendingSupervisorId(null);
    },
    onError: (e) => {
      toast.error(getErrorMessage(e));
      setSendingSupervisorId(null);
    },
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

  const handlePdfUpload = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are allowed");
      return;
    }
    setUploadingPdf(true);
    try {
      const uploaded = await uploadService.uploadProposalPdf(file);
      setProposalPdfUrl(uploaded.fileUrl);
      setPdfFileName(file.name);
      toast.success("Proposal PDF uploaded");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSendRequest = (supervisorId: string) => {
    setSendingSupervisorId(supervisorId);
    requestMutation.mutate(supervisorId);
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
    if (!isTeamLeader) {
      return (
        <EmptyState
          title="Awaiting team leader"
          description="Only the team leader can create the FYP proposal."
        />
      );
    }

    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Create Proposal
          </CardTitle>
          <CardDescription>
            Submit your FYP project proposal for your team. Fields from team
            creation are prefilled when available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((data) => {
              if (!proposalPdfUrl) {
                toast.error("Please upload a proposal PDF");
                return;
              }
              createMutation.mutate(data);
            })}
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
            <div className="space-y-2">
              <Label htmlFor="proposal-pdf">Proposal PDF (required)</Label>
              <input
                ref={pdfInputRef}
                id="proposal-pdf"
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handlePdfUpload(file);
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingPdf}
                  onClick={() => pdfInputRef.current?.click()}
                >
                  {uploadingPdf && <Loader2 className="animate-spin" />}
                  {pdfFileName ? "Replace PDF" : "Upload PDF"}
                </Button>
                {pdfFileName && (
                  <span className="text-sm text-muted-foreground">
                    {pdfFileName}
                  </span>
                )}
              </div>
            </div>
            <Button
              type="submit"
              disabled={createMutation.isPending || uploadingPdf || !proposalPdfUrl}
            >
              {createMutation.isPending && <Loader2 className="animate-spin" />}
              Submit Proposal
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  const canRequestSupervisor =
    isTeamLeader &&
    !isWorkflowLocked &&
    !proposal.assignedSupervisorId &&
    proposal.status !== "APPROVED" &&
    proposal.status !== "REJECTED" &&
    !activePendingRequest;

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
          {proposal.proposalPdfUrl && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={proposal.proposalPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                View Proposal PDF
              </a>
            </Button>
          )}
          {isWorkflowLocked && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Proposal workflow is locked after supervisor acceptance.
            </p>
          )}
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

      {activePendingRequest && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle>Pending Supervision Request</CardTitle>
            <CardDescription>
              Waiting for{" "}
              {getDisplayName(profiles, activePendingRequest.supervisorId)} to
              respond
              {activePendingRequest.expiresAt && (
                <> · expires {formatDate(activePendingRequest.expiresAt)}</>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {(invitations.length > 0 || pendingInvitations.length > 0) && !isWorkflowLocked && (
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
              Browse Supervisors
            </CardTitle>
            <CardDescription>
              Compare supervisor profiles and send a supervision request. Each
              request expires in 5 minutes if not answered.
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
                    onSendRequest={() => handleSendRequest(supervisor.id)}
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
