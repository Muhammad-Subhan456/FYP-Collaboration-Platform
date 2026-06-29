"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

import { IssueActivityTimeline } from "@/components/team-issues/issue-activity-timeline";
import { IssueCommentSection } from "@/components/team-issues/issue-comment-section";
import { PriorityBadge } from "@/components/team-issues/priority-badge";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getDisplayName } from "@/hooks/use-profiles";
import { formatDate } from "@/lib/format";
import type { UserProfile } from "@/types/profile";
import type { TeamIssue } from "@/types/team-issue";

interface IssueDetailPanelProps {
  issue: TeamIssue;
  profiles: Record<string, UserProfile>;
  currentUserId?: string;
  readOnly?: boolean;
  onClaim?: () => Promise<void>;
  onRelease?: () => Promise<void>;
  onComplete?: (input: {
    githubPrUrl?: string;
    githubCommitUrl?: string;
  }) => Promise<void>;
  onComment?: (body: string) => Promise<void>;
  onEdit?: (input: {
    title: string;
    description: string;
    priority: TeamIssue["priority"];
    labels: string[];
  }) => Promise<void>;
}

export function IssueDetailPanel({
  issue,
  profiles,
  currentUserId,
  readOnly = false,
  onClaim,
  onRelease,
  onComplete,
  onComment,
  onEdit,
}: IssueDetailPanelProps) {
  const [completeOpen, setCompleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(issue.title);
  const [editDescription, setEditDescription] = useState(issue.description);
  const [editPriority, setEditPriority] = useState(issue.priority);
  const [editLabels, setEditLabels] = useState(issue.labels.join(", "));
  const [githubPrUrl, setGithubPrUrl] = useState("");
  const [githubCommitUrl, setGithubCommitUrl] = useState("");
  const [acting, setActing] = useState(false);

  const isAssignee = issue.assignedToId === currentUserId;
  const canClaim =
    !readOnly && issue.status === "OPEN" && !issue.assignedToId;
  const canRelease = !readOnly && isAssignee && issue.status === "IN_PROGRESS";
  const canComplete =
    !readOnly && isAssignee && issue.status === "IN_PROGRESS";
  const canEdit =
    !readOnly &&
    issue.createdById === currentUserId &&
    issue.status !== "COMPLETED";

  const runAction = async (action: () => Promise<void>) => {
    setActing(true);
    try {
      await action();
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={issue.status} />
          <PriorityBadge priority={issue.priority} />
          {issue.labels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {label}
            </span>
          ))}
        </div>
        <h3 className="text-lg font-semibold">{issue.title}</h3>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {issue.description}
        </p>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>
            Created by {getDisplayName(profiles, issue.createdById)}
          </span>
          <span>{formatDate(issue.createdAt)}</span>
          {issue.assignedToId && (
            <span>
              Assigned to {getDisplayName(profiles, issue.assignedToId)}
            </span>
          )}
        </div>
      </div>

      {(issue.githubPrUrl || issue.githubCommitUrl) && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">GitHub evidence</p>
          {issue.githubPrUrl && (
            <a
              href={issue.githubPrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Pull request <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {issue.githubCommitUrl && (
            <a
              href={issue.githubCommitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Commit <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          {canEdit && onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditTitle(issue.title);
                setEditDescription(issue.description);
                setEditPriority(issue.priority);
                setEditLabels(issue.labels.join(", "));
                setEditOpen(true);
              }}
            >
              Edit issue
            </Button>
          )}
          {canClaim && onClaim && (
            <Button
              size="sm"
              onClick={() => runAction(onClaim)}
              disabled={acting}
            >
              {acting && <Loader2 className="animate-spin" />}
              Claim issue
            </Button>
          )}
          {canRelease && onRelease && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => runAction(onRelease)}
              disabled={acting}
            >
              Release issue
            </Button>
          )}
          {canComplete && onComplete && (
            <Button
              size="sm"
              onClick={() => setCompleteOpen(true)}
              disabled={acting}
            >
              Mark completed
            </Button>
          )}
        </div>
      )}

      <IssueCommentSection
        comments={issue.comments ?? []}
        profiles={profiles}
        currentUserId={currentUserId}
        readOnly={readOnly && !onComment}
        onPost={onComment}
      />

      <div className="space-y-2">
        <h3 className="font-medium">Activity</h3>
        <IssueActivityTimeline activities={issue.activities ?? []} />
      </div>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete issue</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Optionally add a GitHub pull request or commit URL for development
            evidence.
          </p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="githubPrUrl">GitHub PR URL</Label>
              <Input
                id="githubPrUrl"
                placeholder="https://github.com/org/repo/pull/47"
                value={githubPrUrl}
                onChange={(e) => setGithubPrUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="githubCommitUrl">GitHub commit URL</Label>
              <Input
                id="githubCommitUrl"
                placeholder="https://github.com/org/repo/commit/abc123"
                value={githubCommitUrl}
                onChange={(e) => setGithubCommitUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!onComplete) return;
                setActing(true);
                try {
                  await onComplete({
                    githubPrUrl: githubPrUrl.trim() || undefined,
                    githubCommitUrl: githubCommitUrl.trim() || undefined,
                  });
                  setCompleteOpen(false);
                  setGithubPrUrl("");
                  setGithubCommitUrl("");
                } finally {
                  setActing(false);
                }
              }}
              disabled={acting}
            >
              {acting && <Loader2 className="animate-spin" />}
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="editTitle">Title</Label>
              <Input
                id="editTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={editPriority}
                onValueChange={(v) =>
                  setEditPriority(v as TeamIssue["priority"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["LOW", "MEDIUM", "HIGH"] as const).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editLabels">Labels</Label>
              <Input
                id="editLabels"
                value={editLabels}
                onChange={(e) => setEditLabels(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!onEdit) return;
                const labels = editLabels
                  .split(",")
                  .map((l) => l.trim())
                  .filter(Boolean);
                await onEdit({
                  title: editTitle.trim(),
                  description: editDescription.trim(),
                  priority: editPriority,
                  labels,
                });
                setEditOpen(false);
              }}
              disabled={acting}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
