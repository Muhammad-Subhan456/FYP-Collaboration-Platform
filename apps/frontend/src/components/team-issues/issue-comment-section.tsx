"use client";

import { useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { getDisplayName } from "@/hooks/use-profiles";
import type { UserProfile } from "@/types/profile";
import type { TeamIssueComment } from "@/types/team-issue";

interface IssueCommentSectionProps {
  comments: TeamIssueComment[];
  profiles: Record<string, UserProfile>;
  currentUserId?: string;
  readOnly?: boolean;
  onPost?: (body: string) => Promise<void>;
}

export function IssueCommentSection({
  comments,
  profiles,
  currentUserId,
  readOnly = false,
  onPost,
}: IssueCommentSectionProps) {
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const handleSubmit = async () => {
    if (!body.trim() || !onPost) return;
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
            const isOwn = comment.authUserId === currentUserId;
            return (
              <div
                key={comment.id}
                className="rounded-lg border bg-muted/20 px-3 py-2"
              >
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {getDisplayName(profiles, comment.authUserId)}
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

      {!readOnly && onPost && (
        <div className="space-y-2">
          <Textarea
            rows={3}
            placeholder="Add a comment…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={posting || !body.trim()}
          >
            {posting && <Loader2 className="animate-spin" />}
            Post comment
          </Button>
        </div>
      )}
    </div>
  );
}
