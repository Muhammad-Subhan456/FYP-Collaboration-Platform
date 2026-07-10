"use client";

import { useMemo, useState } from "react";
import { Filter, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ALL_FILTER_VALUE,
  countActiveFilters,
  type UnifiedFilterField,
} from "@/types/evaluation-filters";
import type { SubmissionEvaluationStatus } from "@/types/submission-evaluation";

type Option = { value: string; label: string };

type FilterOptions = {
  phases?: Option[];
  deliverables?: Option[];
  teams?: Option[];
  supervisors?: Option[];
  evaluators?: Option[];
  students?: Option[];
};

type FilterValues = Record<string, string>;

interface UnifiedFiltersDropdownProps {
  fields: UnifiedFilterField[];
  values: FilterValues;
  options: FilterOptions;
  onChange: (values: FilterValues) => void;
  onApply?: (values: FilterValues) => void;
}

const EVALUATION_STATUS_OPTIONS: Array<{
  value: SubmissionEvaluationStatus | typeof ALL_FILTER_VALUE;
  label: string;
}> = [
  { value: ALL_FILTER_VALUE, label: "All statuses" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "SUBMITTED", label: "Submitted" },
];

const SUBMISSION_STATUS_OPTIONS = [
  { value: ALL_FILTER_VALUE, label: "All statuses" },
  { value: "FINALIZED", label: "Finalized" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "DRAFT", label: "Draft" },
];

const FIELD_LABELS: Record<UnifiedFilterField, string> = {
  phase: "Phase",
  deliverable: "Deliverable",
  team: "Team",
  supervisor: "Supervisor",
  evaluator: "Evaluator",
  student: "Student",
  evaluationStatus: "Evaluation status",
  submissionStatus: "Submission status",
};

const FIELD_VALUE_KEYS: Record<UnifiedFilterField, string> = {
  phase: "phaseId",
  deliverable: "templateId",
  team: "teamId",
  supervisor: "supervisorId",
  evaluator: "evaluatorId",
  student: "studentId",
  evaluationStatus: "evaluationStatus",
  submissionStatus: "submissionStatus",
};

export function UnifiedFiltersDropdown({
  fields,
  values,
  options,
  onChange,
  onApply,
}: UnifiedFiltersDropdownProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterValues>(values);

  const activeCount = useMemo(
    () => countActiveFilters(values, fields),
    [fields, values],
  );

  const openDialog = () => {
    setDraft(values);
    setOpen(true);
  };

  const updateDraft = (key: string, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const clearDraft = () => {
    const cleared = Object.fromEntries(
      fields.map((field) => [FIELD_VALUE_KEYS[field], ALL_FILTER_VALUE]),
    );
    setDraft(cleared);
  };

  const applyFilters = () => {
    onChange(draft);
    onApply?.(draft);
    setOpen(false);
  };

  const renderField = (field: UnifiedFilterField) => {
    const valueKey = FIELD_VALUE_KEYS[field];
    const value = draft[valueKey] ?? ALL_FILTER_VALUE;

    if (field === "evaluationStatus") {
      return (
        <div key={field} className="space-y-2">
          <Label>{FIELD_LABELS[field]}</Label>
          <Select value={value} onValueChange={(next) => updateDraft(valueKey, next)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVALUATION_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field === "submissionStatus") {
      return (
        <div key={field} className="space-y-2">
          <Label>{FIELD_LABELS[field]}</Label>
          <Select value={value} onValueChange={(next) => updateDraft(valueKey, next)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBMISSION_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    const optionKey =
      field === "phase"
        ? "phases"
        : field === "deliverable"
          ? "deliverables"
          : field === "team"
            ? "teams"
            : field === "supervisor"
              ? "supervisors"
              : field === "evaluator"
                ? "evaluators"
                : "students";

    const fieldOptions = options[optionKey] ?? [];

    return (
      <div key={field} className="space-y-2">
        <Label>{FIELD_LABELS[field]}</Label>
        <Select value={value} onValueChange={(next) => updateDraft(valueKey, next)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>
              All {FIELD_LABELS[field].toLowerCase()}s
            </SelectItem>
            {fieldOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <>
      <Button variant="outline" onClick={openDialog}>
        <Filter className="mr-2 h-4 w-4" />
        Filters
        {activeCount > 0 ? (
          <Badge variant="secondary" className="ml-2">
            {activeCount}
          </Badge>
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>
              Narrow the list using one or more filters.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {fields.map((field) => renderField(field))}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" onClick={clearDraft}>
              <X className="mr-2 h-4 w-4" />
              Clear all
            </Button>
            <Button type="button" onClick={applyFilters}>
              Apply filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
