"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarClock, Megaphone, Paperclip, UserRound } from "lucide-react";

import { formatAudienceRoles } from "@/components/coordinator/announcement-audience-picker";
import { AttachmentList } from "@/components/work-stream/attachment-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";
import {
  getGlobalAnnouncementAttachmentCount,
  hasGlobalAnnouncementAttachments,
  sortGlobalAnnouncementsNewestFirst,
} from "@/lib/global-announcements";
import { progressService } from "@/services/progress.service";
import type { GlobalAnnouncement } from "@/types/coordinator";
import type { WorkStreamAttachment } from "@/types/work-stream";

const VIEW_ALL_PAGE_SIZE = 6;

const ANNOUNCEMENT_TYPE_LABELS: Record<string, string> = {
  GENERAL: "General",
  DEADLINE: "Deadline",
  MEETING: "Meeting",
  WORKSHOP: "Workshop",
  VIVA: "Viva",
};

function formatAnnouncementType(type?: string) {
  if (!type) {
    return null;
  }
  return ANNOUNCEMENT_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

function toAttachmentList(
  attachments?: GlobalAnnouncement["attachments"],
): WorkStreamAttachment[] {
  if (!attachments?.length) {
    return [];
  }

  return attachments.map((item) => ({
    id: item.id,
    fileUrl: item.fileUrl,
    fileName: item.fileName,
    createdAt: item.createdAt ?? "",
  }));
}

function AttachmentIndicator({ item }: { item: GlobalAnnouncement }) {
  if (!hasGlobalAnnouncementAttachments(item)) {
    return null;
  }

  const attachments = item.attachments ?? [];
  const count = getGlobalAnnouncementAttachmentCount(item);

  if (attachments.length === 1) {
    return (
      <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{attachments[0].fileName}</span>
      </span>
    );
  }

  if (attachments.length > 1) {
    const preview = attachments
      .slice(0, 2)
      .map((attachment) => attachment.fileName)
      .join(", ");
    const suffix =
      attachments.length > 2 ? ` +${attachments.length - 2} more` : "";

    return (
      <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          {preview}
          {suffix}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Paperclip className="h-3.5 w-3.5 shrink-0" />
      {count === 1 ? "1 attachment" : `${count} attachments`}
    </span>
  );
}

function AnnouncementPreviewItem({
  item,
  showAttachmentDetails = false,
  truncateDescription = true,
}: {
  item: GlobalAnnouncement;
  showAttachmentDetails?: boolean;
  /** Dashboard cards truncate; View All / full pages show the complete message. */
  truncateDescription?: boolean;
}) {
  const displayTimestamp =
    item.publishAt ?? item.publishedAt ?? item.createdAt;
  const typeLabel = formatAnnouncementType(item.type);
  const attachments = toAttachmentList(item.attachments);
  const createdBy = item.coordinatorName?.trim() || "Program coordinator";

  return (
    <article className="rounded-lg border bg-card p-3 text-sm shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <h4 className="font-semibold leading-snug">{item.title}</h4>
          <p
            className={
              truncateDescription
                ? "line-clamp-3 text-muted-foreground"
                : "whitespace-pre-wrap break-words text-muted-foreground"
            }
          >
            {item.message}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {typeLabel ? (
          <Badge variant="secondary" className="text-[11px]">
            {typeLabel}
          </Badge>
        ) : null}
        {item.audienceRoles?.length
          ? item.audienceRoles.map((role) => (
              <Badge
                key={role}
                variant="outline"
                className="text-[11px] font-normal"
              >
                {formatAudienceRoles([role])}
              </Badge>
            ))
          : (
            <Badge variant="outline" className="text-[11px] font-normal">
              All recipients
            </Badge>
          )}
      </div>

      <div className="mt-2">
        <AttachmentIndicator item={item} />
      </div>

      {showAttachmentDetails && attachments.length > 0 ? (
        <div className="mt-3">
          <AttachmentList attachments={attachments} />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5" />
          {formatDateTime(displayTimestamp)}
        </span>
        <span className="inline-flex items-center gap-1">
          <UserRound className="h-3.5 w-3.5" />
          {createdBy}
        </span>
      </div>
    </article>
  );
}

function AnnouncementRows({
  items,
  emptyMessage,
  showAttachmentDetails = false,
  truncateDescription = true,
}: {
  items: GlobalAnnouncement[];
  emptyMessage: string;
  showAttachmentDetails?: boolean;
  truncateDescription?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <AnnouncementPreviewItem
          key={item.id}
          item={item}
          showAttachmentDetails={showAttachmentDetails}
          truncateDescription={truncateDescription}
        />
      ))}
    </div>
  );
}

interface GlobalAnnouncementsCardProps {
  announcements?: GlobalAnnouncement[];
  emptyMessage?: string;
  /** When set, only the first N items are shown. */
  limit?: number;
  viewAllHref?: string;
  /** When true, View all opens a paginated dialog instead of navigating. */
  viewAllDialog?: boolean;
}

export function GlobalAnnouncementsCard({
  announcements = [],
  emptyMessage = "No program announcements yet.",
  limit,
  viewAllHref,
  viewAllDialog = false,
}: GlobalAnnouncementsCardProps) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);

  const sortedAnnouncements = sortGlobalAnnouncementsNewestFirst(announcements);
  const items =
    typeof limit === "number"
      ? sortedAnnouncements.slice(0, limit)
      : sortedAnnouncements;

  const pageQuery = useQuery({
    queryKey: ["global-announcements", "page", page, VIEW_ALL_PAGE_SIZE],
    queryFn: () =>
      progressService.getGlobalAnnouncementsPage(page, VIEW_ALL_PAGE_SIZE),
    enabled: open && viewAllDialog,
    placeholderData: keepPreviousData,
    select: (data) => ({
      ...data,
      data: sortGlobalAnnouncementsNewestFirst(data.data),
    }),
  });

  const showViewAll = viewAllDialog || Boolean(viewAllHref);
  /** Dashboard widgets pass `limit` → compact truncated preview. Full pages do not. */
  const isDashboardPreview = typeof limit === "number";

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4" />
            FOASIS Program Announcements
          </CardTitle>
          {showViewAll ? (
            viewAllDialog ? (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  setPage(1);
                  setOpen(true);
                }}
              >
                View all
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="shrink-0" asChild>
                <Link href={viewAllHref!}>View all</Link>
              </Button>
            )
          ) : null}
        </CardHeader>
        <CardContent>
          <AnnouncementRows
            items={items}
            emptyMessage={emptyMessage}
            truncateDescription={isDashboardPreview}
            showAttachmentDetails={!isDashboardPreview}
          />
        </CardContent>
      </Card>

      {viewAllDialog ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Program announcements</DialogTitle>
              <DialogDescription>
                Published FOASIS announcements for your workspace.
              </DialogDescription>
            </DialogHeader>

            {pageQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : pageQuery.isError ? (
              <p className="text-sm text-destructive">
                Failed to load announcements.
              </p>
            ) : (
              <AnnouncementRows
                items={pageQuery.data?.data ?? []}
                emptyMessage={emptyMessage}
                showAttachmentDetails
                truncateDescription={false}
              />
            )}

            {(pageQuery.data?.meta.totalPages ?? 0) > 1 ? (
              <div className="flex items-center justify-between gap-2 pt-2">
                <p className="text-xs text-muted-foreground">
                  Page {pageQuery.data?.meta.page ?? page} of{" "}
                  {pageQuery.data?.meta.totalPages ?? 1}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      page >= (pageQuery.data?.meta.totalPages ?? 1)
                    }
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
