# AGENT CONTROL CENTER (ACC)
### Product Overview — Discovery Document
**Extracted from ACC-Complete-Project-Documentation-v2.7.md (March 2026)**
**Updated with May 2026 Gap Assessment findings**
**Owner: Trac / Edge8 (edge8.ai)**

---

> *"From stakeholder conversation to deployed, tested, documented, and learned from — autonomous, verified, and compounding — without a developer in the relay."*

---

## 1. Vision & Problem Statement

### The Origin

ACC was designed by an AI consulting team (Edge8) that runs multi-agent workflows in production daily — using Claude Code, OpenCode, Aider, Goose, and Cline together on real client projects. The problems are firsthand, not theoretical.

### The Core Problems

**Problem 1 — No Unified Control**
Developers context-switch between 3+ terminal windows, 3+ config files, and 3+ memory systems. Every agent session starts cold. Every switch costs 5–10 minutes of context reconstruction.

**Problem 2 — No Outcome Intelligence**
Every orchestration tool logs what commands ran. Zero tools track whether those commands achieved the goal. There is no feedback loop. Agents don't get smarter per project. Developers don't know which agent succeeds at what.

**Problem 3 — No Asset Management**
Skills, memory files, MCP server configs, and API credentials are scattered across hidden dotfolders (`~/.claude/`, `~/.opencode/`, `~/.gemini/`). Managing them means manually editing JSON. Sharing them across a team is copy-paste.

**Problem 4 — No Workflow Protocol**
Multi-agent parallel execution — wave-based, dependency-aware, with handoff verification and correction loops — is a manually executed runbook. The developer is the orchestrator. The developer is the bottleneck.

**Problem 5 — No Upstream Connection**
Work originates in Lark, Slack, or Jira. Developers read it, interpret it, type it into a terminal, run agents, read the output, write it back. Every step in that relay is a human doing work a system could do.

**Problem 6 — No Team Layer**
Agent workflows, skills, MCP configurations, and proven prompts are trapped on individual machines. Sharing means emailing dotfiles.

**Problem 7 — No Knowledge Compounding**
Every session produces decisions, patterns, anti-patterns, and lessons. All of it evaporates when the terminal closes. The same mistakes get made on the next project. The same patterns get rediscovered. Institutional knowledge never accumulates — it has to be manually written, and it rarely is.

### The Vision

ACC is the **operating system for agentic development** — not a launcher, not a terminal wrapper, not another chat interface. A purpose-built environment where the entire development cycle — from stakeholder conversation to deployed, verified feature — runs with AI agents doing the work and humans approving the decisions.

```
BEFORE ACC:
Stakeholder → [slack message]
Developer reads → interprets → opens terminals → configures agents →
runs agents → reads output → fixes manually → writes docs → reports back
[Every arrow is a human doing manual work]

AFTER ACC:
Stakeholder → [slack/lark/jira message]
ACC detects → proposes → awaits approval → executes agents →
verifies QA → generates docs → reports back
[Every arrow is automated. Human only approves at the gate.]
```

### One-Line Pitch
> *"The cockpit that makes your AI agents smarter the more you use them."*

### Extended Pitch (for stakeholders)
> ACC is a local-first desktop application that unifies Claude Code, OpenCode, Aider, Goose, Cline, Cursor, Gemini CLI, Codex, and Qwen Code under one interface — with wave-based parallel execution, intelligent task routing, encrypted asset management, first-class Supabase and GitHub integration, a full agentic loop from Lark/Slack/Jira conversation to deployed feature tested and reported back, and a Knowledge Compounder that distills every session into structured learning materials — compounding the team's intelligence automatically across every project.

---

## 2. Market Landscape & Competitive Analysis

Research conducted across 13 GitHub repositories and existing applications as of May 2026.

### Competitive Comparison

