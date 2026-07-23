"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { StatusBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatDateTime } from "@/lib/format";
import type { CalendarEvent } from "@/lib/calendar/types";

interface CalendarEventDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarEventDialog({
  event,
  open,
  onOpenChange,
}: CalendarEventDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {event ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6 text-left">{event.title}</DialogTitle>
              <DialogDescription className="sr-only">
                Deliverable calendar details
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                {event.phaseName ? (
                  <Badge variant="secondary">{event.phaseName}</Badge>
                ) : null}
                {event.type ? <StatusBadge status={event.type} /> : null}
                {event.status ? <StatusBadge status={event.status} /> : null}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {event.dueDateLabel ?? "Due date"}
                </p>
                <p className="font-medium text-foreground">
                  {event.dueDate
                    ? formatDateTime(event.dueDate)
                    : "No due date set"}
                </p>
                {event.dueDate ? (
                  <p className="text-muted-foreground">
                    {formatDate(event.dueDate)}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Description
                </p>
                <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                  {event.description.trim()
                    ? event.description
                    : "No description provided."}
                </p>
              </div>
            </div>

            {event.href ? (
              <DialogFooter>
                <Button asChild>
                  <Link href={event.href}>
                    Open deliverable
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </DialogFooter>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
