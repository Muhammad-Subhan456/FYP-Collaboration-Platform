"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { ErrorState } from "@/components/common/state-blocks";
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
import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";
import {
  coordinatorPageService,
  type WorkspaceSettings,
} from "@/services/coordinator-page.service";

type SettingsForm = {
  teamMaxMembers: string;
  supervisorMaxTeams: string;
  supervisorRequestExpiryHours: string;
};

function toForm(settings: WorkspaceSettings): SettingsForm {
  return {
    teamMaxMembers: String(settings.teamMaxMembers),
    supervisorMaxTeams: String(settings.supervisorMaxTeams),
    supervisorRequestExpiryHours: String(settings.supervisorRequestExpiryHours),
  };
}

function parsePositiveInt(value: string, label: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    toast.error(`${label} must be a positive whole number`);
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 1) {
    toast.error(`${label} must be a positive whole number`);
    return null;
  }
  return parsed;
}

export default function CoordinatorSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsForm>({
    teamMaxMembers: "4",
    supervisorMaxTeams: "4",
    supervisorRequestExpiryHours: "24",
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.coordinator.settings(user?.userId, user?.workspaceId),
    queryFn: coordinatorPageService.getSettings,
    enabled: !!user?.userId,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(toForm(settingsQuery.data));
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: coordinatorPageService.updateSettings,
    onSuccess: (data) => {
      toast.success("Workspace settings saved");
      setForm(toForm(data));
      void queryClient.invalidateQueries({
        queryKey: ["coordinator", "settings"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["student", "workspace-settings"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["coordinator", "users"],
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.coordinator.proposals(
          user?.userId,
          user?.workspaceId,
        ),
      });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  if (settingsQuery.isLoading) return <DashboardSkeleton />;
  if (settingsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(settingsQuery.error)}
        onRetry={() => settingsQuery.refetch()}
      />
    );
  }

  const handleSave = () => {
    const teamMaxMembers = parsePositiveInt(
      form.teamMaxMembers,
      "Max team size",
    );
    const supervisorMaxTeams = parsePositiveInt(
      form.supervisorMaxTeams,
      "Supervisor max teams",
    );
    const supervisorRequestExpiryHours = parsePositiveInt(
      form.supervisorRequestExpiryHours,
      "Request expiry hours",
    );

    if (
      teamMaxMembers === null ||
      supervisorMaxTeams === null ||
      supervisorRequestExpiryHours === null
    ) {
      return;
    }

    saveMutation.mutate({
      teamMaxMembers,
      supervisorMaxTeams,
      supervisorRequestExpiryHours,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Workspace Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure team limits and supervisor request expiry for this
          workspace. Lowering limits does not remove existing members or
          assignments.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Limits &amp; expiry</CardTitle>
          <CardDescription>
            These values apply to new team creation, join approvals, and
            supervisor capacity checks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teamMaxMembers">Max team members</Label>
            <Input
              id="teamMaxMembers"
              type="number"
              min={1}
              step={1}
              value={form.teamMaxMembers}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  teamMaxMembers: e.target.value,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Upper limit students can choose when creating a team.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supervisorMaxTeams">
              Max teams per supervisor
            </Label>
            <Input
              id="supervisorMaxTeams"
              type="number"
              min={1}
              step={1}
              value={form.supervisorMaxTeams}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  supervisorMaxTeams: e.target.value,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Active supervised teams counted as Approved or Supervisor
              Assigned.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supervisorRequestExpiryHours">
              Supervisor request expiry (hours)
            </Label>
            <Input
              id="supervisorRequestExpiryHours"
              type="number"
              min={1}
              step={1}
              value={form.supervisorRequestExpiryHours}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  supervisorRequestExpiryHours: e.target.value,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              How long a pending supervisor request remains open.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending && (
              <Loader2 className="animate-spin" />
            )}
            Save settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
