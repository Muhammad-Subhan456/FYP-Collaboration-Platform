"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { AnchoredDropdownPanel } from "@/components/work-stream/anchored-dropdown";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SupervisorWorkStreamTeam } from "@/types/work-stream";

interface TeamFilterSelectProps {
  teams: SupervisorWorkStreamTeam[];
  selectedTeamId: string;
  onChange: (teamId: string) => void;
  label?: string;
}

export function TeamFilterSelect({
  teams,
  selectedTeamId,
  onChange,
  label = "Filter by team",
}: TeamFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return teams;
    }

    return teams.filter((team) => team.name.toLowerCase().includes(query));
  }, [search, teams]);

  const selectedLabel =
    teams.find((team) => team.id === selectedTeamId)?.name ?? "Select a team";

  const close = () => {
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <button
        ref={triggerRef}
        type="button"
        className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="truncate text-left">{selectedLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      <AnchoredDropdownPanel
        open={open}
        triggerRef={triggerRef}
        onClose={close}
        className="rounded-lg border bg-popover p-2 shadow-md"
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
            filteredTeams.map((team) => (
              <button
                key={team.id}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-accent",
                  selectedTeamId === team.id && "bg-accent",
                )}
                onClick={() => {
                  onChange(team.id);
                  close();
                }}
              >
                <span className="truncate">{team.name}</span>
                {selectedTeamId === team.id && (
                  <Check className="h-4 w-4 shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </AnchoredDropdownPanel>
    </div>
  );
}
