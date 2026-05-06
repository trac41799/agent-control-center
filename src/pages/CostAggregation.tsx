import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  DollarSign, Zap, BarChart3,
  Layers, Clock, Cpu, AlertTriangle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  CostSummary, ModelCostSummary, ProjectCostSummary, SessionCostSummary
} from "@/lib/types";

type Tab = "overview" | "models" | "projects" | "sessions";

export default function CostAggregation() {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    (async () => {
      try {
        const data = await invoke<CostSummary>("get_cost_summary", { projectId: null });
        setSummary(data);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="page-header">
          <div className="gradient-accent-bar" />
          <h1>Cost Aggregation</h1>
        </div>
        <p className="text-sm text-muted-foreground">Loading cost data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="page-header">
          <div className="gradient-accent-bar" />
          <h1>Cost Aggregation</h1>
        </div>
        <Card className="p-8 text-center">
          <AlertTriangle className="size-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Connect to a Supabase project or run agents to populate cost data.
          </p>
        </Card>
      </div>
    );
  }

  if (!summary) return null;

  const fmtCost = (usd: number) => `$${usd.toFixed(4)}`;
  const fmtTokens = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

  const tabs: { id: Tab; label: string; icon: typeof DollarSign }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "models", label: "Models", icon: Cpu },
    { id: "projects", label: "Projects", icon: Layers },
    { id: "sessions", label: "Sessions", icon: Clock },
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="page-header">
        <div className="gradient-accent-bar" />
        <h1>Cost Aggregation</h1>
      </div>

      <div className="flex gap-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={tab === id ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab(id)}
            className="gap-1.5"
          >
            <Icon className="size-3.5" />
            {label}
          </Button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-3">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Total Tokens</p>
              <p className="text-2xl font-bold">{fmtTokens(summary.total_tokens)}</p>
              <p className="text-xs text-muted-foreground mt-1">{fmtTokens(summary.total_tokens_in)} in / {fmtTokens(summary.total_tokens_out)} out</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Est. Total Cost</p>
              <p className="text-2xl font-bold">{fmtCost(summary.estimated_total_cost_usd)}</p>
              <p className="text-xs text-muted-foreground mt-1">USD</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Models Used</p>
              <p className="text-2xl font-bold">{summary.by_model.length}</p>
              <p className="text-xs text-muted-foreground mt-1">unique models</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Projects</p>
              <p className="text-2xl font-bold">{summary.by_project.length}</p>
              <p className="text-xs text-muted-foreground mt-1">{summary.by_session.length} sessions</p>
            </Card>
          </div>
        </div>
      )}

      {tab === "models" && (
        <ModelTable data={summary.by_model} fmtCost={fmtCost} fmtTokens={fmtTokens} />
      )}

      {tab === "projects" && (
        <ProjectTable data={summary.by_project} fmtCost={fmtCost} fmtTokens={fmtTokens} />
      )}

      {tab === "sessions" && (
        <SessionTable data={summary.by_session} fmtCost={fmtCost} fmtTokens={fmtTokens} />
      )}
    </div>
  );
}

function ModelTable({ data, fmtCost, fmtTokens }: { data: ModelCostSummary[]; fmtCost: (n: number) => string; fmtTokens: (n: number) => string }) {
  if (data.length === 0) return <EmptyState message="No model usage data yet." />;
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-2 text-left font-medium">Model</th>
            <th className="px-4 py-2 text-right font-medium">Tokens In</th>
            <th className="px-4 py-2 text-right font-medium">Tokens Out</th>
            <th className="px-4 py-2 text-right font-medium">Sessions</th>
            <th className="px-4 py-2 text-right font-medium">Est. Cost</th>
          </tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr key={m.model} className="border-b">
              <td className="px-4 py-2 font-medium">{m.model}</td>
              <td className="px-4 py-2 text-right">{fmtTokens(m.tokens_in)}</td>
              <td className="px-4 py-2 text-right">{fmtTokens(m.tokens_out)}</td>
              <td className="px-4 py-2 text-right">{m.sessions}</td>
              <td className="px-4 py-2 text-right">{fmtCost(m.estimated_cost_usd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function ProjectTable({ data, fmtCost, fmtTokens }: { data: ProjectCostSummary[]; fmtCost: (n: number) => string; fmtTokens: (n: number) => string }) {
  if (data.length === 0) return <EmptyState message="No project usage data yet." />;
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-2 text-left font-medium">Project</th>
            <th className="px-4 py-2 text-right font-medium">Tokens In</th>
            <th className="px-4 py-2 text-right font-medium">Tokens Out</th>
            <th className="px-4 py-2 text-right font-medium">Sessions</th>
            <th className="px-4 py-2 text-right font-medium">Est. Cost</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.project_id} className="border-b">
              <td className="px-4 py-2 font-medium">{p.project_name || p.project_id}</td>
              <td className="px-4 py-2 text-right">{fmtTokens(p.tokens_in)}</td>
              <td className="px-4 py-2 text-right">{fmtTokens(p.tokens_out)}</td>
              <td className="px-4 py-2 text-right">{p.sessions}</td>
              <td className="px-4 py-2 text-right">{fmtCost(p.estimated_cost_usd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function SessionTable({ data, fmtCost, fmtTokens }: { data: SessionCostSummary[]; fmtCost: (n: number) => string; fmtTokens: (n: number) => string }) {
  if (data.length === 0) return <EmptyState message="No session data yet." />;
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-2 text-left font-medium">Session</th>
            <th className="px-4 py-2 text-left font-medium">Agent</th>
            <th className="px-4 py-2 text-right font-medium">Tokens In</th>
            <th className="px-4 py-2 text-right font-medium">Tokens Out</th>
            <th className="px-4 py-2 text-right font-medium">Est. Cost</th>
          </tr>
        </thead>
        <tbody>
          {data.map((s) => (
            <tr key={s.session_id} className="border-b">
              <td className="px-4 py-2 font-mono text-xs">{s.session_id.slice(0, 8)}...</td>
              <td className="px-4 py-2">{s.agent_id || "-"}</td>
              <td className="px-4 py-2 text-right">{fmtTokens(s.tokens_in)}</td>
              <td className="px-4 py-2 text-right">{fmtTokens(s.tokens_out)}</td>
              <td className="px-4 py-2 text-right">{fmtCost(s.estimated_cost_usd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="p-8 text-center">
      <Zap className="size-8 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </Card>
  );
}
