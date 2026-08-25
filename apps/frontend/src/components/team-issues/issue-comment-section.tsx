"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import {
  CommentThread,
  CommentThreadHeader,
} from "@/components/common/comment-thread";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
      <CommentThreadHeader count={comments.length} />

      <CommentThread
        comments={comments}
        profiles={profiles}
        currentUserId={currentUserId}
        previewLimit={3}
        resolveAuthorName={(nextProfiles, authUserId, comment) =>
          getDisplayName(nextProfiles, authUserId, comment?.authorName)
        }
      />

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
