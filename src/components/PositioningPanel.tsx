import {
  GitBranch,
  ShieldCheck,
  Gauge,
  PauseCircle,
  Brain,
  ArrowLeftRight,
  RefreshCw,
  Plug,
  Trophy,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: GitBranch,
    title: "Dependency-Aware Wave Execution",
    description: "Parallel agents with DAG-based dependency resolution. Zero competitors.",
    zeroCompetitors: true,
  },
  {
    icon: ShieldCheck,
    title: "Handoff Verification Gates",
    description: "Schema validation + approve/flag before next wave unlocks. Zero competitors.",
    zeroCompetitors: true,
  },
  {
    icon: Gauge,
    title: "Proactive Token Budget",
    description: "Threshold ladder (60/80/95/100%) with PTY injection. Zero competitors.",
    zeroCompetitors: true,
  },
  {
    icon: PauseCircle,
    title: "WIP Checkpoint & Resume",
    description: "Auto-capture + resume from checkpoint. Zero competitors.",
    zeroCompetitors: true,
  },
  {
    icon: Brain,
    title: "2-Pass Knowledge Compounding",
    description: "Local pre-pass + LLM across all 9 agents. Ruflo is closest (1-pass, Claude-only).",
    zeroCompetitors: false,
  },
  {
    icon: ArrowLeftRight,
    title: "7-Stage Connector Loop",
    description: "Detect → Propose → Approve → Execute → Verify → Report. Zero competitors.",
    zeroCompetitors: true,
  },
  {
    icon: RefreshCw,
    title: "Correction Loop",
    description: "Max 2 auto-retries with escalation. Zero competitors.",
    zeroCompetitors: true,
  },
  {
    icon: Plug,
    title: "SkillBridge Ecosystem",
    description: "Local ↔ cloud memory bridge. Unique to ACC.",
    zeroCompetitors: true,
  },
];

export default function PositioningPanel() {
  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <Trophy className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Why ACC?</h2>
          <p className="text-xs text-muted-foreground">Competitive landscape & differentiators</p>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="flex items-start gap-3 p-3 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
          >
            <feature.icon className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-slate-200">{feature.title}</span>
                {feature.zeroCompetitors && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    0 competitors
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tauri v2 Comparison */}
      <div className="p-4 rounded-lg border border-indigo-500/10 bg-indigo-500/[0.04]">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium text-slate-200">Tauri v2 Native Binary</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-indigo-400 font-medium">ACC</span>
              <span className="text-slate-300">~10MB</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500" style={{ width: "6%" }} />
            </div>
          </div>
          <span className="text-xs text-slate-500">vs</span>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Electron</span>
              <span className="text-slate-500">~150MB+</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-slate-600" style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Market Position Summary */}
      <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-slate-300 font-medium">ACC</span> is the only tool at the intersection of{" "}
          <span className="text-indigo-400">agent orchestration</span>,{" "}
          <span className="text-cyan-400">knowledge management</span>,{" "}
          <span className="text-purple-400">desktop productivity</span>, and{" "}
          <span className="text-emerald-400">team collaboration</span>.{" "}
          No single competitor crosses all four categories.
        </p>
      </div>

      {/* Footnote */}
      <p className="text-[10px] text-slate-600 text-center">
        Based on competitive analysis of 13 products, May 2026
      </p>
    </Card>
  );
}
