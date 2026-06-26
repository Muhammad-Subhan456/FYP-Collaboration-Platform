"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Shield, ShieldOff, UserCheck, UserMinus, Eye } from "lucide-react";

import { CoordinatorUserProfileDialog } from "@/components/coordinator/coordinator-user-profile-dialog";

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
import { useCoordinatorPageQuery } from "@/hooks/use-coordinator-page";
import { authService } from "@/services/auth.service";
import { coordinatorPageService } from "@/services/coordinator-page.service";
import type { AuthUserRecord } from "@/types/profile";
import type { UserRole } from "@/types";

export default function CoordinatorUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [confirmAction, setConfirmAction] = useState<{
    user: AuthUserRecord;
    type: "promote-supervisor" | "demote-student" | "promote-coordinator" | "disable" | "enable";
  } | null>(null);
  const [viewUser, setViewUser] = useState<AuthUserRecord | null>(null);

  const usersQuery = useCoordinatorPageQuery(
    "users",
    coordinatorPageService.getUsers,
  );

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      authService.updateUserRole(userId, role),
    onSuccess: () => {
      toast.success("User role updated");
      queryClient.invalidateQueries({ queryKey: ["coordinator", "users"] });
      setConfirmAction(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      authService.updateUserStatus(userId, isActive),
    onSuccess: () => {
      toast.success("User status updated");
      queryClient.invalidateQueries({ queryKey: ["coordinator", "users"] });
      setConfirmAction(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (usersQuery.isLoading) return <DashboardSkeleton />;
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
      roleMutation.mutate({ userId: user.id, role: "SUPERVISOR" });
    } else if (type === "demote-student") {
      roleMutation.mutate({ userId: user.id, role: "STUDENT" });
    } else if (type === "promote-coordinator") {
      roleMutation.mutate({ userId: user.id, role: "COORDINATOR" });
    } else if (type === "disable") {
      statusMutation.mutate({ userId: user.id, isActive: false });
    } else if (type === "enable") {
      statusMutation.mutate({ userId: user.id, isActive: true });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">User Management</h2>
        <p className="text-sm text-muted-foreground">
          Promote, demote, and view complete user profiles
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
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{user.fullName}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  Joined {formatDate(user.createdAt)}
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
          ))}
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
