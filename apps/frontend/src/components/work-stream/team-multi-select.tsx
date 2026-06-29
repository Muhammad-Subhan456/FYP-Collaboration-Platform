"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SupervisorWorkStreamTeam } from "@/types/work-stream";

interface TeamMultiSelectProps {
  teams: SupervisorWorkStreamTeam[];
  selectedTeamIds: string[];
  onChange: (teamIds: string[]) => void;
  label?: string;
  error?: string;
}

export function TeamMultiSelect({
  teams,
  selectedTeamIds,
  onChange,
  label = "Assign to teams",
  error,
}: TeamMultiSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedTeams = useMemo(
    () =>
      selectedTeamIds
        .map((id) => teams.find((team) => team.id === id))
        .filter((team): team is SupervisorWorkStreamTeam => !!team),
    [selectedTeamIds, teams],
  );

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return teams;
    }

    return teams.filter((team) => team.name.toLowerCase().includes(query));
  }, [search, teams]);

  const toggleTeam = (teamId: string) => {
    if (selectedTeamIds.includes(teamId)) {
      onChange(selectedTeamIds.filter((id) => id !== teamId));
      return;
    }

    onChange([...selectedTeamIds, teamId]);
  };

  const close = () => {
    setOpen(false);
    setSearch("");
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }

      close();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div className="space-y-2" data-team-multi-select ref={rootRef}>
      <Label className="text-sm font-medium">{label}</Label>

      <div
        className={cn(
          "relative min-h-10 rounded-lg border bg-background p-2",
          error ? "border-destructive" : "border-input",
        )}
      >
        {selectedTeams.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {selectedTeams.map((team) => (
              <Badge
                key={team.id}
                variant="secondary"
                className="gap-1 pr-1 font-normal"
              >
                {team.name}
                <button
                  type="button"
                  className="rounded-sm p-0.5 hover:bg-muted"
                  aria-label={`Remove ${team.name}`}
                  onClick={() => toggleTeam(team.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="mb-2 text-sm text-muted-foreground">
            Select at least one team.
          </p>
        )}

        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-dashed border-input px-3 text-sm text-muted-foreground hover:bg-accent/50"
          onClick={() => setOpen((value) => !value)}
        >
          <span>Add teams</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>

        {open && (
          <div
            className="absolute left-0 right-0 top-full z-[60] mt-1 rounded-lg border bg-popover p-2 shadow-md"
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search teams..."
                className="pl-8"
                autoFocus
              />
            </div>
            <div className="max-h-48 space-y-0.5 overflow-y-auto">
              {teams.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  No supervised teams.
                </p>
              ) : filteredTeams.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  No teams match your search.
                </p>
              ) : (
                filteredTeams.map((team) => {
                  const isSelected = selectedTeamIds.includes(team.id);

                  return (
                    <button
                      key={team.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-accent",
                        isSelected && "bg-accent",
                      )}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleTeam(team.id);
                      }}
                    >
                      <span className="truncate">{team.name}</span>
                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
