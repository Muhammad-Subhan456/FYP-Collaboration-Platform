"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/axios";
import { deliverableTemplateService } from "@/services/deliverable-template.service";
import type { DeliverableTemplate } from "@/types/phase";

interface PublishTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DeliverableTemplate | null;
  teams: Array<{ id: string; name: string }>;
  onPublished: () => void;
}

export function PublishTemplateDialog({
  open,
  onOpenChange,
  template,
  teams,
  onPublished,
}: PublishTemplateDialogProps) {
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (template) {
      setSelectedTeamIds([]);
      setDueDate(template.dueDate?.slice(0, 16) ?? "");
    }
  }, [template]);

  const publishMutation = useMutation({
    mutationFn: () =>
      deliverableTemplateService.publish({
        templateId: template!.id,
        teamIds: selectedTeamIds,
        dueDate: dueDate || undefined,
      }),
    onSuccess: () => {
      toast.success("Deliverable published to selected teams");
      onPublished();
      onOpenChange(false);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((current) =>
      current.includes(teamId)
        ? current.filter((id) => id !== teamId)
        : [...current, teamId],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish template</DialogTitle>
        </DialogHeader>
        {template ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {template.title} · {template.phase?.name} · {template.totalMarks}{" "}
              marks
            </p>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Teams</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
                {teams.map((team) => (
                  <label
                    key={team.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTeamIds.includes(team.id)}
                      onChange={() => toggleTeam(team.id)}
                    />
                    {team.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button
            onClick={() => publishMutation.mutate()}
            disabled={
              !template ||
              selectedTeamIds.length === 0 ||
              !dueDate ||
              publishMutation.isPending
            }
          >
            {publishMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
