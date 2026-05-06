import { useEffect, useState } from "react";
import { useIntelligenceStore } from "@/stores/intelligenceStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart3, TrendingUp, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type SortField = "success_rate" | "total" | "agent_id" | "task_type";
type SortDir = "asc" | "desc";

export default function Outcomes() {
  const { outcomeStats, getOutcomeStats } = useIntelligenceStore();
  const [sortField, setSortField] = useState<SortField>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState<"all" | "done" | "failed" | "revised">("all");

  useEffect(() => {
    getOutcomeStats();
  }, []);

  const sorted = [...outcomeStats]
    .filter((s) => {
      if (filter === "all") return true;
      if (filter === "done") return s.done > 0 && s.success_rate > 0.7;
      if (filter === "failed") return s.failed > 0 && s.success_rate < 0.5;
      if (filter === "revised") return s.revised > 0;
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "success_rate") return (a.success_rate - b.success_rate) * dir;
      if (sortField === "total") return (a.total - b.total) * dir;
      return String(a[sortField]).localeCompare(String(b[sortField])) * dir;
    });

  const totals = outcomeStats.reduce(
    (acc, s) => {
      acc.total += s.total;
      acc.done += s.done;
      acc.failed += s.failed;
      acc.revised += s.revised;
      return acc;
    },
    { total: 0, done: 0, failed: 0, revised: 0 }
  );

  const overallRate = totals.total > 0 ? (totals.done / totals.total) * 100 : 0;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="flex h-full flex-col p-6 gap-6">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <div className="gradient-accent-bar" />
          <h1>Outcome Tracker</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => getOutcomeStats()}>
          <RotateCcw className="size-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Total Sessions</span>
          <span className="text-3xl font-bold">{totals.total}</span>
        </Card>
        <Card className="p-4 flex flex-col gap-1 border-green-500/30">
          <span className="text-xs text-muted-foreground">Successful</span>
          <span className="text-3xl font-bold text-green-400">{totals.done}</span>
        </Card>
        <Card className="p-4 flex flex-col gap-1 border-red-500/30">
          <span className="text-xs text-muted-foreground">Failed</span>
          <span className="text-3xl font-bold text-red-400">{totals.failed}</span>
        </Card>
        <Card className="p-4 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Success Rate</span>
          <div className="flex items-center gap-2">
            <span className={cn("text-3xl font-bold", overallRate >= 70 ? "text-green-400" : overallRate >= 40 ? "text-yellow-400" : "text-red-400")}>
              {overallRate.toFixed(1)}%
            </span>
            <TrendingUp className="size-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      <div className="flex gap-2">
        {(["all", "done", "failed", "revised"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f === "done" ? "High Success" : f === "failed" ? "Problematic" : "Revised"}
          </Button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 px-3 text-xs font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort("agent_id")}>
                Agent {sortField === "agent_id" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="py-2 px-3 text-xs font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort("task_type")}>
                Task Type {sortField === "task_type" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-center cursor-pointer" onClick={() => toggleSort("total")}>
                Total {sortField === "total" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-center">Done</th>
              <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-center">Failed</th>
              <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-center">Revised</th>
              <th className="py-2 px-3 text-xs font-medium text-muted-foreground cursor-pointer text-center" onClick={() => toggleSort("success_rate")}>
                Rate {sortField === "success_rate" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  <BarChart3 className="size-8 mx-auto mb-2 opacity-50" />
                  No outcome data yet. Outcomes are recorded when agents complete or fail tasks.
                </td>
              </tr>
            )}
            {sorted.map((s) => (
              <tr key={`${s.agent_id}-${s.task_type}`} className="border-b border-border/50 hover:bg-accent/50">
                <td className="py-3 px-3 font-medium">{s.agent_id}</td>
                <td className="py-3 px-3 text-sm text-muted-foreground">{s.task_type}</td>
                <td className="py-3 px-3 text-center">{s.total}</td>
                <td className="py-3 px-3 text-center">
                  <span className="text-green-400">{s.done}</span>
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="text-red-400">{s.failed}</span>
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="text-yellow-400">{s.revised}</span>
                </td>
                <td className="py-3 px-3 text-center">
                  <SuccessBar rate={s.success_rate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}

function SuccessBar({ rate }: { rate: number }) {
  const pct = (rate * 100).toFixed(1);
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", rate >= 0.7 ? "bg-green-500" : rate >= 0.4 ? "bg-yellow-500" : "bg-red-500")}
          style={{ width: `${Math.max(2, rate * 100)}%` }}
        />
      </div>
      <span className={cn("text-sm tabular-nums", rate >= 0.7 ? "text-green-400" : rate >= 0.4 ? "text-yellow-400" : "text-red-400")}>
        {pct}%
      </span>
    </div>
  );
}
