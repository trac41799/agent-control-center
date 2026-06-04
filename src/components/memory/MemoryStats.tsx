import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Brain, Layers } from "lucide-react";
import type { MemoryStats as MemoryStatsType } from "@/lib/types";

interface MemoryStatsProps {
  stats: MemoryStatsType | null;
  loading?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  decision: "text-blue-400 bg-blue-500/20 border-blue-500/30",
  constraint: "text-red-400 bg-red-500/20 border-red-500/30",
  preference: "text-purple-400 bg-purple-500/20 border-purple-500/30",
  pattern: "text-green-400 bg-green-500/20 border-green-500/30",
  error: "text-orange-400 bg-orange-500/20 border-orange-500/30",
  entity: "text-cyan-400 bg-cyan-500/20 border-cyan-500/30",
};

export default function MemoryStats({ stats, loading }: MemoryStatsProps) {
  const maxCount = useMemo(() => {
    if (!stats || stats.by_type.length === 0) return 1;
    return Math.max(...stats.by_type.map((b) => b.count), 1);
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Brain className="size-6 animate-pulse" />
        <span className="text-sm">Loading stats...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Layers className="size-8 opacity-30" />
        <p className="text-sm">No memory stats available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3 flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Facts</span>
          <span className="text-2xl font-bold tabular-nums">{stats.total_facts}</span>
        </Card>
        <Card className="p-3 flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Confidence</span>
          <span
            className={cn(
              "text-2xl font-bold tabular-nums",
              stats.avg_confidence >= 0.7 ? "text-green-400" : stats.avg_confidence >= 0.4 ? "text-yellow-400" : "text-red-400"
            )}
          >
            {(stats.avg_confidence * 100).toFixed(1)}%
          </span>
        </Card>
        <Card className="p-3 flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Checkpoints</span>
          <span className="text-2xl font-bold tabular-nums">{stats.total_checkpoints}</span>
        </Card>
        <Card className="p-3 flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Tokens Saved</span>
          <span className="text-2xl font-bold tabular-nums text-emerald-400">
            {stats.total_tokens_saved.toLocaleString()}
          </span>
        </Card>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="size-4" />
          <h2 className="text-sm font-semibold">Facts Per Type</h2>
        </div>
        {stats.by_type.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data available.</p>
        ) : (
          <div className="space-y-2">
            {stats.by_type.map((b) => (
              <div key={b.type} className="flex items-center gap-3">
                <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[b.type] || "")}>
                  {b.type}
                </Badge>
                <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.max(2, (b.count / maxCount) * 100)}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums w-8 text-right">{b.count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
