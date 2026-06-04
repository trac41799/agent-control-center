import { useState, useEffect, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Brain, Search, AlertTriangle, Trash2 } from "lucide-react";
import { useMemoryStore } from "@/stores/memoryStore";
import type { MemoryFact } from "@/lib/types";

const FACT_TYPE_COLORS: Record<string, string> = {
  decision: "text-blue-400 bg-blue-500/20 border-blue-500/30",
  constraint: "text-red-400 bg-red-500/20 border-red-500/30",
  preference: "text-purple-400 bg-purple-500/20 border-purple-500/30",
  pattern: "text-green-400 bg-green-500/20 border-green-500/30",
  error: "text-orange-400 bg-orange-500/20 border-orange-500/30",
  entity: "text-cyan-400 bg-cyan-500/20 border-cyan-500/30",
};

const FACT_TYPES = ["decision", "constraint", "preference", "pattern", "error", "entity"];

export default function MemoryPanel() {
  const store = useMemoryStore();
  const { items, loading, error, searchResults, loadFacts, searchFacts, deleteFact, setFilters, clearError } = store;

  const [searchInput, setSearchInput] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [confidenceMin, setConfidenceMin] = useState(0);
  const [activeView, setActiveView] = useState<"timeline" | "search">("timeline");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadFacts();
  }, [loadFacts]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchInput.trim().length > 0) {
        setActiveView("search");
        searchFacts(searchInput.trim());
      } else {
        setActiveView("timeline");
        setFilters({ q: undefined });
        loadFacts();
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, searchFacts, setFilters, loadFacts]);

  const displayFacts = useMemo(() => {
    const source = activeView === "search" && searchResults.length > 0
      ? searchResults.map((r) => r.fact)
      : items;
    return source.filter((f) => {
      if (typeFilter && f.fact_type !== typeFilter) return false;
      if (f.confidence < confidenceMin) return false;
      return true;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [items, searchResults, activeView, typeFilter, confidenceMin]);

  const handleDelete = async (id: string) => {
    try {
      await deleteFact(id);
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-muted-foreground mb-1">Search Memory Facts</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search facts..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="w-36">
          <label className="block text-xs text-muted-foreground mb-1">Type</label>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {FACT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="w-40">
          <label className="block text-xs text-muted-foreground mb-1">
            Min Confidence: {Math.round(confidenceMin * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(confidenceMin * 100)}
            onChange={(e) => setConfidenceMin(parseInt(e.target.value) / 100)}
            className="w-full h-9 accent-indigo-500"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2 text-xs flex items-center gap-2">
          <AlertTriangle className="size-3.5" />
          <span className="flex-1">{error}</span>
          <Button size="sm" variant="ghost" className="h-5 px-2 text-[10px]" onClick={clearError}>Dismiss</Button>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Brain className="size-5 animate-pulse" />
                <span className="text-sm">Loading memory facts...</span>
              </div>
            </div>
          )}

          {!loading && displayFacts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Brain className="size-10 opacity-30" />
              <p className="text-sm">No memory facts found.</p>
              <p className="text-xs">Facts will appear here as agents extract them during sessions.</p>
            </div>
          )}

          {displayFacts.map((fact) => (
            <MemoryFactCard key={fact.id} fact={fact} onDelete={() => handleDelete(fact.id)} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function MemoryFactCard({ fact, onDelete }: { fact: MemoryFact; onDelete: () => void }) {
  const typeColor = FACT_TYPE_COLORS[fact.fact_type] || "text-gray-400 bg-gray-500/20 border-gray-500/30";
  let metadataObj: Record<string, unknown> | null = null;
  if (fact.metadata) {
    try { metadataObj = JSON.parse(fact.metadata); } catch { metadataObj = null; }
  }

  return (
    <Card className="p-4 space-y-3 hover:bg-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className={cn("text-xs", typeColor)}>
              {fact.fact_type}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {new Date(fact.created_at).toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Access ×{fact.access_count}
            </span>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{fact.content}</p>
          {metadataObj && (
            <div className="mt-2 p-2 rounded bg-secondary/30 border border-border/50">
              <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap">
                {JSON.stringify(metadataObj, null, 1)}
              </pre>
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={onDelete} title="Delete">
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1.5">
          <span>Confidence</span>
          <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                fact.confidence >= 0.7 ? "bg-green-500" : fact.confidence >= 0.4 ? "bg-yellow-500" : "bg-red-500"
              )}
              style={{ width: `${Math.max(2, fact.confidence * 100)}%` }}
            />
          </div>
          <span>{(fact.confidence * 100).toFixed(0)}%</span>
        </div>
        <span className="text-[10px] text-muted-foreground">ID: {fact.id.slice(0, 8)}…</span>
      </div>
    </Card>
  );
}
