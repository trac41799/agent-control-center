import { useState } from "react";
import { useOrchestrationStore, type TaskSuggestion } from "@/stores/orchestrationStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Send, TrendingUp, BarChart3, CheckCircle2 } from "lucide-react";

export default function RoutePage() {
  const { suggestions, routeTask } = useOrchestrationStore();
  const [taskDesc, setTaskDesc] = useState("");
  const [taskType, setTaskType] = useState("implement");
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRoute = async () => {
    if (!taskDesc.trim()) return;
    setLoading(true);
    await routeTask(taskDesc, taskType, projectId || undefined);
    setLoading(false);
  };

  return (
    <div className="flex h-full flex-col p-6 gap-6">
      <div className="flex items-center justify-between">
          <div className="page-header">
            <div className="gradient-accent-bar" />
            <h1>Task Router</h1>
          </div>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1.5">Task Description</label>
            <Input
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              placeholder="Describe the task (e.g., 'Implement user authentication with JWT')"
              className="bg-[#0d1117] border-[#30363d] text-gray-300 placeholder:text-gray-600"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="w-48">
            <label className="block text-xs text-gray-400 mb-1.5">Task Type</label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-[#0d1117] border border-[#30363d] rounded text-gray-300 focus:outline-none focus:border-[#1f6feb]"
            >
              <option value="implement">Implement</option>
              <option value="refactor">Refactor</option>
              <option value="review">Review</option>
              <option value="test">Test</option>
              <option value="debug">Debug</option>
              <option value="document">Document</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1.5">Project ID (optional)</label>
            <Input
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Leave empty for cross-project routing"
              className="bg-[#0d1117] border-[#30363d] text-gray-300 placeholder:text-gray-600"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleRoute} disabled={loading || !taskDesc.trim()} className="gap-2">
              {loading ? (
                <span className="animate-spin size-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Send className="size-4" />
              )}
              Route Task
            </Button>
          </div>
        </div>
      </Card>

      {suggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="size-4 text-[#58a6ff]" />
            <span className="text-sm font-medium text-gray-300">
              Agent Suggestions ({suggestions.length})
            </span>
          </div>
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-1 gap-3">
              {suggestions.map((s, i) => (
                <SuggestionCard key={`${s.agent_id}-${i}`} suggestion={s} rank={i + 1} />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {suggestions.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-500 gap-3">
          <BarChart3 className="size-12 opacity-30" />
          <p className="text-sm">Enter a task description and click Route Task to get agent suggestions.</p>
          <p className="text-xs text-gray-600">The router analyzes outcome history to recommend the best agents.</p>
        </div>
      )}
    </div>
  );
}

function SuggestionCard({ suggestion, rank }: { suggestion: TaskSuggestion; rank: number }) {
  const pct = (suggestion.success_rate * 100).toFixed(0);
  const color = suggestion.success_rate >= 0.7 ? "green" : suggestion.success_rate >= 0.4 ? "yellow" : "red";

  return (
    <Card className="p-4 border-[#30363d] hover:border-[#1f6feb]/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                rank === 1 ? "border-[#d29922] text-[#d29922]" : "border-[#30363d] text-gray-400"
              )}
            >
              #{rank}
            </Badge>
            <span className="font-medium text-gray-200">{suggestion.agent_id}</span>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                color === "green"
                  ? "border-green-500/30 text-green-400"
                  : color === "yellow"
                    ? "border-yellow-500/30 text-yellow-400"
                    : "border-red-500/30 text-red-400"
              )}
            >
              {pct}% success
            </Badge>
          </div>
          <p className="text-sm text-gray-400 mb-3">{suggestion.reasoning}</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-green-500" />
              <span className="text-xs text-gray-400">
                Confidence: {(suggestion.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <div className="w-20 h-3 bg-[#21262d] rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                color === "green" ? "bg-green-500" : color === "yellow" ? "bg-yellow-500" : "bg-red-500"
              )}
              style={{ width: `${Math.max(4, suggestion.success_rate * 100)}%` }}
            />
          </div>
          <Button size="sm" className="gap-1.5 text-xs">
            <Send className="size-3" />
            Send to Agent
          </Button>
        </div>
      </div>
    </Card>
  );
}
