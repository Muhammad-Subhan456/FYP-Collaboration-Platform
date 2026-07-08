"use client";

import {
  useBrowseTeamsQuery,
  useStudentTeamQuery,
  isStudentQueryPending,
} from "@/queries/student";
import {
  useStudentTeamMutations,
} from "@/mutations/student";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Check,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  LogOut,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { useAuth } from "@/providers/auth-provider";
import { uploadService } from "@/services/progress.service";
import { getDisplayName } from "@/hooks/use-profiles";
import {
  ProfileAvatar,
  ProfileViewModal,
} from "@/components/profile/profile-view-modal";
import { BrowseTeamDetailsDialog } from "@/components/team/browse-team-details-dialog";
import type { UserProfile } from "@/types/profile";
import type { Team } from "@/types/student";

const createTeamSchema = z.object({
  name: z.string().min(2, "Team name is required"),
  domain: z.string().min(2, "Domain is required"),
  projectTitle: z.string().optional(),
  projectAbstract: z.string().optional(),
  maxMembers: z.number().min(2).max(6),
});

const editTeamSchema = z.object({
  name: z.string().min(2, "Team name is required"),
  domain: z.string().min(2, "Domain is required"),
  projectTitle: z.string().min(5, "Project title must be at least 5 characters"),
  projectAbstract: z
    .string()
    .min(20, "Project abstract must be at least 20 characters"),
});

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function resolveFileUrl(url: string) {
  return url.startsWith("http") ? url : `${apiBase}${url}`;
}

type CreateTeamForm = z.infer<typeof createTeamSchema>;
type EditTeamForm = z.infer<typeof editTeamSchema>;

