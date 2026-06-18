import { Construction } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface PhasePlaceholderProps {
  feature: string;
  phase?: number;
}

export function PhasePlaceholder({
  feature,
  phase = 2,
}: PhasePlaceholderProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Construction className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{feature}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            This feature will be implemented in Phase {phase}. The navigation
            structure and API integration checklist are ready.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
