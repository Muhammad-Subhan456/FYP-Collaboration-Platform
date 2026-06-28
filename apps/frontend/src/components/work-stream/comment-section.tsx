"use client";

import { useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import type { UserProfile } from "@/types/profile";
import type {
  WorkStreamComment,
  WorkStreamEntityType,
} from "@/types/work-stream";
import { workStreamEntityKey } from "@/types/work-stream";

interface CommentSectionProps {
  entityType: WorkStreamEntityType;
  entityId: string;
  comments: WorkStreamComment[];
  profiles: Record<string, UserProfile>;
  currentUserId?: string;
  onPost: (body: string) => Promise<void>;
}

export function CommentSection({
  entityType,
  entityId,
  comments,
  profiles,
  currentUserId,
  onPost,
}: CommentSectionProps) {
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const handleSubmit = async () => {
    if (!body.trim()) return;
    setPosting(true);
    try {
      await onPost(body.trim());
      setBody("");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="font-medium">Comments</h3>
        <span className="text-sm text-muted-foreground">
          ({comments.length})
        </span>
      </div>

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No comments yet. Start the discussion.
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const author = profiles[comment.authUserId];
            const isOwn = comment.authUserId === currentUserId;
            return (
              <div
                key={comment.id}
                className="rounded-lg border bg-muted/20 px-3 py-2"
              >
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {author?.fullName ?? "User"}
                    {isOwn ? " (you)" : ""}
                  </span>
                  <span>{formatDateTime(comment.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment…"
          rows={3}
        />
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={posting || !body.trim()}
        >
          {posting && <Loader2 className="h-4 w-4 animate-spin" />}
          Post comment
        </Button>
      </div>

      <span className="sr-only">
        {workStreamEntityKey(entityType, entityId)}
      </span>
    </div>
  );
}
