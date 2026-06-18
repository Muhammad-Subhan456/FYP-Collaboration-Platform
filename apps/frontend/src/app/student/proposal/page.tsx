"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { FileText, Loader2, Send } from "lucide-react";

import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
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
import { getDisplayName, useProfilesLookup } from "@/hooks/use-profiles";
import { proposalService } from "@/services/proposal.service";
import { teamService } from "@/services/team.service";
import { useState } from "react";

const proposalSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  domain: z.string().min(2, "Domain is required"),
  abstract: z.string().min(20, "Abstract must be at least 20 characters"),
});

type ProposalForm = z.infer<typeof proposalSchema>;

export default function StudentProposalPage() {
  const queryClient = useQueryClient();
  const [selectedSupervisor, setSelectedSupervisor] = useState("");

  const teamQuery = useQuery({
    queryKey: ["team", "my-team"],
    queryFn: teamService.getMyTeam,
  });

  const proposalQuery = useQuery({
    queryKey: ["proposal", "my"],
    queryFn: proposalService.getMyProposal,
    enabled: !!teamQuery.data,
  });

  const supervisorsQuery = useQuery({
    queryKey: ["supervisors"],
    queryFn: proposalService.getSupervisors,
    enabled:
      !!proposalQuery.data &&
      !proposalQuery.data.assignedSupervisorId &&
      proposalQuery.data.status !== "APPROVED",
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProposalForm>({
    resolver: zodResolver(proposalSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: ProposalForm) =>
      proposalService.createProposal({
        ...data,
        teamId: teamQuery.data!.id,
      }),
    onSuccess: () => {
      toast.success("Proposal created!");
      queryClient.invalidateQueries({ queryKey: ["proposal"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const requestMutation = useMutation({
    mutationFn: () =>
      proposalService.requestSupervisor(
        proposalQuery.data!.id,
        selectedSupervisor,
      ),
    onSuccess: () => {
      toast.success("Supervisor request sent!");
      queryClient.invalidateQueries({ queryKey: ["proposal"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const supervisorId = proposalQuery.data?.assignedSupervisorId;
  const profilesQuery = useProfilesLookup(supervisorId ? [supervisorId] : []);
  const supervisorName = supervisorId
    ? getDisplayName(profilesQuery.data, supervisorId)
    : null;

  if (teamQuery.isLoading) return <DashboardSkeleton />;

  if (!teamQuery.data) {
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

  if (proposalQuery.isLoading) return <DashboardSkeleton />;

  const proposal = proposalQuery.data;

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
            </p>
          )}
        </CardContent>
      </Card>

      {canRequestSupervisor && (
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
            {supervisorsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading supervisors...</p>
            ) : supervisorsQuery.isError ? (
              <ErrorState message={getErrorMessage(supervisorsQuery.error)} />
            ) : (
              <>
                <Select
                  value={selectedSupervisor}
                  onValueChange={setSelectedSupervisor}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisorsQuery.data?.map((s) => (
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
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
