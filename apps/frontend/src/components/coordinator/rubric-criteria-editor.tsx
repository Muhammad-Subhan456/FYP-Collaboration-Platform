"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RubricCriterionInput } from "@/types/phase";

interface RubricCriteriaEditorProps {
  criteria: RubricCriterionInput[];
  totalMarks: number;
  onChange: (criteria: RubricCriterionInput[]) => void;
  disabled?: boolean;
}

export function RubricCriteriaEditor({
  criteria,
  totalMarks,
  onChange,
  disabled,
}: RubricCriteriaEditorProps) {
  const rubricSum = criteria.reduce(
    (sum, item) => sum + (item.maxMarks || 0),
    0,
  );

  const updateCriterion = (
    index: number,
    patch: Partial<RubricCriterionInput>,
  ) => {
    onChange(
      criteria.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  };

  const moveCriterion = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= criteria.length) {
      return;
    }

    const next = [...criteria];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    onChange(next.map((entry, sortOrder) => ({ ...entry, sortOrder })));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Rubric criteria</Label>
        <span
          className={
            rubricSum === totalMarks
              ? "text-xs text-muted-foreground"
              : "text-xs text-destructive"
          }
        >
          {rubricSum} / {totalMarks} marks
        </span>
      </div>

      {criteria.map((criterion, index) => (
        <div key={index} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Criterion {index + 1}</span>
            <div className="flex gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={disabled || index === 0}
                onClick={() => moveCriterion(index, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={disabled || index === criteria.length - 1}
                onClick={() => moveCriterion(index, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={disabled || criteria.length <= 1}
                onClick={() =>
                  onChange(criteria.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Input
            placeholder="Criterion title"
            value={criterion.title}
            disabled={disabled}
            onChange={(event) =>
              updateCriterion(index, { title: event.target.value })
            }
          />
          <Textarea
            placeholder="Description (optional)"
            value={criterion.description ?? ""}
            disabled={disabled}
            rows={2}
            onChange={(event) =>
              updateCriterion(index, { description: event.target.value })
            }
          />
          <Input
            type="number"
            min={1}
            placeholder="Max marks"
            value={criterion.maxMarks || ""}
            disabled={disabled}
            onChange={(event) =>
              updateCriterion(index, {
                maxMarks: Number(event.target.value) || 0,
              })
            }
          />
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...criteria,
            { title: "", description: "", maxMarks: 0, sortOrder: criteria.length },
          ])
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        Add criterion
      </Button>
    </div>
  );
}
