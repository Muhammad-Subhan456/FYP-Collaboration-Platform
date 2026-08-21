"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Building2,
  Loader2,
  Pencil,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import {
  useWorkspaceMutations,
  useWorkspacesQuery,
} from "@/queries/super-admin/use-workspaces";
import type { Workspace } from "@/types/workspace";

type WorkspaceFormState = {
  name: string;
  slug: string;
  coordinatorEmail: string;
  description: string;
};

const emptyForm: WorkspaceFormState = {
  name: "",
  slug: "",
  coordinatorEmail: "",
  description: "",
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function SuperAdminWorkspacesPage() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Workspace | null>(null);
  const [form, setForm] = useState<WorkspaceFormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);

  const workspacesQuery = useWorkspacesQuery(includeArchived);
  const {
    createMutation,
    updateMutation,
    archiveMutation,
    restoreMutation,
  } = useWorkspaceMutations();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const sortedWorkspaces = useMemo(() => {
    return [...(workspacesQuery.data ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [workspacesQuery.data]);

  const openCreateDialog = () => {
    setEditing(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setDialogOpen(true);
  };

  const openEditDialog = (workspace: Workspace) => {
    setEditing(workspace);
    setForm({
      name: workspace.name,
      slug: workspace.slug,
      coordinatorEmail: workspace.coordinatorEmail,
      description: workspace.description ?? "",
    });
    setSlugTouched(true);
    setDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm((current) => ({
      ...current,
      name,
      slug: slugTouched ? current.slug : slugify(name),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim() || !form.slug.trim() || !form.coordinatorEmail.trim()) {
      toast.error("Name, slug, and coordinator email are required");
      return;
    }

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          data: {
            name: form.name.trim(),
            slug: form.slug.trim(),
            coordinatorEmail: form.coordinatorEmail.trim(),
            description: form.description.trim() || undefined,
          },
        });
        toast.success("Workspace updated");
      } else {
        await createMutation.mutateAsync({
          name: form.name.trim(),
          slug: form.slug.trim(),
          coordinatorEmail: form.coordinatorEmail.trim(),
          description: form.description.trim() || undefined,
        });
        toast.success("Workspace created");
      }

      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (workspacesQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (workspacesQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(workspacesQuery.error)}
        onRetry={() => workspacesQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIncludeArchived((value) => !value)}
          >
            {includeArchived ? "Hide archived" : "Show archived"}
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New workspace
          </Button>
        </div>
      </div>

      {sortedWorkspaces.length === 0 ? (
        <EmptyState
          title="No workspaces yet"
          description="Create a workspace to add a coordinator."
          action={
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create workspace
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedWorkspaces.map((workspace) => (
            <Card key={workspace.id}>
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{workspace.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      /{workspace.slug}
                    </p>
                  </div>
                  <StatusBadge
                    status={workspace.isArchived ? "ARCHIVED" : "ACTIVE"}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Coordinator:</span>{" "}
                    {workspace.coordinatorEmail}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Teams:</span>{" "}
                    {workspace._count?.teams ?? 0}
                  </p>
                  <p className="text-muted-foreground">
                    Created {formatDate(workspace.createdAt)}
                  </p>
                </div>

                {workspace.description ? (
                  <p className="text-sm text-muted-foreground">
                    {workspace.description}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(workspace)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  {workspace.isArchived ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={restoreMutation.isPending}
                      onClick={async () => {
                        try {
                          await restoreMutation.mutateAsync(workspace.id);
                          toast.success("Workspace restored");
                        } catch (error) {
                          toast.error(getErrorMessage(error));
                        }
                      }}
                    >
                      {restoreMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArchiveRestore className="mr-2 h-4 w-4" />
                      )}
                      Restore
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={archiveMutation.isPending}
                      onClick={async () => {
                        try {
                          await archiveMutation.mutateAsync(workspace.id);
                          toast.success("Workspace archived");
                        } catch (error) {
                          toast.error(getErrorMessage(error));
                        }
                      }}
                    >
                      {archiveMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Archive className="mr-2 h-4 w-4" />
                      )}
                      Archive
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent closeOnOutsideClick={false}>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit workspace" : "Create workspace"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={form.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder="PUCIT Computer Science"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Slug</label>
                <Input
                  value={form.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setForm((current) => ({
                      ...current,
                      slug: event.target.value,
                    }));
                  }}
                  placeholder="pucit-cs"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Coordinator email</label>
                <Input
                  type="email"
                  value={form.coordinatorEmail}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      coordinatorEmail: event.target.value,
                    }))
                  }
                  placeholder="coordinator@institution.edu"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Optional workspace description"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editing ? "Save changes" : "Create workspace"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
