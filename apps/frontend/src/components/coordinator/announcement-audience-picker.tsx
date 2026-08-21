"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export const ANNOUNCEMENT_AUDIENCE_OPTIONS = [
  { value: "STUDENT", label: "Students" },
  { value: "SUPERVISOR", label: "Supervisors" },
  { value: "EVALUATOR", label: "Evaluators" },
] as const;

export type AnnouncementAudienceRole =
  (typeof ANNOUNCEMENT_AUDIENCE_OPTIONS)[number]["value"];

interface AnnouncementAudiencePickerProps {
  value: AnnouncementAudienceRole[];
  onChange: (roles: AnnouncementAudienceRole[]) => void;
}

export function AnnouncementAudiencePicker({
  value,
  onChange,
}: AnnouncementAudiencePickerProps) {
  const allSelected =
    value.length === ANNOUNCEMENT_AUDIENCE_OPTIONS.length;

  const toggleRole = (role: AnnouncementAudienceRole) => {
    if (value.includes(role)) {
      onChange(value.filter((item) => item !== role));
      return;
    }
    onChange([...value, role]);
  };

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
      return;
    }
    onChange(
      ANNOUNCEMENT_AUDIENCE_OPTIONS.map((option) => option.value),
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Audience</Label>
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={toggleAll}
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {ANNOUNCEMENT_AUDIENCE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={value.includes(option.value)}
              onChange={() => toggleRole(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No roles selected. Add specific individuals below, or leave both empty
          to reach all students, supervisors, and evaluators.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {value.map((role) => (
            <Badge key={role} variant="secondary">
              {ANNOUNCEMENT_AUDIENCE_OPTIONS.find(
                (option) => option.value === role,
              )?.label ?? role}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function formatAudienceRoles(roles: string[]) {
  if (!roles.length) {
    return "All recipients";
  }

  return roles
    .map(
      (role) =>
        ANNOUNCEMENT_AUDIENCE_OPTIONS.find(
          (option) => option.value === role,
        )?.label ?? role,
    )
    .join(", ");
}
