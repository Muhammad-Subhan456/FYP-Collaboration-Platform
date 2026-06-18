"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatDateTime, pluralize } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { getDisplayName, useProfilesLookup } from "@/hooks/use-profiles";
import { authService } from "@/services/auth.service";
import { coordinatorService } from "@/services/coordinator.service";
import type { CoordinatorEvaluation } from "@/types/coordinator";

function EvaluationPanels({
  evaluationId,
  onAssignTeam,
}: {
  evaluationId: string;
  onAssignTeam: (panelId?: string) => void;
}) {
  const panelsQuery = useQuery({
    queryKey: ["coordinator", "evaluation-panels", evaluationId],
    queryFn: () => coordinatorService.getPanelsForEvaluation(evaluationId),
  });

  const evaluatorIds =
    panelsQuery.data?.flatMap(
      (p) => p.evaluators?.map((e) => e.evaluatorId) ?? [],
    ) ?? [];
  const profilesQuery = useProfilesLookup(evaluatorIds);

  if (panelsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading panels...</p>;
  }

  if ((panelsQuery.data?.length ?? 0) === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No panels yet. Create a panel to assign evaluators and teams.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {panelsQuery.data!.map((panel) => (
        <li key={panel.id} className="rounded-lg border p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">Room {panel.room}</p>
              {panel.scheduledAt && (
                <p className="text-muted-foreground">
                  {formatDateTime(panel.scheduledAt)}
                </p>
              )}
              {panel.remarks && (
                <p className="mt-1 text-muted-foreground">{panel.remarks}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAssignTeam(panel.id)}
            >
              Assign team
            </Button>
          </div>
          {(panel.evaluators?.length ?? 0) > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {panel.evaluators!.map((ev) => (
                <li key={ev.id}>
                  {getDisplayName(profilesQuery.data, ev.evaluatorId)} (
                  {ev.role})
                </li>
              ))}
            </ul>
          )}
          {(panel.assignments?.length ?? 0) > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {pluralize(panel.assignments!.length, "team")} assigned to this panel
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function CoordinatorEvaluationsPage() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState<CoordinatorEvaluation | null>(
    null,
  );
  const [assignOpen, setAssignOpen] = useState<{
    evaluation: CoordinatorEvaluation;
    panelId?: string;
  } | null>(null);
  const [evaluatorOpen, setEvaluatorOpen] = useState<string | null>(null);

  const [evalTitle, setEvalTitle] = useState("");
  const [evalType, setEvalType] = useState<"MID_VIVA" | "FINAL_VIVA">("MID_VIVA");
  const [evalDate, setEvalDate] = useState("");
  const [evalVenue, setEvalVenue] = useState("");
  const [evalRemarks, setEvalRemarks] = useState("");

  const [panelRoom, setPanelRoom] = useState("");
  const [panelScheduledAt, setPanelScheduledAt] = useState("");
  const [panelRemarks, setPanelRemarks] = useState("");

  const [assignTeamIds, setAssignTeamIds] = useState<string[]>([]);
  const [evaluatorId, setEvaluatorId] = useState("");
  const [evaluatorRole, setEvaluatorRole] = useState("EVALUATOR");

  const evaluationsQuery = useQuery({
    queryKey: ["coordinator", "evaluations"],
    queryFn: coordinatorService.getEvaluations,
  });

  const teamsQuery = useQuery({
    queryKey: ["coordinator", "teams"],
    queryFn: coordinatorService.getAllTeams,
  });

  const supervisorsQuery = useQuery({
    queryKey: ["auth", "supervisors"],
    queryFn: authService.listSupervisors,
  });

  const assignmentsQuery = useQuery({
    queryKey: [
      "coordinator",
      "evaluation-assignments",
      assignOpen?.evaluation.id,
    ],
    queryFn: () =>
      coordinatorService.getEvaluationAssignments(assignOpen!.evaluation.id),
    enabled: !!assignOpen?.evaluation.id,
  });

  const createEvalMutation = useMutation({
    mutationFn: coordinatorService.createEvaluation,
    onSuccess: () => {
      toast.success("Evaluation created");
      queryClient.invalidateQueries({ queryKey: ["coordinator", "evaluations"] });
      setCreateOpen(false);
      setEvalTitle("");
      setEvalDate("");
      setEvalVenue("");
      setEvalRemarks("");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const createPanelMutation = useMutation({
    mutationFn: coordinatorService.createEvaluationPanel,
    onSuccess: (_, vars) => {
      toast.success("Panel created");
      queryClient.invalidateQueries({
        queryKey: ["coordinator", "evaluation-panels", vars.evaluationId],
      });
      setPanelOpen(null);
      setPanelRoom("");
      setPanelScheduledAt("");
      setPanelRemarks("");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const addEvaluatorMutation = useMutation({
    mutationFn: ({
      panelId,
      evaluatorId,
      role,
    }: {
      panelId: string;
      evaluatorId: string;
      role?: string;
    }) => coordinatorService.addPanelEvaluator(panelId, { evaluatorId, role }),
    onSuccess: () => {
      toast.success("Evaluator added");
      queryClient.invalidateQueries({ queryKey: ["coordinator", "evaluation-panels"] });
      setEvaluatorOpen(null);
      setEvaluatorId("");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const assignTeamsMutation = useMutation({
    mutationFn: ({
      evaluationId,
      teamIds,
      panelId,
    }: {
      evaluationId: string;
      teamIds: string[];
      panelId?: string;
    }) =>
      coordinatorService.assignTeamsToEvaluation(evaluationId, {
        teamIds,
        panelId,
      }),
    onSuccess: (_, vars) => {
      toast.success(
        `${pluralize(vars.teamIds.length, "team")} assigned to evaluation`,
      );
      queryClient.invalidateQueries({
        queryKey: ["coordinator", "evaluation-panels"],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "coordinator",
          "evaluation-assignments",
          vars.evaluationId,
        ],
      });
      setAssignOpen(null);
      setAssignTeamIds([]);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (evaluationsQuery.isLoading) return <DashboardSkeleton />;

  if (evaluationsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(evaluationsQuery.error)}
        onRetry={() => evaluationsQuery.refetch()}
      />
    );
  }

  const evaluations = evaluationsQuery.data ?? [];
  const teams = teamsQuery.data ?? [];
  const supervisors = supervisorsQuery.data ?? [];
  const assignedTeamIds = new Set(
    (assignmentsQuery.data ?? []).map((assignment) => assignment.teamId),
  );
  const availableTeams = teams.filter((team) => !assignedTeamIds.has(team.id));

  const toggleAssignTeam = (teamId: string) => {
    setAssignTeamIds((current) =>
      current.includes(teamId)
        ? current.filter((id) => id !== teamId)
        : [...current, teamId],
    );
  };

  const handleCreateEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalTitle.trim() || !evalDate || !evalVenue.trim()) {
      toast.error("Title, date, and venue are required");
      return;
    }
    createEvalMutation.mutate({
      title: evalTitle.trim(),
      type: evalType,
      date: new Date(evalDate).toISOString(),
      venue: evalVenue.trim(),
      remarks: evalRemarks.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Evaluations</h2>
          <p className="text-sm text-muted-foreground">
            Schedule viva sessions, panels, and team assignments
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New evaluation
        </Button>
      </div>

      {evaluations.length === 0 ? (
        <EmptyState
          title="No evaluations scheduled"
          description="Create an evaluation to set up panels and assign teams."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create evaluation
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {evaluations.map((evaluation) => {
            const expanded = expandedId === evaluation.id;
            return (
              <Card key={evaluation.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">{evaluation.title}</CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>{evaluation.type.replace(/_/g, " ")}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(evaluation.date)}
                        </span>
                        <span>·</span>
                        <span>{evaluation.venue}</span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {evaluation.remarks && (
                    <p className="text-sm text-muted-foreground">
                      {evaluation.remarks}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPanelOpen(evaluation)}
                    >
                      <Plus className="h-4 w-4" />
                      Create panel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setAssignOpen({ evaluation, panelId: undefined })
                      }
                    >
                      <Users className="h-4 w-4" />
                      Assign teams
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedId(expanded ? null : evaluation.id)
                      }
                    >
                      {expanded ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Hide panels
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          View panels
                        </>
                      )}
                    </Button>
                  </div>
                  {expanded && (
                    <EvaluationPanels
                      evaluationId={evaluation.id}
                      onAssignTeam={(panelId) =>
                        setAssignOpen({ evaluation, panelId })
                      }
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreateEvaluation}>
            <DialogHeader>
              <DialogTitle>New evaluation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="Title"
                value={evalTitle}
                onChange={(e) => setEvalTitle(e.target.value)}
              />
              <Select
                value={evalType}
                onValueChange={(v) =>
                  setEvalType(v as "MID_VIVA" | "FINAL_VIVA")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MID_VIVA">Mid Viva</SelectItem>
                  <SelectItem value="FINAL_VIVA">Final Viva</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="datetime-local"
                value={evalDate}
                onChange={(e) => setEvalDate(e.target.value)}
              />
              <Input
                placeholder="Venue"
                value={evalVenue}
                onChange={(e) => setEvalVenue(e.target.value)}
              />
              <Textarea
                placeholder="Remarks (optional)"
                value={evalRemarks}
                onChange={(e) => setEvalRemarks(e.target.value)}
                rows={2}
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
              <Button type="submit" disabled={createEvalMutation.isPending}>
                {createEvalMutation.isPending && (
                  <Loader2 className="animate-spin" />
                )}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!panelOpen} onOpenChange={(o) => !o && setPanelOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create panel for {panelOpen?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="Room"
              value={panelRoom}
              onChange={(e) => setPanelRoom(e.target.value)}
            />
            <Input
              type="datetime-local"
              value={panelScheduledAt}
              onChange={(e) => setPanelScheduledAt(e.target.value)}
            />
            <Textarea
              placeholder="Remarks (optional)"
              value={panelRemarks}
              onChange={(e) => setPanelRemarks(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPanelOpen(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!panelOpen || !panelRoom.trim()) return;
                createPanelMutation.mutate(
                  {
                    evaluationId: panelOpen.id,
                    room: panelRoom.trim(),
                    scheduledAt: panelScheduledAt
                      ? new Date(panelScheduledAt).toISOString()
                      : undefined,
                    remarks: panelRemarks.trim() || undefined,
                  },
                  {
                    onSuccess: (panel) => {
                      setEvaluatorOpen(panel.id);
                    },
                  },
                );
              }}
              disabled={!panelRoom.trim() || createPanelMutation.isPending}
            >
              {createPanelMutation.isPending && (
                <Loader2 className="animate-spin" />
              )}
              Create panel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!evaluatorOpen}
        onOpenChange={(o) => !o && setEvaluatorOpen(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add evaluator to panel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={evaluatorId} onValueChange={setEvaluatorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select supervisor" />
              </SelectTrigger>
              <SelectContent>
                {supervisors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Role (default: EVALUATOR)"
              value={evaluatorRole}
              onChange={(e) => setEvaluatorRole(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvaluatorOpen(null)}>
              Skip
            </Button>
            <Button
              onClick={() =>
                evaluatorOpen &&
                evaluatorId &&
                addEvaluatorMutation.mutate({
                  panelId: evaluatorOpen,
                  evaluatorId,
                  role: evaluatorRole || undefined,
                })
              }
              disabled={!evaluatorId || addEvaluatorMutation.isPending}
            >
              {addEvaluatorMutation.isPending && (
                <Loader2 className="animate-spin" />
              )}
              Add evaluator
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!assignOpen}
        onOpenChange={(o) => {
          if (!o) {
            setAssignOpen(null);
            setAssignTeamIds([]);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign teams to evaluation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {assignOpen?.panelId && (
              <p className="text-sm text-muted-foreground">
                Assigning multiple teams to the same panel block.
              </p>
            )}
            {assignmentsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading teams...</p>
            ) : availableTeams.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All teams are already assigned to this evaluation.
              </p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-3">
                {availableTeams.map((team) => {
                  const checked = assignTeamIds.includes(team.id);
                  return (
                    <label
                      key={team.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAssignTeam(team.id)}
                        className="h-4 w-4 rounded border-border"
                      />
                      <span className="text-sm">
                        {team.name}{" "}
                        <span className="text-muted-foreground">
                          ({team.domain})
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            {assignTeamIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {pluralize(assignTeamIds.length, "team")} selected
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                assignOpen &&
                assignTeamIds.length > 0 &&
                assignTeamsMutation.mutate({
                  evaluationId: assignOpen.evaluation.id,
                  teamIds: assignTeamIds,
                  panelId: assignOpen.panelId,
                })
              }
              disabled={
                assignTeamIds.length === 0 || assignTeamsMutation.isPending
              }
            >
              {assignTeamsMutation.isPending && (
                <Loader2 className="animate-spin" />
              )}
              Assign selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