| Project | Stars | Language | Agents | Parallel Exec | Token Budget | Knowledge | Connectors | Desktop |
|---|---|---|---|---|---|---|---|---|
| **wshobson/agents** | 34.6k | Python/C# | Claude only | ✗ | ✗ | skills only | ✗ | ✗ |
| **ClawTeam (HKUDS)** | ~5k | Python | 5+ | ✓ (tmux) | ✗ | ✗ | ✗ | ✗ |
| **Paseo** | 5.2k | TypeScript | 3 | ✗ | ✗ | ✗ | ✗ | ✓ |
| **Agent-Swarm** | 390 | TypeScript | 6+ | ✓ (Docker) | ✗ | ✓ (vector) | Slack/Jira/Linear/GH | Web |
| **Composio AO** | ~2k | TypeScript | 5+ | ✓ (worktree) | ✗ | ✗ | GH/Linear | Web |
| **1code** | ~500 | TypeScript | 2 | ✗ | ✗ | ✗ | GH/Linear/Slack | ✓ |
| **ccswarm** | ~200 | Rust | 3+ | partial | ✓ (OTel) | RAG planned | ✗ | TUI |
| **OpenSwarm** | ~500 | TS/Python | 1 (Claude) | ✓ | cost only | ✗ | ✗ | ✓ |
| **Ruflo** | ~500 | TypeScript | 1 (Claude) | partial | cost-tracker | ✓ (AgentDB+SONA) | ✗ | Web |
| **Wolfpack** | 27 | TypeScript | 3+ | ✗ | ✗ | ✗ | ✗ | ✓ |
| **CrewAI-Studio** | 1.3k | Python | any LLM | ✗ | ✗ | ✗ | ✗ | Web |
| **TaskWeaver (MS)** | 6.2k | Python | GPT only | ✗ | ✗ | ✗ | ✗ | CLI |
| **ACC (this)** | — | Rust/React | **9** | **✓ (wave+DAG)** | **✓** | **✓** | **✓** | **✓** |

### Key Findings

- **No single project combines all ACC features.** The market is fragmented across agent clients (1code, Paseo), orchestrators (ClawTeam, Composio), and knowledge systems (Ruflo).
- **ClawTeam** is the closest architectural match — leader/worker pattern, tmux-based parallel, agent-agnostic. Lacks desktop UI, token tracking, knowledge compounding, and upstream connectors.
- **Agent-Swarm** has the most complete integration + memory story. Docker-based isolation, vector memory, multi-channel connectors. Web-only. No token budget management.
- **1code** and **Paseo** have the best desktop UX but are agent clients, not orchestrators. Neither has wave orchestration, outcome tracking, or knowledge compounding.
- **ccswarm** has the most ambitious vision (Rust-native, OTel token tracking, RAG, voting) but is largely incomplete.

### ACC's Definitive Differentiators

1. 9-agent unification in one desktop app (nobody else exceeds 6)
2. Wave-based parallel execution with intra-wave DAG dependency resolution (unique to ACC)
3. Proactive token budget system with WIP checkpoint/resume (no competitor has this)
4. Knowledge Compounder that compounds across sessions automatically (Ruflo is closest, Claude-only)
5. Full 7-stage upstream connector loop (Agent-Swarm has connectors but no automated execution pipeline)
6. Tauri v2 native binary (~10MB) vs Electron (~150MB+)
7. Supabase + GitHub first-class integrations with architecture-enforced safety defaults

---

## 3. Target Users & Personas

### Persona 1 — The AI-Forward Lead Developer (Primary)

**Name:** Alex, Senior Software Engineer
**Context:** Uses Claude Code and OpenCode daily. Manages 2–4 active client projects. Runs multi-agent workflows manually using documented runbooks.

**Current Pain:**
- Switches between 4 terminals per complex feature
- CLAUDE.md files are out of date — maintained manually
- When an agent fails, spends 15 minutes reading terminal output to diagnose
- Can't tell if Claude Code or OpenCode would be better for a given task
- Has to remember which MCP configs apply to which project

**What ACC Does For Alex:**
- One window for all agents, all projects
- Failure diagnosed in one click
- Outcome history tells him Claude Code has 89% success on refactors in this codebase
- MCPs auto-toggle when he switches projects
- CLAUDE.md updates automatically from session learnings

**Success Metric:** Alex runs 3x more agent tasks per day with the same cognitive load.

---

### Persona 2 — The AI Consulting Team Lead (Secondary)

**Name:** Trac, AI Officer at Edge8
**Context:** Runs multi-agent projects for enterprise clients. Receives requirements in Lark. Delivers features to clients. Needs repeatable, documented AI workflows per client engagement.

**Current Pain:**
- Each client project needs its own agent configuration — maintained per developer
- Requirements from Lark are read manually and typed into terminals
- Reporting back to clients (changelogs, QA reports) is written manually after each session
- New team members need days to understand a client's AI setup

**What ACC Does For Trac:**
- Lark message → proposal → approval → execution → report back, automated
- Each client has a `.acc` playbook bundle — share with any team member in 30 seconds
- Session replay + feature doc generator produces client reports automatically
- New team member imports playbook → immediately productive

