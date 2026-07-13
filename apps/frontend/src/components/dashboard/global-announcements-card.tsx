"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";

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
import { progressService } from "@/services/progress.service";
import type { GlobalAnnouncement } from "@/types/coordinator";

const VIEW_ALL_PAGE_SIZE = 6;

interface GlobalAnnouncementsCardProps {
  announcements?: GlobalAnnouncement[];
  emptyMessage?: string;
  /** When set, only the first N items are shown. */
  limit?: number;
  viewAllHref?: string;
  /** When true, View all opens a paginated dialog instead of navigating. */
  viewAllDialog?: boolean;
}

function AnnouncementRows({
  items,
  emptyMessage,
}: {
  items: GlobalAnnouncement[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border p-3 text-sm">
          <p className="font-medium">{item.title}</p>
          <p className="line-clamp-2 text-muted-foreground">{item.message}</p>
          {item.attachments && item.attachments.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {item.attachments.length} attachment
              {item.attachments.length === 1 ? "" : "s"}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(item.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
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

  const items =
    typeof limit === "number"
      ? announcements.slice(0, limit)
      : announcements;

  const pageQuery = useQuery({
    queryKey: ["global-announcements", "page", page, VIEW_ALL_PAGE_SIZE],
    queryFn: () =>
      progressService.getGlobalAnnouncementsPage(page, VIEW_ALL_PAGE_SIZE),
    enabled: open && viewAllDialog,
    placeholderData: keepPreviousData,
  });

  const showViewAll = viewAllDialog || Boolean(viewAllHref);

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
          <AnnouncementRows items={items} emptyMessage={emptyMessage} />
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
