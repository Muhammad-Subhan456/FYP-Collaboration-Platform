"use client";

import { useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { UserProfile } from "@/types/profile";

export interface CommentThreadItem {
  id: string;
  authUserId: string;
  body: string;
  createdAt: string;
}

interface CommentThreadProps {
  comments: CommentThreadItem[];
  profiles: Record<string, UserProfile>;
  currentUserId?: string;
  previewLimit?: number;
  resolveAuthorName?: (
    profiles: Record<string, UserProfile>,
    authUserId: string,
  ) => string;
}

function defaultAuthorName(
  profiles: Record<string, UserProfile>,
  authUserId: string,
) {
  return profiles[authUserId]?.fullName ?? "User";
}

export function CommentThread({
  comments,
  profiles,
  currentUserId,
  previewLimit = 3,
  resolveAuthorName = defaultAuthorName,
}: CommentThreadProps) {
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(
    () =>
      [...comments].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [comments],
  );

  const visible = showAll ? sorted : sorted.slice(-previewLimit);
  const hasMore = sorted.length > previewLimit;

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No comments yet. Start the discussion.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {hasMore && !showAll && (
        <p className="text-xs text-muted-foreground">
          Showing latest {Math.min(previewLimit, sorted.length)} of{" "}
          {sorted.length} comments
        </p>
      )}
      {visible.map((comment) => {
        const isOwn = comment.authUserId === currentUserId;
        return (
          <div
            key={comment.id}
            className="rounded-lg border bg-muted/20 px-3 py-2"
          >
            <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {resolveAuthorName(profiles, comment.authUserId)}
                {isOwn ? " (you)" : ""}
              </span>
              <span>{formatDateTime(comment.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
          </div>
        );
      })}
      {hasMore && (
        <Button
          type="button"
          variant="link"
          className="h-auto px-0"
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll
            ? "Show fewer comments"
            : `View all comments (${sorted.length})`}
        </Button>
      )}
    </div>
  );
}

export function CommentThreadHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2">
      <MessageSquare className="h-4 w-4 text-primary" />
      <h3 className="font-medium">Comments</h3>
      <span className="text-sm text-muted-foreground">({count})</span>
    </div>
  );
}
