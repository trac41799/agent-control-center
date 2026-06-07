import {
  Waves, Brain, Shield, Zap, Workflow, Sparkles,
  Monitor, Apple, Terminal, Github, Rocket, ArrowRight, ExternalLink,
} from "lucide-react";

const features = [
  {
    icon: Waves,
    title: "Wave Execution",
    desc: "Dependency-aware sequential agent waves. Each wave completes before the next begins, with automatic retry on failure.",
  },
  {
    icon: Shield,
    title: "Handoff Verification",
    desc: "Seven-section envelope validation ensures agents never lose context between transitions.",
  },
  {
    icon: Brain,
    title: "Knowledge Compounding",
    desc: "2-pass semantic extraction builds a queryable knowledge graph from every session automatically.",
  },
  {
    icon: Zap,
    title: "Proactive Budgeting",
    desc: "Token budgets enforced before execution. No runaway costs — every request is pre-approved.",
  },
  {
    icon: Workflow,
    title: "7-Stage Connector Loop",
    desc: "Fetch → Analyze → Store → Review → Compare → Tag → Relate. Every integration is rigorously validated.",
  },
  {
    icon: Sparkles,
    title: "SkillBridge Ecosystem",
    desc: "Plug into 50+ agent skills. Extend with custom skill definitions that compound across sessions.",
  },
];

const stats = [
  { value: "~10 MB", label: "Bundle Size" },
  { value: "50+", label: "Skills" },
  { value: "7", label: "Pipeline Stages" },
  { value: "v0.9.0", label: "Version" },
];

const platforms = [
  { icon: Monitor, label: "Windows", ext: ".msi / .exe" },
  { icon: Apple, label: "macOS", ext: ".dmg" },
  { icon: Terminal, label: "Linux", ext: ".deb / AppImage" },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="mesh fixed inset-0" />
      <div className="grid-overlay pointer-events-none fixed inset-0" />

      {/* ── Nav ── */}
      <nav className="glass sticky top-0 z-50 border-b border-brand-500/8">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand-500 shadow-[0_0_12px_rgb(99_102_241/0.3)]">
              <Rocket className="size-4 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-surface-100">
              SourceForge
            </span>
            <span className="rounded-md bg-brand-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-400 hidden sm:inline-block">
              v0.9.0
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/trac41799/agent-control-center"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-surface-400 transition-colors hover:text-surface-100"
            >
              <Github className="size-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <a
              href="https://github.com/trac41799/agent-control-center/releases"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-[0_0_16px_rgb(99_102_241/0.2)] transition-all hover:-translate-y-px hover:shadow-[0_0_24px_rgb(99_102_241/0.35)] active:scale-[0.98]"
            >
              Download
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-20 pt-16 text-center sm:pt-28 sm:pb-28">
        <span className="animate-fade-in inline-block rounded-full bg-brand-500/10 px-4 py-1.5 text-xs font-medium text-brand-400 mb-6">
          Public Beta
        </span>

        <h1 className="animate-fade-up text-5xl font-bold tracking-tight text-surface-50 sm:text-6xl lg:text-7xl">
          Forge software
          <br />
          <span className="gradient-text">with agent waves</span>
        </h1>

        <p className="animate-fade-up delay-200 mx-auto mt-6 max-w-xl text-lg leading-relaxed text-surface-400 sm:text-xl">
          Coordinate multiple AI coding agents through dependency-aware waves,
          verified handoffs, and automatic knowledge compounding — in{" "}
          <strong className="text-surface-200">under 10 MB</strong>.
        </p>

        <div className="animate-fade-up delay-300 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="https://github.com/trac41799/agent-control-center/releases"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-500 px-8 text-base font-semibold text-white shadow-[0_0_24px_rgb(99_102_241/0.25)] transition-all hover:-translate-y-px hover:shadow-[0_0_36px_rgb(99_102_241/0.4)] active:scale-[0.98]"
          >
            <Monitor className="size-5" />
            Download Free
          </a>
          <a
            href="https://github.com/trac41799/agent-control-center"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-brand-500/15 bg-brand-500/5 px-8 text-base font-semibold text-surface-200 transition-all hover:border-brand-500/30 hover:bg-brand-500/10"
          >
            <Github className="size-5" />
            View on GitHub
          </a>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24">
        <div className="glass grid grid-cols-2 gap-6 rounded-2xl px-8 py-8 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold text-surface-50 sm:text-3xl">
                {s.value}
              </div>
              <div className="mt-1 text-xs font-medium text-surface-500">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold text-surface-50 sm:text-4xl">
            Everything you need to{" "}
            <span className="gradient-text">orchestrate</span>
          </h2>
          <p className="mt-3 text-surface-500">
            One cohesive platform for the full agent lifecycle.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="glass-card group rounded-2xl p-6"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-500/10 ring-1 ring-brand-500/15 transition-transform group-hover:scale-110">
                <f.icon className="size-5 text-brand-400" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-surface-100">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-surface-400">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Downloads ── */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold text-surface-50 sm:text-4xl">
            Download for your{" "}
            <span className="gradient-text">platform</span>
          </h2>
          <p className="mt-3 text-surface-500">
            Available on Windows, macOS, and Linux.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {platforms.map((p) => (
            <a
              key={p.label}
              href="https://github.com/trac41799/agent-control-center/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card group flex flex-col items-center gap-4 rounded-2xl p-8"
            >
              <div className="flex size-14 items-center justify-center rounded-xl bg-brand-500/10 ring-1 ring-brand-500/15 transition-transform group-hover:scale-110">
                <p.icon className="size-7 text-brand-400" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-surface-100">{p.label}</div>
                <div className="text-sm text-surface-500">{p.ext}</div>
              </div>
              <ExternalLink className="size-4 text-surface-600 transition-colors group-hover:text-brand-400" />
            </a>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-surface-600">
          Also on{" "}
          <code className="rounded-md bg-surface-800 px-1.5 py-0.5 text-surface-400 text-[11px]">
            winget install Edge8.SourceForge
          </code>
          {" · "}
          <code className="rounded-md bg-surface-800 px-1.5 py-0.5 text-surface-400 text-[11px]">
            brew install sourceforge
          </code>
        </p>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-brand-500/8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2 text-xs text-surface-500">
            <Rocket className="size-3.5" />
            <span>SourceForge</span>
            <span className="text-surface-700">·</span>
            <span>Built with Tauri v2</span>
          </div>
          <a
            href="https://github.com/trac41799/agent-control-center"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-surface-500 transition-colors hover:text-surface-300"
          >
            MIT License
          </a>
        </div>
      </footer>
    </div>
  );
}