**Success Metric:** A new developer joins a client project and is fully operational in under 5 minutes using an imported `.acc` playbook.

---

### Persona 3 — The Power Builder (Tertiary)

**Name:** Kai, Indie Developer / Solo Builder
**Context:** Builds products alone using Claude Code. Experiments with MCPs, custom skills, and OpenRouter models. Needs to maximize output-per-hour.

**Current Pain:**
- MCP configs are JSON files — easy to break, hard to share
- Custom skills live in random directories
- No way to know which model or agent setup works best for different task types

**What ACC Does For Kai:**
- MCP registry with one-click toggle — no JSON editing
- Skills library with search and inject
- Outcome tracker builds a personal "what works" database over time
- Model router learns his preferences and patterns

**Success Metric:** Kai discovers that Gemini CLI outperforms Claude Code on his specific test-writing tasks and routes accordingly — a data-driven insight ACC surfaces automatically.

---

## 4. Core Design Principles

### P1 — Human in the Loop, Always
ACC is not autonomous. It is agentic. The human approves every consequential decision: task execution, agent routing, corrections, deployments. ACC automates the execution, not the judgment.

*Manifestation: Task Router suggests, never fires. Upstream loop waits for approval. Failure Analyzer diagnoses, human decides next step.*

### P2 — Files Are the Source of Truth
Agent configs, skills, and memory live on disk in their native formats. ACC reads and writes those files directly — no proprietary database layer between the user and their data. Everything works without ACC installed.

*Manifestation: CLAUDE.md stays a plain markdown file. MCP config stays a plain JSON file. ACC is an editor and manager, not a replacement.*

### P3 — Local First, Cloud Optional
All v1 features work offline. SQLite is the database. Rust handles all system access. Cloud sync, team sharing, and web access are v2 features layered on top — never required.

*Manifestation: No account required to run ACC. No data leaves the machine without explicit user action.*

### P4 — Transparent, Not Magic
When ACC suggests a task route, it shows the reasoning and confidence score. When the failure analyzer returns a diagnosis, it shows the evidence from the PTY output. When a correction is auto-generated, the user previews it before injection.

*Manifestation: No black boxes. Every AI decision is explainable and overridable.*

### P5 — Expandable From Day One
The agent abstraction, connector abstraction, and `.acc` bundle format are designed for extensibility from the first commit. Adding a new agent is one config object. Adding a new connector is one config object. No rewrites.

*Manifestation: AgentConfig and ConnectorConfig interfaces are the extension points. All platform-specific logic lives in config, not code.*

### P6 — Dogfood the Product
ACC is built using the MAFW protocol — wave-based parallel agents, handoff verification, correction loops. The tool builds itself. Every feature is a proof of concept of the product's own value.

*Manifestation: ACC development uses ACC's own Wave Orchestrator, Agent Guideline Generator, and Feature Doc Generator from Phase 5 onward.*

### P7 — Product Ecosystem
ACC detects and integrates with sibling Edge8 products (SkillBridge) without merging codebases or creating hard dependencies. Integration is additive and read-only — ACC surfaces ecosystem products in its UI but never controls their state, writes their config, or requires them to function.

*Manifestation: SkillBridge detection at startup via process check / app path / config file. MCP auto-registration, unified memory view, knowledge source integration. ACC is fully functional without SkillBridge installed.*

---

## 5. Product Ecosystem

### SkillBridge Integration

SkillBridge is a standalone Tauri v2 desktop application (production-ready, v1.0) that bridges local agent memory (`~/.claude-mem/`) to Claude.ai web via a Deno Deploy edge relay with encrypted tunnels. It runs alongside ACC on the same machine — not inside ACC.

**What SkillBridge does:**
- Maintains a structured persistent memory bank (`~/.claude-mem/`) shared between local coding agents and Claude.ai web
- Exposes an MCP-over-SSE endpoint via its relay for programmatic memory access
- Provides a context-mode sandbox that isolates Claude.ai web sessions from the local filesystem
- Manages its own bridge state, relay connection, and worker processes independently

**How ACC integrates with SkillBridge:**

ACC detects SkillBridge at startup and surfaces its status in two locations:
- **Settings → Integrations panel** — shows SkillBridge version, bridge status, relay URL, and MCP endpoint. Provides one-click copy of the MCP URL and a link to open SkillBridge.
- **Runner status bar** — compact indicator: `SkillBridge: ● Connected` or `SkillBridge: ○ Not installed`

