"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface SortableTableHeaderProps {
  label: string;
  active: boolean;
  direction?: "asc" | "desc";
  onClick: () => void;
  className?: string;
}

export function SortableTableHeader({
  label,
  active,
  direction = "asc",
  onClick,
  className,
}: SortableTableHeaderProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-md text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "text-foreground" : "text-muted-foreground",
        className,
      )}
    >
      <span>{label}</span>
      {active ? (
        direction === "asc" ? (
          <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
        )
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
      )}
      <span className="sr-only">
        {active
          ? `Sorted ${direction === "asc" ? "ascending" : "descending"}`
          : "Not sorted"}
      </span>
    </button>
  );
}
