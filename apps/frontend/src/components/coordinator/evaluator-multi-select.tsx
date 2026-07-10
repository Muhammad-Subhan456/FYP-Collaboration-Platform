"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SubmissionEvaluationPerson } from "@/types/submission-evaluation";

interface EvaluatorMultiSelectProps {
  evaluators: SubmissionEvaluationPerson[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  excludedIds?: string[];
  label?: string;
  placeholder?: string;
  error?: string;
}

export function EvaluatorMultiSelect({
  evaluators,
  selectedIds,
  onChange,
  excludedIds = [],
  label = "Evaluators",
  placeholder = "Select evaluators",
  error,
}: EvaluatorMultiSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const availableEvaluators = useMemo(
    () =>
      evaluators.filter((evaluator) => !excludedIds.includes(evaluator.id)),
    [evaluators, excludedIds],
  );

  const selectedEvaluators = useMemo(
    () =>
      selectedIds
        .map((id) => availableEvaluators.find((evaluator) => evaluator.id === id))
        .filter((evaluator): evaluator is SubmissionEvaluationPerson => !!evaluator),
    [availableEvaluators, selectedIds],
  );

  const filteredEvaluators = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return availableEvaluators;
    }

    return availableEvaluators.filter(
      (evaluator) =>
        evaluator.fullName.toLowerCase().includes(query) ||
        evaluator.email.toLowerCase().includes(query),
    );
  }, [availableEvaluators, search]);

  const toggleEvaluator = (evaluatorId: string) => {
    if (selectedIds.includes(evaluatorId)) {
      onChange(selectedIds.filter((id) => id !== evaluatorId));
      return;
    }

    onChange([...selectedIds, evaluatorId]);
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
    <div className="space-y-2" ref={rootRef}>
      <Label className="text-sm font-medium">{label}</Label>

      <div
        className={cn(
          "relative min-h-10 rounded-lg border bg-background p-2",
          error ? "border-destructive" : "border-input",
        )}
      >
        {selectedEvaluators.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {selectedEvaluators.map((evaluator) => (
              <Badge
                key={evaluator.id}
                variant="secondary"
                className="gap-1 pr-1 font-normal"
              >
                {evaluator.fullName}
                <button
                  type="button"
                  className="rounded-sm p-0.5 hover:bg-muted"
                  aria-label={`Remove ${evaluator.fullName}`}
                  onClick={() => toggleEvaluator(evaluator.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="mb-2 text-sm text-muted-foreground">
            {placeholder}
          </p>
        )}

        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-dashed border-input px-3 text-sm text-muted-foreground hover:bg-accent/50"
          onClick={() => setOpen((value) => !value)}
        >
          <span>Add evaluators</span>
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
                placeholder="Search by name or email..."
                className="pl-8"
                autoFocus
              />
            </div>
            <div className="max-h-48 space-y-0.5 overflow-y-auto">
              {availableEvaluators.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  No evaluators available to assign.
                </p>
              ) : filteredEvaluators.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  No evaluators match your search.
                </p>
              ) : (
                filteredEvaluators.map((evaluator) => {
                  const isSelected = selectedIds.includes(evaluator.id);

                  return (
                    <button
                      key={evaluator.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-accent",
                        isSelected && "bg-accent",
                      )}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleEvaluator(evaluator.id);
                      }}
                    >
                      <span className="truncate">
                        {evaluator.fullName}
                        <span className="ml-2 text-muted-foreground">
                          {evaluator.email}
                        </span>
                      </span>
                      {isSelected ? (
                        <Check className="h-4 w-4 shrink-0" />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
