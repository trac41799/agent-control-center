import { useState, useEffect, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Brain,
  Search,
  Plus,
  Trash2,
  BarChart3,
  Tag,
  Layers,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  X,
  Link2,
  TrendingUp,
  Hash,
} from "lucide-react";
import {
  useKnowledgeStore,
  type PreflightWarning,
} from "@/stores/knowledgeStore";
import { useProjectStore } from "@/stores/projectStore";
import type { KnowledgeItem, KnowledgeRelation } from "@/lib/types";

type TabId = "browse" | "relations" | "stats" | "preflight";

const TYPE_COLORS: Record<string, string> = {
  context: "text-blue-400 bg-blue-500/20 border-blue-500/30",
  pattern: "text-purple-400 bg-purple-500/20 border-purple-500/30",
  handoff: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
  correction: "text-red-400 bg-red-500/20 border-red-500/30",
  insight: "text-green-400 bg-green-500/20 border-green-500/30",
  fact: "text-cyan-400 bg-cyan-500/20 border-cyan-500/30",
  antipattern: "text-red-300 bg-red-500/15 border-red-500/30",
  convention: "text-indigo-300 bg-indigo-500/15 border-indigo-500/30",
  tooling: "text-orange-300 bg-orange-500/15 border-orange-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "text-green-400 bg-green-500/20 border-green-500/30",
  pending: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
  stale: "text-gray-400 bg-gray-500/20 border-gray-500/30",
  revoked: "text-red-400 bg-red-500/20 border-red-500/30",
  active: "text-green-400 bg-green-500/20 border-green-500/30",
};

const KNOWN_TYPES = [
  "context",
  "pattern",
  "antipattern",
  "convention",
  "tooling",
  "insight",
  "fact",
  "handoff",
  "correction",
];

const NOTIFICATION_TIMEOUT_MS = 4000;

