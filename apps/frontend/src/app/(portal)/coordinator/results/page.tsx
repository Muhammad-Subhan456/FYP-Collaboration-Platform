"use client";

import { useMemo, useState } from "react";
import { Award, Search } from "lucide-react";

import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, ErrorState } from "@/components/common/state-blocks";
import { ResultsAnalyticsCharts } from "@/components/coordinator/results-analytics-charts";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { getErrorMessage } from "@/lib/axios";
import { useCoordinatorPageQuery } from "@/hooks/use-coordinator-page";
import { coordinatorPageService } from "@/services/coordinator-page.service";
import { cn } from "@/lib/utils";

export default function CoordinatorResultsPage() {
  const [search, setSearch] = useState("");
  const [evaluationFilter, setEvaluationFilter] = useState("all");

  const pageQuery = useCoordinatorPageQuery(
    "results",
    coordinatorPageService.getResults,
  );

  const teamNameById = useMemo(
    () =>
      new Map(
        (pageQuery.data?.teams ?? []).map((team) => [team.id, team.name]),
      ),
    [pageQuery.data?.teams],
  );

  const evaluationOptions = useMemo(() => {
    const titles = new Set(
      (pageQuery.data?.overview ?? []).map((row) => row.evaluationTitle),
    );
    return Array.from(titles);
  }, [pageQuery.data?.overview]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (pageQuery.data?.overview ?? []).filter((row) => {
      const teamName = teamNameById.get(row.teamId) ?? "";
      const matchesEvaluation =
        evaluationFilter === "all" ||
        row.evaluationTitle === evaluationFilter;
      const matchesSearch =
        !query ||
        row.evaluationTitle.toLowerCase().includes(query) ||
        teamName.toLowerCase().includes(query);

      return matchesEvaluation && matchesSearch;
    });
  }, [pageQuery.data?.overview, evaluationFilter, search, teamNameById]);

  if (pageQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (pageQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(pageQuery.error)}
        onRetry={() => pageQuery.refetch()}
      />
    );
  }

  const rows = pageQuery.data?.overview ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Evaluation Results</h2>
        <p className="text-sm text-muted-foreground">
          Global visibility across all evaluations, teams, and published marks.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No evaluation assignments"
          description="Assign teams to evaluations to track results here."
        />
      ) : (
        <>
          <ResultsAnalyticsCharts rows={rows} teamNameById={teamNameById} />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-4 w-4" />
                All Results
              </CardTitle>
              <CardDescription>
                Every team-evaluation combination with marks or pending status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search by evaluation or team..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select
                  value={evaluationFilter}
                  onValueChange={setEvaluationFilter}
                >
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Filter evaluation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All evaluations</SelectItem>
                    {evaluationOptions.map((title) => (
                      <SelectItem key={title} value={title}>
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">Evaluation</th>
                      <th className="px-4 py-3 font-medium">Team</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium text-right">Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr
                        key={`${row.evaluationId}-${row.teamId}`}
                        className="border-t"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium">{row.evaluationTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.evaluationType.replace(/_/g, " ")} ·{" "}
                            {row.evaluationVenue}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {teamNameById.get(row.teamId) ?? "Unknown Team"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(row.evaluationDate)}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right font-medium",
                            !row.evaluated && "text-muted-foreground",
                          )}
                        >
                          {row.evaluated ? row.marks : "Not Evaluated"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
