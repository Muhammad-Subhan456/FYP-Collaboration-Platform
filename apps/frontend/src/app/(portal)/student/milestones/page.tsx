"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Flag, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { IssueDetailPanel } from "@/components/team-issues/issue-detail-panel";
import { IssueListCard } from "@/components/team-issues/issue-list-card";
import { IssueStatusTabs } from "@/components/team-issues/issue-status-tabs";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/axios";
import {
  filterIssuesByTab,
  type IssueStatusTab,
} from "@/lib/team-issue-helpers";
import {
  useStudentClaimTeamIssueMutation,
  useStudentCompleteTeamIssueMutation,
  useStudentCreateTeamIssueMutation,
  useStudentReleaseTeamIssueMutation,
  useStudentUpdateTeamIssueMutation,
  useStudentTeamIssueCommentMutation,
} from "@/mutations/student";
import { useAuth } from "@/providers/auth-provider";
import {
  isStudentQueryPending,
  useStudentMilestonesQuery,
} from "@/queries/student";
import type { TeamIssuePriority } from "@/types/team-issue";

const PRIORITIES: TeamIssuePriority[] = ["LOW", "MEDIUM", "HIGH"];

export default function StudentMilestonesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const issueIdParam = searchParams.get("issueId");

  const [filter, setFilter] = useState<IssueStatusTab>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TeamIssuePriority>("MEDIUM");
  const [labelsInput, setLabelsInput] = useState("");

  const pageQuery = useStudentMilestonesQuery();
  const createMutation = useStudentCreateTeamIssueMutation({
    onSuccess: () => {
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setLabelsInput("");
    },
  });
  const claimMutation = useStudentClaimTeamIssueMutation();
  const releaseMutation = useStudentReleaseTeamIssueMutation();
  const updateMutation = useStudentUpdateTeamIssueMutation();
  const completeMutation = useStudentCompleteTeamIssueMutation();
  const commentMutation = useStudentTeamIssueCommentMutation();

  useEffect(() => {
    if (issueIdParam) {
      setSelectedId(issueIdParam);
    }
  }, [issueIdParam]);

  const issues = pageQuery.data?.issues ?? [];
  const profiles = pageQuery.data?.profiles ?? {};
  const summaries = pageQuery.data?.summaries;

  const filteredIssues = useMemo(
    () => filterIssuesByTab(issues, filter),
    [filter, issues],
  );

  const selectedIssue =
    issues.find((i) => i.id === selectedId) ?? filteredIssues[0] ?? null;

  if (isStudentQueryPending(pageQuery)) return <DashboardSkeleton />;

  if (pageQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(pageQuery.error)}
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  if (!pageQuery.data?.team) {
    return (
      <EmptyState
        title="No team yet"
        description="Join a team to track milestones together."
        action={
          <Button asChild>
            <Link href="/student/team">Go to Team</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New issue
        </Button>
      </div>

      {summaries && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Open
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {summaries.open}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In progress
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {summaries.inProgress ?? 0}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Recently completed
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {summaries.recentlyCompleted}
            </CardContent>
          </Card>
        </div>
      )}

      <IssueStatusTabs value={filter} onChange={setFilter} />

      {filteredIssues.length === 0 ? (
        <EmptyState
          title={`No ${filter.replace(/_/g, " ")} tasks`}
          description={
            filter === "open"
              ? "Create the first task for your team."
              : "Tasks appear here as their status changes."
          }
          action={
            filter === "open" ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Flag className="h-4 w-4" />
                Create task
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="space-y-2">
            {filteredIssues.map((issue) => (
              <IssueListCard
                key={issue.id}
                issue={issue}
                profiles={profiles}
                selected={selectedIssue?.id === issue.id}
                showInProgressDetails={filter === "in_progress"}
                onSelect={() => setSelectedId(issue.id)}
              />
            ))}
          </div>

          {selectedIssue && (
            <Card>
              <CardContent className="pt-6">
                <IssueDetailPanel
                  issue={selectedIssue}
                  profiles={profiles}
                  currentUserId={user?.userId}
                  onClaim={async () => {
                    await claimMutation.mutateAsync(selectedIssue.id);
                  }}
                  onRelease={async () => {
                    await releaseMutation.mutateAsync(selectedIssue.id);
                  }}
                  onComplete={async (input) => {
                    await completeMutation.mutateAsync({
                      issueId: selectedIssue.id,
                      input,
                    });
                  }}
                  onComment={async (body) => {
                    await commentMutation.mutateAsync({
                      issueId: selectedIssue.id,
                      body,
                    });
                  }}
                  onEdit={async (input) => {
                    await updateMutation.mutateAsync({
                      issueId: selectedIssue.id,
                      input,
                    });
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create issue</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim() || !description.trim()) {
                toast.error("Title and description are required");
                return;
              }
              const labels = labelsInput
                .split(",")
                .map((l) => l.trim())
                .filter(Boolean);
              createMutation.mutate({
                title: title.trim(),
                description: description.trim(),
                priority,
                labels: labels.length ? labels : undefined,
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="issueTitle">Title</Label>
              <Input
                id="issueTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issueDescription">Description</Label>
              <Textarea
                id="issueDescription"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) =>
                  setPriority(v as TeamIssuePriority)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issueLabels">Labels (comma-separated)</Label>
              <Input
                id="issueLabels"
                placeholder="bug, frontend"
                value={labelsInput}
                onChange={(e) => setLabelsInput(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="animate-spin" />
                )}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
