"use client";

import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryKeys } from "@/lib/react-query";
import { useAuth } from "@/providers/auth-provider";
import { phaseService } from "@/services/phase.service";

interface PhaseFilterProps {
  value: string;
  onChange: (phaseId: string) => void;
  className?: string;
}

export function PhaseFilter({ value, onChange, className }: PhaseFilterProps) {
  const { user } = useAuth();

  const phasesQuery = useQuery({
    queryKey: queryKeys.phases.list(user?.workspaceId),
    queryFn: () => phaseService.list("ACTIVE"),
    enabled: !!user?.workspaceId,
  });

  const phases = phasesQuery.data ?? [];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "w-[200px]"}>
        <SelectValue placeholder="All phases" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All phases</SelectItem>
        {phases.map((phase) => (
          <SelectItem key={phase.id} value={phase.id}>
            {phase.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
