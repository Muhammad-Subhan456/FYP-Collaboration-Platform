"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, ExternalLink, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RichContent } from "@/components/work-stream/rich-content";
import { getErrorMessage } from "@/lib/axios";
import { formatDate } from "@/lib/format";
import { deliverableTemplateService } from "@/services/deliverable-template.service";

interface TemplateDetailsDialogProps {
  templateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export function TemplateDetailsDialog({
  templateId,
  open,
  onOpenChange,
}: TemplateDetailsDialogProps) {
  const detailsQuery = useQuery({
    queryKey: ["supervisor", "template-details", templateId],
    queryFn: () => deliverableTemplateService.get(templateId!),
    enabled: open && !!templateId,
  });

  const template = detailsQuery.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template?.title ?? "Deliverable template"}</DialogTitle>
          <DialogDescription>
            Read-only preview of the deliverable template.
          </DialogDescription>
        </DialogHeader>

        {detailsQuery.isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : detailsQuery.isError ? (
          <p className="py-6 text-sm text-destructive">
            {getErrorMessage(detailsQuery.error)}
          </p>
        ) : template ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <DetailStat label="Phase" value={template.phase?.name ?? "—"} />
              <DetailStat label="Type" value={template.type} />
              <DetailStat
                label="Total marks"
                value={String(template.totalMarks)}
              />
              <DetailStat
                label="Weightage"
                value={`${template.weightagePercent ?? 0}%`}
              />
              <DetailStat
                label="Due date"
                value={
                  template.dueDate
                    ? formatDate(template.dueDate)
                    : "Set at publish"
                }
              />
              <DetailStat
                label="Status"
                value={template.isLocked ? "Locked" : "Editable"}
              />
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                Description &amp; instructions
              </h3>
              {template.description ? (
                <RichContent content={template.description} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No description provided.
                </p>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                Rubric criteria ({template.rubricCriteria.length})
              </h3>
              {template.rubricCriteria.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No rubric criteria defined.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 text-left">Criterion</th>
                        <th className="px-3 py-2 text-right">Max marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {template.rubricCriteria.map((criterion) => (
                        <tr key={criterion.id} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <div className="font-medium">{criterion.title}</div>
                            {criterion.description ? (
                              <div className="text-xs text-muted-foreground">
                                {criterion.description}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {criterion.maxMarks}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                Attachments ({template.attachments.length})
              </h3>
              {template.attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments.</p>
              ) : (
                <div className="space-y-2">
                  {template.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                    >
                      <span className="truncate font-medium">
                        {attachment.fileName}
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-primary">
                        <ExternalLink className="h-4 w-4" />
                        <Download className="h-4 w-4" />
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </section>

            <div className="flex flex-wrap gap-2 border-t pt-3 text-xs text-muted-foreground">
              <Badge variant="outline">
                Published to {template._count?.deliverables ?? 0} team(s)
              </Badge>
              <span>Updated {formatDate(template.updatedAt)}</span>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
