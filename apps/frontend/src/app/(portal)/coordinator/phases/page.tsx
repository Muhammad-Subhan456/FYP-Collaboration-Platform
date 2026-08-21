"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";
import { phaseService } from "@/services/phase.service";
import type { Phase, PhaseStatus } from "@/types/phase";

const emptyForm = {
  name: "",
  creditHours: 3,
  description: "",
  status: "ACTIVE" as PhaseStatus,
};

export default function CoordinatorPhasesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishingPhase, setPublishingPhase] = useState<Phase | null>(null);
  const [editing, setEditing] = useState<Phase | null>(null);
  const [form, setForm] = useState(emptyForm);

  const phasesQuery = useQuery({
    queryKey: queryKeys.coordinator.phases(user?.workspaceId),
    queryFn: () => phaseService.list(),
    enabled: !!user?.workspaceId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        creditHours: Number(form.creditHours),
        description: form.description.trim() || undefined,
        status: form.status,
      };

      if (editing) {
        return phaseService.update(editing.id, payload);
      }

      return phaseService.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Phase updated" : "Phase created");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.coordinator.phases(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.phases.list(),
      });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => phaseService.remove(id),
    onSuccess: () => {
      toast.success("Phase deleted");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.coordinator.phases(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.phases.list(),
      });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => phaseService.publishConfiguration(id),
    onSuccess: () => {
      toast.success("Phase configuration published");
      setPublishDialogOpen(false);
      setPublishingPhase(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.coordinator.phases(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.phases.list(),
      });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const weightageQuery = useQuery({
    queryKey: [
      "coordinator",
      "phase-weightage",
      publishingPhase?.id,
      user?.workspaceId,
    ],
    queryFn: () => phaseService.validateWeightages(publishingPhase!.id),
    enabled: publishDialogOpen && !!publishingPhase?.id,
  });

  if (phasesQuery.isLoading) return <DashboardSkeleton />;
  if (phasesQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(phasesQuery.error)}
        onRetry={() => phasesQuery.refetch()}
      />
    );
  }

  const phases = phasesQuery.data ?? [];

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (phase: Phase) => {
    setEditing(phase);
    setForm({
      name: phase.name,
      creditHours: phase.creditHours,
      description: phase.description ?? "",
      status: phase.status,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New phase
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phases</CardTitle>
          <CardDescription>
            Each deliverable template belongs to one phase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {phases.length === 0 ? (
            <EmptyState
              title="No phases yet"
              description="Create FYP I, FYP II, or FYP III to get started."
            />
          ) : (
            phases.map((phase) => (
              <div
                key={phase.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{phase.name}</p>
                    <Badge variant={phase.status === "ACTIVE" ? "default" : "secondary"}>
                      {phase.status}
                    </Badge>
                    {phase.isConfigurationPublished ? (
                      <Badge variant="outline">Published config</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {phase.creditHours} credit hours
                    {phase.description ? ` · ${phase.description}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {phase._count?.templates ?? 0} templates ·{" "}
                    {phase._count?.deliverables ?? 0} deliverables
                  </p>
                </div>
                <div className="flex gap-2">
                  {!phase.isConfigurationPublished ? (
                    <Button
                      size="sm"
                      disabled={publishMutation.isPending}
                      onClick={() => {
                        setPublishingPhase(phase);
                        setPublishDialogOpen(true);
                      }}
                    >
                      Publish configuration
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => openEdit(phase)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(phase.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent closeOnOutsideClick={false}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit phase" : "Create phase"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="FYP I"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Credit hours</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.creditHours}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      creditHours: Number(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      status: value as PhaseStatus,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.name.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={publishDialogOpen}
        onOpenChange={(open) => {
          setPublishDialogOpen(open);
          if (!open) {
            setPublishingPhase(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish phase configuration</DialogTitle>
            <DialogDescription>
              Publishing locks deliverable weightings for{" "}
              <strong>{publishingPhase?.name}</strong>. GPA becomes available
              when evaluations are complete. Weightings must total 100%.
            </DialogDescription>
          </DialogHeader>

          {weightageQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking deliverable weightings...
            </div>
          ) : weightageQuery.isError ? (
            <p className="text-sm text-destructive">
              {getErrorMessage(weightageQuery.error)}
            </p>
          ) : weightageQuery.data ? (
            <div className="space-y-3">
              <div className="rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left">Deliverable template</th>
                      <th className="px-3 py-2 text-left">Weightage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weightageQuery.data.templates?.map((template: {
                      id: string;
                      title: string;
                      weightagePercent: number;
                    }) => (
                      <tr key={template.id} className="border-b">
                        <td className="px-3 py-2">{template.title}</td>
                        <td className="px-3 py-2">
                          {template.weightagePercent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm">
                Total weightage:{" "}
                <strong>{weightageQuery.data.totalWeightage}%</strong>
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPublishDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                !publishingPhase ||
                publishMutation.isPending ||
                weightageQuery.isLoading ||
                weightageQuery.isError ||
                !weightageQuery.data?.isValid
              }
              onClick={() => {
                if (!publishingPhase) return;
                publishMutation.mutate(publishingPhase.id);
              }}
            >
              {publishMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Publish configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
