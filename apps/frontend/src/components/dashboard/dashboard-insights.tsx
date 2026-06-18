import { Card, CardContent } from "@/components/ui/card";

interface DashboardInsightsProps {
  lines: string[];
}

export function DashboardInsights({ lines }: DashboardInsightsProps) {
  if (lines.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="space-y-1 pt-6">
        {lines.map((line) => (
          <p key={line} className="text-sm text-foreground">
            {line}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
