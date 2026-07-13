"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Paperclip, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { RubricCriteriaEditor } from "@/components/coordinator/rubric-criteria-editor";
import { PhaseFilter } from "@/components/common/phase-filter";
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
import { formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";
import { deliverableTemplateService } from "@/services/deliverable-template.service";
import { phaseService } from "@/services/phase.service";
import { uploadService } from "@/services/progress.service";
import type {
  DeliverableTemplate,
  RubricCriterionInput,
} from "@/types/phase";
import type { DeliverableType } from "@/types/student";

const DELIVERABLE_TYPES: DeliverableType[] = [
  "SRS",
  "DESIGN",
  "MID_VIVA",
  "FINAL_REPORT",
  "PRESENTATION",
  "OTHER",
];

const defaultCriterion = (): RubricCriterionInput => ({
  title: "",
  description: "",
  maxMarks: 0,
});

export default function CoordinatorDeliverableTemplatesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DeliverableTemplate | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<DeliverableType>("SRS");
  const [phaseId, setPhaseId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [totalMarks, setTotalMarks] = useState(100);
  const [weightagePercent, setWeightagePercent] = useState(0);
  const [criteria, setCriteria] = useState<RubricCriterionInput[]>([
    defaultCriterion(),
  ]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const phasesQuery = useQuery({
    queryKey: queryKeys.phases.list(user?.workspaceId),
    queryFn: () => phaseService.list("ACTIVE"),
    enabled: !!user?.workspaceId,
  });

  const templatesQuery = useQuery({
    queryKey: queryKeys.coordinator.deliverableTemplates(
      phaseFilter === "all" ? undefined : phaseFilter,
      user?.workspaceId,
    ),
    queryFn: () =>
      deliverableTemplateService.list(
        phaseFilter === "all" ? undefined : phaseFilter,
      ),
    enabled: !!user?.workspaceId,
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("SRS");
    setPhaseId(phasesQuery.data?.[0]?.id ?? "");
    setDueDate("");
    setTotalMarks(100);
    setWeightagePercent(0);
    setCriteria([defaultCriterion()]);
    setPendingFiles([]);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (template: DeliverableTemplate) => {
    setEditing(template);
    setTitle(template.title);
    setDescription(template.description);
    setType(template.type as DeliverableType);
    setPhaseId(template.phaseId);
    setDueDate(template.dueDate?.slice(0, 16) ?? "");
    setTotalMarks(template.totalMarks);
    setWeightagePercent(Number(template.weightagePercent ?? 0));
    setCriteria(
      template.rubricCriteria.map((criterion) => ({
        id: criterion.id,
        title: criterion.title,
        description: criterion.description ?? undefined,
        maxMarks: criterion.maxMarks,
        sortOrder: criterion.sortOrder,
      })),
    );
    setPendingFiles([]);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      try {
        const attachments: Array<{ fileUrl: string; fileName: string }> = [];
        for (const file of pendingFiles) {
          const uploaded = await uploadService.uploadFile(file);
          attachments.push({ fileUrl: uploaded.fileUrl, fileName: file.name });
        }

        const payload = {
          phaseId,
          title: title.trim(),
          description: description.trim(),
          type,
          dueDate: dueDate || undefined,
          totalMarks,
          weightagePercent,
          rubricCriteria: criteria,
          attachments: attachments.length
            ? [
                ...attachments,
                ...(editing?.attachments.map((item) => ({
                  fileUrl: item.fileUrl,
                  fileName: item.fileName,
                })) ?? []),
              ]
            : editing?.attachments.map((item) => ({
                fileUrl: item.fileUrl,
                fileName: item.fileName,
              })),
        };

        if (editing) {
          return deliverableTemplateService.update(editing.id, payload);
        }

        return deliverableTemplateService.create(payload);
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Template updated" : "Template created");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.deliverableTemplates.all,
      });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deliverableTemplateService.remove(id),
    onSuccess: () => {
      toast.success("Template deleted");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.deliverableTemplates.all,
      });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  if (phasesQuery.isLoading || templatesQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (phasesQuery.isError || templatesQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(
          phasesQuery.error ?? templatesQuery.error,
        )}
        onRetry={() => {
          void phasesQuery.refetch();
          void templatesQuery.refetch();
        }}
      />
    );
  }

  const phases = phasesQuery.data ?? [];
  const templates = templatesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Deliverable Templates</h1>
          <p className="text-sm text-muted-foreground">
            Define deliverables with dynamic rubrics. Supervisors publish them to teams.
          </p>
        </div>
        <div className="flex gap-2">
          <PhaseFilter value={phaseFilter} onChange={setPhaseFilter} />
          <Button onClick={openCreate} disabled={phases.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            New template
          </Button>
        </div>
      </div>

      {phases.length === 0 ? (
        <EmptyState
          title="No phases available"
          description="Create at least one academic phase before adding deliverable templates."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
            <CardDescription>
              Templates lock after a supervisor publishes them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.length === 0 ? (
              <EmptyState
                title="No templates yet"
                description="Create a deliverable template for the selected phase."
              />
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{template.title}</p>
                      <Badge variant="outline">{template.phase?.name}</Badge>
                      {template.isLocked ? (
                        <Badge variant="secondary">Published</Badge>
                      ) : null}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {template.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {template.totalMarks} marks · {Number(template.weightagePercent ?? 0)}% weightage · {template.rubricCriteria.length}{" "}
                      criteria · {template._count?.deliverables ?? 0} published
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(template)}
                    >
                      {template.isLocked ? "View" : "Edit"}
                    </Button>
                    {!template.isLocked ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(template.id)}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? (editing.isLocked ? "View template" : "Edit template") : "Create template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Phase</Label>
              <Select
                value={phaseId}
                onValueChange={setPhaseId}
                disabled={!!editing?.isLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  {phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                disabled={!!editing?.isLocked}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                disabled={!!editing?.isLocked}
                rows={4}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={type}
                  onValueChange={(value) => setType(value as DeliverableType)}
                  disabled={!!editing?.isLocked}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERABLE_TYPES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total marks</Label>
                <Input
                  type="number"
                  min={1}
                  value={totalMarks}
                  disabled={!!editing?.isLocked}
                  onChange={(event) =>
                    setTotalMarks(Number(event.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Weightage (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={weightagePercent}
                  disabled={!!editing?.isLocked}
                  onChange={(event) =>
                    setWeightagePercent(Number(event.target.value) || 0)
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Default due date (optional)</Label>
              <Input
                type="datetime-local"
                value={dueDate}
                disabled={!!editing?.isLocked}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
            <RubricCriteriaEditor
              criteria={criteria}
              totalMarks={totalMarks}
              onChange={setCriteria}
              disabled={!!editing?.isLocked}
            />
            {!editing?.isLocked ? (
              <div className="space-y-2">
                <Label>Attachments</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    setPendingFiles((current) => [...current, ...files]);
                    event.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  Add files
                </Button>
                {pendingFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                  >
                    <span>{file.name}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setPendingFiles((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
            {editing?.attachments?.length ? (
              <div className="space-y-1 text-sm text-muted-foreground">
                {editing.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block underline"
                  >
                    {attachment.fileName}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          {!editing?.isLocked ? (
            <DialogFooter>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={
                  !title.trim() ||
                  !phaseId ||
                  !description.trim() ||
                  saveMutation.isPending ||
                  uploading
                }
              >
                {(saveMutation.isPending || uploading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save template
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
