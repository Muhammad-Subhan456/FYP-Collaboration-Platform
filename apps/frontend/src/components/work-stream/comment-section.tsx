"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import {
  CommentThread,
  CommentThreadHeader,
} from "@/components/common/comment-thread";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
      <CommentThreadHeader count={comments.length} />

      <CommentThread
        comments={comments}
        profiles={profiles}
        currentUserId={currentUserId}
        previewLimit={3}
      />

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
