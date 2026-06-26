"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Package, Plus, CalendarClock } from "lucide-react";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useSupervisorPageQuery } from "@/hooks/use-supervisor-page";
import { supervisorPageService } from "@/services/supervisor-page.service";
import { supervisorService } from "@/services/supervisor.service";
import type { DeliverableType } from "@/types/student";

const schema = z.object({
  title: z.string().min(2),
  description: z.string().min(5),
  type: z.enum([
    "SRS",
    "DESIGN",
    "MID_VIVA",
    "FINAL_REPORT",
    "PRESENTATION",
    "OTHER",
  ]),
  dueDate: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

const DELIVERABLE_TYPES: DeliverableType[] = [
  "SRS",
  "DESIGN",
  "MID_VIVA",
  "FINAL_REPORT",
  "PRESENTATION",
  "OTHER",
];

export default function SupervisorDeliverablesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [extendTarget, setExtendTarget] = useState<{
    id: string;
    title: string;
    dueDate: string;
  } | null>(null);
  const [newDueDate, setNewDueDate] = useState("");
  const [extendReason, setExtendReason] = useState("");

  const deliverablesQuery = useSupervisorPageQuery(
    "deliverables",
    supervisorPageService.getDeliverables,
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "SRS" },
  });

  const type = watch("type");

  const createMutation = useMutation({
    mutationFn: supervisorService.createDeliverable,
    onSuccess: () => {
      toast.success("Deliverable created");
      reset({ type: "SRS" });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["supervisor", "deliverables"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      id,
      isActive,
    }: {
      id: string;
      isActive: boolean;
    }) => supervisorService.updateDeliverable(id, { isActive }),
    onSuccess: () => {
      toast.success("Deliverable updated");
      queryClient.invalidateQueries({ queryKey: ["supervisor", "deliverables"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const extendMutation = useMutation({
    mutationFn: ({
      id,
      newDueDate,
      reason,
    }: {
      id: string;
      newDueDate: string;
      reason?: string;
    }) =>
      supervisorService.extendDeliverableDeadline(id, {
        newDueDate,
        reason,
      }),
    onSuccess: () => {
      toast.success("Deadline extended");
      setExtendTarget(null);
      setNewDueDate("");
      setExtendReason("");
      queryClient.invalidateQueries({ queryKey: ["supervisor", "deliverables"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["supervisor", "notifications"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (deliverablesQuery.isLoading) return <DashboardSkeleton />;

  if (deliverablesQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(deliverablesQuery.error)}
        onRetry={() => deliverablesQuery.refetch()}
      />
    );
  }

  const deliverables = deliverablesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Deliverables</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage deliverables for your supervised teams
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New Deliverable
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Deliverable</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={handleSubmit((data) => createMutation.mutate(data))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...register("title")} />
                {errors.title && (
                  <p className="text-sm text-destructive">
                    {errors.title.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={3} {...register("description")} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={type ?? "SRS"}
                  onValueChange={(v) =>
                    setValue("type", v as FormData["type"], {
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERABLE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due date</Label>
                <Input id="dueDate" type="date" {...register("dueDate")} />
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="animate-spin" />
                )}
                Create
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {deliverables.length === 0 ? (
        <EmptyState
          title="No deliverables yet"
          description="Create your first deliverable for supervised teams."
          action={
            <Button onClick={() => setOpen(true)}>
              <Package className="h-4 w-4" />
              Create Deliverable
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {deliverables.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{d.title}</CardTitle>
                  <StatusBadge
                    status={d.isActive ? "ACTIVE" : "INACTIVE"}
                  />
                </div>
                <CardDescription>
                  {d.type.replace(/_/g, " ")} · Due {formatDate(d.dueDate)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {d.description}
                </p>
                <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={toggleMutation.isPending}
                  onClick={() =>
                    toggleMutation.mutate({
                      id: d.id,
                      isActive: !d.isActive,
                    })
                  }
                >
                  {d.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setExtendTarget({
                      id: d.id,
                      title: d.title,
                      dueDate: d.dueDate,
                    });
                    setNewDueDate("");
                    setExtendReason("");
                  }}
                >
                  <CalendarClock className="h-4 w-4" />
                  Extend Deadline
                </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!extendTarget}
        onOpenChange={(open) => !open && setExtendTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Deadline</DialogTitle>
            <DialogDescription>
              {extendTarget
                ? `Update the due date for "${extendTarget.title}". Current deadline: ${formatDate(extendTarget.dueDate)}.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newDueDate">New due date</Label>
              <Input
                id="newDueDate"
                type="date"
                value={newDueDate}
                min={
                  extendTarget
                    ? new Date(extendTarget.dueDate).toISOString().slice(0, 10)
                    : undefined
                }
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extendReason">Reason (optional)</Label>
              <Textarea
                id="extendReason"
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                placeholder="Why is the deadline being extended?"
              />
            </div>
            <Button
              className="w-full"
              disabled={
                !extendTarget ||
                !newDueDate ||
                extendMutation.isPending
              }
              onClick={() =>
                extendTarget &&
                extendMutation.mutate({
                  id: extendTarget.id,
                  newDueDate: new Date(newDueDate).toISOString(),
                  reason: extendReason || undefined,
                })
              }
            >
              {extendMutation.isPending && (
                <Loader2 className="animate-spin" />
              )}
              Confirm Extension
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
