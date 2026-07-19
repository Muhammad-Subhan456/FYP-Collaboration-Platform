"use client";

import { ArrowUp, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

interface GradePromotionResult {
  promotionApplied?: boolean;
  promotionEligible?: boolean;
  promotedByName?: string | null;
  promotedAt?: string | null;
}

export function GradePromotionCell({
  result,
  isPending,
  onPromote,
}: {
  result: GradePromotionResult;
  isPending: boolean;
  onPromote: () => void;
}) {
  if (result.promotionApplied) {
    return (
      <div className="space-y-1">
        <Badge variant="secondary">Promoted +1</Badge>
        {result.promotedByName ? (
          <p className="text-xs text-muted-foreground">
            by {result.promotedByName}
            {result.promotedAt ? ` · ${formatDate(result.promotedAt)}` : ""}
          </p>
        ) : null}
      </div>
    );
  }

  if (!result.promotionEligible) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={onPromote}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ArrowUp className="h-4 w-4" />
      )}
      Promote Grade (+1 Mark)
    </Button>
  );
}
