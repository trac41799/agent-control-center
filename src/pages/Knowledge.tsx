import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Brain,
  Search,
  Plus,
  Trash2,
  BarChart3,
  Tag,
  Layers,
} from "lucide-react";
import type { KnowledgeItem, KnowledgeRelation, KnowledgeQuery } from "@/lib/types";

type TabId = "browse" | "relations" | "stats";

const TYPE_COLORS: Record<string, string> = {
  context: "text-blue-400 bg-blue-500/20 border-blue-500/30",
  pattern: "text-purple-400 bg-purple-500/20 border-purple-500/30",
  handoff: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
  correction: "text-red-400 bg-red-500/20 border-red-500/30",
  insight: "text-green-400 bg-green-500/20 border-green-500/30",
  fact: "text-cyan-400 bg-cyan-500/20 border-cyan-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "text-green-400 bg-green-500/20 border-green-500/30",
  pending: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
  stale: "text-gray-400 bg-gray-500/20 border-gray-500/30",
  revoked: "text-red-400 bg-red-500/20 border-red-500/30",
};

export default function Knowledge() {
  const [tab, setTab] = useState<TabId>("browse");
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [relations, setRelations] = useState<KnowledgeRelation[]>([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<KnowledgeQuery>({});

  useEffect(() => {
    // Placeholder: backend not ready yet
    setItems([]);
    setRelations([]);
  }, []);

  const filteredItems = items.filter((item) => {
    if (query && !item.title.toLowerCase().includes(query.toLowerCase()) && !item.content.toLowerCase().includes(query.toLowerCase())) {
      return false;
    }
    if (filters.type && item.type !== filters.type) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.stack && (!item.stack_tags || !item.stack_tags.includes(filters.stack))) return false;
    if (filters.agent && (!item.agent_tags || !item.agent_tags.includes(filters.agent))) return false;
    return true;
  });

  const typeCounts: Record<string, number> = {};
  let totalConfidence = 0;
  let activeCount = 0;
  for (const item of items) {
    typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    totalConfidence += item.confidence;
    if (item.status === "confirmed" || item.status === "pending") activeCount++;
  }
  const avgConfidence = items.length > 0 ? totalConfidence / items.length : 0;

  return (
    <div className="flex h-full flex-col p-6 gap-6">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <div className="gradient-accent-bar" />
          <h1>Knowledge Compounder</h1>
        </div>
        <Button variant="outline" size="sm" disabled>
          <Plus className="size-4 mr-2" /> Add Entry
        </Button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-lg bg-secondary/50 w-fit">
        {(["browse", "relations", "stats"] as TabId[]).map((t) => (
          <Button
            key={t}
            variant={tab === t ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab(t)}
          >
            {t === "browse" ? "Browse" : t === "relations" ? "Relations" : "Stats"}
          </Button>
        ))}
      </div>

      {tab === "browse" && (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Search + Filters */}
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-muted-foreground mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search knowledge..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-32">
              <label className="block text-xs text-muted-foreground mb-1">Type</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={filters.type || ""}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value || undefined }))}
              >
                <option value="">All</option>
                {Object.keys(TYPE_COLORS).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="w-40">
              <label className="block text-xs text-muted-foreground mb-1">Stack</label>
              <Input
                placeholder="e.g., react"
                value={filters.stack || ""}
                onChange={(e) => setFilters((f) => ({ ...f, stack: e.target.value || undefined }))}
              />
            </div>
            <div className="w-40">
              <label className="block text-xs text-muted-foreground mb-1">Agent</label>
              <Input
                placeholder="e.g., opencode"
                value={filters.agent || ""}
                onChange={(e) => setFilters((f) => ({ ...f, agent: e.target.value || undefined }))}
              />
            </div>
            <div className="w-32">
              <label className="block text-xs text-muted-foreground mb-1">Status</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={filters.status || ""}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
              >
                <option value="">All</option>
                {Object.keys(STATUS_COLORS).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Item List */}
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-2">
              {filteredItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <Brain className="size-10 opacity-30" />
                  <p className="text-sm">No knowledge entries found.</p>
                  <p className="text-xs">Agents will populate this as they surface learnings during sessions.</p>
                </div>
              )}
              {filteredItems.map((item) => (
                <KnowledgeCard key={item.id} item={item} />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {tab === "relations" && (
        <div className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 px-3 text-xs font-medium text-muted-foreground">From</th>
                  <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Relation</th>
                  <th className="py-2 px-3 text-xs font-medium text-muted-foreground">To</th>
                  <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {relations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      <Layers className="size-8 mx-auto mb-2 opacity-50" />
                      No knowledge relations found.
                    </td>
                  </tr>
                )}
                {relations.map((rel, i) => (
                  <tr key={`${rel.from_id}-${rel.to_id}-${i}`} className="border-b border-border/50 hover:bg-accent/50">
                    <td className="py-3 px-3 font-mono text-xs">{rel.from_id}</td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className="text-xs">
                        {rel.relation_type}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs">{rel.to_id}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{rel.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      )}

      {tab === "stats" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Total Items</span>
              <span className="text-3xl font-bold">{items.length}</span>
            </Card>
            <Card className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Avg Confidence</span>
              <span className={cn("text-3xl font-bold", avgConfidence >= 0.7 ? "text-green-400" : avgConfidence >= 0.4 ? "text-yellow-400" : "text-red-400")}>
                {(avgConfidence * 100).toFixed(1)}%
              </span>
            </Card>
            <Card className="p-4 flex flex-col gap-1 border-green-500/30">
              <span className="text-xs text-muted-foreground">Active Items</span>
              <span className="text-3xl font-bold text-green-400">{activeCount}</span>
            </Card>
            <Card className="p-4 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Types</span>
              <span className="text-3xl font-bold">{Object.keys(typeCounts).length}</span>
            </Card>
          </div>

          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4" />
              <h2 className="text-lg font-semibold">By Type</h2>
            </div>
            {Object.keys(typeCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(typeCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <Badge variant="outline" className={cn("text-xs", TYPE_COLORS[type] || "")}>
                        {type}
                      </Badge>
                      <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.max(2, (count / items.length) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm tabular-nums w-8 text-right">{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function KnowledgeCard({ item }: { item: KnowledgeItem }) {
  const typeColor = TYPE_COLORS[item.type] || "text-gray-400 bg-gray-500/20 border-gray-500/30";
  const statusColor = STATUS_COLORS[item.status] || "";

  const tags = item.tags ? item.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return (
    <Card className="p-4 space-y-3 hover:bg-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">{item.title}</span>
            <Badge variant="outline" className={cn("text-xs", typeColor)}>
              {item.type}
            </Badge>
            {item.is_global && (
              <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                Global
              </Badge>
            )}
            {item.status && (
              <Badge variant="outline" className={cn("text-xs", statusColor)}>
                {item.status}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag className="size-3 text-muted-foreground" />
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span>Confidence</span>
          <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                item.confidence >= 0.7 ? "bg-green-500" : item.confidence >= 0.4 ? "bg-yellow-500" : "bg-red-500"
              )}
              style={{ width: `${Math.max(2, item.confidence * 100)}%` }}
            />
          </div>
          <span>{(item.confidence * 100).toFixed(0)}%</span>
        </div>
        <span>Confirmed {item.confirmation_count}x</span>
        <span>Last: {item.last_confirmed}</span>
      </div>
    </Card>
  );
}
