"use client";

import { useState } from "react";
import { Loader2, Shield, ShieldOff, UserCheck, UserMinus, Eye } from "lucide-react";

import { CoordinatorUserProfileDialog } from "@/components/coordinator/coordinator-user-profile-dialog";
import { CoordinatorInvitePanel } from "@/components/coordinator/coordinator-invite-panel";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { ErrorState } from "@/components/common/state-blocks";
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
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { useCoordinatorUserMutations } from "@/mutations/coordinator";
import {
  isCoordinatorQueryInitialLoading,
  useCoordinatorUsersQuery,
} from "@/queries/coordinator";
import type { AuthUserRecord } from "@/types/profile";
import type { UserRole } from "@/types";

export default function CoordinatorUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [confirmAction, setConfirmAction] = useState<{
    user: AuthUserRecord;
    type: "promote-supervisor" | "demote-student" | "promote-coordinator" | "disable" | "enable";
  } | null>(null);
  const [viewUser, setViewUser] = useState<AuthUserRecord | null>(null);

  const usersQuery = useCoordinatorUsersQuery();
  const { roleMutation, statusMutation } = useCoordinatorUserMutations();

  if (isCoordinatorQueryInitialLoading(usersQuery)) return <DashboardSkeleton />;
  if (usersQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(usersQuery.error)}
        onRetry={() => usersQuery.refetch()}
      />
    );
  }

  const users = (usersQuery.data ?? []).filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleConfirm = () => {
    if (!confirmAction) return;
    const { user, type } = confirmAction;
    if (type === "promote-supervisor") {
      roleMutation.mutate(
        { userId: user.id, role: "SUPERVISOR" },
        { onSuccess: () => setConfirmAction(null) },
      );
    } else if (type === "demote-student") {
      roleMutation.mutate(
        { userId: user.id, role: "STUDENT" },
        { onSuccess: () => setConfirmAction(null) },
      );
    } else if (type === "promote-coordinator") {
      roleMutation.mutate(
        { userId: user.id, role: "COORDINATOR" },
        { onSuccess: () => setConfirmAction(null) },
      );
    } else if (type === "disable") {
      statusMutation.mutate(
        { userId: user.id, isActive: false },
        { onSuccess: () => setConfirmAction(null) },
      );
    } else if (type === "enable") {
      statusMutation.mutate(
        { userId: user.id, isActive: true },
        { onSuccess: () => setConfirmAction(null) },
      );
    }
  };

  return (
    <div className="space-y-6">
      <CoordinatorInvitePanel />
      <div>
        <h2 className="text-lg font-semibold">User Management</h2>
        <p className="text-sm text-muted-foreground">
          Manage workspace memberships by role. Users with multiple roles appear
          once per role.
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
            <p className="text-sm text-muted-foreground">
              No memberships match your search or filter.
            </p>
          ) : (
            users.map((user) => (
            <div
              key={user.membershipId}
              className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{user.fullName}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  Membership created {formatDate(user.createdAt)}
                </p>
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
                <StatusBadge status={user.role} />
                <StatusBadge status={user.isActive ? "ACTIVE" : "INACTIVE"} />
                {user.role === "STUDENT" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setConfirmAction({ user, type: "promote-supervisor" })
                    }
                  >
                    <UserCheck className="h-3 w-3" />
                    Promote to Supervisor
                  </Button>
                )}
                {user.role === "SUPERVISOR" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setConfirmAction({ user, type: "demote-student" })
                    }
                  >
                    <UserMinus className="h-3 w-3" />
                    Demote to Student
                  </Button>
                )}
                {user.role !== "COORDINATOR" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setConfirmAction({ user, type: "promote-coordinator" })
                    }
                  >
                    Make Coordinator
                  </Button>
                )}
                {user.isActive ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirmAction({ user, type: "disable" })}
                  >
                    <ShieldOff className="h-3 w-3" />
                    Disable
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmAction({ user, type: "enable" })}
                  >
                    <Shield className="h-3 w-3" />
                    Enable
                  </Button>
                )}
              </div>
            </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm action</DialogTitle>
            <DialogDescription>
              Are you sure you want to perform this action on{" "}
              <strong>{confirmAction?.user.fullName}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={roleMutation.isPending || statusMutation.isPending}
            >
              {(roleMutation.isPending || statusMutation.isPending) && (
                <Loader2 className="animate-spin" />
              )}
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
