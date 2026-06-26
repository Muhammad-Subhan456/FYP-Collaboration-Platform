"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Check,
  Eye,
  Loader2,
  Pencil,
  Search,
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
import { teamService } from "@/services/team.service";
import { studentService } from "@/services/student.service";
import { getDisplayName } from "@/hooks/use-profiles";
import {
  ProfileAvatar,
  ProfileViewModal,
} from "@/components/profile/profile-view-modal";
import type { UserProfile } from "@/types/profile";

const createTeamSchema = z.object({
  name: z.string().min(2, "Team name is required"),
  domain: z.string().min(2, "Domain is required"),
  description: z.string().optional(),
  maxMembers: z.number().min(2).max(6),
});

type CreateTeamForm = z.infer<typeof createTeamSchema>;

export default function StudentTeamPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchDomain, setSearchDomain] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [viewProfile, setViewProfile] = useState<UserProfile | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  const overviewQuery = useQuery({
    queryKey: ["student", "team", user?.userId],
    queryFn: studentService.getTeam,
    enabled: !!user?.userId,
  });

  const browseQuery = useQuery({
    queryKey: ["teams", "browse", activeSearch],
    queryFn: () => teamService.searchTeams(activeSearch),
    enabled: !overviewQuery.data?.team && !!activeSearch,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTeamForm>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { maxMembers: 4 },
  });

  const invalidateTeam = () => {
    queryClient.invalidateQueries({ queryKey: ["student", "team"] });
    queryClient.invalidateQueries({ queryKey: ["team"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: teamService.createTeam,
    onSuccess: () => {
      toast.success("Team created successfully!");
      reset();
      invalidateTeam();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const joinMutation = useMutation({
    mutationFn: teamService.requestToJoin,
    onSuccess: () => {
      toast.success("Join request sent!");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const approveMutation = useMutation({
    mutationFn: teamService.approveRequest,
    onSuccess: () => {
      toast.success("Request approved");
      invalidateTeam();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const rejectMutation = useMutation({
    mutationFn: teamService.rejectRequest,
    onSuccess: () => {
      toast.success("Request rejected");
      invalidateTeam();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const roleMutation = useMutation({
    mutationFn: ({
      memberId,
      teamRole,
    }: {
      memberId: string;
      teamRole: string;
    }) => teamService.updateMemberRole(memberId, teamRole),
    onSuccess: () => {
      toast.success("Team role updated");
      setEditingMemberId(null);
      invalidateTeam();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (overviewQuery.isLoading) return <DashboardSkeleton />;

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
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {team.name}
                </CardTitle>
                <CardDescription>{team.domain}</CardDescription>
              </div>
              <StatusBadge status={team.isOpen ? "ACTIVE" : "INACTIVE"} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {team.description && (
              <p className="text-sm text-muted-foreground">{team.description}</p>
            )}
            <div className="flex gap-6 text-sm">
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
                      {isLeader && m.authUserId !== team.leaderId && (
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
                                roleMutation.mutate({
                                  memberId: m.id,
                                  teamRole: draftRole,
                                })
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

        {isLeader && (
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

  return (
    <Tabs defaultValue="browse" className="space-y-4">
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
                    className="rounded-xl border p-4 transition-all hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{t.name}</h3>
                        <p className="text-sm text-muted-foreground">{t.domain}</p>
                      </div>
                      <StatusBadge status="ACTIVE" />
                    </div>
                    {t.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Max {t.maxMembers} members
                      </span>
                      <Button
                        size="sm"
                        onClick={() => joinMutation.mutate(t.id)}
                        disabled={joinMutation.isPending}
                      >
                        {joinMutation.isPending && (
                          <Loader2 className="animate-spin" />
                        )}
                        Request to Join
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
              onSubmit={handleSubmit((data) => createMutation.mutate(data))}
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
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of your team..."
                  {...register("description")}
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
