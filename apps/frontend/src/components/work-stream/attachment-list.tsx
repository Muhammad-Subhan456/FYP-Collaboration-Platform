"use client";

import { Download, ExternalLink } from "lucide-react";

import type { WorkStreamAttachment } from "@/types/work-stream";

interface AttachmentListProps {
  attachments: WorkStreamAttachment[];
}

export function AttachmentList({ attachments }: AttachmentListProps) {
  if (attachments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No attachments</p>
    );
  }

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
        >
          <span className="truncate font-medium">{attachment.fileName}</span>
          <span className="flex shrink-0 items-center gap-2 text-primary">
            <ExternalLink className="h-4 w-4" />
            <Download className="h-4 w-4" />
          </span>
        </a>
      ))}
    </div>
  );
}
