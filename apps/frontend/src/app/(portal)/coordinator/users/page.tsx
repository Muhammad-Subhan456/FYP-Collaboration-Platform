"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Eye,
  Loader2,
  Shield,
  ShieldOff,
  UserCheck,
  UserCog,
  UserMinus,
} from "lucide-react";

import { CoordinatorUserProfileDialog } from "@/components/coordinator/coordinator-user-profile-dialog";
import { CoordinatorInvitePanel } from "@/components/coordinator/coordinator-invite-panel";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { useCoordinatorUserMutations } from "@/mutations/coordinator";
import {
  isCoordinatorQueryInitialLoading,
  useCoordinatorUsersQuery,
} from "@/queries/coordinator";
import { useAuth } from "@/providers/auth-provider";
import type { AuthUserRecord } from "@/types/profile";

type MembershipAction =
  | "promote-supervisor"
  | "demote-student"
  | "promote-coordinator"
  | "make-evaluator"
  | "disable"
  | "enable";

const ACTION_COPY: Record<
  MembershipAction,
  { label: string; confirm: string }
> = {
  "promote-supervisor": {
    label: "Promote to Supervisor",
    confirm: "promote this user to Supervisor",
  },
  "demote-student": {
    label: "Demote to Student",
    confirm: "demote this user to Student",
  },
  "promote-coordinator": {
    label: "Make Coordinator",
    confirm: "make this user a Coordinator",
  },
  "make-evaluator": {
    label: "Make Evaluator",
    confirm: "make this user an Evaluator",
  },
  disable: {
    label: "Disable",
    confirm: "disable this membership",
  },
  enable: {
    label: "Enable",
    confirm: "enable this membership",
  },
};

function getMembershipActions(
  user: AuthUserRecord,
  currentUserId: string | undefined,
): MembershipAction[] {
  if (currentUserId && user.id === currentUserId) {
    return [];
  }

  const actions: MembershipAction[] = [];

  if (user.role === "STUDENT") {
    actions.push("promote-supervisor");
  }
  if (user.role === "SUPERVISOR") {
    actions.push("demote-student");
  }
  if (user.role !== "COORDINATOR") {
    actions.push("promote-coordinator");
  }
  if (user.role !== "EVALUATOR" && user.role !== "COORDINATOR") {
    actions.push("make-evaluator");
  }
  actions.push(user.isActive ? "disable" : "enable");

  return actions;
}

export default function CoordinatorUsersPage() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [confirmAction, setConfirmAction] = useState<{
    user: AuthUserRecord;
    type: MembershipAction;
  } | null>(null);
  const [viewUser, setViewUser] = useState<AuthUserRecord | null>(null);

  const usersQuery = useCoordinatorUsersQuery();
  const { roleMutation, statusMutation } = useCoordinatorUserMutations();

  const users = useMemo(() => {
    return (usersQuery.data ?? []).filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [usersQuery.data, search, roleFilter]);

  if (isCoordinatorQueryInitialLoading(usersQuery)) return <DashboardSkeleton />;
  if (usersQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(usersQuery.error)}
        onRetry={() => usersQuery.refetch()}
      />
    );
  }

  const handleConfirm = () => {
    if (!confirmAction) return;
    const { user, type } = confirmAction;
    const onSuccess = () => setConfirmAction(null);

    if (type === "promote-supervisor") {
      roleMutation.mutate({ userId: user.id, role: "SUPERVISOR" }, { onSuccess });
    } else if (type === "demote-student") {
      roleMutation.mutate({ userId: user.id, role: "STUDENT" }, { onSuccess });
    } else if (type === "promote-coordinator") {
      roleMutation.mutate({ userId: user.id, role: "COORDINATOR" }, { onSuccess });
    } else if (type === "make-evaluator") {
      roleMutation.mutate({ userId: user.id, role: "EVALUATOR" }, { onSuccess });
    } else if (type === "disable") {
      statusMutation.mutate({ userId: user.id, isActive: false }, { onSuccess });
    } else if (type === "enable") {
      statusMutation.mutate({ userId: user.id, isActive: true }, { onSuccess });
    }
  };

  const isMutating = roleMutation.isPending || statusMutation.isPending;

  return (
    <div className="space-y-6">
      <CoordinatorInvitePanel />
      <div>
        <h2 className="text-lg font-semibold">Members</h2>
        <p className="text-sm text-muted-foreground">
          Manage members by role. People with more than one role are listed once
          for each.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            <SelectItem value="STUDENT">Students</SelectItem>
            <SelectItem value="SUPERVISOR">Supervisors</SelectItem>
            <SelectItem value="COORDINATOR">Coordinators</SelectItem>
            <SelectItem value="EVALUATOR">Evaluators</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Memberships ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.length === 0 ? (
            <EmptyState
              title="No members found"
              description="No members match your search or filter."
            />
          ) : (
            users.map((user) => {
              const actions = getMembershipActions(user, currentUser?.userId);

              return (
                <div
                  key={user.membershipId}
                  className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{user.fullName}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Membership created {formatDate(user.createdAt)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge status={user.role} />
                      <StatusBadge
                        status={user.isActive ? "ACTIVE" : "INACTIVE"}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setViewUser(user)}
                    >
                      <Eye className="h-3 w-3" />
                      View Profile
                    </Button>

                    {actions.length > 0 ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            Actions
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          {actions.map((action, index) => {
                            const isStatusAction =
                              action === "disable" || action === "enable";
                            const showSeparator =
                              isStatusAction &&
                              index > 0 &&
                              actions[index - 1] !== "disable" &&
                              actions[index - 1] !== "enable";

                            return (
                              <div key={action}>
                                {showSeparator ? <DropdownMenuSeparator /> : null}
                                <DropdownMenuItem
                                  className={
                                    action === "disable"
                                      ? "text-destructive focus:text-destructive"
                                      : undefined
                                  }
                                  onSelect={() =>
                                    setConfirmAction({ user, type: action })
                                  }
                                >
                                  <ActionIcon action={action} />
                                  {ACTION_COPY[action].label}
                                </DropdownMenuItem>
                              </div>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm action</DialogTitle>
            <DialogDescription>
              Are you sure you want to{" "}
              {confirmAction
                ? ACTION_COPY[confirmAction.type].confirm
                : "perform this action"}{" "}
              for <strong>{confirmAction?.user.fullName}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant={
                confirmAction?.type === "disable" ? "destructive" : "default"
              }
              onClick={handleConfirm}
              disabled={isMutating}
            >
              {isMutating && <Loader2 className="animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CoordinatorUserProfileDialog
        user={viewUser}
        open={!!viewUser}
        onOpenChange={(open) => !open && setViewUser(null)}
      />
    </div>
  );
}

function ActionIcon({ action }: { action: MembershipAction }) {
  switch (action) {
    case "promote-supervisor":
      return <UserCheck className="h-4 w-4" />;
    case "demote-student":
      return <UserMinus className="h-4 w-4" />;
    case "promote-coordinator":
      return <UserCog className="h-4 w-4" />;
    case "make-evaluator":
      return <UserCheck className="h-4 w-4" />;
    case "disable":
      return <ShieldOff className="h-4 w-4" />;
    case "enable":
      return <Shield className="h-4 w-4" />;
  }
}