export default function Knowledge() {
  const store = useKnowledgeStore();
  const projectStore = useProjectStore();
  const activeProject = projectStore.currentProject;
  const projectStack = activeProject?.stack?.join(",") || "";

  const {
    items,
    loading,
    error,
    filters,
    relations,
    stats,
    preflight,
    preflightStack,
    compounderRunning,
    lastCompounderAt,
    lastCompounderResult,
    loadItems,
    loadStats,
    loadPreflight,
    addKnowledgeItem,
    deleteItem,
    addRelation,
    loadRelations,
    searchKnowledge,
    runCompounder,
    setFilters,
    clearError,
    subscribeKnowledgeEvents,
  } = store;

  const [tab, setTab] = useState<TabId>("browse");
  const [confidenceMin, setConfidenceMin] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRelationDialog, setShowRelationDialog] = useState<KnowledgeItem | null>(null);
  const [showCompounderDialog, setShowCompounderDialog] = useState(false);
  const [preflightStackInput, setPreflightStackInput] = useState(projectStack);
  const [notification, setNotification] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadItems();
    loadStats();
    const unlistenPromise = subscribeKnowledgeEvents();
    return () => {
      unlistenPromise.then((u) => u()).catch(() => undefined);
    };
  }, [loadItems, loadStats, subscribeKnowledgeEvents]);

  useEffect(() => {
    if (projectStack && !preflightStackInput) {
      setPreflightStackInput(projectStack);
    }
  }, [projectStack, preflightStackInput]);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(
      () => setNotification(null),
      NOTIFICATION_TIMEOUT_MS
    );
    return () => clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchInput.trim().length > 0) {
        searchKnowledge(searchInput.trim());
      } else if (filters.q) {
        setFilters({ q: undefined });
        loadItems();
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, searchKnowledge, loadItems, setFilters, filters.q]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (
        searchInput &&
        !item.title.toLowerCase().includes(searchInput.toLowerCase()) &&
        !item.content.toLowerCase().includes(searchInput.toLowerCase())
      ) {
        return false;
      }
      if (filters.type && item.type !== filters.type) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (
        filters.stack &&
        (!item.stack_tags || !item.stack_tags.includes(filters.stack))
      )
        return false;
      if (
        filters.agent &&
        (!item.agent_tags || !item.agent_tags.includes(filters.agent))
      )
        return false;
      if (item.confidence < confidenceMin) return false;
      return true;
    });
  }, [items, searchInput, filters, confidenceMin]);

  const typeCounts: Record<string, number> = {};
  let totalConfidence = 0;
  let activeCount = 0;
  let topConfirmed: KnowledgeItem | null = null;
  for (const item of items) {
    typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    totalConfidence += item.confidence;
    if (item.status === "active" || item.status === "confirmed") activeCount++;
    if (!topConfirmed || item.confirmation_count > topConfirmed.confirmation_count) {
      topConfirmed = item;
    }
  }
  const avgConfidence = items.length > 0 ? totalConfidence / items.length : 0;

  const handleAdd = async (text: string, category: string, stackTags: string) => {
    try {
      await addKnowledgeItem(text, category, stackTags);
      setShowAddDialog(false);
      setNotification({ kind: "ok", text: "Knowledge item added" });
      await loadStats();
    } catch (e) {
      setNotification({ kind: "err", text: `Add failed: ${e}` });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem(id);
      setNotification({ kind: "ok", text: "Item removed" });
      await loadStats();
    } catch (e) {
      setNotification({ kind: "err", text: `Delete failed: ${e}` });
    }
  };

  const handleCompounderRun = async (sessionId: string) => {
    try {
      const result = await runCompounder(
        sessionId,
        activeProject?.id
      );
      if (result && result.length > 0) {
        setNotification({
          kind: "ok",
          text: `Compounder produced ${result.length} item(s)`,
        });
        setShowCompounderDialog(false);
        await loadStats();
      } else {
        setNotification({
          kind: "ok",
          text: "Compounder found no actionable patterns",
        });
        setShowCompounderDialog(false);
      }
    } catch (e) {
      setNotification({ kind: "err", text: `Compounder error: ${e}` });
    }
  };

  const handleLoadPreflight = async () => {
    if (!preflightStackInput.trim()) {
      setNotification({ kind: "err", text: "Stack is required" });
      return;
    }
    try {
      await loadPreflight(preflightStackInput.trim());
      setTab("preflight");
    } catch (e) {
      setNotification({ kind: "err", text: `Preflight load failed: ${e}` });
    }
  };

  const handleOpenRelations = async (item: KnowledgeItem) => {
    setShowRelationDialog(item);
    await loadRelations(item.id);
  };

  const handleCreateRelation = async (toId: string, type: string) => {
    if (!showRelationDialog) return;
    try {
      await addRelation(showRelationDialog.id, toId, type);
      setNotification({ kind: "ok", text: "Relation added" });
    } catch (e) {
      setNotification({ kind: "err", text: `Relation failed: ${e}` });
    }
  };

  return (
    <div className="flex h-full flex-col p-6 gap-4">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <div className="gradient-accent-bar" />
          <h1>Knowledge Compounder</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadItems();
              loadStats();
            }}
            disabled={loading}
          >
            <RefreshCw className={cn("size-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCompounderDialog(true)}
            disabled={compounderRunning}
          >
            <Sparkles
              className={cn(
                "size-4 mr-2",
                compounderRunning && "animate-pulse text-amber-400"
              )}
            />
            {compounderRunning ? "Compounding..." : "Run Compounder"}
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="size-4 mr-2" /> Add Item
          </Button>
        </div>
      </div>

      {notification && (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-xs flex items-center gap-2",
            notification.kind === "ok"
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          )}
        >
          {notification.kind === "ok" ? (
            <TrendingUp className="size-3.5" />
          ) : (
            <AlertTriangle className="size-3.5" />
          )}
          <span className="flex-1">{notification.text}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-5 w-5 p-0"
            onClick={() => setNotification(null)}
          >
            <X className="size-3" />
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2 text-xs flex items-center gap-2">
          <AlertTriangle className="size-3.5" />
          <span className="flex-1">{error}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-5 px-2 text-[10px]"
            onClick={clearError}
          >
            Dismiss
          </Button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3 flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Total Items
          </span>
          <span className="text-2xl font-bold tabular-nums">{items.length}</span>
        </Card>
        <Card className="p-3 flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Avg Confidence
          </span>
          <span
            className={cn(
              "text-2xl font-bold tabular-nums",
              avgConfidence >= 0.7
                ? "text-green-400"
                : avgConfidence >= 0.4
                  ? "text-yellow-400"
                  : "text-red-400"
            )}
          >
            {(avgConfidence * 100).toFixed(1)}%
          </span>
        </Card>
        <Card className="p-3 flex flex-col gap-1 border-green-500/30">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Active Items
          </span>
          <span className="text-2xl font-bold text-green-400 tabular-nums">
            {activeCount}
          </span>
        </Card>
        <Card className="p-3 flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Top Confirmed
          </span>
          {topConfirmed ? (
            <div className="space-y-0.5">
              <span
                className="text-xs font-medium truncate block"
                title={topConfirmed.title}
              >
                {topConfirmed.title}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ×{topConfirmed.confirmation_count}
              </span>
            </div>
          ) : (
            <span className="text-2xl font-bold text-muted-foreground">—</span>
          )}
        </Card>
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-secondary/50 w-fit">
        {(["browse", "relations", "stats", "preflight"] as TabId[]).map((t) => (
          <Button
            key={t}
            variant={tab === t ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab(t)}
          >
            {t === "browse"
              ? "Browse"
              : t === "relations"
                ? "Relations"
                : t === "stats"
                  ? "Stats"
                  : "Preflight"}
            {t === "preflight" && preflight.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-4 text-[10px]">
                {preflight.length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {tab === "browse" && (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-muted-foreground mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search knowledge..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-36">
              <label className="block text-xs text-muted-foreground mb-1">
                Category
              </label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={filters.type || ""}
                onChange={(e) =>
                  setFilters({ type: e.target.value || undefined })
                }
              >
                <option value="">All</option>
                {KNOWN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-40">
              <label className="block text-xs text-muted-foreground mb-1">
                Stack
              </label>
              <Input
                placeholder="e.g., react"
                value={filters.stack || ""}
                onChange={(e) =>
                  setFilters({ stack: e.target.value || undefined })
                }
              />
            </div>
            <div className="w-40">
              <label className="block text-xs text-muted-foreground mb-1">
                Agent
              </label>
              <Input
                placeholder="e.g., opencode"
                value={filters.agent || ""}
                onChange={(e) =>
                  setFilters({ agent: e.target.value || undefined })
                }
              />
            </div>
            <div className="w-36">
              <label className="block text-xs text-muted-foreground mb-1">
                Status
              </label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={filters.status || ""}
                onChange={(e) =>
                  setFilters({ status: e.target.value || undefined })
                }
              >
                <option value="">All</option>
                {Object.keys(STATUS_COLORS).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
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
                onChange={(e) =>
                  setConfidenceMin(parseInt(e.target.value) / 100)
                }
                className="w-full h-9 accent-indigo-500"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-2">
              {filteredItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <Brain className="size-10 opacity-30" />
                  <p className="text-sm">No knowledge entries match.</p>
                  <p className="text-xs">
                    {items.length === 0
                      ? "Agents will populate this as they surface learnings during sessions."
                      : "Try clearing filters or running the compounder."}
                  </p>
                </div>
              )}
              {filteredItems.map((item) => (
                <KnowledgeCard
                  key={item.id}
                  item={item}
                  onDelete={() => handleDelete(item.id)}
                  onOpenRelations={() => handleOpenRelations(item)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {tab === "relations" && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="text-xs text-muted-foreground mb-2">
            Showing relations for items loaded in this session. Click any item
            card to expand its relations.
          </div>
          <ScrollArea className="flex-1">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 px-3 text-xs font-medium text-muted-foreground">
                    From
                  </th>
                  <th className="py-2 px-3 text-xs font-medium text-muted-foreground">
                    Relation
                  </th>
                  <th className="py-2 px-3 text-xs font-medium text-muted-foreground">
                    To
                  </th>
                  <th className="py-2 px-3 text-xs font-medium text-muted-foreground">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(relations).length === 0 ||
                Object.values(relations).every((r) => r.length === 0) ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      <Layers className="size-8 mx-auto mb-2 opacity-50" />
                      No relations loaded. Click a knowledge card to load its
                      relations.
                    </td>
                  </tr>
                ) : (
                  Object.entries(relations).flatMap(([fromId, rels]) =>
                    rels.map((rel, i) => (
                      <tr
                        key={`${fromId}-${rel.to_id}-${i}`}
                        className="border-b border-border/50 hover:bg-accent/50"
                      >
                        <td className="py-3 px-3 font-mono text-xs">
                          {rel.from_id.slice(0, 8)}…
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className="text-xs">
                            {rel.relation_type}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 font-mono text-xs">
                          {rel.to_id.slice(0, 8)}…
                        </td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">
                          {rel.created_at}
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      )}

      {tab === "stats" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-3">
            <Card className="p-3 flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Stats From Backend
              </span>
              <span className="text-2xl font-bold tabular-nums">
                {stats?.total ?? items.length}
              </span>
            </Card>
            <Card className="p-3 flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Avg (backend)
              </span>
              <span
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  (stats?.avg_confidence ?? 0) >= 0.7
                    ? "text-green-400"
                    : (stats?.avg_confidence ?? 0) >= 0.4
                      ? "text-yellow-400"
                      : "text-red-400"
                )}
              >
                {((stats?.avg_confidence ?? avgConfidence) * 100).toFixed(1)}%
              </span>
            </Card>
            <Card className="p-3 flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Distinct Types
              </span>
              <span className="text-2xl font-bold tabular-nums">
                {Object.keys(typeCounts).length}
              </span>
            </Card>
            <Card className="p-3 flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Last Compounder
              </span>
              <span className="text-xs text-muted-foreground">
                {lastCompounderAt
                  ? new Date(lastCompounderAt).toLocaleString()
                  : "—"}
              </span>
              {lastCompounderResult && (
                <span className="text-[10px] text-muted-foreground">
                  {lastCompounderResult.length} item(s)
                </span>
              )}
            </Card>
          </div>

          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4" />
              <h2 className="text-sm font-semibold">By Type</h2>
            </div>
            {Object.keys(typeCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(typeCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", TYPE_COLORS[type] || "")}
                      >
                        {type}
                      </Badge>
                      <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{
                            width: `${Math.max(2, (count / Math.max(items.length, 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs tabular-nums w-8 text-right">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </Card>

          {stats && stats.by_stack.length > 0 && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Hash className="size-4" />
                <h2 className="text-sm font-semibold">By Stack Tag</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.by_stack.map((s) => (
                  <Badge
                    key={s.stack}
                    variant="secondary"
                    className="text-xs gap-1"
                  >
                    {s.stack}
                    <span className="text-muted-foreground">×{s.count}</span>
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "preflight" && (
        <div className="flex flex-col gap-4">
          <Card className="p-3 flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-400" />
            <span className="text-xs text-muted-foreground">Stack:</span>
            <Input
              placeholder="e.g., react, rust, tauri"
              value={preflightStackInput}
              onChange={(e) => setPreflightStackInput(e.target.value)}
              className="h-8 max-w-[200px]"
            />
            <Button size="sm" onClick={handleLoadPreflight}>
              Load
            </Button>
            {preflightStack && (
              <span className="text-xs text-muted-foreground">
                Showing {preflight.length} antipattern(s) for "{preflightStack}"
              </span>
            )}
          </Card>
          {preflight.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
              <AlertTriangle className="size-8 opacity-30" />
              <p className="text-sm">No preflight warnings for this stack.</p>
              <p className="text-xs">
                Anti-patterns discovered by the compounder will appear here.
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-2">
                {preflight.map((w) => (
                  <PreflightCard key={w.id} warning={w} />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}

      {showAddDialog && (
        <AddItemDialog
          onClose={() => setShowAddDialog(false)}
          onSubmit={handleAdd}
        />
      )}

      {showCompounderDialog && (
        <CompounderDialog
          onClose={() => setShowCompounderDialog(false)}
          onRun={handleCompounderRun}
          running={compounderRunning}
        />
      )}

      {showRelationDialog && (
        <RelationDialog
          item={showRelationDialog}
          allItems={items}
          existingRelations={relations[showRelationDialog.id] || []}
          onClose={() => setShowRelationDialog(null)}
          onAdd={handleCreateRelation}
        />
      )}
    </div>
  );
}

function KnowledgeCard({
  item,
  onDelete,
  onOpenRelations,
}: {
  item: KnowledgeItem;
  onDelete: () => void;
  onOpenRelations: () => void;
}) {
  const typeColor = TYPE_COLORS[item.type] || "text-gray-400 bg-gray-500/20 border-gray-500/30";
  const statusColor = STATUS_COLORS[item.status] || "";

  const tags = item.tags ? item.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const stackTags = item.stack_tags
    ? item.stack_tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  const sessionIds = item.session_ids
    ? item.session_ids.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <Card className="p-4 space-y-3 hover:bg-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-sm truncate">{item.title}</span>
            <Badge variant="outline" className={cn("text-xs", typeColor)}>
              {item.type}
            </Badge>
            {item.is_global && (
              <Badge
                variant="outline"
                className="text-xs border-blue-500/30 text-blue-400"
              >
                Global
              </Badge>
            )}
            {item.status && (
              <Badge variant="outline" className={cn("text-xs", statusColor)}>
                {item.status}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
            {item.content}
          </p>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onOpenRelations}
            title="Manage relations"
          >
            <Link2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {(tags.length > 0 || stackTags.length > 0) && (
        <div className="flex items-center gap-3 flex-wrap">
          {stackTags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Tag className="size-3 text-muted-foreground" />
              {stackTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs border-indigo-500/20 text-indigo-300"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1.5">
          <span>Confidence</span>
          <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                item.confidence >= 0.7
                  ? "bg-green-500"
                  : item.confidence >= 0.4
                    ? "bg-yellow-500"
                    : "bg-red-500"
              )}
              style={{ width: `${Math.max(2, item.confidence * 100)}%` }}
            />
          </div>
          <span>{(item.confidence * 100).toFixed(0)}%</span>
        </div>
        <span>Confirmed ×{item.confirmation_count}</span>
        {sessionIds.length > 0 && (
          <span className="truncate max-w-[200px]" title={sessionIds.join(", ")}>
            Sessions: {sessionIds.length}
          </span>
        )}
        <span className="ml-auto">Last: {item.last_confirmed}</span>
      </div>
    </Card>
  );
}

function PreflightCard({ warning }: { warning: PreflightWarning }) {
  return (
    <Card className="p-3 flex items-start gap-3 border-amber-500/20 bg-amber-500/5">
      <AlertTriangle className="size-4 text-amber-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{warning.title}</span>
          <Badge
            variant="outline"
            className="text-xs border-red-500/30 text-red-300"
          >
            antipattern
          </Badge>
          <span className="text-xs text-muted-foreground">
            ×{warning.confirmation_count}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{warning.content}</p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Confidence: {(warning.confidence * 100).toFixed(0)}%</span>
          {warning.stack_tags && (
            <Badge variant="secondary" className="text-[10px] h-4">
              {warning.stack_tags}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

function AddItemDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (text: string, category: string, stackTags: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("pattern");
  const [stackTags, setStackTags] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(text.trim(), category, stackTags.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <Card className="w-[560px] max-w-[90vw] p-5 space-y-3 bg-[#0d1117] border-[#30363d]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-indigo-400" />
            <span className="text-sm font-medium text-gray-200">Add Knowledge Item</span>
          </div>
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={onClose}>
            Close
          </Button>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Content</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Describe the knowledge item..."
            className="w-full px-2 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-[#1f6feb] resize-none font-mono"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {KNOWN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Stack tags (comma-separated)
            </label>
            <Input
              value={stackTags}
              onChange={(e) => setStackTags(e.target.value)}
              placeholder="react, typescript"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={submitting || !text.trim()}>
            {submitting ? "Adding..." : "Add Item"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function CompounderDialog({
  onClose,
  onRun,
  running,
}: {
  onClose: () => void;
  onRun: (sessionId: string) => Promise<void>;
  running: boolean;
}) {
  const [sessionId, setSessionId] = useState("");
  const projectStore = useProjectStore();
  const activeProject = projectStore.currentProject;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <Card className="w-[480px] max-w-[90vw] p-5 space-y-3 bg-[#0d1117] border-[#30363d]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-amber-400" />
            <span className="text-sm font-medium text-gray-200">
              Run Knowledge Compounder
            </span>
          </div>
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          <p>
            Pass 1: scan session events for file edits, command patterns, error
            signatures.
          </p>
          <p>
            Pass 2: invoke Intelligence Layer to extract 2-5 reusable knowledge
            items.
          </p>
          <p>
            Deduplicate via Jaccard (≥0.7); record contradictions as relations.
          </p>
        </div>
        {activeProject && (
          <div className="text-xs text-muted-foreground">
            Active project:{" "}
            <code className="text-gray-300">{activeProject.name || activeProject.id}</code>
          </div>
        )}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Session ID</label>
          <Input
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="e.g., 5a4b..."
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose} disabled={running}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onRun(sessionId.trim())}
            disabled={running || !sessionId.trim()}
          >
            {running ? "Compounding..." : "Run"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function RelationDialog({
  item,
  allItems,
  existingRelations,
  onClose,
  onAdd,
}: {
  item: KnowledgeItem;
  allItems: KnowledgeItem[];
  existingRelations: KnowledgeRelation[];
  onClose: () => void;
  onAdd: (toId: string, type: string) => Promise<void>;
}) {
  const [targetId, setTargetId] = useState("");
  const [relationType, setRelationType] = useState("relates_to");
  const [submitting, setSubmitting] = useState(false);

  const others = allItems.filter(
    (i) => i.id !== item.id && !existingRelations.some((r) => r.to_id === i.id)
  );

  const submit = async () => {
    if (!targetId) return;
    setSubmitting(true);
    try {
      await onAdd(targetId, relationType);
      setTargetId("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <Card className="w-[560px] max-w-[90vw] p-5 space-y-3 bg-[#0d1117] border-[#30363d]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-indigo-400" />
            <span className="text-sm font-medium text-gray-200">
              Relations: {item.title}
            </span>
          </div>
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={onClose}>
            Close
          </Button>
        </div>
        <Separator />
        <div className="space-y-1 max-h-[160px] overflow-y-auto">
          {existingRelations.length === 0 ? (
            <p className="text-xs text-muted-foreground">No relations yet.</p>
          ) : (
            existingRelations.map((r) => {
              const target = allItems.find((i) => i.id === r.to_id);
              return (
                <div
                  key={r.to_id}
                  className="flex items-center gap-2 text-xs py-1"
                >
                  <Badge variant="outline" className="text-xs">
                    {r.relation_type}
                  </Badge>
                  <span className="truncate text-gray-300">
                    {target?.title || r.to_id}
                  </span>
                </div>
              );
            })
          )}
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Target</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select item...</option>
              {others.slice(0, 50).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select
              value={relationType}
              onChange={(e) => setRelationType(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="relates_to">relates_to</option>
              <option value="depends_on">depends_on</option>
              <option value="contradicts">contradicts</option>
              <option value="supersedes">supersedes</option>
              <option value="extends">extends</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose} disabled={submitting}>
            Close
          </Button>
          <Button size="sm" onClick={submit} disabled={submitting || !targetId}>
            {submitting ? "Adding..." : "Add Relation"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
