"use client";

import { Label } from "@/components/ui/label";
import type { SupervisorWorkStreamTeam } from "@/types/work-stream";

interface TeamSelectorProps {
  teams: SupervisorWorkStreamTeam[];
  selectedTeamIds: string[];
  onChange: (teamIds: string[]) => void;
  label?: string;
}

export function TeamSelector({
  teams,
  selectedTeamIds,
  onChange,
  label = "Teams",
}: TeamSelectorProps) {
  const toggleTeam = (teamId: string, checked: boolean) => {
    if (checked) {
      onChange([...new Set([...selectedTeamIds, teamId])]);
      return;
    }

    onChange(selectedTeamIds.filter((id) => id !== teamId));
  };

  const selectAll = () => onChange(teams.map((team) => team.id));
  const clearAll = () => onChange([]);

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={selectAll}
          >
            All
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:underline"
            onClick={clearAll}
          >
            Clear
          </button>
        </div>
      </div>

      {teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">No supervised teams</p>
      ) : (
        <div className="space-y-2">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center gap-2">
              <input
                id={`team-${team.id}`}
                type="checkbox"
                className="h-4 w-4 rounded border"
                checked={selectedTeamIds.includes(team.id)}
                onChange={(e) => toggleTeam(team.id, e.target.checked)}
              />
              <Label htmlFor={`team-${team.id}`} className="font-normal">
                {team.name}
              </Label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
