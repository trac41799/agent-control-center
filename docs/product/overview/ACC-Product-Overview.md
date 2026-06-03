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

Research conducted across 13 GitHub repositories and existing applications as of May 2026. Full analysis documented in `docs/2026-06-02-gap-analysis/02-market-gap-analysis.md`.

### Competitive Comparison

| Project | Stars | Lang | Agent Count | Parallel | Token Budget | Knowledge | Connectors | Desktop |
|---|---|---|---|---|---|---|---|---|
| **wshobson/agents** | 34.6k | Python/C# | Claude only | No | No | Skills only | No | No |
| **ClawTeam (HKUDS)** | ~5k | Python | 5+ | Yes (tmux) | No | No | No | No |
| **Paseo** | 5.2k | TypeScript | 3 | No | No | No | No | Yes |
| **Agent-Swarm** | 390 | TypeScript | 6+ | Yes (Docker) | No | Yes (vector) | Slack/Jira/Linear/GH | Web |
| **Composio AO** | ~2k | TypeScript | 5+ | Yes (worktree) | No | No | GH/Linear | Web |
| **1code** | ~500 | TypeScript | 2 | No | No | No | GH/Linear/Slack | Yes |
| **ccswarm** | ~200 | Rust | 3+ | Partial | Yes (OTel) | RAG planned | No | TUI |
| **OpenSwarm** | ~500 | TS/Python | 1 (Claude) | Yes | Cost only | No | No | Yes |
| **Ruflo** | ~500 | TypeScript | 1 (Claude) | Partial | Cost-tracker | Yes (AgentDB+SONA) | No | Web |
| **Wolfpack** | 27 | TypeScript | 3+ | No | No | No | No | Yes |
| **CrewAI-Studio** | 1.3k | Python | Any LLM | No | No | No | No | Web |
| **TaskWeaver (MS)** | 6.2k | Python | GPT only | No | No | No | No | CLI |
| **ACC** | — | Rust/React | **9** | **Yes (wave+DAG)** | **Yes** | **Yes** | **Yes** | **Yes** |

### Feature-by-Feature Market Gaps

#### Agent Count & Unification
- **Market ceiling:** 6 agents (Agent-Swarm). **ACC ships with 9.**
- **Agent-agnostic architecture:** 3 products (ClawTeam, Composio, Agent-Swarm). ACC matches via AgentConfig interface.
- **Subagent observability:** None. ACC detects subagent spawn via PTY pattern matching from 7 agents.
- **IDE agent support:** 1 product (1code desktop focus). ACC supports Cursor via headless CLI.

#### Parallel Execution
- **Dependency-aware execution:** Zero competitors. ACC's DAG with intra-wave per-agent unlock is greenfield.
- **Handoff verification gates:** Zero competitors. ACC's fs.watch + schema validation + approve/flag is greenfield.
- **Stall detection + recovery:** Zero competitors. ACC's 10-min threshold with retry/complete/terminate is greenfield.
- **Correction loop:** Zero competitors. ACC's max-2-auto-retries with escalation is greenfield.

**Key gap:** No competitor has dependency-aware wave execution with handoff verification. Existing parallel solutions are "fire and forget" — no feedback loop between parallel agents.

#### Token Budget Management
- **Per-agent budget allocation:** Zero competitors. ACC's complexity × historical p75 × model context calculation is greenfield.
- **Threshold ladder (60/80/95/100%):** Zero competitors. ACC's PTY injection at each threshold is greenfield.
- **WIP checkpoint capture + wave resumption:** Zero competitors. Greenfield.
- **ccswarm** has OTel token tracking but no proactive allocation, threshold enforcement, or WIP capture.

**Key gap:** Token budget management is entirely uncontested. No competitor has a budget state machine with automatic agent shutdown and resume-from-checkpoint.

#### Knowledge Compounding
- **Auto-extract learning from sessions:** 1 (Ruflo — Claude-only, vector DB). ACC: 2-pass compounder (local pre-pass + LLM call) across all 9 agents.
- **Confidence scoring across sessions:** Zero competitors. ACC: confirmation_count + Jaccard deduplication.
- **Contradiction detection:** Zero competitors. ACC: knowledge_relations table, "conflicting evidence" badge.
- **Preflight warnings in guidelines:** Zero competitors. ACC surfaces anti-patterns before agent spawn.

