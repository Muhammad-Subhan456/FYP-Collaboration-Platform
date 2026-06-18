"use client";

import { Megaphone } from "lucide-react";

import { ScrollableFeed } from "@/components/common/scrollable-feed";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { GlobalAnnouncement } from "@/types/coordinator";

interface GlobalAnnouncementsCardProps {
  announcements?: GlobalAnnouncement[];
  emptyMessage?: string;
}

export function GlobalAnnouncementsCard({
  announcements = [],
  emptyMessage = "No program announcements yet.",
}: GlobalAnnouncementsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-4 w-4" />
          FOASIS Program Announcements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {announcements.length > 0 ? (
          <ScrollableFeed>
            {announcements.map((item) => (
              <div key={item.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{item.title}</p>
                <p className="line-clamp-2 text-muted-foreground">
                  {item.message}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(item.createdAt)}
                </p>
              </div>
            ))}
          </ScrollableFeed>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