When SkillBridge is detected, ACC enables three integration points:
- **MCP Registry auto-registration** — SkillBridge's MCP endpoint is added as a managed entry with a `🔗 external` badge. Read-only in ACC (user can toggle per-agent but cannot edit connection params; changes must happen in SkillBridge).
- **Knowledge Compounder source** — `~/.claude-mem/` entries become an additional input source for the Compounder (read-only — ACC never writes to SkillBridge's domain). Entries tagged with the current project's stack are prioritized. Knowledge items sourced from SkillBridge show a `📡 SkillBridge` badge distinct from session-derived knowledge.
- **Unified Memory View** — a new sub-tab in the Memory Browser when SkillBridge is detected, showing Agent Memory files (CLAUDE.md, GEMINI.md, etc.) alongside claude-mem entries, with cross-reference detection via keyword overlap.

**What ACC does NOT do:**
- Manage the Deno relay connection (SkillBridge owns this)
- Spawn `claude-mem` or `context-mode` workers
- Control SkillBridge's bridge state (start/stop)
- Write to `~/.claude-mem/` (single-writer principle — SkillBridge writes, ACC reads)
- Require SkillBridge to be installed (ACC is fully functional without it)

**Architecture relationship:**
```
ACC (Tauri v2)                          SkillBridge (Tauri v2)
  ├── Agent Runner (9 PTY agents)         ├── Bridge state manager
  ├── Wave Orchestrator                   ├── Relay connection (Deno Deploy)
  ├── Knowledge Compounder                ├── claude-mem worker
  │    └── reads claude-mem/ ◄──────────  │   (writes structured memory)
  ├── MCP Registry                        ├── context-mode worker
  │    └── registers SkillBridge MCP      └── MCP endpoint (/mcp/<id>/sse)
  └── Memory Browser
       └── unified view (local + claude-mem)

ACC reads SkillBridge state. ACC never writes SkillBridge config.
Integration layer is additive — zero changes to SkillBridge codebase.
```

**Stack compatibility:** Near-identical — Tauri v2, React/TypeScript, Tailwind, Zustand, Stronghold. No shared state, no IPC requirement, no API dependency.

---

## 6. Known Limitations (v1)

These are deliberate v1 scope decisions with documented upgrade paths. They represent trade-offs made to ship a complete, usable product rather than delay for completeness.

### 1. Upstream Connector Loop — GitHub Issues Only at Launch

The full 7-stage upstream loop (Monitor → Detect → Propose → Await → Execute → Verify → Report) is operational at v1 launch only for **GitHub Issues**. Lark, Slack, and Jira connectors are fully specified (Module 14, 7 stages documented, connector config schema complete) but deferred to a post-launch phase. They require custom integration work for each platform that is not in the v1 scope.

**v1 mitigation:** GitHub Issues serves as the reference implementation. The connector abstraction layer accepts new platforms as pure config additions. Lark/Slack/Jira will be the first post-launch connector targets.

### 2. v1 Task Routing — Keyword-Based

v1 task routing uses keyword classification (refactor / review / test / implement / debug / document) matched against outcome history stats. This means tasks without these exact terms receive routing suggestions based on history hit rate only — not semantic match quality. The UI labels these as "estimated" confidence.

**v1.5 upgrade path (Phase 10):** When Ollama is configured locally, routing automatically upgrades to embedding-based similarity. Task descriptions are embedded locally (no API call) and compared against embedded outcome history via cosine similarity. This provides meaningful confidence for any task description without requiring full agent-mediated routing.

### 3. Single-Wave Orchestration Only

The Wave Orchestrator manages one `feature_plan` at a time. You cannot run Wave A (auth feature) and Wave B (dashboard feature) as concurrent orchestration threads. Agent panels in the Runner can run independently in parallel, but formal orchestration (dependency graphs, handoff verification, correction loops, budget tracking) is single-threaded.

**v1 mitigation:** Independent chat sessions in the Runner grid can be used for parallel work (just without orchestration features). A "Control Session" abstraction enabling multiple parallel orchestration threads is a Phase 10+ architectural candidate — it requires concurrency support in feature_plans, per-thread docs scoping, per-thread file watchers, and cross-thread conflict detection.

---

*Document extracted from ACC-Complete-Project-Documentation-v2.7.md (4153 lines, 21 modules, 11 ADRs, 68 user stories). Gap assessment findings from ACC-Gap-Assessment.md (2026-05-02) integrated for Market Landscape, Design Principles, Product Ecosystem, and Known Limitations sections.*