export default function StudentTeamPage() {
  const { user } = useAuth();
  const [searchDomain, setSearchDomain] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [viewProfile, setViewProfile] = useState<UserProfile | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [joiningTeamId, setJoiningTeamId] = useState<string | null>(null);
  const [joinedTeamIds, setJoinedTeamIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedBrowseTeamId, setSelectedBrowseTeamId] = useState<
    string | null
  >(null);
  const [selectedBrowseTeam, setSelectedBrowseTeam] = useState<Team | null>(
    null,
  );
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [editPdfUrl, setEditPdfUrl] = useState<string | null>(null);
  const [editPdfFileName, setEditPdfFileName] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const overviewQuery = useStudentTeamQuery();

  const browseQuery = useBrowseTeamsQuery(
    activeSearch,
    !overviewQuery.data?.team && !!activeSearch,
  );

  const {
    createMutation,
    joinMutation,
    updateTeamMutation,
    approveMutation,
    rejectMutation,
    roleMutation,
    deleteTeamMutation,
    leaveTeamMutation,
  } = useStudentTeamMutations();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTeamForm>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { maxMembers: 4 },
  });

  const editTeamForm = useForm<EditTeamForm>({
    resolver: zodResolver(editTeamSchema),
    values: overviewQuery.data?.team
      ? {
          name: overviewQuery.data.team.name,
          domain: overviewQuery.data.team.domain,
          projectTitle: overviewQuery.data.team.projectTitle ?? "",
          projectAbstract: overviewQuery.data.team.projectAbstract ?? "",
        }
      : undefined,
  });

  const handleStartEdit = () => {
    const currentTeam = overviewQuery.data?.team;
    setEditPdfUrl(currentTeam?.proposalPdfUrl ?? null);
    setEditPdfFileName(
      currentTeam?.proposalPdfUrl ? "Current proposal.pdf" : null,
    );
    setIsEditingTeam(true);
  };

  const handlePdfUpload = async (file: File) => {
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      toast.error("Only PDF files are allowed");
      return;
    }
    setUploadingPdf(true);
    try {
      const uploaded = await uploadService.uploadProposalPdf(file);
      setEditPdfUrl(uploaded.fileUrl);
      setEditPdfFileName(file.name);
      toast.success("Proposal PDF uploaded");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setUploadingPdf(false);
    }
  };

  if (isStudentQueryPending(overviewQuery)) return <DashboardSkeleton />;

  if (overviewQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(overviewQuery.error)}
        onRetry={() => overviewQuery.refetch()}
      />
    );
  }

  const overview = overviewQuery.data;
  if (!overview) {
    return (
      <ErrorState
        message="Failed to load team data."
        onRetry={() => overviewQuery.refetch()}
      />
    );
  }

  const team = overview.team;
  const profiles = overview.profiles;
  const isLeader = overview.isLeader;
  const canDeleteTeam = overview.canDeleteTeam ?? false;
  const canLeaveTeam = overview.canLeaveTeam ?? false;
  const canEditProfile = overview.canEditProfile ?? false;
  const isProfileComplete = overview.isProfileComplete ?? false;

  const isWorkflowLocked = overview.isWorkflowLocked ?? false;

  if (team) {
    const members = overview.members;
    const joinRequests = overview.joinRequests;

    return (
      <div className="space-y-6">
        <ProfileViewModal
          profile={viewProfile}
          open={!!viewProfile}
          onOpenChange={(open) => !open && setViewProfile(null)}
        />
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {team.name}
                </CardTitle>
                <CardDescription>{team.domain}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={team.isOpen ? "ACTIVE" : "INACTIVE"} />
                {isLeader && canEditProfile && !isEditingTeam && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleStartEdit}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Team Profile
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditingTeam && isLeader && canEditProfile ? (
              <form
                onSubmit={editTeamForm.handleSubmit((data) => {
                  if (!editPdfUrl) {
                    toast.error("Please upload a proposal PDF");
                    return;
                  }
                  updateTeamMutation.mutate(
                    {
                      ...data,
                      proposalPdfUrl: editPdfUrl,
                    },
                    { onSuccess: () => setIsEditingTeam(false) },
                  );
                })}
                className="space-y-4 rounded-lg border p-4"
              >
                <div className="space-y-2">
                  <Label>Team Name</Label>
                  <Input {...editTeamForm.register("name")} />
                  {editTeamForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {editTeamForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Domain</Label>
                  <Input {...editTeamForm.register("domain")} />
                  {editTeamForm.formState.errors.domain && (
                    <p className="text-sm text-destructive">
                      {editTeamForm.formState.errors.domain.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Project Title</Label>
                  <Input {...editTeamForm.register("projectTitle")} />
                  {editTeamForm.formState.errors.projectTitle && (
                    <p className="text-sm text-destructive">
                      {editTeamForm.formState.errors.projectTitle.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Project Abstract</Label>
                  <Textarea
                    rows={4}
                    {...editTeamForm.register("projectAbstract")}
                  />
                  {editTeamForm.formState.errors.projectAbstract && (
                    <p className="text-sm text-destructive">
                      {editTeamForm.formState.errors.projectAbstract.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Proposal PDF</Label>
                  <input
                    ref={pdfInputRef}
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
                      <FileText className="h-4 w-4" />
                      {editPdfUrl ? "Replace PDF" : "Upload PDF"}
                    </Button>
                    {editPdfUrl && (
                      <>
                        <Button type="button" variant="secondary" size="sm" asChild>
                          <a
                            href={resolveFileUrl(editPdfUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View PDF
                          </a>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditPdfUrl(null);
                            setEditPdfFileName(null);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                        {editPdfFileName && (
                          <span className="text-sm text-muted-foreground">
                            {editPdfFileName}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={updateTeamMutation.isPending || uploadingPdf}
                  >
                    {updateTeamMutation.isPending && (
                      <Loader2 className="animate-spin" />
                    )}
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsEditingTeam(false);
                      setEditPdfUrl(null);
                      setEditPdfFileName(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <>
            {!isProfileComplete && isLeader && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-300">
                Complete your team profile (title, abstract, domain, and
                proposal PDF) before sending a proposal to a supervisor.
              </p>
            )}
            {team.projectTitle && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Project title
                </p>
                <p className="text-sm">{team.projectTitle}</p>
              </div>
            )}
            {team.projectAbstract && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Project abstract
                </p>
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
            <div className="flex flex-wrap gap-6 text-sm">
              <span>
                <strong>{members.length}</strong> / {team.maxMembers} members
              </span>
              <span className="text-muted-foreground">
                Created {formatDate(team.createdAt)}
              </span>
              {isLeader && (
                <span className="font-medium text-primary">You are the leader</span>
              )}
            </div>
            {isWorkflowLocked && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Team profile and proposal PDF are locked after supervisor
                acceptance.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {canDeleteTeam && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteTeamMutation.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Delete this team? All members will be removed.",
                      )
                    ) {
                      deleteTeamMutation.mutate();
                    }
                  }}
                >
                  {deleteTeamMutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete Team
                </Button>
              )}
              {canLeaveTeam && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={leaveTeamMutation.isPending}
                  onClick={() => {
                    if (window.confirm("Leave this team?")) {
                      leaveTeamMutation.mutate();
                    }
                  }}
                >
                  {leaveTeamMutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  Leave Team
                </Button>
              )}
            </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            {isLeader && (
              <CardDescription>
                Assign roles and responsibilities to each member
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {members.map((m) => {
                const profile = profiles?.[m.authUserId];
                const isEditing = editingMemberId === m.id;
                const draftRole = roleDrafts[m.id] ?? m.teamRole ?? "";
                return (
                  <div
                    key={m.id}
                    className="flex flex-col gap-3 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <ProfileAvatar profile={profile} className="h-9 w-9" />
                      <div>
                        <span className="font-medium">
                          {getDisplayName(profiles, m.authUserId)}
                        </span>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          {m.authUserId === team.leaderId && (
                            <Badge variant="secondary" className="text-[10px]">
                              Leader
                            </Badge>
                          )}
                          {m.teamRole && !isEditing && (
                            <Badge variant="outline" className="text-[10px]">
                              {m.teamRole}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Joined {formatDate(m.joinedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => profile && setViewProfile(profile)}
                        disabled={!profile}
                      >
                        <Eye className="h-4 w-4" />
                        View Profile
                      </Button>
                      {isLeader && !isWorkflowLocked && m.authUserId !== team.leaderId && (
                        isEditing ? (
                          <>
                            <Input
                              className="h-8 w-40"
                              placeholder="e.g. Backend Lead"
                              value={draftRole}
                              onChange={(e) =>
                                setRoleDrafts((prev) => ({
                                  ...prev,
                                  [m.id]: e.target.value,
                                }))
                              }
                            />
                            <Button
                              size="sm"
                              disabled={roleMutation.isPending}
                              onClick={() =>
                                roleMutation.mutate(
                                  {
                                    memberId: m.id,
                                    teamRole: draftRole,
                                  },
                                  { onSuccess: () => setEditingMemberId(null) },
                                )
                              }
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingMemberId(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingMemberId(m.id);
                              setRoleDrafts((prev) => ({
                                ...prev,
                                [m.id]: m.teamRole ?? "",
                              }));
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            {m.teamRole ? "Edit Role" : "Assign Role"}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {isLeader && !isWorkflowLocked && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Pending Join Requests
              </CardTitle>
              <CardDescription>Approve or reject students who want to join</CardDescription>
            </CardHeader>
            <CardContent>
              {joinRequests.length > 0 ? (
                <div className="space-y-3">
                  {joinRequests.map((req) => {
                    const profile = profiles?.[req.authUserId];
                    return (
                      <div key={req.id} className="rounded-xl border p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex gap-3">
                            <ProfileAvatar profile={profile} className="h-12 w-12" />
                            <div>
                              <p className="font-medium">
                                {getDisplayName(profiles, req.authUserId)}
                              </p>
                              {profile?.department && (
                                <p className="text-sm text-muted-foreground">
                                  {profile.department}
                                  {profile.batch ? ` · Batch ${profile.batch}` : ""}
                                </p>
                              )}
                              {profile?.skills?.length ? (
                                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                                  Skills: {profile.skills.join(", ")}
                                </p>
                              ) : null}
                              {profile?.bio && (
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {profile.bio}
                                </p>
                              )}
                              {(profile?.github || profile?.linkedIn) && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {profile.github ? `GitHub: ${profile.github}` : ""}
                                  {profile.github && profile.linkedIn ? " · " : ""}
                                  {profile.linkedIn ? `LinkedIn: ${profile.linkedIn}` : ""}
                                </p>
                              )}
                              <p className="mt-1 text-xs text-muted-foreground">
                                Requested {formatDate(req.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => profile && setViewProfile(profile)}
                              disabled={!profile}
                            >
                              View Full Profile
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => approveMutation.mutate(req.id)}
                              disabled={approveMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectMutation.mutate(req.id)}
                              disabled={rejectMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pending requests.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const browseTeams = activeSearch
    ? browseQuery.data ?? []
    : overview.browseTeams ?? [];

  const pendingJoinTeamIds = new Set([
    ...(overview.pendingJoinTeamIds ?? []),
    ...joinedTeamIds,
  ]);

  const hasPendingJoinRequest = (teamId: string) =>
    pendingJoinTeamIds.has(teamId);

  const handleRequestJoin = (teamId: string) => {
    setJoiningTeamId(teamId);
    joinMutation.mutate(teamId, {
      onSuccess: () => {
        toast.success("Join request sent!");
        setJoinedTeamIds((prev) => new Set(prev).add(teamId));
      },
      onSettled: () => setJoiningTeamId(null),
    });
  };

  return (
    <Tabs defaultValue="browse" className="space-y-4">
      <BrowseTeamDetailsDialog
        teamId={selectedBrowseTeamId}
        open={!!selectedBrowseTeamId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBrowseTeamId(null);
            setSelectedBrowseTeam(null);
          }
        }}
        fallbackTeam={selectedBrowseTeam}
        hasPendingRequest={
          selectedBrowseTeamId
            ? hasPendingJoinRequest(selectedBrowseTeamId)
            : false
        }
        isJoining={joiningTeamId === selectedBrowseTeamId}
        onRequestJoin={handleRequestJoin}
      />
      <TabsList>
        <TabsTrigger value="browse">Browse Teams</TabsTrigger>
        <TabsTrigger value="create">Create Team</TabsTrigger>
      </TabsList>

      <TabsContent value="browse">
        <Card>
          <CardHeader>
            <CardTitle>Find a Team</CardTitle>
            <CardDescription>
              Browse open teams or search by domain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by domain (e.g. AI, Web)..."
                value={searchDomain}
                onChange={(e) => setSearchDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setActiveSearch(searchDomain)}
              />
              <Button
                variant="secondary"
                onClick={() => setActiveSearch(searchDomain)}
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>

            {activeSearch && browseQuery.isLoading ? (
              <DashboardSkeleton />
            ) : browseQuery.isError ? (
              <ErrorState message={getErrorMessage(browseQuery.error)} />
            ) : browseTeams.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {browseTeams.map((t) => (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer rounded-xl border p-4 transition-all hover:border-primary/30 hover:shadow-sm"
                    onClick={() => {
                      setSelectedBrowseTeam(t);
                      setSelectedBrowseTeamId(t.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedBrowseTeam(t);
                        setSelectedBrowseTeamId(t.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{t.name}</h3>
                        <p className="text-sm text-muted-foreground">{t.domain}</p>
                      </div>
                      <StatusBadge status="ACTIVE" />
                    </div>
                    {t.projectTitle && (
                      <p className="mt-2 line-clamp-1 text-sm font-medium">
                        {t.projectTitle}
                      </p>
                    )}
                    {t.projectAbstract && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {t.projectAbstract}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Max {t.maxMembers} members
                      </span>
                      <Button
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRequestJoin(t.id);
                        }}
                        disabled={
                          joiningTeamId === t.id || hasPendingJoinRequest(t.id)
                        }
                      >
                        {joiningTeamId === t.id && (
                          <Loader2 className="animate-spin" />
                        )}
                        {hasPendingJoinRequest(t.id)
                          ? "Request Sent"
                          : "Request to Join"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No teams found"
                description="Try a different search or create your own team."
              />
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="create">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Create a Team</CardTitle>
            <CardDescription>
              Become the team leader and invite others to join
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((data) =>
                createMutation.mutate(data, { onSuccess: () => reset() }),
              )}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input id="name" placeholder="Team Alpha" {...register("name")} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  placeholder="Machine Learning, Web Dev..."
                  {...register("domain")}
                />
                {errors.domain && (
                  <p className="text-sm text-destructive">{errors.domain.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectTitle">Project Title (optional)</Label>
                <Input
                  id="projectTitle"
                  placeholder="Early project title for your FYP"
                  {...register("projectTitle")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectAbstract">Project Abstract (optional)</Label>
                <Textarea
                  id="projectAbstract"
                  rows={3}
                  placeholder="Brief summary to reuse when creating your proposal"
                  {...register("projectAbstract")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxMembers">Max Members</Label>
                <Input
                  id="maxMembers"
                  type="number"
                  min={2}
                  max={6}
                  {...register("maxMembers", { valueAsNumber: true })}
                />
                {errors.maxMembers && (
                  <p className="text-sm text-destructive">
                    {errors.maxMembers.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="animate-spin" />}
                Create Team
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
