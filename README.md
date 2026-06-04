# Agent Control Center

> **The cockpit that makes your AI agents smarter the more you use them.**

---

## What is ACC?

Agent Control Center is a local-first desktop application that unifies **9 AI coding agents** — Claude Code, OpenCode, Aider, Goose, Cline CLI, Cursor, Gemini CLI, Qwen Code, and Codex CLI — into a single interface. Built with Tauri v2, it orchestrates agents in parallel PTY sessions with wave-based execution, dependency-aware scheduling, and automated handoff verification. Every session feeds a **Knowledge Compounder** that distills decisions, patterns, and lessons into structured, compounding learning materials. The result: your team's AI workflows get measurably smarter project after project.

---

## Installation

### Prerequisites

- **Node.js 18+** and **npm**
- **Rust toolchain** (stable, via [rustup](https://rustup.rs))
- At least **one AI coding agent CLI** installed (e.g., `claude`, `opencode`, `aider`)

### Download

Pre-built binaries are available on the [GitHub Releases](https://github.com/edge8/agent-control-center/releases) page.

### Build from Source

```bash
npm install
npx tauri build
```

The compiled binary will be in `src-tauri/target/release/`.

### Platform Support

| Windows | macOS | Linux |
|:---:|:---:|:---:|
| ✅ | ✅ | ✅ |

---

## Quick Start

1. **Launch ACC** — open the app and you'll land on the Runner view
2. **Open a project** — select any local directory (or use the built-in demo project)
3. **Spawn an agent** — click an agent button (e.g., "Claude Code") to start a PTY session
4. **Type a task** — type into the terminal panel and watch the agent work in real time
5. **Try parallelism** — spawn a second agent simultaneously; both run side by side
6. **Check the Knowledge page** after completing work — patterns and lessons are extracted automatically

---

## Supported Agents

| Agent | Install Command | Memory File | Native Subagents |
|---|---|---|---|
| **Claude Code** | `npm install -g @anthropic-ai/claude-code` | `CLAUDE.md` | ✅ |
| **OpenCode** | `npm install -g @opencode-ai/opencode` | `.opencode/memory/default.md` | ✅ |
| **Aider** | `pip install aider-chat` | `CONVENTIONS.md` | — |
| **Goose** | `brew install goose` or direct install | `.goose/instructions.md` | Roadmap |
| **Cline CLI** | `npm install -g cline` | `.clinerules` | ✅ |
| **Cursor** | Download from cursor.com (subscription) | `.cursor/rules` | ✅ |
| **Gemini CLI** | `npm install -g @google/gemini-cli` | `GEMINI.md` | ✅ |
| **Qwen Code** | `npm install -g @alibaba/qwen-code` | `qwen.md` | ✅ |
| **Codex CLI** | `npm install -g @openai/codex` | `AGENTS.md` | ✅ |

All agents support full PTY read/write and wave orchestration. Cursor requires a Cursor subscription auth check.

---

## Key Features

- **Multi-Agent Runner** — Spawn and control up to 9 AI coding agents in a single window with resizable, detachable PTY panels, real-time status chips, and preset command buttons.

- **Wave Orchestration** — Define dependency-aware work item tables with parallel execution across waves. Agents unlock per-dependency (not per-wave), with stall detection, handoff verification, and automated correction loops.

- **Knowledge Compounder** — After every completed wave, a two-pass async pipeline extracts decisions, patterns, anti-patterns, and lessons into structured, deduplicated knowledge items — no human input required.

- **Memory Layer** — Browser, diff, and cross-agent sync for all agent memory files (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, `CONVENTIONS.md`, etc.). Reactive memory capture detects project conventions from PTY output and prompts for one-click injection.

- **Codebase Exploration** — Auto-detects project tech stack, test framework, and package manager from `package.json`, `pyproject.toml`, `Cargo.toml`, etc. Suggests relevant MCP servers and agent configurations.

- **Knowledge Graph** — Visualize extracted patterns, decisions, and their relationships (extends, confirms, contradicts) in an interactive Cytoscape graph.

- **Token Budget System** — Proactively allocate, monitor, and enforce token budgets per agent per task. Captures structured WIP checkpoints before budget exhaustion so work resumes cleanly — not from scratch.

- **Session Replay** — Timeline browser showing every event across all agents: reads, edits, runs, corrections, handoffs, and outcomes. Export sessions as Markdown or PDF.

- **Playbook Export/Import** — Package your project's skills, memory, MCP configs, presets, and models into a portable `.acc` bundle. Import into any ACC instance in under 30 seconds. Secrets are scaffolded, never exported.

- **Supabase & GitHub Integration** — First-class, granular MCP integration with safety defaults. Supabase: read-only by default, schema migrations require explicit human approval. GitHub: automated PR creation, CI/CD status polling, and Issues as a full upstream connector (file an issue → ACC classifies → wave executes → PR created → issue auto-closed).

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    AGENT CONTROL CENTER                    │
│                                                          │
│  ┌─────────────────────┐   ┌───────────────────────────┐ │
│  │   FRONTEND (React)  │   │    BACKEND (Tauri/Rust)    │ │
│  │                     │   │                           │ │
│  │  Agent Runner       │◄─►│  PTY Manager              │ │
│  │  Wave Orchestrator  │   │  SQLite + WAL             │ │
│  │  Asset Manager      │   │  File Sync Engine         │ │
│  │  Outcome Dashboard  │   │  Connector Vault (AES-256)│ │
│  │  Knowledge Panel    │   │  Knowledge Compounder     │ │
│  │  Playbook Manager   │   │  Cron Scheduler           │ │
│  │  Token Budgets      │   │  Token Guard + Monitor    │ │
│  └─────────────────────┘   └───────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────┐   │
│  │               PYTHON SERVICES (optional)            │   │
│  │  local-daemon: file watchers + agent lifecycle     │   │
│  │  webhook-server: Slack/Lark/Jira webhook ingestion │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  ┌───────────────────────────────────────────────────┐   │
│  │                  FILE SYSTEM                        │   │
│  │  ~/.claude/  ~/.opencode/  ~/.gemini/  ~/.codex/   │   │
│  │  ~/.aider/   ~/.goose/    ~/.cline/   ~/.cursor/   │   │
│  │  ~/.qwen/    Project dirs                           │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

**Stack:** Tauri v2 (Rust) · React 19 · Vite 6 · Tailwind CSS v4 · xterm.js · Zustand · SQLite · shadcn/ui · OpenRouter (intelligence layer)

---

## Development

```bash
# Start the Vite dev server (frontend only)
npm run dev

# Start with full Tauri desktop shell
npm run tauri dev

# Run tests (Vitest)
npm run test

# Run linter
npm run lint

# Build for production
npm run build
```

### Project Structure

```
agent-control-center/
├── src/                    # React frontend
│   ├── components/         # shadcn/ui components
│   ├── lib/                # Agents, connectors, store, utils
│   ├── pages/              # Runner, Orchestrator, Knowledge, etc.
│   └── hooks/              # Custom React hooks
├── src-tauri/              # Rust backend
│   ├── src/                # Tauri commands, PTY manager, DB, scheduler
│   ├── migrations/         # SQLite migrations
│   └── capabilities/       # Tauri capability permissions
├── local-daemon/           # Python file watchers & agent lifecycle
├── webhook-server/         # Python webhook ingestion server
├── docs/                   # Product and technical documentation
└── agent-workspaces/       # Isolated worktree directories for waves
```

---

## License

MIT © Edge8

---

<p align="center">
  Built with ACC. Literally. Every feature is a proof of concept of the product's own value.
</p>