**Key gap:** Ruflo is the only competitor with any knowledge system, but it's Claude-only and web-based. ACC's compounding flywheel — more sessions → more knowledge → smarter agents → better outcomes → more sessions — is unique.

#### Connectors & Upstream Loop
- **Multi-platform chat connectors:** 3 products (Agent-Swarm, 1code, Composio).
- **Full 7-stage loop (detect→propose→approve→execute→verify→report):** Zero competitors.
- **Automated proposal generation:** Zero competitors. ACC: Architect Agent Lark Doc / Slack Canvas.
- **Approval signal detection:** Zero competitors. ACC: ✅ reaction / "approved" reply.
- **Completion report posted back:** Zero competitors. ACC: Changelog + QA Report to original thread.

**Key gap:** Agent-Swarm has the most connectors (Slack, Jira, Linear, GitHub) but no automated execution pipeline. The human relay (developer reads → interprets → types → runs → writes back) remains in every existing product.

### ACC's Definitive Differentiators

1. **9-agent unification** in one desktop app (nobody else exceeds 6)
2. **Wave-based parallel execution** with intra-wave DAG dependency resolution (unique to ACC)
3. **Proactive token budget system** with WIP checkpoint/resume (no competitor has this)
4. **Knowledge Compounder** that compounds across sessions automatically (Ruflo is closest, Claude-only)
5. **Full 7-stage upstream connector loop** (Agent-Swarm has connectors but no automated execution pipeline)
6. **Tauri v2 native binary (~10MB)** vs Electron (~150MB+)
7. **Supabase + GitHub first-class integrations** with architecture-enforced safety defaults

### Uncontested Features (0 Competitors)

| Feature | Closest Competitor | Gap |
|---|---|---|
| Dependency-aware wave execution with intra-wave unlock | None | Greenfield |
| Handoff schema validation + approval gates | None | Greenfield |
| Proactive token budget with threshold ladder | None | Greenfield |
| WIP checkpoint capture + wave resumption | None | Greenfield |
| Two-pass knowledge compounding (local + LLM) | Ruflo (1-pass, Claude-only) | 2-pass + multi-agent |
| Full 7-stage upstream loop with proposal + approval + execution + report | Agent-Swarm (I/O only) | Full execution pipeline |
| Correction loop with auto-retry + escalation | None | Greenfield |
| SkillBridge ecosystem integration (local ↔ cloud memory) | None | Unique |

### Market Positioning

ACC occupies a unique position at the intersection of:
- **Agent orchestration** (ClawTeam, Composio, Agent-Swarm territory)
- **Knowledge management** (Ruflo territory)
- **Desktop productivity** (Paseo, 1code, Wolfpack territory)
- **Team collaboration** (Agent-Swarm, 1code territory)

No single competitor crosses all four categories.

### Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Competitor builds wave orchestration | Medium | First-mover advantage; 5-week Phase 5 allocation indicates complexity barrier |
| Agent-Swarm adds desktop app | Low | Docker-based architecture is hard to port to desktop |
| Claude adds native subagent orchestration | Medium | ACC's agent-agnostic design insulates; Claude-only orchestration doesn't compete with 9-agent unification |
| Open-source clone emerges from spec | Medium | Spec is public; execution speed + Edge8 domain expertise are moat |
| Large player enters (GitHub, Vercel, Replit) | High | Tauri v2 local-first architecture is hard for cloud-native companies to replicate quickly |

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

*Document extracted from ACC-Complete-Project-Documentation-v2.7.md (4153 lines, 21 modules, 11 ADRs, 68 user stories). Gap assessment findings from ACC-Gap-Assessment.md (2026-05-02) integrated for Market Landscape, Design Principles, Product Ecosystem, and Known Limitations sections. Market gap analysis from `docs/2026-06-02-gap-analysis/02-market-gap-analysis.md` (13 products, 2026-06-03) integrated for Section 2 competitive analysis, uncontested features, risk assessment. Current codebase: 19 Rust modules, 14 ADRs, 73 user stories.*
