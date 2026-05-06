# AGENT CONTROL CENTER (ACC)
### Complete Project Documentation
**Version 2.0 — March 2026**
**Owner: Trac / Edge8 (edge8.ai)**

---

> *"From stakeholder conversation to deployed, tested, documented, and learned from — autonomous, verified, and compounding — without a developer in the relay."*

---

## TABLE OF CONTENTS

**Part 1 — Discovery**
1. Vision & Problem Statement
2. Market Landscape & Competitive Analysis
3. Target Users & Personas
4. Core Design Principles

**Part 2 — Requirements**
5. User Stories
6. Feature Specifications (Modules 1–21)

**Part 3 — Design**
7. System Architecture
8. UI/UX Structure & Wireframes

**Part 4 — Technical**
9. Technology Stack
10. First-Class Integrations: Supabase & GitHub
11. Data Models & Schema
12. Agent Abstraction Layer
13. Connector Abstraction Layer
14. Architecture Decision Records

**Part 5 — Execution**
15. Build Roadmap (Phased Plan)
16. Expansion Path & Commercial Strategy

---

# PART 1 — DISCOVERY

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

### Tools Evaluated

| Tool | Stars | Real User Signal | Core Strength | Critical Gap |
|---|---|---|---|---|
| **Ruflo / Claude-Flow** | 21.5k | Poor — Opus 4 required, documented broken | High marketing | Non-functional per real users |
| **ccswarm** | ~300 | Honest — docs admit incomplete | Rust + TUI, transparent | No web UI, multi-provider not implemented |
| **1code (21st-dev)** | 5.2k | Good — real commits, real UI | Git worktrees, diff viewer, git client | No intelligence layer, no assets, no upstream |
| **Composio Agent Orchestrator** | Active | Funded company | PR automation, CI/CD | Not a cockpit, no OpenCode/Cursor terminal-native support |
| **Parallel Code / Jean** | Small | Minimal | Worktree isolation | No asset management, no outcome tracking |
| **Claude Code Agent Monitor** | Small | Read-only observability | Nice UI | No control, no asset management |
| **Praktor** | Small | Real — Go binary | Docker isolation, Telegram UI | Complex setup, no MCP management |
| **OpenClaw** | 247k | Massive — Tencent built on it | Personal automation via messaging apps | Not a coding agent orchestrator |

### The Definitive Gap

After evaluating every tool in the market, **zero** have all of:
- Agent outcome tracking (did it work?)
- Failure analyzer + correction loop (why did it fail, fix it automatically)
- Unified asset management (skills, memory, MCPs, connectors)
- Wave-based parallel execution with dependency tracking
- First-class Supabase integration (schema reads, migrations, Edge Functions, storage)
- First-class GitHub integration (PRs, CI/CD status, Issues as upstream connector)
- Upstream connector loop (Lark/Slack/Jira/GitHub → execution → report back)
- Team playbook sharing
- Knowledge Compounder (structured learning distillation compounding across sessions)

ACC is the only tool designed to cover all of these.

### Strategic Positioning vs. Key Competitors

**vs. 1code:** 1code has superior UI/UX for the runner layer. ACC has everything 1code lacks: intelligence, assets, wave orchestration, upstream connectors. 1code is Apache 2.0 — usable as a starting point for the runner UI if beneficial. ACC's moat is what happens *after* the terminal opens.

**vs. OpenClaw:** OpenClaw owns the personal automation + messaging app space. ACC owns the coding agent orchestration space. They can be complementary: ACC can register as an OpenClaw skill, gaining 247k users as a discovery channel.

**vs. Ruflo:** Ruflo's star count is a marketing artifact. Real user reviews document failure. ACC's design is grounded in production-proven workflows (MAFW protocol, Edge8 grading system).

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

---

# PART 2 — REQUIREMENTS

---

## 5. User Stories

### Epic 1: Agent Runner

**US-101** — As a developer, I want to launch Claude Code, OpenCode, Aider, and Goose in one window so I don't switch between terminals.
*Acceptance: All three agents spawn from ACC with one click per agent. PTY output visible inline.*

**US-102** — As a developer, I want preset command buttons so I can inject common commands without typing.
*Acceptance: Clicking a preset button injects the command string into the target agent's PTY. No copy-paste required.*

**US-103** — As a developer, I want to see real-time agent status so I know what each agent is doing without reading the terminal.
*Acceptance: Status chip per agent updates in real time: idle / thinking / writing / running tests / done / failed.*

**US-104** — As a developer, I want to switch projects and have all agents restart in the new directory automatically.
*Acceptance: Project switcher changes cwd for all active agents simultaneously. MCPs auto-toggle per project profile.*

**US-105** — As a developer, I want to observe subagent activity from agents that spawn parallel sub-tasks (Claude Code subagents, Cursor parallel agents, Cline subagents).
*Acceptance: ACC detects subagent spawn from PTY output patterns, registers each subagent as a tracked sub-session in the parent panel, and surfaces status chips per subagent.*

**US-106** — As a developer, I want to support Gemini CLI, Codex, and Cursor alongside Claude Code and OpenCode.
*Acceptance: Any Tier 1 agent (CLI-spawnable) can be added via AgentConfig. Agent panels are dynamic, not hardcoded.*

---

### Epic 2: Asset Manager

**US-201** — As a developer, I want to browse and edit all my agent skills in one place without navigating dotfolders.
*Acceptance: Skills Library lists all skills from all configured skill directories. Monaco editor opens inline.*

**US-202** — As a developer, I want to inject a skill into my current project's CLAUDE.md with one click.
*Acceptance: "Inject" button appends skill content to the active project's memory file. Confirms before writing.*

**US-203** — As a developer, I want to manage all MCP server configs across all agents from one panel.
*Acceptance: MCP Registry shows all MCPs with toggle per agent. Toggle writes to the correct agent config file.*

**US-204** — As a developer, I want my API keys encrypted and auto-injected into agent environments.
*Acceptance: Connector Vault stores secrets with AES-256. Secrets are env vars on PTY spawn — never plaintext.*

**US-205** — As a developer, I want to see a diff of my memory file between sessions.
*Acceptance: Memory Browser shows side-by-side diff: current CLAUDE.md vs. last session snapshot.*

**US-206** — As a developer, I want to import OpenClaw-format skill files.
*Acceptance: Skills Library accepts `SKILL.md` files in OpenClaw format. Metadata parsed correctly.*

---

### Epic 3: Project Intelligence

**US-301** — As a developer, I want ACC to auto-detect my project's tech stack on load.
*Acceptance: Project profile populated from `package.json`, `pyproject.toml`, `Cargo.toml` etc. without manual input.*

**US-302** — As a developer, I want MCP suggestions based on my detected stack.
*Acceptance: If Supabase detected in dependencies, Supabase MCP appears as "Suggested" in MCP Registry.*

**US-303** — As a developer, I want to load a project profile and have all agents, MCPs, and skills configure automatically.
*Acceptance: "Load Profile" applies MCPs, injects skills, sets agent preferred model — all in one click.*

---

### Epic 4: Outcome Tracker

**US-401** — As a developer, I want to record whether an agent task succeeded, failed, or needed revision.
*Acceptance: After agent goes idle, ACC prompts: Done / Failed / Revised / Skip. Response stored in SQLite.*

**US-402** — As a developer, I want to see each agent's success rate by task type.
*Acceptance: Outcome dashboard shows per-agent, per-task-type success rates computed from SQLite history.*

**US-403** — As a developer, I want the outcome history to inform routing suggestions over time.
*Acceptance: Task Router uses outcome stats to rank agents by task type for the current project.*

---

### Epic 5: Task Router & Model Router

**US-501** — As a developer, I want to describe a task and get a smart agent suggestion.
*Acceptance: Single input box → ACC suggests agent + model with confidence score and reasoning. User confirms.*

**US-502** — As a developer, I want to route tasks to specific models within agents.
*Acceptance: Model Router suggests `openrouter/minimax/minimax-m2.7` for file ops, Qwen for complex logic.*

**US-503** — As a developer, I want to send the same task to multiple agents and compare results.
*Acceptance: "Send to Both" option spawns the task in two PTY sessions simultaneously.*

---

### Epic 6: Wave Orchestrator

**US-601** — As a developer, I want to plan a multi-agent feature with a dependency-aware work item table.
*Acceptance: Wave Orchestrator UI lets me add agents, assign waves, set dependencies. Validates graph for cycles.*

**US-602** — As a developer, I want Wave 1 agents to spawn in parallel automatically.
*Acceptance: "Execute Wave 1" spawns all Wave 1 agents simultaneously in separate PTY sessions.*

**US-603** — As a developer, I want Wave 2 agents to only spawn after all Wave 1 handoffs are verified.
*Acceptance: ACC blocks Wave 2 spawn until each Wave 1 `HANDOFF_<ID>.md` exists and validates.*

**US-604** — As a developer, I want stalled agents flagged after 10 minutes with recovery options.
*Acceptance: If no file changes for 10 minutes: alert + options [Retry] [Complete Manually] [Terminate].*

---

### Epic 7: Agent Guideline Generator

**US-701** — As a developer, I want to generate structured agent briefs before wave execution.
*Acceptance: Guideline Generator form → produces `AGENT_A1_GUIDELINE.md` in docs subfolder.*

**US-702** — As a developer, I want to see the exact `opencode run` command before firing it.
*Acceptance: CLI preview shown in Guideline Generator. User can copy or execute directly from ACC.*

---

### Epic 8: Handoff Monitor

**US-801** — As a developer, I want ACC to detect when an agent produces a handoff document.
*Acceptance: File watcher on docs subfolder detects `HANDOFF_<ID>.md` creation and parses it automatically.*

**US-802** — As a developer, I want to approve or flag each handoff before the next wave unlocks.
*Acceptance: Handoff panel shows parsed content. "Approve" button unlocks dependent agents. "Flag" triggers correction.*

---

### Epic 9: Failure Analyzer & Correction Loop

**US-901** — As a developer, I want one-click failure diagnosis from PTY output.
*Acceptance: "Analyze Failure" → ACC spawns non-interactive agent session with PTY excerpt + task context → structured diagnosis: root cause, evidence, suggested fix, confidence.*

**US-902** — As a developer, I want ACC to auto-generate a correction document and re-inject it to the agent.
*Acceptance: After diagnosis: "Generate Correction" → `CORRECTION_<ID>.md` created → "Re-inject" fires `opencode run`.*

**US-903** — As a developer, I want failed corrections to escalate to me after 2 retries.
*Acceptance: After 2 failed corrections: ACC stops, shows exact error, prompts for human decision.*

---

### Epic 10: Session Replay & Feature Docs

**US-1001** — As a developer, I want a structured timeline of everything that happened in a session.
*Acceptance: Session Replay shows chronological events: read / edit / run / input / error with file targets and diffs.*

**US-1002** — As a developer, I want to generate client-ready documentation after a multi-agent feature.
*Acceptance: "Generate Feature Docs" → ACC spawns non-interactive agent session with session context → 4 canonical docs: EXECUTIVE_PLAN, CHANGELOG, QA_REPORT, TECHNICAL_PLAN.*

**US-1003** — As a developer, I want to export session replays as PDF or Markdown for client reporting.
*Acceptance: Export button on any session → PDF or Markdown file with timeline, outcome, and file changes.*

---

### Epic 11: Team Playbooks

**US-1101** — As a team lead, I want to export a client's full AI setup as a single portable file.
*Acceptance: "Export Playbook" → `.acc` bundle: skills, memory, MCPs (no secrets), presets, project profile.*

**US-1102** — As a team member, I want to import a playbook and be fully set up in under 30 seconds.
*Acceptance: Import `.acc` → all assets installed, MCPs configured, presets loaded. Secret key scaffolding prompts for values.*

---

### Epic 12: Reactive Memory Capture

**US-1201** — As a developer, I want ACC to surface agent learnings as candidate memory entries.
*Acceptance: Pattern detection in PTY output → candidate prompt appears: "Add to memory? [Add] [Edit] [Skip]".*

**US-1202** — As a developer, I want approved memory entries to automatically update CLAUDE.md.
*Acceptance: On "Add" — entry appended to project CLAUDE.md with timestamp. No manual file editing.*

---

### Epic 13: Upstream Connector Loop (Lark / Slack / Jira)

**US-1301** — As a team lead, I want ACC to monitor Lark channels for feature requests and bug reports.
*Acceptance: Architect Agent polls configured channels on schedule. New messages classified automatically.*

**US-1302** — As a team lead, I want ACC to create a Lark Doc proposal for each detected request.
*Acceptance: Classified item → Lark Doc created with problem, root cause, solution options, execution plan.*

**US-1303** — As a stakeholder, I want to approve a proposal in Lark without leaving the app.
*Acceptance: ✅ reaction or "approved" reply → ACC detects signal → execution triggered.*

**US-1304** — As a stakeholder, I want a completion report posted back to Lark automatically.
*Acceptance: After QA pass → summary message + Changelog + QA Report posted to original thread.*

**US-1305** — As a team lead, I want Slack and Jira supported with the same loop.
*Acceptance: ConnectorConfig abstraction supports Slack (official MCP) and Jira (Atlassian Rovo MCP) with identical stages.*

**US-1306** — As a team lead, I want a Lark Base record created for every completed delivery.
*Acceptance: Delivery log table in Lark Base — one record per completed feature with all doc links.*

---

### Epic 14: Supabase & GitHub Integration

**US-1401** — As an app builder, I want to manage Supabase MCP feature groups per project so agents don't have destructive access by default.
*Acceptance: Supabase MCP entry in registry shows 8 feature group toggles. Read-only mode on by default. Project-scoped config.*

**US-1402** — As a developer, I want agents to read the Supabase schema before writing migrations.
*Acceptance: Agent can call Supabase MCP `database` tools to inspect tables, columns, and RLS policies mid-session.*

**US-1403** — As a developer, I want migrations flagged for human review before application.
*Acceptance: Supabase MCP `execute_sql` is disabled by default. Agent writes migration file, flags it. Human applies via dashboard or CLI.*

**US-1404** — As a developer, I want GitHub CI/CD status to serve as the QA signal for wave completion.
*Acceptance: After Wave final agent creates PR, ACC polls GitHub Actions status. Green CI = QA pass. Red CI = correction loop trigger.*

**US-1405** — As a developer, I want GitHub Issues to trigger the upstream connector loop.
*Acceptance: GitHub Issues monitored as Tier 1 connector. New issue → classify → propose → approve → wave → PR created → issue closed with report.*

**US-1406** — As a developer, I want GitHub PRs created automatically after a completed wave.
*Acceptance: Post-QA: `@octokit/rest` creates PR with CHANGELOG content as description, links to session replay, tags reviewers.*

**US-1407** — As a developer, I want Lockdown mode enabled by default on GitHub MCP for public repos.
*Acceptance: GitHub MCP config includes `lockdown: true` for any project where repo visibility is public. Surfaced in MCP Registry.*

---

### Epic 15: Knowledge Compounder

**US-1501** — As a developer, I want ACC to automatically extract learning materials from completed sessions without me doing anything.
*Acceptance: Async job fires after Feature Doc generation. No user input required. Results appear in Knowledge Panel.*

**US-1502** — As a developer, I want five types of learning outputs: Decision Logs, Pattern Cards, Anti-Pattern Warnings, Stack Runbooks, and Lesson Briefs.
*Acceptance: Knowledge Compounder spawns non-interactive agent session and returns structured JSON with type field. Each type renders with distinct visual treatment.*

**US-1503** — As a developer, I want knowledge items to gain confidence when confirmed by multiple sessions.
*Acceptance: Matching items increment `confirmation_count`. Confidence score displayed as fill bar (1 conf = low, 8+ conf = high).*

**US-1504** — As a developer, I want relevant knowledge injected into agent context at session start.
*Acceptance: On project load, ACC queries knowledge base by stack + project tags. Top 3–5 items appended to CLAUDE.md session preamble.*

**US-1505** — As a developer, I want to search and filter my knowledge base.
*Acceptance: Knowledge Panel has full-text search + filter by type, stack, agent, project, confidence level.*

**US-1506** — As a developer, I want to export knowledge items into team playbooks.
*Acceptance: "Add to Playbook" on any knowledge item → included in `.acc` bundle export as `knowledge/` directory.*

**US-1507** — As a team lead, I want the knowledge base to surface contradictions between sessions.
*Acceptance: When new item contradicts existing one, `contradicts` relation created. Both items flagged with "conflicting evidence" badge.*

**US-1508** — As a developer, I want anti-patterns to surface as warnings in the Agent Guideline Generator.
*Acceptance: When generating a guideline, ACC queries anti-patterns by stack. Matching anti-patterns shown as preflight warnings.*

---

# PART 2 — REQUIREMENTS (continued)

---

## 6. Feature Specifications

### Module 1: Agent Runner
**Purpose:** Spawn, control, and monitor all supported agents in parallel PTY sessions.

**Supported Agents:**

| Agent | Tier | Spawn Command | Control | Notes |
|---|---|---|---|---|
| Claude Code | 1 — Full PTY | `claude --dangerously-skip-permissions` | Full write | Native subagents, hooks, MCP, skills |
| OpenCode | 1 — Full PTY | `opencode run --model <model> --dir <path>` | Full write | 75+ providers, native LSP, native subagents (task tool) |
| Aider | 1 — Full PTY | `aider --message "<prompt>"` or interactive | Full write | Git-native (auto-commit), worktree-friendly |
| Goose | 1 — Full PTY | `goose run` (interactive) or `goose run --resume <id>` | Full write | Block, MCP-native, recipes (multi-step workflows) |
| Cline CLI | 1 — Full PTY | `cline` (CLI 2.0) | Full write | Native subagents (v3.58+), approval workflows |
| Cursor | 1 — Full PTY (subscription) | `agent chat "<prompt>"` | Full write | Parallel subagents, background agents |
| Gemini CLI | 1 — Full PTY | `gemini --output-format json` | Full write | Free tier (1k req/day), Google, native subagents (@agent) |
| Qwen Code | 1 — Full PTY | `qwen-code run --model <model>` | Full write | Apache 2.0, free, native subagents (task tool) |
| Codex CLI | 1 — Full PTY | `codex run --model <model>` | Full write | OpenAI, cloud sandboxing, native subagents (spawn_agent) |

**Layout:** Dynamic grid — panels added per agent spawned. Resizable, collapsible, detachable.

**Per-Panel Controls:** Spawn / Kill / Restart / Clear / Detach / Screenshot

**Status chips:** `idle` `thinking` `writing` `running tests` `done` `failed` `stalled`

> **Status chip reliability note:** All status chips are inferred from PTY stdout patterns, not reported by the agent. They are informational and should not be used as hard gates for critical decisions. The Wave Orchestrator gates wave advancement on HANDOFF document presence and test results — not on status chip state. Status chips are cosmetic indicators only.

**PTY Output Processing Pipeline:**

Raw PTY stdout passes through a two-stage pipeline before reaching any consumer (xterm.js renderer, pattern detectors, ACB parser, reactive memory capture):

```
Raw PTY stdout
    │
    ▼
Stage 1 — ANSI/escape strip
    Strip ANSI colour codes, cursor movement, terminal control sequences.
    Produces clean text stream for all pattern-matching consumers.
    │
    ├──► xterm.js renderer  (receives RAW stream — renders colours correctly)
    │
    ▼
Stage 2 — Rate-limited dispatch (60fps batching)
    Buffers clean text lines, dispatches to consumers at max 60fps.
    Prevents React render saturation under high-output parallel agents.
    │
    ├──► SQLite event logger
    ├──► Idle detector
    ├──► Reactive memory pattern matcher
    ├──► ACB signal parser  (prefix check first: line.includes('[ACC:') before regex)
    └──► Status chip inferrer
```

xterm.js receives the raw stream directly for correct colour rendering. All intelligence consumers receive the escape-stripped clean stream. The 60fps rate limiter means parallel agent output never saturates React's render cycle.

**Preset Button Bar:** Project-scoped and global presets. One-click inject into target PTY. Tags, search, drag-to-reorder.

**Orchestrator Mode:** Toggle switches layout from peer panels to orchestrator-at-top + dynamic sub-agent grid. Only `waveEligible: true` agents appear in wave assignment dropdowns.

---

### Module 2: Asset Manager

#### 2a. Skills Library
- Sources: `~/.claude/skills/`, `~/.opencode/skills/`, `~/.gemini/skills/`, custom paths
- OpenClaw `SKILL.md` format compatible
- Monaco editor inline
- One-click inject into any agent's memory file
- Import from URL, file, or GitHub gist
- Tag + search + sort by last used

#### 2b. Memory Browser
- Files managed: `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, `.opencode/memory/`, `.aider.conf.yml` + `CONVENTIONS.md`, `.goose/instructions.md`, `.clinerules`, `.cursor/rules`, `qwen.md`
- Side-by-side diff: current vs. last session snapshot
- Add / remove / reorder entries without file editing
- Cross-agent sync: push block to multiple agents

#### 2c. MCP Registry
- Reads: `~/.claude/claude_desktop_config.json`, `~/.gemini/settings.json`, `~/.codex/config.json`
- Toggle per MCP per agent
- Add new MCP: type (stdio/sse/http), command, args, env key names
- Test connection inline
- Connector platform MCPs (Lark, Slack, Jira, GitHub) also registered here
- **First-class MCPs** (Supabase, GitHub) get expanded configuration panels — not just on/off toggles

#### 2d. Connector Vault
- Tauri Stronghold — AES-256 at rest
- Scope: global / agent / project
- Auto-inject as env vars on PTY spawn
- Required key scaffolding for playbook imports
- Audit log of when secrets were accessed
- **ACC Intelligence key:** Stores OpenRouter key for Mode 1 intelligence operations. ACC default key pre-loaded with usage cap. User override accepted and stored under `acc-intelligence` scope. Usage counter tracked in SQLite against cap threshold.
- **Stronghold fallback:** If Stronghold fails to initialise (known on some macOS/Windows configurations), ACC automatically falls back to the OS native keychain (macOS Keychain via Security framework, Windows Credential Manager via DPAPI). Fallback is transparent to all vault consumers — the same get/set interface is used. A Settings badge indicates which backend is active. Vault operations never block app startup.

#### 2e. Memory File Write Coordinator

All writes to agent memory files (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, `.opencode/memory/`, `CONVENTIONS.md` (Aider), `.goose/instructions.md`, `.clinerules`, `.cursor/rules`, `qwen.md`) are routed through a single Rust async write coordinator — not written directly by individual modules. This prevents race conditions when multiple ACC operations (Reactive Memory Capture, Skill Injection, Knowledge pre-load) attempt concurrent writes to the same file.

```
Write request queue (per file path)
    │
    ▼
Acquire file lock → read current content → apply change → write → release lock
    │
    ▼
Broadcast file-changed event → reload in Memory Browser UI
```

Reads by the active agent are not blocked — the coordinator uses a short-duration exclusive lock only during the write operation itself (typically <5ms). If an agent is actively mid-session, write requests are queued and applied on the next idle window (detected via idle detector signal).

#### 2e. Plugin Manager
- Lists extensions in `~/.vscode/extensions/` (shared with Cursor)
- Enable/disable per agent context
- Marketplace links for discovery

---

### Module 3: Project Intelligence

**Auto-Detection:** Reads `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `requirements.txt`, `composer.json`

**Detected:** Stack, test framework, package manager, env vars present, recent git activity

**Project Profile JSON:**
```json
{
  "id": "uuid",
  "path": "/projects/client-x",
  "name": "Client X Automation",
  "stack": ["Python 3.11", "FastAPI", "Supabase"],
  "test_framework": "pytest",
  "package_manager": "pip",
  "active_agents": ["claude", "opencode"],
  "active_skills": ["data-cleaner", "api-builder"],
  "active_mcps": ["filesystem", "supabase"],
  "preferred_models": {
    "implementation": "openrouter/minimax/minimax-m2.7",
    "review": "openrouter/qwen/qwen3.5-flash"
  },
  "connector": "lark",
  "lark_channels": ["oc_abc123"],
  "memory_snapshot": "2026-03-21T09:41:00Z"
}
```

---

### Module 4: Outcome Tracker

**Trigger:** Agent PTY idle for N seconds (configurable, default 60s) **AND** at least one supplementary signal is present.

**Supplementary signals (at least one required before outcome prompt fires):**
- A HANDOFF file was written to the session docs folder during this session, OR
- A passing test run was detected in PTY output (exit code 0 from a known test runner), OR
- The agent emitted a known completion phrase (`"All done"`, `"Task complete"`, `"I've finished"`)

**Rationale:** Idle-only triggers fire on legitimate non-completion events — long API calls, rate-limit backoff, thinking pauses, awaiting user confirmation. Requiring a supplementary signal ensures the outcome prompt reflects genuine task completion and keeps the outcome dataset clean. If no supplementary signal is present after 5 minutes of idle, ACC surfaces a status query (`"Still working? [Yes] [Stalled] [Done]"`) instead of a completion outcome prompt.

**Prompt:** `Task complete? [✓ Done] [✗ Failed] [↻ Revised] [→ Skip]`

**Stored per outcome:** Agent, project, task description (from last user input), duration, timestamp, session ID

**Dashboard:** Per-agent × per-task-type success rate grid. Sortable by project, agent, time range.

**Used by:** Module 5 (Task Router) for confidence scoring.

---

### Module 5: Task Router & Model Router

**Input:** Natural language task description

**v1 Routing Logic (rules-based, keyword classification):**
- Keyword classification: refactor / review / test / implement / debug / document
- Match against outcome stats per agent per project
- Rank agents by success rate for task type
- Apply model alternation pattern to suggested model
- **Limitation:** Keyword matching fails for tasks that don't use these exact terms. Confidence scores in v1 reflect outcome history hit rate only — not semantic match quality. The UI displays this as "estimated" confidence, not a precise metric. Users should treat v1 suggestions as a starting point, not a deterministic recommendation.

**v1.5 Routing Logic (local embedding similarity — upgrade path):**
- When Ollama is configured (Phase 10), v1 routing upgrades automatically to embedding-based similarity
- Task description is embedded locally (no API call) and compared against embedded outcome history descriptions via cosine similarity
- Gives meaningful routing confidence for tasks that don't contain classification keywords
- Enables graceful v1 → v2 transition without requiring full agent-mediated routing for every task

**v2 Routing Logic (Agent-mediated):**
- Task + outcome history → ACC spawns non-interactive agent session via Intelligence Layer → structured routing recommendation
- Returns: agent, model, wave structure suggestion, reasoning
- User always confirms before execution

**Output Display:**
```
Task: "Implement JWT authentication"
───────────────────────────────────────────────
Suggested:  OpenCode
Model:      openrouter/minimax/minimax-m2.7
Confidence: ~89% estimated  ← v1: based on 34 implementation tasks
            (keyword match — upgrade to v1.5 for semantic confidence)
Reason:     OpenCode success rate highest for implementation tasks in this project

Alternative: Claude Code (~71% estimated)
             openrouter/qwen/qwen3.5-flash

[Send to OpenCode]  [Send to Claude Code]  [Send to Both]
```

---

### Module 6: Agent Handoff Protocol

**Handoff Envelope (auto-constructed):**
```json
{
  "original_task": "Implement JWT authentication",
  "completed_by": "opencode",
  "model_used": "openrouter/minimax/minimax-m2.7",
  "output_summary": "JWT implemented in auth.ts and middleware.ts",
  "changed_files": ["src/auth.ts", "src/middleware/auth.ts"],
  "diff_preview": "...",
  "handoff_instruction": "Please review for security best practices",
  "next_agent": "claude",
  "next_model": "claude-opus-4-6"
}
```

User previews envelope → confirms → injected into target PTY as structured prompt.

---

### Module 7: Failure Analyzer & Correction Loop

**Stage 1 — Diagnosis:**
Input: last 200 lines of PTY output + task description + project profile + similar past failures
Output: root cause, evidence lines, suggested fix, confidence, similar failure matches

*Executed via ACC Intelligence Layer (OpenRouter Mode 1 default, or agent-mediated Mode 2 — see Section 9).*

**Stage 2 — Correction Generation:**
```markdown
# Correction for Agent A1 — Retry 1 of 2

## Bug
Error: Cannot find module 'src/auth/jwt'

## Root Cause
Import path uses src/ prefix but tsconfig paths are relative to project root

## Fix Required
Change: import { verifyJWT } from 'src/auth/jwt'
To:     import { verifyJWT } from './auth/jwt'
File:   src/middleware/auth.ts, line 3

## Test That Must Pass
npm test -- auth.middleware.spec.ts
```

**Stage 3 — Re-injection:**
Fires `opencode run` with original guideline + correction document concatenated. Monitors for updated HANDOFF with fresh test results. Escalates to user after 2 retries.

---

### Module 8: Session Replay & Feature Documentation Generator

**Timeline Event Types:** `read` `edit` `run` `user_input` `agent_output` `error` `handoff` `correction`

**Per-event data:** Agent, timestamp, target file/command, line changes, exit code, duration

**Filters:** By agent, event type, file, time range, outcome

**Export formats:** Markdown, PDF (via Tauri pdf plugin)

**Feature Documentation Generator:**

*Executed via ACC Intelligence Layer (OpenRouter Mode 1 default, or agent-mediated Mode 2/3 — see Section 9).*

**Generation strategy: 4 sequential targeted calls, not one large call.**

A single large call consuming the full session context risks token limit exhaustion and leaves no recovery path if it fails. Instead, ACC runs 4 sequential calls — one per document — so partial failure is recoverable and each call has a focused, smaller context.

**Pre-step — Session Summarisation (when session exceeds token threshold):**
If the session event log exceeds a configurable token threshold (default: 20,000 tokens of content), ACC runs a summarisation pass first — a short focused call that condenses the event log, HANDOFF documents, and corrections into a structured summary. The 4 document calls then use this summary rather than the raw log, keeping each call well within context limits.

```
Session events + HANDOFFs + corrections
    │
    ├── IF total tokens < threshold → pass directly to doc calls
    └── IF total tokens ≥ threshold → summarisation pre-call → condensed context
                                                              │
                                                              ▼
Call 1: EXECUTIVE_PLAN.md   — business summary, before/after architecture, results table
    ↓ (success required before proceeding)
Call 2: CHANGELOG.md        — versioned entries, new/modified files, per-agent contributions
    ↓ (success required before proceeding)
Call 3: QA_REPORT.md        — test suites, per-test results, regression confirmation
    ↓ (success required before proceeding)
Call 4: TECHNICAL_PLAN.md   — component specs, method signatures, feature flags, rollback
```

**Failure handling:** If any call fails (rate limit, timeout, context error), ACC saves the documents already generated, marks the failed document as `pending`, and surfaces a retry button in the UI for that document only. The developer is never left with nothing — partial generation is always preserved.

Cleanup step: prompts to delete intermediate files (PLAN, GUIDELINES, HANDOFFs), leaving only 4 canonical docs. Cleanup only offered after all 4 documents are generated successfully.

---

### Module 9: Reactive Memory Capture

**Patterns detected in PTY output:**
- "I see this project uses..."
- "I'll remember to..."
- "Note that..." / "Important:"
- Repeated failure → fix pattern (convention signal)
- User correction typed after agent output

**Signal-to-noise scoping — detection is phase-gated:**

The patterns above appear constantly in normal agent output — in code comments, documentation strings, and reasoning chains — producing a flood of false candidate prompts. Detection is therefore gated to specific PTY output phases only:

- **Active file-writing phase** (agent is editing files): patterns are **suppressed** — any "Note that" inside code the agent is writing is not a project convention
- **Idle/reflection phase** (agent has stopped writing and is summarising or concluding): patterns are **active** — this is when genuine learnings are expressed
- **User correction phase** (user has typed into the PTY after agent output): patterns are **always active** — user corrections are the highest-value signal

Phase detection uses the existing status chip inference signals (writing vs idle) as the gate. This alone eliminates the majority of false positives without requiring any change to the detection patterns themselves.

**Candidate prompt:** Non-blocking toast notification: `"Agent noted: always use async/await here. Add to CLAUDE.md? [Add] [Edit] [Skip]"`

**On Add:** Appends to project CLAUDE.md with timestamp and source session ID.

---

### Module 10: Team Playbooks

**`.acc` Bundle Format** (standard zip):
```
client-x-setup.acc
├── manifest.json          ← schema version, created_at, project name
├── profile.json           ← project profile (no secrets)
├── skills/
│   ├── data-cleaner.md
│   └── api-builder.md
├── memory/
│   └── project-context.md
├── mcps.json              ← MCP definitions + required secret key names
├── presets.json           ← preset command buttons
├── models.json            ← preferred model assignments
└── README.md              ← what this playbook is for, how to use it
```

**Secrets policy:** Key names exported as scaffolding only (e.g., `SUPABASE_URL: <required>`). Values never included. Importer prompted to fill via Connector Vault on first load.

**Import flow:** Select `.acc` file → preview contents → confirm → assets installed, MCPs configured, presets loaded, secret scaffolding prompts displayed.

---

### Module 11: Wave Orchestrator

**Work Item Table Builder:**

| Field | Type | Notes |
|---|---|---|
| Agent ID | Text | Convention: A1, A2, B1, C1 |
| Task | Text | Short description |
| Depends On | Multi-select | Other agent IDs |
| Wave | Auto-computed | From dependency depth |
| Model | Dropdown | From Model Registry |
| Guideline Path | Auto | docs/YYYY-MM-DD-slug/AGENT_ID_GUIDELINE.md |
| Status | Auto | queued / running / done / failed / manual / **limit-paused** |

**Wave Execution Controls:**
- Visual dependency graph (nodes + edges, color-coded by wave)
- "Execute Wave N" button — spawns all agents in that wave simultaneously
- Wave progress bar across top of Orchestrator Mode layout
- Per-agent panel: status, elapsed time, file change count, handoff detected

**Intra-Wave Dependency Resolution:**

The Wave Orchestrator evaluates per-agent readiness against each agent's specific `depends_on` list — not against the entire preceding wave completing. When an agent's direct dependencies are all verified, it unlocks immediately, even if sibling agents in the same wave are still running.

```
Example: B1 depends_on=[A1], B2 depends_on=[A1, A2]

A1 completes (verified) ──► B1 unlocks and spawns immediately
A2 still running         ──► B2 remains queued
A2 completes (verified)  ──► B2 unlocks and spawns

Result: B1 starts 40 minutes earlier than under full-wave-gate model
```

This is a pure DAG scheduling optimisation. The dependency graph UI already renders nodes and edges — the execution engine simply evaluates readiness per-node rather than per-wave-level. All existing handoff verification, ACK signal resolution, and correction loop logic applies per-agent as before.

**Stall Detection:** 10-minute timer without file system changes → alert with [Retry] [Complete Manually] [Terminate]. Timer is configurable per agent and per task type in Settings — long compilation or heavy test runs warrant a higher threshold.

**Conventions enforced:**
- Zero-Regression Rule: existing test suite must pass before wave proceeds
- New-Files-First: warn if agent brief asks to modify existing file directly
- Feature Flag Pattern: template auto-inserted into guideline for any code modification

---

### Module 12: Agent Guideline Generator

**Input Form Fields:**
- Agent ID, Task description, Objective (one sentence)
- Depends on (multi-select from existing agents in plan)
- Model (from Model Registry dropdown)
- Files to create (path + purpose pairs)
- Files NOT to touch (path + reason pairs)
- Test requirements (checklist — happy path, error paths, edge cases)
- Input contracts (what from predecessors)
- Output contracts (what to expose to successors)

**Output:**
- `AGENT_<ID>_GUIDELINE.md` written to `docs/YYYY-MM-DD-<slug>/`
- CLI preview: exact `opencode run` or `claude` command shown
- "Copy Command" and "Execute" buttons

---

### Module 13: Handoff Monitor

**Watch target:** `docs/YYYY-MM-DD-<slug>/HANDOFF_*.md`

**Write-completion debounce:** fs.watch fires on the first file system event, which may occur before the agent has finished writing. A 500ms debounce is applied — the monitor waits 500ms after the last file system event before attempting to parse. If the file is still incomplete after parsing, the monitor retries once after 2 seconds before surfacing a parse error.

**Required HANDOFF Schema:**

Agents are instructed via their guideline to produce a HANDOFF file with these required sections. The monitor validates presence of all required sections before accepting the handoff:

```markdown
# HANDOFF: <Agent ID> — <Task Name>
**Agent:** <ID>  **Wave:** <N>  **Status:** complete | partial

## Completed Work
<what was built — files created/modified with line counts>

## Test Results
<test runner output or explicit "no tests required" + reason>
**All tests passing:** yes | no
**Exit code:** 0 | <non-zero>

## Interface Contracts Exposed
<exports, function signatures, API routes, types that successor agents depend on>

## Files NOT Modified
<confirmation that restricted files were untouched>

## Design Decisions
<any deviations from the guideline + rationale>

## Handoff Instructions
<what the next agent needs to know>
```

**Validation rules:**
- All 7 section headings must be present (case-insensitive)
- `All tests passing: yes` is required for the handoff to auto-approve; `no` forces manual review
- If `Exit code` is non-zero, handoff is immediately flagged regardless of other content
- Agent-reported "all tests passing" is treated as a signal for review, not ground truth — the Zero-Regression Rule runs the test suite independently before wave advancement

**On detection:**
- Parse required sections, extract test status, interface contracts, changed files
- Validate schema completeness and test passing status
- Display in Handoff Panel with Approve / Flag Issue controls

**On approve:** Dependent agents unlock in Wave Orchestrator per intra-wave dependency resolution rules. Status updates to `verified`.

**On flag:** Correction Loop (Module 7) triggered automatically.

---

### Module 14: Upstream Connector Loop

**The 7 Stages (platform-agnostic):**

```
[1] MONITOR   → Poll connector for new messages/issues
[2] DETECT    → Classify: feature_request / bug_report / optimization / question
[3] PROPOSE   → Create proposal doc in connector's native format
[4] AWAIT     → Poll for approval signal (reaction, status change, reply)
[5] EXECUTE   → Trigger Wave Orchestrator with extracted execution plan
[6] VERIFY    → QA gate: all tests pass, handoffs verified
[7] REPORT    → Post summary + docs back to connector. Create delivery log entry.
```

**Supported Connectors (v1):**

| Platform | MCP | Approval Signal | Proposal Medium | Report Medium |
|---|---|---|---|---|
| **Lark** | `@larksuiteoapi/lark-mcp` (official) | ✅ reaction or "approved" reply | Lark Doc | Thread message + Lark Doc + Base record |
| **Slack** | `mcp.slack.com/mcp` (official hosted) | ✅ reaction or "approved" reply | Canvas or thread | Thread message |
| **Jira** | `mcp.atlassian.com/v1/sse` (official) | Status → "Approved" transition | Sub-task or linked issue | Ticket update + attachments |

**Supported Connectors (v2):**
Linear (official MCP), GitHub Issues (GitHub MCP), Notion (official MCP), Confluence (via Atlassian Rovo)

**Connector Config Schema:**
```typescript
interface ConnectorConfig {
  id: string
  platform: 'lark' | 'slack' | 'jira' | 'linear' | 'github'
  mcp_server: string
  project_id: string
  monitor: {
    targets: string[]        // channel IDs, project keys, board IDs
    keywords: string[]       // trigger words
    poll_interval: number    // minutes
  }
  detect: {
    structured: boolean      // Jira/Linear = true (pre-classified), Slack/Lark = false
  }
  propose: {
    folder: string           // where to create proposal docs
    require_confirmation: boolean  // ask user before posting?
  }
  await: {
    approval_signals: string[]
    timeout_days: number
    reminder_after_hours: number
  }
  report: {
    delivery_log_id: string  // Lark Base ID, Linear project ID, etc.
  }
}
```

**Architect Agent:**
Runs as a background Rust async task (not a PTY session). Spawns non-interactive agent sessions for classification and proposal generation. The agent calls connector MCP tools directly using its configured credentials. Persists state in SQLite between polls.

**Resilience strategy:**

The Architect Agent loop runs silently in the background and must degrade gracefully — failures should never crash the app or produce invisible stale state.

```
Poll cycle (every N minutes per connector):
    │
    ├── Timeout: each MCP call has a 30s hard timeout
    │   → on timeout: log to SQLite, increment consecutive_failures counter
    │
    ├── Consecutive failures ≥ 3:
    │   → connector marked 'degraded' in connector_configs
    │   → polling interval doubles (exponential backoff, max 60 min)
    │   → Connector Monitor panel shows degraded badge
    │   → user can force-retry or disable connector
    │
    ├── Malformed MCP response:
    │   → log raw response to SQLite for debugging
    │   → skip item, continue loop (do not crash)
    │
    ├── Concurrent poll guard:
    │   → if previous poll for a connector is still running, skip this cycle
    │   → prevents call stacking when a poll takes longer than the interval
    │
    └── Recovery:
        → on first successful poll after degraded state: reset failure counter
        → restore original poll interval
        → clear degraded badge
```

Failure state is visible in the Connector Monitor UI — developers are never left wondering why no items are being detected.

---

### Module 15: Supabase & GitHub — First-Class Integrations

These are not generic MCPs. They are purpose-built integrations that unlock capabilities unavailable through standard MCP toggling.

#### 15a. Supabase Integration

**MCP Server:** `https://mcp.supabase.com/mcp` (official, OAuth 2.0)

**Feature Group Toggles (per project):**

| Group | Default | What It Enables |
|---|---|---|
| `docs` | ✅ On | Agents read Supabase documentation inline |
| `database` | ✅ On | Schema inspection — tables, columns, RLS policies |
| `storage` | ✅ On | Read bucket structure and file metadata |
| `functions` | ⚠️ Opt-in | Read Edge Function code and invocation logs |
| `branching` | ⚠️ Opt-in | Create/merge Supabase branches for safe development |
| `development` | 🔒 Locked | Migration application — requires explicit unlock per session |
| `debugging` | ⚠️ Opt-in | Read logs, query performance, error traces |
| `account` | 🔒 Locked | Org/billing — disabled by default, no agent access |

**Safe Migration Workflow (ACC-enforced):**
```
Agent reads schema via MCP (database group)
    ↓
Agent writes migration file to supabase/migrations/
    ↓
ACC flags migration for human review
    ↓
Human reviews in Supabase dashboard or via CLI
    ↓
Human applies: supabase db push  (or branching merge)
    ↓
Agent verifies via MCP schema read post-migration
```

The `development` group (which enables `execute_sql`) is locked behind a per-session unlock requiring explicit user confirmation. This prevents agents from running destructive migrations accidentally.

**Project-scoped config stored in project profile:**
```json
{
  "supabase": {
    "project_ref": "xyzabc123",
    "feature_groups": ["docs", "database", "storage"],
    "readonly_execute_sql": true,
    "lockdown_migrations": true
  }
}
```

**Supabase-Aware Intelligence:**
- Project Intelligence (Module 3) detects Supabase in dependencies → auto-suggests Supabase MCP with safe defaults
- Knowledge Compounder (Module 16) generates Stack Runbooks specific to Supabase patterns observed in sessions
- Failure Analyzer (Module 7) recognizes Supabase error patterns (RLS violations, connection pool exhaustion, missing env vars)

#### 15b. GitHub Integration

**MCP Server:** `https://api.githubcopilot.com/mcp/` (official, co-developed with Anthropic)

**Toolsets available (toggle per project):**

| Toolset | Default | What It Enables |
|---|---|---|
| `repos` | ✅ On | Read file contents, directory structure, commits |
| `issues` | ✅ On | Read/create/update issues — upstream connector source |
| `pull_requests` | ✅ On | Create PRs, read PR comments and reviews |
| `actions` | ✅ On | Monitor CI/CD runs, read workflow logs |
| `code_security` | ⚠️ Opt-in | Dependabot alerts, code scanning results |
| `projects` | ⚠️ Opt-in | GitHub Projects board management |
| `notifications` | ⚠️ Opt-in | Watch mentions, review requests |

**Security: Lockdown Mode (auto-enabled for public repos):**
- Content sanitization prevents prompt injection from malicious PR/issue content
- Agents cannot act on instructions embedded in user-submitted content
- ACC detects repo visibility and enables Lockdown Mode automatically

**GitHub as QA Signal:**
```
Wave final agent completes + HANDOFF verified
    ↓
ACC creates PR via GitHub MCP (pull_requests toolset)
PR description = CHANGELOG.md content
    ↓
GitHub Actions triggered (CI/CD runs)
    ↓
ACC polls Actions status every 2 minutes (actions toolset)
    ↓
Green CI = QA pass → proceed to Report stage
Red CI  = QA fail → Failure Analyzer with Actions log as input
                  → Correction loop fires
```

**GitHub Issues as Upstream Connector (Tier 1):**
GitHub Issues joins Lark, Slack, and Jira as a first-class connector source for the 7-stage loop. An issue filed → ACC classifies → proposes (as issue comment) → approved (label or comment) → wave executes → PR created → CI passes → issue closed with report.

```typescript
// Connector spec addition
{
  id: 'github',
  label: 'GitHub Issues',
  mcpServer: 'https://api.githubcopilot.com/mcp/',
  structured: true,        // Issues have type/label pre-applied
  approvalSignals: ['label:approved', 'label:ready-to-build', '/approve'],
  proposalMedium: 'issue_comment',
  reportMedium: ['issue_comment', 'pr_description', 'issue_close']
}
```

---

### Module 16: Knowledge Compounder

**Purpose:** Asynchronously distill every completed workloop into structured, tagged, compounding learning materials — without requiring any user input.

#### Trigger

```
Wave complete → QA pass → Feature Docs generated (Module 8)
                                    ↓
                     [ASYNC — runs in background, non-blocking]
                          Knowledge Compounder activates
```

The compounder never blocks the developer's next task. It runs after the workloop closes, surfaces results in the Knowledge Panel, and pre-loads relevant items into the next session's context automatically.

#### Extraction Strategy — Two-Pass Incremental Approach

A single large context call (full session log → knowledge items) is expensive and fragile at scale. Instead, the compounder uses a two-pass approach that dramatically reduces token usage:

**Pass 1 — Cheap pattern pre-pass (no Intelligence Layer call):**
ACC performs local pattern matching against HANDOFF documents, corrections, and failure analyses to build a candidate list. This pass detects:
- File ownership conventions (agent claimed exclusive ownership of a file)
- Repeated failure → fix pairs (same error pattern appeared and was resolved)
- Interface contracts defined (exported types, API routes, function signatures)
- Explicit agent decisions (text in HANDOFF `## Design Decisions` sections)

This typically produces 3–8 structured candidates per wave with no API cost.

**Pass 2 — Focused Intelligence Layer call:**
ACC sends only the candidates (not the full session log) to the Intelligence Layer for classification, tagging, confidence assignment, and prose generation. Input is typically 2,000–5,000 tokens rather than 50,000+.

```
Pass 1 output (candidates, ~500 tokens)
    +
Relevant existing knowledge items for contradiction check (~1,000 tokens)
    │
    ▼
Intelligence Layer call (~2,000 tokens total)
    │
    ▼
Structured JSON: classified items with type, title, tags, confidence
```

#### Deduplication and Confidence Mechanism

This is the core of the compounding flywheel. The mechanism must be explicitly defined:

**Step 1 — Candidate fingerprinting:**
Each new candidate is fingerprinted using a combination of: its type, primary tag(s), and a 3-word key phrase extracted from its title by the Intelligence Layer call. Example fingerprint: `pattern|jwt|stateless-auth`.

**Step 2 — Existing item lookup:**
ACC queries `knowledge_items` for items with matching type and overlapping tags. This is a fast SQLite query, not a semantic call.

**Step 3 — Similarity scoring (lightweight):**
For each candidate, ACC computes a simple token overlap score (Jaccard similarity on title word tokens) against the retrieved existing items. This requires no embedding model.

- **Score ≥ 0.6:** Likely same item → increment `confirmation_count`, update `last_confirmed`, merge any new tags
- **Score 0.3–0.59:** Possibly related → create `knowledge_relation` with type `extends` or `confirmed_by`, flag for human review in Knowledge Panel
- **Score < 0.3:** New item → insert as new `knowledge_item` with `confirmation_count = 1`

**Step 4 — Contradiction detection:**
When a new item's sentiment conflicts with an existing high-confidence item on the same fingerprint (e.g., new item recommends against a pattern the existing item recommends), the Intelligence Layer is invoked with both items for contradiction assessment. Confirmed contradictions create a `contradicts` relation and flag both items.

This approach requires zero embedding infrastructure in v1 (Jaccard similarity is pure string processing), produces meaningful confidence scores, and provides a clean upgrade path to semantic embeddings in Phase 10 when Ollama is available.

#### Input Sources

| Source | What's Extracted |
|---|---|
| Session event log (SQLite) | What was tried, what order, what changed |
| HANDOFF documents | Design decisions, trade-offs, interface choices |
| CORRECTION documents | What failed, what the fix was |
| Failure analyses | Root causes, evidence patterns |
| Outcome records | Success/failure per agent per task type |
| Feature Docs (4 canonical) | Structured summaries already generated |
| PTY output patterns | Agent self-corrections, repeated patterns |

#### 5 Output Formats

**1. Decision Log** — Architecture and design choices with context and outcome
```markdown
## Decision: JWT over session-based auth
Project: Client X | Date: 2026-03-21 | Session: #47 | Outcome: ✓ Success

**Context:** Session auth causing race conditions in concurrent API requests.
**Options:** Session+Redis (race risk) vs JWT (stateless) vs OAuth2 (too heavy)
**Chosen:** JWT with 15-min expiry + refresh token rotation
**Result:** 47/47 tests passing. No regressions.
**Tags:** #auth #jwt #architecture #python #client-x
```

**2. Pattern Card** — Reusable technique confirmed across multiple sessions
```markdown
## Pattern: Model Alternation for Parallel Waves
Confidence: ████████░░ High (8 confirmations)
First observed: 2026-03-12 | Last confirmed: 2026-03-21

**Pattern:** Alternate models between Wave 1 parallel agents:
Odd agents (A1, A3) → Minimax M2.7 (fast file operations)
Even agents (A2, A4) → Qwen 3.5 Flash (complex logic, test writing)

**Why it works:** Distributes API load. Prevents single-model bottlenecks.
**When to use:** Any Wave with 2+ parallel agents.
**Tags:** #wave-orchestration #model-routing #performance
```

**3. Anti-Pattern Warning** — What to avoid, with evidence and correct alternative
```markdown
## ⚠️ Anti-Pattern: Modifying existing files without feature flags
Severity: High | Observations: 3 | Stack: Python, FastAPI, TypeScript

**What happened:** Agent modified existing file directly → broke imports in
2 other files → regression found in QA → 45 min of correction work.

**Root Cause:** Old code deleted instead of preserved below feature flag.

**Correct approach:**
New logic in NEW file. Import behind env flag in existing file.
Old code stays below the flag, untouched.

**MAFW Rule enforced:** New-Files-First + Feature Flag Pattern
**Tags:** #anti-pattern #feature-flags #regression #mafw
```

**4. Stack Runbook** — Step-by-step operational guide for a specific stack operation
```markdown
## Runbook: Supabase Migration via Agent
Stack: Python + FastAPI + Supabase | Success rate: ████████████ 100% (3/3)
Last used: 2026-03-21

**Reliable steps:**
1. Agent reads schema via Supabase MCP (database group)
2. Agent writes migration to supabase/migrations/ — does NOT apply it
3. ACC flags for human review
4. Human applies via supabase db push or dashboard
5. Agent verifies via schema read post-migration

**Common failure:** Agent tries execute_sql directly → permission error
**Fix:** Keep development group locked. Always apply migrations manually.
**Tags:** #supabase #migration #database #python #runbook
```

**5. Lesson Brief** — Human-readable insight for onboarding or retrospectives
```markdown
## Lesson: Parallel agents need explicit file ownership contracts
From: JWT auth feature (Wave 1, 2026-03-21) | Audience: New team members

**The lesson:**
When A1 and A2 run in parallel, they must have non-overlapping file
ownership. Without this, both write to the same file and the second
write silently overwrites the first — including test files.

**How ACC handles it now:**
"Files NOT to Touch" section in Agent Guideline Generator.
Each agent's brief lists files owned by other agents.
Handoff Monitor checks for conflicts before Wave 2 unlocks.

**Edge case:** Scope test files by agent (test_auth_A1.py, not test_auth.py)
**Tags:** #parallel-execution #file-ownership #lessons #onboarding
```

#### Knowledge Base: The Compound Effect

Items are not static. They evolve across sessions:

```
Session 1: Pattern detected (confidence: low, count: 1)
Session 3: Same pattern confirmed (confidence: medium, count: 3)
Session 8: Pattern well-established (confidence: high, count: 8)
Session 12: Contradicting evidence found → flag for review
           → knowledge_relations: { type: 'contradicts' }
```

When confidence crosses thresholds, the item's behavior changes:
- **Low (1–2):** Surfaced as "emerging pattern" — informational only
- **Medium (3–5):** Injected as context suggestion into next session
- **High (6+):** Auto-injected into CLAUDE.md session preamble and Agent Guideline warnings

#### Preflight Integration with Agent Guideline Generator

When generating a guideline for a new wave agent, ACC queries the knowledge base and surfaces relevant warnings directly in the guideline form:

```
┌─ Preflight Knowledge Check ─────────────────────────────────────┐
│  Stack: Python + Supabase                                        │
│                                                                  │
│  ⚠️ Anti-Pattern (High confidence): Modifying existing files     │
│     without feature flags — seen 3x, caused regressions         │
│                                                                  │
│  📋 Runbook available: Supabase Migration via Agent (100%)       │
│     → Inject into guideline? [Yes] [Preview] [Skip]             │
│                                                                  │
│  ✓ Pattern: Model Alternation confirmed for this project         │
│     A1 → Minimax, A2 → Qwen (applied automatically)             │
└──────────────────────────────────────────────────────────────────┘
```

#### Knowledge Panel UI

```
┌── Knowledge Base ─────────────────────────────────────────────────┐
│  Search: [supabase migration        ]  [All types ▾] [This project▾]│
│                                                                    │
│  📈 3 new items from today's session  [View New]                  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ PATTERN  ████████░░  8 confirmations  Global                 │ │
│  │ Model Alternation for Parallel Waves                         │ │
│  │ #wave-orchestration #model-routing  · opencode, claude       │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ ⚠️ ANTI-PATTERN  ████░░░░░░  3 observations  Python, FastAPI │ │
│  │ Modifying existing files without feature flags               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ 📋 RUNBOOK  ██████████  100% success (3/3)  Client X        │ │
│  │ Supabase Migration via Agent                                  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  [Export Selected]  [Add to Playbook]  [Export All as Markdown]   │
└────────────────────────────────────────────────────────────────────┘
```

---

### Module 17: Agent Communication Bus (ACB)

**Purpose:** Enable real-time, ACC-mediated peer communication between agents running within the same wave — so agents can negotiate shared contracts, surface blockers, and broadcast status mid-execution without waiting for a handoff document to close.

#### Design Principles

ACC remains the **sole mediator** of all inter-agent communication. Agents do not communicate directly with each other. This is intentional:

- Maintains P1 (human in the loop) — ACC can intercept, inspect, or block any signal before delivery
- Maintains P4 (transparent, not magic) — all signals are visible in the UI and logged
- Feeds the Knowledge Compounder — recurring signal patterns (repeated CONTRACT_PROPOSAL types, common BLOCKER causes) are extractable as architectural conventions
- Requires zero binary changes to Claude Code, OpenCode, Aider, Goose, Cline, Cursor, or any agent

#### Communication Mechanism: Stdout Signal Lines

Agents write structured signal lines to their standard output during execution. ACC's existing PTY output parser — already watching for status patterns, reactive memory triggers, and idle detection — is extended to recognise and route these signals in real time.

No files are created. No cleanup is required. Signals are ephemeral by design: meaningful in the moment, not persisted beyond a thin SQLite audit record.

#### Signal Line Format

The format is informed by principles from embedded and network protocol design:

- **Prefix sentinel** (NMEA 0183 influence) — a reliable, unambiguous parser hook that distinguishes signal lines from normal agent output
- **Structured key-value header** (Syslog RFC 5424 influence) — machine-parseable and human-readable without a schema
- **Topic-style addressing** (MQTT influence) — clean, filterable routing
- **Priority field** (CAN Bus influence) — blocking signals preempt informational ones in ACC's delivery queue

```
[ACC:<TYPE> from=<ID> to=<ID|ALL> priority=<P> id=<MSGID>] <human-readable body>
```

**Field definitions:**

| Field | Values | Notes |
|---|---|---|
| `TYPE` | `CONTRACT` `QUERY` `STATUS` `BLOCKER` `CONFLICT` `RESOLVE` | Signal category — drives ACC routing behaviour |
| `from` | Agent ID (A1, B1, etc.) | Sender — matched against active wave agents |
| `to` | Agent ID or `ALL` or `ORCHESTRATOR` | Recipient — `ORCHESTRATOR` surfaces to UI only, no PTY injection |
| `priority` | `INFO` `ACK` `HIGH` | INFO = fire-and-forget; ACK = acknowledged delivery required; HIGH = immediate escalation |
| `id` | Short alphanumeric (c001, q002) | Unique per session — used for threading replies |
| `ref` | Prior message id (optional) | Closes the loop on a prior QUERY or CONTRACT — enables message threading without a separate lookup |

**Signal types and ACC behaviour:**

| Type | Purpose | ACC Action |
|---|---|---|
| `CONTRACT` | Agent proposes a shared interface, schema, or naming convention other agents depend on | Delivered to target via PTY stdin injection; if `priority=ACK`, wave advancement blocked until RESOLVE received |
| `QUERY` | Agent needs a specific piece of information from a peer | Delivered to target PTY; non-blocking by default |
| `STATUS` | Agent announces its current state to peers | Logged to SQLite; displayed in Orchestrator Mode panel; not injected into PTY |
| `BLOCKER` | Agent cannot proceed without input | Immediately escalated to ACC UI as a user-action alert; wave paused |
| `CONFLICT` | Agent detects a collision with a peer (same file, same function name, incompatible interface) | Wave Orchestrator paused; displayed in Handoff Panel; user resolution required |
| `RESOLVE` | Agent acknowledges and responds to a prior signal | Closes the referenced open signal; unblocks wave if applicable |

**Real examples:**

```
[ACC:CONTRACT from=A1 to=ALL priority=INFO id=c001] UserProfile defined at src/types/user.ts — all agents import from @/types/user, do not redefine
[ACC:QUERY from=A2 to=A1 priority=ACK id=q001] Confirm: using JWT not session tokens for auth middleware?
[ACC:RESOLVE from=A1 to=A2 priority=INFO ref=q001] Confirmed JWT — implementation at src/auth/jwt.ts
[ACC:STATUS from=B1 to=ALL priority=INFO id=s001] Completed integration test scaffold — moving to API route wiring
[ACC:BLOCKER from=B1 to=ORCHESTRATOR priority=HIGH id=b001] Cannot proceed — need A1 route structure before wiring middleware
[ACC:CONFLICT from=A2 to=A1 priority=HIGH id=x001] Both writing to src/middleware/auth.ts — coordinate ownership
```

#### PTY Delivery Format

When ACC routes a signal to a target agent, it injects the following into that agent's PTY stdin:

```
[ACC → <TYPE> from <FROM_ID>]
<human-readable body>
[ref: <MSGID> — reply with: ACC:RESOLVE from=<YOUR_ID> to=<FROM_ID> ref=<MSGID>]
```

The injected message is structured to be natural for the LLM agent to read and act on, including the exact syntax for a reply signal so agents do not need to remember the format.

#### SQLite Schema

```sql
CREATE TABLE agent_messages (
  id          TEXT PRIMARY KEY,   -- signal id (e.g. c001)
  session_id  TEXT NOT NULL,
  wave        INTEGER,
  from_agent  TEXT NOT NULL,
  to_agent    TEXT NOT NULL,      -- agent ID, ALL, or ORCHESTRATOR
  type        TEXT NOT NULL,
  priority    TEXT NOT NULL,
  body        TEXT NOT NULL,
  ref_id      TEXT,               -- references prior message id
  status      TEXT DEFAULT 'OPEN',-- OPEN | ACKNOWLEDGED | RESOLVED
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);
```

The table stores the audit trail and open/resolved state. It does not store full message history for resolved signals beyond the session — the Knowledge Compounder extracts structural patterns (recurring CONTRACT types, BLOCKER causes) before the session closes.

#### Agent Guideline Generator Integration

The Agent Guideline Generator (Module 12) automatically appends a Communication Protocol section to every generated guideline:

```markdown
## Agent Communication Protocol
During execution, you may signal peer agents or ACC by writing structured
lines to stdout in this exact format:

[ACC:<TYPE> from=<YOUR_ID> to=<TARGET|ALL> priority=<P> id=<UNIQUE_ID>] <message>

Types:
  CONTRACT — propose a shared interface or convention other agents depend on
  QUERY    — request specific information from a peer
  STATUS   — broadcast your current state (informational)
  BLOCKER  — signal you cannot proceed without input (escalates immediately)
  CONFLICT — flag a collision with a peer agent
  RESOLVE  — acknowledge and close a prior signal (include ref=<msg_id>)

Priorities:
  INFO — fire and forget, logged only
  ACK  — peer must acknowledge before you proceed
  HIGH — immediate escalation to ACC and user

Examples:
  [ACC:CONTRACT from=A1 to=ALL priority=INFO id=c001] UserProfile at src/types/user.ts
  [ACC:QUERY from=A1 to=B1 priority=ACK id=q001] Are you handling auth in middleware or route handlers?
  [ACC:RESOLVE from=A1 to=B1 priority=INFO ref=q001] Confirmed middleware — see src/middleware/auth.ts

ACC will deliver your signal to the target agent automatically.
Use BLOCKER or ACK-priority signals only when you genuinely cannot proceed.
Prefer STATUS and INFO for awareness-level communication.
```

#### Message Bus Panel (UI)

A new panel integrated into the Handoff Monitor view in the ACC UI:

```
┌── Agent Messages ──────────────────────────────────────────────────┐
│                                                                     │
│  OPEN (2)                                                           │
│  ┌──────┬───────────┬────────────────────────────┬───────────────┐ │
│  │  ID  │ From → To │ Subject                    │ Status        │ │
│  ├──────┼───────────┼────────────────────────────┼───────────────┤ │
│  │ q001 │ A2 → A1   │ JWT vs session tokens?     │ 🔴 ACK OPEN   │ │
│  │ b001 │ B1 → ORC  │ Needs A1 route structure   │ 🔴 BLOCKED    │ │
│  └──────┴───────────┴────────────────────────────┴───────────────┘ │
│  [View] [Force Resolve] [Inject to Target Manually]                 │
│                                                                     │
│  RESOLVED THIS SESSION (4)  [View Log]                              │
└─────────────────────────────────────────────────────────────────────┘
```

The human can **Force Resolve** any open signal at any time — consistent with P1.

#### Integration with Existing Modules

| Module | Change |
|---|---|
| **Module 11 — Wave Orchestrator** | ACK-priority and BLOCKER signals pause wave advancement; RESOLVE unblocks |
| **Module 12 — Agent Guideline Generator** | Communication Protocol section auto-appended to every guideline |
| **Module 13 — Handoff Monitor** | Open ACK signals must be resolved before a handoff is marked verified |
| **Module 7 — Failure Analyzer** | BLOCKER signals fed as input — body included in failure context |
| **Module 8 — Session Replay** | `acb_signal` event type added to timeline (sender, type, recipient, resolved status) |
| **Module 16 — Knowledge Compounder** | Recurring CONTRACT and BLOCKER patterns extracted as architectural conventions and anti-patterns |
| **Module 3 — Project Intelligence** | Common CONTRACT signal types across sessions surface as stack-specific interface conventions |

#### What This Does Not Do

- Agents do not communicate directly with each other — ACC is always in the relay path
- No files are created — signals are ephemeral stdout lines, not documents
- No network infrastructure — entirely local, in-process
- Does not replace handoffs — HANDOFF documents remain the formal wave completion signal; ACB handles mid-execution coordination only

#### Build Placement

Phase 6 extension — one sprint (2 weeks) appended after the Wave Orchestrator and Guideline Generator are complete. The PTY watcher extension, SQLite table, and UI panel reuse infrastructure already built in Phases 1–6. The guideline template addition is a single template change.

---

### Module 18: Session Resilience & Token Guard

**Purpose:** Detect, handle, and recover from agent session interruptions caused by plan limits, API quota exhaustion, and token overruns — during both regular and wave-orchestrated execution. Provide visibility into intelligence layer usage to prevent unexpected interruptions.

#### The Problem

When a coding agent (Claude Code, OpenCode) or the ACC Intelligence Layer hits a plan limit or token quota mid-execution, the PTY stream goes silent with an error message. The current Wave Orchestrator has no `limit-paused` state — it treats this as a failure and triggers the correction loop, which re-fires the same session, hits the same limit again, exhausts its 2 retries, and escalates as a correction failure. This is entirely the wrong behaviour. A limit hit is not a code error — it is a resource constraint that requires human action, not automated retry.

#### Component 1 — Limit Event Detector

Extends the PTY output parser to recognise known limit error signatures across all supported agents:

```
Claude Code patterns:
  "You've reached your usage limit"
  "Rate limit exceeded"
  "This model is currently overloaded"
  "Your Claude.ai Pro plan has been exhausted"

OpenCode / OpenRouter patterns:
  "429 Too Many Requests"
  "quota exceeded"
  "insufficient_quota"
  "rate_limit_exceeded"
  "context_length_exceeded"

ACC Intelligence Layer (Mode 1 — OpenRouter):
  HTTP 429 response
  "No credits remaining"
  "Free tier limit reached"
```

On detection, the Limit Event Detector:
1. Classifies the event: `PLAN_LIMIT` | `RATE_LIMIT` | `QUOTA_EXHAUSTED` | `CONTEXT_EXCEEDED`
2. Marks the affected session in `plan_agents` as `status = 'limit-paused'` (not `failed`)
3. Fires a system notification immediately
4. Suppresses the correction loop for this session — limit events must not trigger automated retry

#### Component 2 — Wave Resilience

The Wave Orchestrator gains `limit-paused` as a first-class plan_agents status:

```
'queued' | 'running' | 'done' | 'failed' | 'manual' | 'limit-paused'  ← NEW
```

**Wave behaviour on limit-paused:**
- The paused agent's wave slot is frozen — it neither proceeds nor triggers corrections
- Other agents in the same wave that do not share the same limit continue running
- Wave advancement is blocked only for agents that depend on the paused agent's handoff
- Independent agents in the next wave remain blocked until the paused agent resumes or is manually completed

**Recovery options surfaced in the Wave Orchestrator UI:**

```
┌── Agent A2 — LIMIT PAUSED ─────────────────────────────────────────┐
│  Event: Plan limit reached (Claude Code subscription)               │
│  Detected: 14:32:07  |  Wave 1 of 3                                 │
│                                                                      │
│  [Resume when ready]    Waits for user to confirm limit resolved     │
│  [Switch model]         Re-run A2 with a different model/agent       │
│  [Complete manually]    Mark as done, write HANDOFF manually         │
│  [Abort wave]           Cancel all remaining agents                  │
└──────────────────────────────────────────────────────────────────────┘
```

**Resume flow:** User resolves the limit (plan resets, switches to OpenRouter, upgrades plan), clicks `Resume when ready`. ACC re-spawns the agent session with the original guideline + any ACB messages it missed while paused. The session resumes from the beginning of its task (agents cannot resume from a mid-execution checkpoint — they restart the task).

#### Component 3 — Token Guard

Proactive monitoring to warn users before limits are hit, not after.

**For coding agent sessions (Mode 2 or interactive sessions):**
- Claude Code and OpenCode emit token usage in their PTY output in verbose mode
- The PTY parser captures usage lines and logs to a new `token_usage` SQLite table
- Running totals are tracked per session and per day against configurable warning thresholds
- Warning toast when estimated remaining capacity drops below threshold: *"A2 is approaching its token limit for this session (~80% used). Consider splitting the task."*

**For ACC Intelligence Layer (Mode 1 — OpenRouter):**
- HTTP responses include token usage in headers or response body
- ACC tracks cumulative usage against the default key cap
- Surfaces a usage indicator in Settings: `Intelligence: 12,340 / 50,000 tokens (default quota)`
- Yellow warning at 80%, red warning at 95%, prompt to add own key at 100%

**For ACC Intelligence Layer (Mode 3 — Interactive Session):**
- The designated panel accumulates context across all queries within the session
- Token Guard monitors the running context size via usage output in the PTY stream
- Context usage bar visible in Settings → Intelligence → Mode 3 panel
- Yellow warning at 70% context capacity (lower threshold than coding sessions — intelligence queries can be large)
- At 90%: ACC prompts user to clear the session or auto-spawns a fresh designated panel and transfers the designation
- If context limit is hit mid-query: ACC captures partial response, marks the intelligence task as `context-exceeded`, falls back to Mode 1 for that task only, and notifies the user

**SQLite schema addition:**

```sql
CREATE TABLE token_usage (
  id            TEXT PRIMARY KEY,
  session_id    TEXT REFERENCES sessions(id),
  agent_id      TEXT,
  context       TEXT NOT NULL,  -- 'coding' | 'intelligence' | 'wave'
  model         TEXT,
  tokens_in     INTEGER DEFAULT 0,
  tokens_out    INTEGER DEFAULT 0,
  recorded_at   TEXT NOT NULL
);

CREATE TABLE limit_events (
  id            TEXT PRIMARY KEY,
  session_id    TEXT REFERENCES sessions(id),
  plan_agent_id TEXT REFERENCES plan_agents(id),
  event_type    TEXT NOT NULL,  -- 'PLAN_LIMIT' | 'RATE_LIMIT' | 'QUOTA_EXHAUSTED' | 'CONTEXT_EXCEEDED'
  raw_message   TEXT,
  resolved      INTEGER DEFAULT 0,
  resolved_at   TEXT,
  resolution    TEXT            -- 'resumed' | 'switched_model' | 'manual' | 'aborted'
);

-- ============================================================
-- AUTONOMOUS SCHEDULER (Module 20)
-- ============================================================
CREATE TABLE cron_jobs (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  description           TEXT,
  project_id            TEXT REFERENCES projects(id),
  schedule              TEXT NOT NULL,     -- cron expression or @daily/@weekly/@hourly
  task_template         TEXT NOT NULL,     -- supports {date} {project} {last_run} variables
  wave_preset           TEXT,              -- JSON: agent_ids, model overrides, guideline template
  auto_approve          INTEGER DEFAULT 1, -- 1 = skip AWAIT stage
  escalation_policy     TEXT NOT NULL,     -- JSON escalation policy (see Module 20)
  notification_channels TEXT,              -- JSON array: ['system','slack','lark','github']
  max_correction_retries INTEGER DEFAULT 2,
  enabled               INTEGER DEFAULT 1,
  last_run_at           TEXT,
  next_run_at           TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);

CREATE TABLE cron_executions (
  id                TEXT PRIMARY KEY,
  cron_job_id       TEXT REFERENCES cron_jobs(id),
  plan_id           TEXT REFERENCES feature_plans(id),
  status            TEXT DEFAULT 'running', -- 'running'|'completed'|'escalated'|'failed'
  escalation_reason TEXT,                   -- human-readable: which policy condition triggered
  escalation_source TEXT,                   -- module that generated the event: 'acb'|'limit'|'qa'|'correction'|'heartbeat'
  started_at        TEXT NOT NULL,
  completed_at      TEXT,
  notified_at       TEXT
);

-- ============================================================
-- TOKEN BUDGET SYSTEM (Module 21)
-- ============================================================
CREATE TABLE agent_budgets (
  id                TEXT PRIMARY KEY,
  session_id        TEXT REFERENCES sessions(id),
  plan_agent_id     TEXT REFERENCES plan_agents(id),
  agent_id          TEXT NOT NULL,
  task_complexity   TEXT,                  -- 'simple'|'moderate'|'complex'|'very-complex'
  model             TEXT,
  budget_total      INTEGER NOT NULL,      -- allocated tokens
  budget_used       INTEGER DEFAULT 0,     -- live counter
  state             TEXT DEFAULT 'active', -- 'active'|'budget-warning'|'budget-caution'|'budget-halt'|'budget-exhausted'|'completed'
  wip_path          TEXT,                  -- path to WIP_CHECKPOINT_*.md if written
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE wave_resumption_plans (
  id                TEXT PRIMARY KEY,
  wave_id           TEXT REFERENCES feature_plans(id),
  pending_task_id   TEXT REFERENCES knowledge_items(id),
  plan_path         TEXT NOT NULL,         -- path to WAVE_RESUMPTION_PLAN.md
  agents_completed  TEXT,                  -- JSON array of completed agent IDs
  agents_wipd       TEXT,                  -- JSON array of WIP'd agent IDs
  agents_pending    TEXT,                  -- JSON array of unstarted agent IDs
  estimated_remaining_tokens INTEGER,
  created_at        TEXT NOT NULL
);

-- knowledge_items extension for pending_task type
ALTER TABLE knowledge_items ADD COLUMN pending_task_data TEXT;
-- pending_task_data is JSON: {wave_id, agent_id, wip_path, resumption_plan_path,
--   original_task, blocking_reason, priority, created_at, last_reminded_at}
```

#### Component 4 — Intelligence Layer Usage Panel

New section in Settings → Intelligence:

```
┌── Intelligence Layer ─────────────────────────────────────────────────┐
│                                                                        │
│  Mode:  ● OpenRouter     ○ Agent-mediated     ○ Interactive session   │
│         (default)          (Mode 2)              (Mode 3)             │
│                                                                        │
│  ── Mode 1: OpenRouter ──────────────────────────────────────────────  │
│  Default quota:  ████████████████░░░░  12,340 / 50,000 tokens         │
│                  [Add your own OpenRouter key to remove cap]           │
│  Your key:  [sk-or-••••••••••••••••••••]  [Clear]                     │
│  Model:     [google/gemini-flash-1.5 (free) ▾]                        │
│                                                                        │
│  ── Mode 2 / Mode 3 warning (shown when either is selected) ────────  │
│  ⚠️ Intelligence tasks will share your coding agent's plan limits.     │
│     Limit events during waves may pause intelligence operations.       │
│                                                                        │
│  ── Mode 3: Interactive Session ─────────────────────────────────────  │
│  Agent:  [Claude Code ▾]                                               │
│  Panel:  🧠 Intelligence (auto-spawned)  [Re-designate] [Open panel]  │
│  Status: ● Online — context 4,210 / 200,000 tokens                    │
│          ░░░░░░░░░░░░░░░░░░░░  2% used  [Clear session]               │
│                                                                        │
│  This month:  47 intelligence calls  |  Avg: 262 tokens/call          │
└────────────────────────────────────────────────────────────────────────┘
```

#### Integration with Existing Modules

| Module | Change |
|---|---|
| **Module 11 — Wave Orchestrator** | `limit-paused` state added; corrector loop suppressed for limit events; recovery UI added |
| **Module 7 — Failure Analyzer** | Limit events excluded from failure analysis pipeline |
| **Module 8 — Session Replay** | `limit_event` event type added to timeline; Mode 3 intelligence queries visible as labelled events in the designated panel's replay |
| **Module 1 — Agent Runner** | Mode 3 designated panel gets 🧠 badge; right-click context menu → "Use as Intelligence Session" |
| **Module 17 — ACB** | BLOCKER signals from limit-paused agents surfaced in Message Bus Panel |
| **Module 2d — Connector Vault** | Intelligence OpenRouter key management added |

#### Build Placement

Phase 3 extension (alongside Failure Analyzer) — the PTY output parser and the limit event detection share the same infrastructure. Token Guard UI (Settings panel) is a Phase 3 addition. Wave Orchestrator `limit-paused` state is a Phase 5 addition. SQLite tables added in Phase 1 schema.

---

### Module 19: Session Heartbeat

**Purpose:** Active health monitoring for all running PTY sessions. Complements the passive stall detector (Module 11) by probing session liveness, distinguishing crashed from stalled from thinking, and enabling auto-restart for autonomous cron sessions.

#### Relationship to the Stall Detector

| | Stall Detector (Module 11) | Session Heartbeat (Module 19) |
|---|---|---|
| **Type** | Passive — waits for timeout | Active — probes on schedule |
| **Trigger** | No file changes for N minutes | Every 2 minutes (configurable) |
| **Detection** | Inactivity only | Inactivity + process death + unresponsiveness |
| **States** | stalled | HEALTHY / THINKING / STALLED / CRASHED |
| **Action** | Alert user immediately | Probe first → attempt revival → then alert |
| **Critical for** | Manual sessions | Autonomous cron sessions (unattended) |

Both mechanisms run in parallel. The heartbeat catches what the stall detector misses — a crashed process still looks silent to the stall timer.

#### Health States

```
HEALTHY     — PID alive + output or file changes within last 2 minutes
THINKING    — PID alive + no output/changes, but < stall threshold
              (agent is processing — normal, no action)
STALLED     — PID alive + no output/changes beyond stall threshold
              (same condition the stall detector handles — both fire)
CRASHED     — PID no longer exists in OS process table
              (silent failure — stall detector never fires for this)
UNRESPONSIVE — PID alive + probe injected + no response within 60s
               (process hung, not dead — different handling from CRASHED)
```

#### Heartbeat Cycle (Rust async task, every 2 minutes)

```
For each active PTY session (age > 5 minutes):
    │
    ├── 1. PID check (OS process table)
    │       CRASHED? → immediate escalation (skip probe)
    │
    ├── 2. Activity timestamp check
    │       Last stdout or file change < 2 min → HEALTHY, done
    │
    ├── 3. THINKING vs STALLED classification
    │       < stall threshold → THINKING (log only, no action)
    │       ≥ stall threshold → proceed to probe
    │
    └── 4. Gentle PTY probe
            Inject: "" (empty line — safe for all agents)
            Wait 60s for any response
            Response received → HEALTHY, reset stall timer
            No response → UNRESPONSIVE → escalate
```

**CRASHED handling — auto-restart for cron sessions:**
When a cron-scheduled session crashes (PID dead), the heartbeat triggers an automatic restart rather than alerting immediately. The session is re-spawned with its original guideline. If it crashes again within 5 minutes, the cron execution is marked `failed` and the human escalation policy fires. This prevents transient crashes from waking the team at 2am.

For manual sessions, CRASHED always alerts immediately — the developer needs to know.

#### SQLite logging

Heartbeat events are logged to the `events` table with `event_type = 'heartbeat'` and `target` = the health state. No new table required. The Session Replay timeline shows heartbeat health state transitions for long sessions.

#### Build Placement

Phase 3 extension — the heartbeat runs as a lightweight Rust async task alongside the idle detector. Critical for cron sessions (Module 20), so it must be complete before Phase 9+ (Autonomous Scheduler).

---

### Module 20: Autonomous Task Scheduler

**Purpose:** Schedule agent tasks to run autonomously on a cron-like schedule with no human required to initiate execution. Human involvement is event-driven — notifications fire only when escalation conditions are met. Enables a truly agentic team that works continuously, surfaces results, and asks for help only when genuinely stuck.

#### Design Philosophy

The existing Architect Agent (Module 14) + Wave Orchestrator (Module 11) already handle the full execution pipeline. The Autonomous Scheduler is not a parallel system — it is a *time-based trigger layer* on top of the existing infrastructure. The 7-stage connector loop's AWAIT stage (human approval) is made optional. The escalation policy replaces the fixed human gate.

```
BEFORE (connector loop, message-triggered):
  External message → Architect Agent detects → classifies → proposes → AWAIT human → executes → reports

AFTER (cron, time-triggered):
  Schedule fires → Scheduler creates plan → executes immediately → reports
  Human only notified when escalation policy conditions are met
```

#### Cron Registry

The Cron Registry is accessible from the main navigation as a dedicated panel and from Settings. Each registered job defines what to run, when, and under what conditions to surface the human.

**Job fields:**

| Field | Type | Description |
|---|---|---|
| `name` | Text | Short label |
| `description` | Text | What this job does |
| `project_id` | FK | Which project context |
| `schedule` | Cron expression | `"0 9 * * 1"` = Monday 9am. Also supports `@daily`, `@weekly`, `@hourly` |
| `task_template` | Text | Task description. Supports `{date}`, `{project}`, `{last_run}` variables |
| `wave_preset` | Optional FK | Reference to a saved wave configuration (agent IDs, models, guideline templates) |
| `auto_approve` | Boolean | Skip AWAIT stage — execute immediately without human sign-off |
| `escalation_policy` | JSON | Which events notify the human (see below) |
| `notification_channels` | JSON array | `['system', 'slack', 'lark', 'github']` — where to send escalation notices |
| `max_correction_retries` | Integer | Before correction exhaustion escalates. Default 2. |
| `enabled` | Boolean | Pause without deleting |

#### Escalation Policy

Per-job JSON that defines exactly when a human is pulled in:

```json
{
  "notify_on_start": false,
  "notify_on_completion": true,
  "notify_on_blocker": true,
  "notify_on_qa_fail": true,
  "notify_on_plan_limit": true,
  "notify_on_correction_exhausted": true,
  "notify_on_session_crash": true,
  "notify_on_confidence_below": 0.70,
  "require_human_for_destructive": true,
  "destructive_patterns": ["supabase_migration", "file_delete", "schema_change"]
}
```

**Autonomy presets** (selectable in the UI, map to the JSON above):

| Preset | Behaviour |
|---|---|
| **Full Auto** | Notify only on completion and hard failures. No interruptions for fixable issues. |
| **Semi-Auto** | Notify on completion, blockers, and QA failures. Retries handled silently. |
| **Supervised** | Notify on start, all failures, and completion. Human sees everything. |
| **Custom** | Manual policy configuration. |

#### Escalation Event Sources

Escalation events are generated by existing modules — the Scheduler listens to them:

| Source | Event | Default escalation |
|---|---|---|
| ACB Module 17 | `BLOCKER` signal from any agent | Always |
| Module 18 | `limit-paused` state | Always |
| Module 11 | Correction loop exhausted (retries ≥ max) | Always |
| Module 15 | QA fail (CI red or local tests fail) | `notify_on_qa_fail` |
| Module 19 | Session CRASHED (auto-restart failed twice) | Always |
| Intelligence Layer | Task classification confidence < threshold | `notify_on_confidence_below` |
| Supabase safe-by-default | Migration file detected | `require_human_for_destructive` |

#### Escalation Notification Format

When an escalation fires, ACC sends a structured notification through the configured channels:

```
[ACC Scheduler] ⚠️ Human input needed — Project: Client X

Job: "Weekly code quality sweep"
Status: QA FAILED — 3 tests failing after 2 correction attempts
Wave: A1 (refactor), A2 (tests) — A2 correction exhausted

What's needed: Review test failures in QA_REPORT.md and decide next step.

[Open in ACC →]  [View Wave →]  [View QA Report →]

Options you can take:
  • Complete manually and mark wave done
  • Override and retry with a different model
  • Abort this execution
```

For `notify_on_completion` (no failure), the notification is a simple summary:

```
[ACC Scheduler] ✅ Complete — Project: Client X

Job: "Weekly code quality sweep"
Duration: 47 minutes | Agents: 3 | Files changed: 12
PR #84 created and CI green.

[View PR →]  [View Feature Docs →]
```

#### Cron Execution Lifecycle

```
Schedule fires (Rust cron task)
    │
    ├── Create feature_plans record (status: 'scheduled')
    ├── Create cron_executions record (status: 'running')
    │
    ▼
    If notify_on_start → send start notification
    │
    ▼
    Spawn Wave Orchestrator (skip AWAIT stage — auto_approve: true)
    │
    ├── Wave executes with Heartbeat monitoring (Module 19)
    ├── ACB signals processed normally (Module 17)
    ├── Limit events handled normally (Module 18)
    │
    ▼
    Any escalation condition met?
    ├── YES → send escalation notification → cron_execution status: 'escalated'
    │          Wave pauses at that point, awaits human action
    │          Human resolves in ACC UI → wave resumes or aborts
    └── NO  → Wave completes → QA passes → Feature Docs generated
                    │
                    ▼
                cron_execution status: 'completed'
                If notify_on_completion → send completion summary
                Update cron_job.last_run_at + next_run_at
```

#### Cron Registry UI

Accessible from the main navigation as `⏰ Scheduler`:

```
┌── Autonomous Scheduler ──────────────────────────────────────────────┐
│                                                                       │
│  ACTIVE JOBS (3)                          [+ New Job]                 │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ ✅ Weekly code quality sweep                                     │ │
│  │    Mon 9am · Client X · Full Auto · Last run: 2h ago (complete)  │ │
│  │    [Edit] [Run Now] [Pause] [History]                            │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ ⚠️ Daily dependency check                                        │ │
│  │    Daily 7am · All projects · Semi-Auto · ESCALATED 4h ago       │ │
│  │    ↳ QA failed: 2 tests · [Review in ACC →]                      │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │ ⏸ Monthly security audit                                         │ │
│  │    1st of month · Global · Supervised · PAUSED                   │ │
│  │    [Edit] [Enable]                                               │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  NEXT SCHEDULED                                                       │
│  Daily dependency check → Tomorrow 7:00 AM (in 14h 23m)             │
│  Weekly code quality sweep → Monday 9:00 AM (in 5 days)             │
└───────────────────────────────────────────────────────────────────────┘
```

#### SQLite Schema Additions

```sql
CREATE TABLE cron_jobs (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  description           TEXT,
  project_id            TEXT REFERENCES projects(id),
  schedule              TEXT NOT NULL,     -- cron expression or @daily/@weekly
  task_template         TEXT NOT NULL,     -- task description, supports {date} {project} {last_run}
  wave_preset           TEXT,              -- JSON: agent_ids, model overrides
  auto_approve          INTEGER DEFAULT 1,
  escalation_policy     TEXT NOT NULL,     -- JSON escalation policy object
  notification_channels TEXT,              -- JSON array: ['system', 'slack', 'lark']
  max_correction_retries INTEGER DEFAULT 2,
  enabled               INTEGER DEFAULT 1,
  last_run_at           TEXT,
  next_run_at           TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);

CREATE TABLE cron_executions (
  id                TEXT PRIMARY KEY,
  cron_job_id       TEXT REFERENCES cron_jobs(id),
  plan_id           TEXT REFERENCES feature_plans(id),
  status            TEXT DEFAULT 'running', -- 'running'|'completed'|'escalated'|'failed'
  escalation_reason TEXT,                   -- which policy condition triggered escalation
  escalation_source TEXT,                   -- which module generated the escalation event
  started_at        TEXT NOT NULL,
  completed_at      TEXT,
  notified_at       TEXT
);

CREATE INDEX idx_cron_executions_job  ON cron_executions(cron_job_id, status);
CREATE INDEX idx_cron_executions_plan ON cron_executions(plan_id);
```

#### Integration with Existing Modules

| Module | Integration |
|---|---|
| **Module 11 — Wave Orchestrator** | Cron execution spawns wave directly, skips AWAIT stage. Escalation events fed back to cron execution status. |
| **Module 14 — Architect Agent** | Cron Scheduler reuses Architect Agent's execution infrastructure. Architect Agent extended with `SchedulerTrigger` as a trigger source alongside connector messages. |
| **Module 17 — ACB** | BLOCKER signals from cron-triggered waves → escalation policy check → notification if policy requires it. |
| **Module 18 — Session Resilience** | `limit-paused` state in cron waves always triggers escalation notification. |
| **Module 19 — Session Heartbeat** | Heartbeat monitors all cron-spawned sessions. CRASHED state with auto-restart failure → escalation. |
| **Module 16 — Knowledge Compounder** | Cron-completed waves feed the Knowledge Compounder as normal. Scheduled quality sweeps become a continuous source of knowledge items. |
| **Module 8 — Feature Docs** | Feature Docs generated for each completed cron execution. Attached to the completion notification. |

#### Build Placement

Phase 9+ (2 weeks) — after Phase 9 (Knowledge Layer). Requires: Wave Orchestrator (Phase 5), Intelligence Layer (Phase 3), Session Heartbeat (Phase 3 extension), and Notification infrastructure (Phase 1's `@tauri-apps/plugin-notification`). Knowledge Layer (Phase 9) is not a hard dependency but makes cron jobs significantly more intelligent — they benefit from pre-loaded knowledge context.

---

### Module 21: Intelligent Token Budget System

**Purpose:** Proactively allocate, monitor, and enforce token budgets per agent per task. Capture structured Work-In-Progress (WIP) state when budgets approach exhaustion. Persist pending tasks in memory so the orchestrator (or the agent's next session) automatically resumes from where execution stopped — not from scratch.

#### Distinction from Module 18 (Session Resilience & Token Guard)

These two modules solve adjacent but distinct problems:

| | **Module 18 — Reactive** | **Module 21 — Proactive** |
|---|---|---|
| **Trigger** | Limit already hit (PTY error pattern) | Budget threshold approached (counter-based) |
| **Action** | Pause wave, ask human to resolve | Controlled shutdown with WIP capture |
| **Resume** | Agent restarts task from scratch | Agent picks up from WIP checkpoint |
| **Scope** | Whole-session interruption | Per-task budget management |
| **Visibility** | Crisis event, surfaced to user | Continuous monitoring, budget bar in UI |
| **Coverage** | Catches unexpected limits (rate spikes, model changes) | Prevents most limit events from occurring |

Module 21 is the planning and graceful-shutdown layer. Module 18 is the safety net for limits that slip past Module 21's monitoring. Both are needed.

---

#### Component 1 — Budget Planning Layer

Before any agent is spawned (solo task or wave agent), the Budget Planner allocates a token budget based on:

- **Task complexity classification** — simple / moderate / complex / very-complex (from Task Router or wave guideline metadata)
- **Model context window** — different models have different caps (Claude 200k, Minimax 245k, Gemini 1M)
- **Historical token usage** — `token_usage` table aggregates per agent × task type × project, providing realistic baselines
- **Reserved overhead** — 15% reserved for WIP capture if budget is hit (must not run out before WIP can be written)
- **Wave context** — for wave agents, total team budget is divided across agents weighted by task complexity

```
Budget computation (Rust function, runs at agent spawn time):

  base_budget = historical_p75_for(agent, task_type, project)
                or model_default if no history exists
                
  complexity_multiplier = {simple: 0.7, moderate: 1.0, complex: 1.5, very-complex: 2.2}
  
  raw_budget = base_budget × complexity_multiplier[task.complexity]
  
  capped_budget = min(raw_budget, model.context_window × 0.85)
                  // never exceed 85% of model context — leaves room for response
  
  final_budget = capped_budget × 0.85
                 // reserves 15% for WIP capture if threshold hit
```

The computed budget is stored in `agent_budgets` and injected into the agent's guideline as a soft target with explicit instructions on what to do as it's approached.

**Wave-level budget planning:**
The Wave Orchestrator computes total team budget for the wave (sum of per-agent budgets). If this exceeds plan capacity (Mode 2/3) or OpenRouter quota (Mode 1), the planner surfaces a warning before wave execution: *"This wave is estimated to use 180k tokens — 73% of your remaining daily quota. Continue?"* The user can proceed, reduce wave scope, or split into multiple smaller waves.

---

#### Component 2 — Real-Time Budget Monitoring

Each running agent has a live budget counter — visible in the agent panel header as a thin progress bar.

**Token consumption tracking:**

Token usage is captured from two sources depending on Intelligence Mode:

```
Mode 1 (OpenRouter HTTP)        → response headers contain exact token count
Mode 2 (non-interactive spawn)  → agent stdout includes usage in verbose mode
                                  (e.g., Claude Code emits "[Usage: 1234 tokens]")
Mode 3 (interactive panel)      → captured from PTY parser, accumulates per session
Wave coding agents              → captured from PTY pattern (same as Mode 3 method)
```

The existing `token_usage` SQLite table from Module 18 is the storage substrate. Module 21 adds a real-time consumption rate calculator in Rust async — token deltas per minute over a 5-minute rolling window. This lets the system detect *trajectory*, not just current consumption: an agent burning 8k tokens/minute against a 30k remaining budget will hit limit in ~4 minutes, and the warning fires now, not in 4 minutes.

**Threshold response ladder:**

| Threshold | State | Action |
|---|---|---|
| **60%** | `budget-warning` | Soft notification in agent panel header. Yellow budget bar. No instruction injection. |
| **80%** | `budget-caution` | PTY instruction injected: *"You have used 80% of your token budget. Begin wrapping up the current sub-task. Avoid starting new work."* |
| **95%** | `budget-halt` | PTY instruction injected: *"Token budget critical. Stop all current work. Write WIP_CHECKPOINT.md immediately following the format provided in your guideline. Do not start any new operations."* |
| **100%** | `budget-exhausted` | If WIP not yet written, ACC writes it from accumulated session context (fallback). Agent session terminated. Module 18's `limit-paused` state activates. |

The 95% threshold is the critical one — it must fire while there's still budget headroom (the 15% reserve) for the agent to actually write the WIP document. If the agent ignores the halt instruction (reasoning continues, more tokens consumed), the 100% fallback kicks in and ACC writes the WIP from session reconstruction.

---

#### Component 3 — WIP Capture

When `budget-halt` fires, the agent writes a structured WIP checkpoint. The format is defined in the guideline template so the agent knows exactly what to produce:

```markdown
# WIP_CHECKPOINT — <Agent ID> — <Task Name>
**Wave:** <N>  **Captured at:** <ISO timestamp>  **Trigger:** budget-halt at 95%
**Tokens used / budget:** 28,450 / 30,000

## Original Task
<one-paragraph summary of the original task as understood>

## Completed So Far
<bullet list of what has been done — files created/modified with line counts, decisions made>

## In Progress
<what was being worked on at the moment of halt — file, function, specific change>

## Not Yet Started
<remaining sub-tasks from the original guideline that haven't been touched>

## Critical Context for Resumption
<any non-obvious context the next agent must know to pick up cleanly:
 - design decisions made
 - dependencies discovered mid-task
 - failed approaches that should not be retried
 - interface contracts established or pending>

## Suggested Resumption Approach
<what should happen first when this is picked up — specific file to open,
 specific test to run, specific function to complete>

## State of External Systems
<any side effects with external state — files modified, branches created,
 commits made, migrations applied — so resumption doesn't duplicate>
```

This format is also written into the Agent Guideline Generator's template, alongside the Communication Protocol section. Every guideline includes the WIP capture instructions automatically.

**Fallback WIP generation:**
If the agent fails to write a WIP (ignored the halt, crashed, or context was already exhausted), ACC reconstructs one from session data — recent file changes, last HANDOFF state, ACB signals, last 200 lines of PTY output. This reconstruction is best-effort and explicitly labeled as `auto-generated, may be incomplete` so the next agent treats it with appropriate caution.

---

#### Component 4 — Orchestrator Consolidation

When a wave agent writes a WIP, the Wave Orchestrator is notified via the existing fs.watch mechanism (same as HANDOFF detection). The Orchestrator:

1. **Aggregates** all WIP checkpoints from the current wave (some agents may have completed, some may have WIP'd)
2. **Reconciles dependencies** — if A1 WIP'd before completing an interface that B1 depends on, B1's WIP must reflect this incomplete dependency
3. **Generates a Wave Resumption Plan** — a single document consolidating all WIPs into an actionable resumption strategy
4. **Persists** the consolidated plan to memory (next component)

The Wave Resumption Plan is written by the Intelligence Layer (cheap call — typically 2-3k tokens, just synthesises the WIP files):

```markdown
# WAVE RESUMPTION PLAN — <Wave Name>
**Original wave:** <wave_id>  **WIP'd at:** <timestamp>  **Reason:** budget exhaustion (3 of 6 agents)

## Wave Status Summary
- A1: ✅ Completed (HANDOFF verified)
- A2: ⏸ WIP at 73% complete — see WIP_CHECKPOINT_A2.md
- B1: ⏸ WIP at 40% complete — blocked waiting for A2's interface
- B2: ⏸ Not started — depends on A1 (now complete)
- C1: ⏸ Not started — depends on B1
- C2: ⏸ Not started — depends on B1, B2

## Recommended Resumption Order
1. Spawn B2 first (A1 dependency satisfied, can proceed in parallel)
2. Resume A2 from its WIP checkpoint
3. Once A2 complete, resume B1 from its WIP checkpoint
4. After B1 complete, spawn C1 and C2 in parallel

## Critical Context Summary
<consolidated critical-context bullets from all WIPs>

## Estimated Token Budget for Completion
<reconstructed budget for remaining work, based on WIP progress percentages>
```

---

#### Component 5 — Persistent Pending Task Memory

Pending tasks must persist across sessions, app restarts, and time. They must surface to the relevant agent when work is next picked up — without the user manually navigating to a "pending tasks" panel and assigning them.

**Storage:** The existing `knowledge_items` table is extended with a new item type: `pending_task`. This reuses Module 16's infrastructure rather than creating a parallel system.

```sql
-- knowledge_items already exists. Module 21 adds:
-- New item type 'pending_task'
-- New status states 'pending'|'reminded'|'in-progress'|'resolved'

ALTER TABLE knowledge_items ADD COLUMN pending_task_data TEXT;
-- JSON blob: {wave_id, agent_id, wip_path, resumption_plan_path, 
--             original_task, blocking_reason, priority, created_at, last_reminded_at}

CREATE INDEX idx_pending_tasks ON knowledge_items(type, status) 
  WHERE type = 'pending_task' AND status IN ('pending', 'reminded');
```

**Reminder mechanism — automatic, context-aware:**

Pending tasks surface in three places without requiring user action:

1. **On agent spawn** — when any agent is spawned in a project, ACC checks for pending tasks belonging to that agent (or its role) in that project. If found, the pending task summary is injected into the agent's context preamble alongside the existing knowledge pre-load. The agent sees: *"You have a pending task from a previous session — see WIP_CHECKPOINT_A2.md. Recommendation: resume from this checkpoint before starting new work."*

2. **On wave start** — when a Wave Orchestrator launches a wave in a project that has a pending Wave Resumption Plan, the Plan is automatically loaded as a candidate starting point. The user is shown: *"This project has a pending wave from <date>. Resume that wave or start fresh?"*

3. **On Cron job execution** — Module 20's autonomous scheduler checks for pending tasks before launching a scheduled wave. If a pending task exists for this project, the cron job receives it as priority context: *"Before running today's scheduled task, complete the pending wave from <date>."*

**Lifecycle:**

```
created (status: pending)
   │
   ├── On any agent spawn referencing this task → status: reminded, last_reminded_at updated
   │
   ├── On agent picks up task (verified via WIP_CHECKPOINT read in PTY output)
   │     → status: in-progress
   │
   ├── On task completion (HANDOFF verified for resumed work)
   │     → status: resolved, archived
   │
   └── If 30 days pass without pickup
         → escalation notification fires (configurable)
         → status: stale (still visible, but no longer auto-injected)
```

**User control:**
The Knowledge Panel gains a `Pending Tasks` filter showing all unresolved items. Each item has Resume Now, Mark Resolved, and Archive controls. Users can manually triage stale items or mark them obsolete if requirements changed.

---

#### Component 6 — Budget UI

A new tab `Budgets` in the Outcomes panel (or accessible via a top-bar indicator):

```
┌── Token Budgets ─────────────────────────────────────────────────────┐
│                                                                       │
│  CURRENT WAVE: "Login Refactor" — Wave 2 of 3                        │
│                                                                       │
│  ┌─────┬──────────────────────────────┬──────────┬─────────────────┐ │
│  │ A1  │ ████████████░░░░░░░░  60%    │  ✓ Done  │ 18.2k / 30k     │ │
│  │ A2  │ ████████████████████  95% ⚠  │  Halting │ 28.5k / 30k     │ │
│  │ B1  │ ██████░░░░░░░░░░░░░░  30%    │  Active  │ 7.5k / 25k      │ │
│  └─────┴──────────────────────────────┴──────────┴─────────────────┘ │
│                                                                       │
│  Total wave budget: 85,000 / 110,000 (77%)                           │
│                                                                       │
│  PENDING TASKS (2)                                  [View all]        │
│  ─ Login Refactor (Wave 2 — A2 + B1) — 3 days ago                    │
│  ─ Dashboard query optimisation (A1) — 12 days ago                    │
│                                                                       │
│  HISTORICAL ACCURACY                                                  │
│  Budget predictions: 82% within ±20% of actual usage                  │
│  [Adjust complexity multipliers]                                      │
└───────────────────────────────────────────────────────────────────────┘
```

---

#### Schema Additions

```sql
CREATE TABLE agent_budgets (
  id                TEXT PRIMARY KEY,
  session_id        TEXT REFERENCES sessions(id),
  plan_agent_id     TEXT REFERENCES plan_agents(id),
  agent_id          TEXT NOT NULL,
  task_complexity   TEXT,                  -- 'simple'|'moderate'|'complex'|'very-complex'
  model             TEXT,
  budget_total      INTEGER NOT NULL,      -- allocated tokens
  budget_used       INTEGER DEFAULT 0,     -- consumed tokens (live counter)
  state             TEXT DEFAULT 'active', -- 'active'|'budget-warning'|'budget-caution'|'budget-halt'|'budget-exhausted'|'completed'
  wip_path          TEXT,                  -- path to WIP_CHECKPOINT_*.md if written
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE wave_resumption_plans (
  id                TEXT PRIMARY KEY,
  wave_id           TEXT REFERENCES feature_plans(id),
  pending_task_id   TEXT REFERENCES knowledge_items(id),
  plan_path         TEXT NOT NULL,         -- path to WAVE_RESUMPTION_PLAN.md
  agents_completed  TEXT,                  -- JSON array of completed agent IDs
  agents_wipd       TEXT,                  -- JSON array of WIP'd agent IDs
  agents_pending    TEXT,                  -- JSON array of unstarted agent IDs
  estimated_remaining_tokens INTEGER,
  created_at        TEXT NOT NULL
);

CREATE INDEX idx_agent_budgets_session ON agent_budgets(session_id, state);
CREATE INDEX idx_agent_budgets_active  ON agent_budgets(state) WHERE state != 'completed';
CREATE INDEX idx_resumption_wave       ON wave_resumption_plans(wave_id);
```

---

#### Integration with Existing Modules

| Module | Integration |
|---|---|
| **Module 5 — Task Router** | Provides task complexity classification used by Budget Planner |
| **Module 11 — Wave Orchestrator** | Consumes Wave Resumption Plans on wave start; allocates per-agent budgets at spawn time |
| **Module 12 — Agent Guideline Generator** | Auto-appends Budget Section + WIP Capture instructions to every guideline |
| **Module 13 — Handoff Monitor** | WIP_CHECKPOINT files are detected by the same fs.watch mechanism; monitor distinguishes WIP from HANDOFF |
| **Module 16 — Knowledge Compounder** | `pending_task` becomes a knowledge_item type; reuses storage and lifecycle infrastructure |
| **Module 18 — Session Resilience** | Module 18's `limit-paused` activates as fallback when Module 21's 100% threshold is hit |
| **Module 19 — Session Heartbeat** | Heartbeat reports include current budget state; CRASHED sessions trigger fallback WIP generation |
| **Module 20 — Autonomous Scheduler** | Cron jobs check for pending tasks before launching; pending tasks may take priority over scheduled work |
| **Token Guard (Module 18)** | Module 21's threshold ladder replaces Module 18's static warning — Module 18 becomes the catch-all for limits Module 21 didn't predict |

---

#### Build Placement

Phase 9++ (2 weeks, after Phase 9+ Autonomous Scheduler) — depends on Wave Orchestrator (Phase 5), Token Usage tracking (Phase 3 / Module 18), Knowledge Compounder (Phase 9), Session Heartbeat (Phase 3 ext / Module 19), and Autonomous Scheduler integration (Phase 9+ / Module 20). Best built last because it touches every preceding piece — building it earlier would require revisiting these modules to integrate.

---

# PART 3 — DESIGN

---

## 7. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AGENT CONTROL CENTER                           │
│                                                                     │
│  ┌─────────────────────────┐  ┌──────────────────────────────────┐  │
│  │   FRONTEND (React 19)   │  │     BACKEND (Tauri v2 / Rust)    │  │
│  │                         │  │                                  │  │
│  │  Agent Runner           │  │  PTY Manager                     │  │
│  │  Asset Manager          │◄─►  File Sync Engine                │  │
│  │  Wave Orchestrator      │  │  Log File Watcher                │  │
│  │  Task + Model Router    │  │  Connector Vault (Stronghold)    │  │
│  │  Outcome Dashboard      │  │  SQLite Database                 │  │
│  │  Session Replay         │  │  Architect Agent Loop            │  │
│  │  Handoff Monitor        │  │  Project Scanner                 │  │
│  │  Message Bus Panel      │  │  File System Watcher             │  │
│  │  Playbook Manager       │  │  ACB Signal Parser + Router      │  │
│  │  Connector Monitor      │  │  Knowledge Compounder (async)    │  │
│  │  Knowledge Panel        │  │  Session Heartbeat Monitor       │  │
│  │  Scheduler Panel        │  │  Cron Scheduler + Escalation     │  │
│  │  Budgets Panel          │  │  Budget Planner + Monitor        │  │
│  │                         │  │  WIP Capture + Resumption        │  │
│  │                         │  │  HTTP Client (MCP servers only)  │  │
│  └─────────────────────────┘  └──────────────────────────────────┘  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                      FILE SYSTEM LAYER                              │
│  ~/.claude/  ~/.opencode/  ~/.gemini/  ~/.codex/  Project dirs      │
├─────────────────────────────────────────────────────────────────────┤
│                      EXTERNAL SERVICES                              │
│  OpenRouter   Supabase MCP   GitHub MCP                             │
│  Lark MCP [deferred]   Slack MCP [deferred]   Jira MCP [deferred]  │
└─────────────────────────────────────────────────────────────────────┘
```

### PTY Session Flow

```
User: [Spawn Agent] or [Wave Orchestrator: Execute Wave 1]
  │
  ▼
Tauri Shell Plugin
  │ spawn(cmd, args, { cwd: project_path, env: secrets_from_vault })
  ▼
OS Process (claude / opencode / gemini / codex)
  │
  ├─── stdout ──► PTY Stream ──► xterm.js panel (React)
  │                          └──► SQLite event log (structured)
  │                          └──► Pattern detector (reactive memory)
  │                          └──► Idle detector (outcome prompt trigger)
  │                          └──► ACB Signal parser ──► route to target PTY stdin
  │                                                 └──► SQLite agent_messages log
  │                                                 └──► Wave Orchestrator (block/unblock)
  │                                                 └──► UI Message Bus Panel
  │
  ├─── File changes ──► Tauri fs.watch() ──► Handoff detector
  │                                      └──► Stall timer reset
  │
  └─── stdin ◄── PTY write ◄── Preset buttons / Task Router / Correction injector
                           └──► ACB Signal delivery (routed from peer agent signals)
```

### Upstream Connector Flow

```
Background: Architect Agent Loop (Rust async task)
  │
  ├── Every N minutes: call connector MCP tools (list_messages / search_issues)
  │
  ├── New items found → ACC spawns non-interactive agent session for classification
  │     → type, priority, summary, requires_clarification
  │
  ├── If requires_clarification → reply in thread → wait
  │
  ├── If actionable → create proposal doc via MCP
  │     → notify user in ACC Detection Panel
  │     → [optional] user confirms before posting
  │
  ├── Poll for approval signal every 5 minutes
  │     → on approval: populate Wave Orchestrator → execute
  │
  ├── Monitor wave execution → wait for QA pass
  │
  └── On QA pass: generate Feature Docs → post to connector via MCP
        → create delivery log entry
```

### Wave Orchestration Flow

```
Wave Orchestrator: Plan created
  │
  ├── Wave 1 agents (no dependencies)
  │   ├── Spawn A1 PTY (background, model: Minimax)
  │   ├── Spawn A2 PTY (background, model: Qwen)
  │   └── Start 10-min stall timers
  │
  ├── Monitor: fs.watch docs/ for HANDOFF_A1.md, HANDOFF_A2.md
  │
  ├── On HANDOFF_A1.md detected:
  │   ├── Parse and validate
  │   ├── Tests passing? → Mark A1 verified
  │   └── Tests failing? → Generate CORRECTION_A1.md → re-inject (max 2x)
  │
  ├── All Wave 1 verified? → Unlock Wave 2
  │   └── Spawn B1 PTY (model: Minimax, alternating)
  │
  └── All waves complete? → QA agent (final wave) → Feature Doc Generator
```

---

## 8. UI/UX Structure & Wireframes

### Navigation Structure

```
ACC
├── 🚀  Runner           ← Default view: agent panels + presets
├── 🎯  Route            ← Task Router: input → suggestion → execute
├── 🌊  Orchestrate      ← Wave Orchestrator + Guideline Generator
├── 📋  Handoffs         ← Handoff Monitor: all pending verifications
├── 💬  Messages         ← Agent Communication Bus: open signals, routing log
├── 🗂️  Assets           ← Skills / Memory / MCPs / Connectors / Plugins
├── 📊  Outcomes         ← Success rate dashboard + outcome history + Token Budgets tab
├── ⏱️  Replay           ← Session timeline browser
├── 📦  Playbooks        ← Import / export .acc bundles
├── 🔭  Connectors       ← Lark / Slack / Jira / GitHub monitor + detection
├── 🧠  Knowledge        ← Knowledge Compounder: patterns, runbooks, lessons
├── ⏰  Scheduler        ← Autonomous Task Scheduler: cron jobs, escalation history
└── ⚙️  Settings         ← Agent paths, model registry, conventions, API keys, intelligence mode
```

### Runner View (Primary Layout)

```
┌─── Project: /projects/client-x  [switch ▾]  [Load Profile]  ────────┐
│                                                                       │
│  AGENTS                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │ Claude Code  ●   │  │ OpenCode     ○   │  │ Aider          ◐   │  │
│  │ thinking...      │  │ idle             │  │ writing auth.ts    │  │
│  │                  │  │                  │  │ (auto-commit on)   │  │
│  │ [PTY terminal]   │  │ [PTY terminal]   │  │ [PTY terminal]     │  │
│  │                  │  │                  │  │ Started: 2m ago    │  │
│  │ [Kill][Restart]  │  │ [Spawn][Config]  │  │ [Kill][Restart]    │  │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘  │
│                                                                       │
│  PRESETS                                                              │
│  [Fix Tests] [Review PR] [Lint] [Commit] [Deploy Staging] [+ New]   │
│                                                                       │
│  SESSION  14 events · 4m 12s · 3 files changed  [🔍 Analyze] [Docs] │
└───────────────────────────────────────────────────────────────────────┘
```

### Orchestrator Mode Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR: Claude Code (subagent-capable)                ◉ active│
│  [PTY / Status Panel — full width]                                   │
├──────────────────────────────────────────────────────────────────────┤
│  Wave 1 ████████░░ (2/3 complete)   Wave 2 ░░░░░░░░░░ (waiting)     │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────────────┐   │
│  │ A1: JWT impl   │ │ A2: Unit tests │ │ B1: Integration tests  │   │
│  │ ✓ Verified     │ │ ● Running 3m   │ │ ⏸ Waiting for A1, A2   │   │
│  │ OpenCode       │ │ Aider          │ │ Goose                  │   │
│  │ Minimax        │ │ Qwen           │ │ Minimax                │   │
│  │ [View Handoff] │ │ [View PTY]     │ │ [View Plan]            │   │
│  └────────────────┘ └────────────────┘ └────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### Connector Monitor View

```
┌── Connectors ─────────────────────────────────────────────────────────┐
│                                                                        │
│  Lark — #client-x-dev    Last checked: 4 min ago    [Check Now]       │
│  Slack — #edge8-internal Last checked: 4 min ago                      │
│  Jira  — CLIENT-X board  Last checked: 14 min ago                     │
│                                                                        │
│  DETECTED ITEMS (3 pending)                                            │
│  ┌──────┬────────────────────────────────────┬──────────┬───────────┐ │
│  │ Src  │ Summary                            │ Priority │ Action    │ │
│  ├──────┼────────────────────────────────────┼──────────┼───────────┤ │
│  │ Lark │ Wrong scores for multi-submission  │ 🔴 High  │ [Propose] │ │
│  │ Jira │ Add CSV export to reports          │ 🟡 Med   │ [Propose] │ │
│  │ Slack│ API rate limit question            │ 🟢 Low   │ [Skip]    │ │
│  └──────┴────────────────────────────────────┴──────────┴───────────┘ │
│                                          [Propose All] [Dismiss All]   │
│                                                                        │
│  AWAITING APPROVAL (1)                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ "Fix incorrect scores..." · Proposed 2h ago · [Open in Lark ↗] │  │
│  │ [Force Approve]  [Reject]  [Send Reminder]                      │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

# PART 4 — TECHNICAL

---

## 9. Technology Stack

### Core Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| **App Shell** | Tauri | v2 | Native binary ~10MB, Rust backend, no Node.js shipped |
| **UI Framework** | React | 19 | Component ecosystem, familiar, identical to web dev |
| **Build Tool** | Vite | 6 | Instant HMR, minimal config, fastest dev loop |
| **Styling** | Tailwind CSS | v4 | Utility-first, zero CSS maintenance |
| **Components** | shadcn/ui | latest | Copy-paste, no dependency lock-in, fully customizable |
| **State (UI)** | Zustand | 5 | Minimal boilerplate, async-friendly |
| **Terminal** | xterm.js + fit addon | 5.x | Industry standard PTY renderer |
| **Code Editor** | Monaco Editor (React) | latest | VS Code editor embedded for skills/memory editing |
| **Database** | SQLite via Tauri sql plugin | — | Local, zero setup, fast, offline-first |
| **Routing** | React Router | v7 | Client-side nav for sidebar sections |

### Tauri Plugins

| Plugin | Purpose |
|---|---|
| `@tauri-apps/plugin-shell` | Spawn and write to PTY processes |
| `@tauri-apps/plugin-sql` | SQLite access from Rust commands |
| `@tauri-apps/plugin-fs` | File read/write/watch for config files |
| `@tauri-apps/plugin-stronghold` | AES-256 encrypted secrets vault |
| `@tauri-apps/plugin-store` | App settings persistence |
| `@tauri-apps/plugin-dialog` | File/folder picker |
| `@tauri-apps/plugin-notification` | System notifications (stall alerts, approvals) |
| `@tauri-apps/plugin-http` | HTTP client for MCP server connections (SSE/HTTP transport MCPs) |

### Key npm Packages

| Package | Purpose |
|---|---|
| `simple-git` | Git operations: worktrees, branch check, status, commit, push |
| `@octokit/rest` | GitHub API: PR creation, CI status polling |
| `diff2html` | Unified diff → HTML visual diff rendering |
| `@monaco-editor/react` | Monaco editor React wrapper |
| `date-fns` | Date formatting in session replay |
| `zustand` | UI state management |
| `react-router-dom` | Sidebar navigation |

### ACC Intelligence Layer

ACC requires AI inference for its own operations: Failure Analyzer, Feature Doc Generator, Knowledge Compounder, Task Router v2, and Architect Agent classification. These are ACC's own intelligence features — distinct from the agent coding sessions ACC manages.

ACC supports two modes, user-selectable in Settings:

---

#### Mode 1 — OpenRouter (Default)

ACC calls OpenRouter directly using its own HTTP client (`@tauri-apps/plugin-http`). This is the default and recommended mode.

**Default model:** A free, stable OpenRouter model (configured at build time — e.g., a capable open-weight model available on OpenRouter's free tier). Users can override the intelligence model via the Model Registry.

**Key management:**
- ACC ships with a **default OpenRouter key** for trial use, capped at a defined monthly token limit per installation
- When the cap is reached, ACC surfaces a prompt in Settings: *"You've used your free intelligence quota. Add your own OpenRouter key to continue."*
- User's own key is stored in the Connector Vault (AES-256, scoped to `acc-intelligence`)
- User's key has no cap enforced by ACC — subject only to their OpenRouter plan limits

**Why OpenRouter, not Anthropic API directly:**
OpenRouter provides access to multiple models (including free tiers) under a single API key. This avoids ACC being tied to a single provider, allows the default model to be changed without an app update, and gives users flexibility to bring their own key from a provider they already use.

**Characteristics:**
- No plan sharing with user's coding agent sessions
- Fast — dedicated HTTP call, not a PTY spawn overhead
- Works offline from the agent ecosystem — intelligence runs even if no coding agent is configured
- Default free model may have lower capability than premium models; users can upgrade via their own key

---

#### Intelligence Request Queue and Backoff

Multiple ACC modules trigger Intelligence Layer calls concurrently: Failure Analyzer (user-triggered), Feature Doc Generator (post-wave), Knowledge Compounder (async), Task Router v2 (user-triggered), Architect Agent classification (background). Without coordination, these can collide under rate limits and produce silent failures.

A shared Rust async intelligence request queue serialises all Intelligence Layer calls with priority ordering:

```
Priority levels (higher = processed first):
  CRITICAL  — Failure Analyzer (user waiting for diagnosis)
  HIGH      — Feature Doc Generator (user expecting docs post-wave)
  NORMAL    — Task Router v2 (user waiting for routing suggestion)
  LOW       — Architect Agent classification (background, not time-critical)
  BACKGROUND — Knowledge Compounder (fully async, can wait)
```

**Rate limit handling (Mode 1 — OpenRouter HTTP):**
- On HTTP 429: exponential backoff starting at 5s, doubling each retry, max 5 retries
- After 5 retries: task marked `intelligence-failed`, user notified for CRITICAL/HIGH priority
- LOW/BACKGROUND tasks silently requeued for next available slot

**Concurrency for Modes 2/3 (agent sessions):**
- Max 1 concurrent non-interactive agent session for intelligence (Mode 2)
- Mode 3 interactive panel handles 1 query at a time by design (sequential injection)
- Queued tasks wait; no parallel intelligence sessions spawned

The queue state is visible in Settings → Intelligence as an activity indicator.

---

#### Mode 2 — Agent-Mediated (User's Subscription)

ACC spawns short-lived, non-interactive agent sessions for intelligence tasks instead of calling OpenRouter directly. The agent uses the user's existing Claude Code or OpenCode subscription credentials.

**How it works:**
```
Claude Code:  claude --print "<intelligence prompt>"
OpenCode:     opencode run --model {model} "{intelligence prompt}"
```

ACC captures stdout, parses the structured output, closes the session. The session is logged as type `intelligence` in the sessions table — distinct from regular coding sessions in the Outcome Tracker.

**Model selection:** Uses the same Model Registry as regular sessions. User can assign a specific model for intelligence tasks (separate from their implementation/review model preferences).

**⚠️ Mandatory warning displayed in Settings when Mode 2 is active:**
> *"Agent-mediated intelligence uses your Claude Code / OpenCode subscription for ACC's own analysis tasks (Failure Analyzer, Feature Docs, Knowledge Compounder, etc.). These calls count against your plan usage and run alongside your coding sessions. If you hit your plan limit during a wave, intelligence tasks will also fail. Consider Mode 1 (OpenRouter) to keep intelligence usage separate."*

**Characteristics:**
- Uses existing credentials — no additional API key needed
- Shares plan limits with coding sessions — risk of limit interference during active waves
- Model quality matches whatever the user has configured for their agent
- Slightly higher latency than Mode 1 (PTY spawn overhead vs. direct HTTP)
- Ephemeral — each intelligence task spawns and closes a session independently

---

#### Mode 3 — Interactive Session (Visible, Persistent)

A designated Claude Code or OpenCode panel in the Runner acts as a persistent, always-visible intelligence interface. ACC sends queries to it via PTY stdin injection, exactly as it injects preset commands. The user can see every intelligence operation happen in real time in the panel, and can interact with it directly when ACC is not using it.

**Key distinction from Mode 2:** Mode 2 spawns hidden, ephemeral background sessions per task. Mode 3 uses a single persistent, visible panel that the user can observe and participate in.

**How it works:**

ACC injects a structured query into the designated panel's PTY stdin:

```
[ACC:INTELLIGENCE id=i001 type=FAILURE_ANALYSIS]
<full analysis prompt here>
Please end your response with: [ACC:DONE ref=i001]
[END ACC:INTELLIGENCE]
```

The agent processes the query and ends its response with the sentinel marker. ACC's existing PTY stdout parser detects `[ACC:DONE ref=i001]`, captures all output between the query injection and the sentinel, and routes it to the requesting module. The panel remains open for the next query or user interaction.

**Designation:** User designates a panel as the intelligence session in two ways:
- **Auto-spawn:** Settings → Intelligence → Mode 3 → select agent → ACC spawns a dedicated "Intelligence" panel in the Runner, labelled with a 🧠 indicator
- **Designate existing:** Right-click any active panel → "Use as Intelligence Session" — ACC marks it and starts routing queries to it

The designated panel is visually distinguished in the Runner (subtle badge, different header colour) so the user always knows which panel ACC is communicating with.

**Fallback behaviour:** If the designated panel is closed, crashes, or becomes unavailable mid-query:
1. ACC detects absence via idle/crash signal from the PTY manager
2. In-progress intelligence task is marked failed (not retried)
3. ACC falls back to Mode 1 (OpenRouter) for all subsequent intelligence tasks until the user re-designates a panel
4. Settings badge shows: *"Intelligence session offline — using OpenRouter fallback"*

**Context accumulation:** The designated session retains conversational context across queries. This is a feature — the Knowledge Compounder's extraction call can reference prior Failure Analyzer diagnoses from the same session. It is also a risk — after many queries the context approaches the model's limit. Module 18 (Token Guard) monitors this and warns the user when the session context is approaching capacity. At that point ACC suggests clearing the session or auto-opens a fresh panel.

**Model selection:** Inherits from the designated panel's configured model. User can pin a specific model to the intelligence panel independently from their coding panels.

**⚠️ Mandatory warning displayed in Settings when Mode 3 is active:**
> *"Interactive intelligence uses a persistent Claude Code / OpenCode session visible in the Runner. All intelligence operations and their responses are visible in that panel. ACC queries share the session's plan and context limits with any manual queries you send to the same panel. The panel must remain open for intelligence features to work."*

**Characteristics:**
- Fully visible — user sees every intelligence query and response in real time
- Persistent context — prior analyses inform later ones within the session
- Interactive — user can follow up, correct, or extend any response manually
- Designatable — user can point it at any running panel or auto-spawn a dedicated one
- Plan-sharing risk same as Mode 2, but more visible and controllable
- Requires panel to remain open — less resilient than Mode 1 or 2 for background operations
- Warmest UX — feels like a natural extension of the agent the user is already working with

---

#### Intelligence Session Type in Schema

All three modes log to the `sessions` table with `task_type = 'intelligence'` so intelligence invocations are visible in Session Replay and excluded from Outcome Tracker statistics (they are not developer coding tasks).

Mode 3 additionally tracks the designated panel's session ID in a `settings` store key (`intelligence.designated_session_id`) so ACC can reconnect to it after an app restart if the session is still running.

---

### External APIs

| Service | Used For | Mode |
|---|---|---|
| OpenRouter | ACC intelligence operations (Failure Analyzer, Feature Docs, Knowledge Compounder, Task Router v2, Architect Agent) | Mode 1 default |
| Agent subscription (Claude Code / OpenCode) | ACC intelligence — ephemeral non-interactive sessions | Mode 2 optional |
| Agent subscription (Claude Code / OpenCode) | ACC intelligence — persistent visible interactive panel | Mode 3 optional |
| OpenRouter | Wave agent model routing (Minimax, Qwen, etc.) | All modes — wave execution only |
| Lark MCP (`@larksuiteoapi/lark-mcp`) | Upstream connector — **DEFERRED** pending custom integration | Future phase |
| Slack MCP (`mcp.slack.com`) | Upstream connector — **DEFERRED** pending custom integration | Future phase |
| Jira MCP (`mcp.atlassian.com`) | Upstream connector — **DEFERRED** pending custom integration | Future phase |



### What's Intentionally Excluded

| Technology | Why Excluded |
|---|---|
| Electron | 150MB+ binary, ships full Node.js + Chromium, complex rebuild for native modules |
| Next.js | SSR/API routes have no function in a Tauri webview; reserved for v2 web layer |
| Redux / MobX | Zustand sufficient; less boilerplate |
| GraphQL | REST sufficient for all v1 API patterns |
| Docker | Local-first principle; no container dependency |
| Express / Fastify | Tauri Rust backend handles all system ops natively |

---

## 10. First-Class Integrations: Supabase & GitHub

These two services receive dedicated treatment beyond generic MCP toggling. They are deeply integrated across ACC's intelligence, routing, and workflow layers because app builders use them on virtually every real project.

### Why They Are Not Generic MCPs

Generic MCPs in ACC's registry are on/off switches. Supabase and GitHub are different — they have:
- **Granular feature group control** (not all-or-nothing access)
- **Safety defaults** enforced by ACC architecture, not just config
- **Cross-module intelligence** — they inform the Failure Analyzer, Project Intelligence, Knowledge Compounder, and Wave Orchestrator
- **Dual roles** — both tool (used by agents mid-session) and connector (source of upstream work)

### Supabase

**MCP Server:** `https://mcp.supabase.com/mcp` — official, OAuth 2.0, zero install

**8 Feature Groups — ACC Registry UI shows individual toggles:**

| Group | ACC Default | Risk Level | What Agents Can Do |
|---|---|---|---|
| `docs` | ✅ On | None | Read Supabase documentation inline |
| `database` | ✅ On | Read-only | Inspect tables, columns, RLS policies, indexes |
| `storage` | ✅ On | Read-only | Read bucket structure, file metadata |
| `debugging` | ⚠️ Opt-in | Low | Query logs, error traces, performance stats |
| `functions` | ⚠️ Opt-in | Low | Read Edge Function code and invocation logs |
| `branching` | ⚠️ Opt-in | Medium | Create/merge Supabase branches |
| `development` | 🔒 Locked | **High** | execute_sql — requires explicit per-session unlock |
| `account` | 🔒 Locked | **Critical** | Org/billing — permanently disabled for agents |

**Migration Safety Protocol (ACC-enforced, not just documented):**

The `development` feature group is locked behind a per-session confirmation modal. When an agent needs to apply a migration, ACC intercepts and requires explicit human unlock. This is an architectural constraint, not a convention.

```
Agent writes migration → supabase/migrations/YYYYMMDD_description.sql
                  ↓
ACC detects new file in migrations/ directory (fs.watch)
                  ↓
ACC displays: "Migration file created. Apply to database?
              [Review in Dashboard] [Run supabase db push] [Dismiss]"
                  ↓
Human acts → Agent verifies via schema read post-apply
```

**Project Intelligence integration:** Stack scanner detects Supabase in `package.json` or `requirements.txt` → auto-suggests Supabase MCP with safe defaults pre-configured.

**Knowledge Compounder integration:** Supabase-specific Stack Runbooks are generated from observed migration and schema patterns. Anti-patterns (e.g., agent attempting `execute_sql` directly) are captured and surfaced as preflight warnings.

**Failure Analyzer integration:** Recognizes Supabase error signatures: RLS violations (`new row violates row-level security`), connection pool exhaustion, missing env vars (`supabaseUrl is required`), auth token expiry.

---

### GitHub

**MCP Server:** `https://api.githubcopilot.com/mcp/` — official, co-developed with Anthropic, auto-scopes tools to OAuth token permissions

**Toolsets — ACC Registry UI shows individual toggles:**

| Toolset | ACC Default | What Agents Can Do |
|---|---|---|
| `repos` | ✅ On | Read files, directory structure, commits, branches |
| `issues` | ✅ On | Read, create, update, close issues |
| `pull_requests` | ✅ On | Create PRs, read comments, request reviews |
| `actions` | ✅ On | Monitor CI/CD runs, read workflow logs |
| `code_security` | ⚠️ Opt-in | Dependabot alerts, code scanning results |
| `projects` | ⚠️ Opt-in | GitHub Projects board management |
| `notifications` | ⚠️ Opt-in | Watch mentions, review requests |

**Lockdown Mode — auto-enabled for public repos:**
ACC detects repo visibility on project load. Public repos get Lockdown Mode automatically — content sanitization prevents prompt injection attacks from malicious issue/PR content. Surfaced as a visible indicator in the MCP Registry panel.

**GitHub as QA Signal (replaces or supplements test suite):**

```
Wave final agent completes → HANDOFF verified
              ↓
ACC creates PR via GitHub MCP
PR title = feature slug | PR body = CHANGELOG.md content
              ↓
GitHub Actions triggered automatically (if configured)
              ↓
ACC polls Actions API every 2 minutes (max 60 minutes before timeout)
              ↓
✅ Green CI → QA pass → proceed to Report stage
❌ Red CI  → Failure Analyzer (GitHub Actions log as input)
           → Correction loop fires
           → Re-run wave agent that owns the failing file
```

**QA gate fallback — projects without GitHub Actions:**

GitHub CI is the preferred QA signal but is not universal. ACC detects whether a project has Actions configured on project load (via the `repos` toolset — checks for `.github/workflows/` directory). If no workflows are found, ACC uses a local fallback QA pass:

```
No GitHub Actions detected:
              ↓
ACC runs project test command locally (from project profile: test_framework + package_manager)
e.g.  pytest | npm test | cargo test | go test ./...
              ↓
✅ Exit code 0 → QA pass
❌ Non-zero   → Failure Analyzer (test output as input)
```

If no test command is configured and no CI exists, ACC surfaces a warning: *"No QA signal configured. Wave will proceed without automated verification."* The developer can then approve manually or configure a test command in the project profile before proceeding. The wave is never silently promoted without at least one QA check or explicit manual approval.

**GitHub Issues as Tier 1 Upstream Connector:**

GitHub Issues is a first-class connector source using the identical 7-stage loop as Lark and Jira. Issue filed → ACC classifies (issues already have labels, so classification is lightweight) → proposes as issue comment → approved via label or `/approve` comment → wave executes → PR created and linked → CI passes → issue auto-closed with summary comment.

This means for open-source projects or GitHub-native teams, **ACC requires no external communication platform** — the entire loop runs inside GitHub.

---

## 11. Data Models & Schema

### Complete SQLite Schema

#### Database Initialisation Pragmas

These pragmas **must** be executed at database creation time in the Rust backend before any table is created. They are not optional — without WAL mode, parallel wave write contention will serialise all writes through a single lock, causing visible lag under the exact load pattern ACC is designed to run.

```sql
-- Must execute before any table creation
PRAGMA journal_mode=WAL;       -- concurrent reads + writes; essential for parallel waves
PRAGMA synchronous=NORMAL;     -- faster writes, still crash-safe with WAL
PRAGMA foreign_keys=ON;        -- enforce all FK constraints at DB level
PRAGMA cache_size=-32000;      -- 32MB page cache (negative value = kilobytes)
PRAGMA temp_store=MEMORY;      -- temp tables and indices in memory
```

```sql
-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE projects (
  id              TEXT PRIMARY KEY,
  path            TEXT NOT NULL UNIQUE,
  name            TEXT,
  stack           TEXT,            -- JSON array
  test_framework  TEXT,
  package_manager TEXT,
  profile         TEXT,            -- Full JSON project profile blob
  connector_id    TEXT,            -- Active upstream connector
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

-- ============================================================
-- AGENTS (registered agent configurations)
-- ============================================================
CREATE TABLE agents (
  id              TEXT PRIMARY KEY,
  label           TEXT NOT NULL,   -- "Claude Code", "OpenCode"
  spawn_cmd       TEXT NOT NULL,   -- "claude", "opencode", "gemini"
  spawn_args      TEXT,            -- JSON array of default args
  memory_file     TEXT,            -- "CLAUDE.md", "GEMINI.md", "CONVENTIONS.md", etc.
  config_path     TEXT,            -- "~/.claude/", "~/.aider/", etc.
  mcp_config_key  TEXT,            -- "mcpServers" or "mcp" or "extensions"
  tier            INTEGER NOT NULL, -- 1 (full PTY) or 2 (full PTY + subscription auth)
  requires_auth   TEXT,            -- "cursor-subscription", etc.
  supports_subagents INTEGER DEFAULT 0, -- 1 if agent natively spawns parallel subagents
  is_active       INTEGER DEFAULT 1
);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE sessions (
  id              TEXT PRIMARY KEY,
  project_id      TEXT REFERENCES projects(id),
  agent_id        TEXT REFERENCES agents(id),
  model           TEXT,
  started_at      TEXT NOT NULL,
  ended_at        TEXT,
  task_desc       TEXT,
  task_type       TEXT,            -- 'refactor' | 'implement' | 'review' | 'test' | 'debug' | 'document'
  outcome         TEXT,            -- 'done' | 'failed' | 'revised' | null
  outcome_at      TEXT,
  plan_id         TEXT REFERENCES feature_plans(id)
);

-- ============================================================
-- SESSION EVENTS (replay)
-- Lean index table kept small for fast scans and filtering.
-- Heavy payload content (diffs, command output) stored separately
-- in event_payloads and fetched only on explicit detail view.
-- ============================================================
CREATE TABLE events (
  id              TEXT PRIMARY KEY,
  session_id      TEXT REFERENCES sessions(id),
  timestamp       TEXT NOT NULL,
  agent_id        TEXT,
  event_type      TEXT NOT NULL,   -- 'read' | 'edit' | 'run' | 'user_input' | 'agent_output' | 'error' | 'handoff' | 'correction' | 'acb_signal' | 'limit_event' | 'intelligence'
  target          TEXT,            -- file path or command
  lines_added     INTEGER,
  lines_removed   INTEGER,
  exit_code       INTEGER          -- for 'run' events
);

-- Payload table: large content stored separately, fetched on demand
CREATE TABLE event_payloads (
  event_id        TEXT PRIMARY KEY REFERENCES events(id),
  detail          TEXT             -- diff content, command output, PTY excerpt, etc.
);

-- ============================================================
-- ASSETS (skills, memory, MCPs, connectors, plugins)
-- ============================================================
CREATE TABLE assets (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL,   -- 'skill' | 'memory' | 'mcp' | 'plugin'
  agent_scope     TEXT NOT NULL,   -- 'claude' | 'opencode' | 'global' | comma-separated
  name            TEXT NOT NULL,
  description     TEXT,
  file_path       TEXT,
  content         TEXT,
  config          TEXT,            -- JSON for MCPs
  tags            TEXT,            -- JSON array
  source_format   TEXT,            -- 'acc' | 'openclaw' | 'native'
  is_active       INTEGER DEFAULT 1,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE project_assets (
  project_id      TEXT REFERENCES projects(id),
  asset_id        TEXT REFERENCES assets(id),
  applied_at      TEXT NOT NULL,
  PRIMARY KEY (project_id, asset_id)
);

-- ============================================================
-- MCP REGISTRY
-- ============================================================
CREATE TABLE mcps (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,   -- 'stdio' | 'sse' | 'http'
  command         TEXT,
  args            TEXT,            -- JSON array
  env_key_names   TEXT,            -- JSON array of required secret names
  agent_scope     TEXT,            -- JSON array of agent IDs
  is_active       INTEGER DEFAULT 1,
  is_connector    INTEGER DEFAULT 0 -- 1 for Lark/Slack/Jira MCPs
);

-- ============================================================
-- PRESET COMMANDS
-- ============================================================
CREATE TABLE presets (
  id              TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  agent_id        TEXT REFERENCES agents(id),
  command         TEXT NOT NULL,
  tags            TEXT,            -- JSON array
  project_id      TEXT,            -- NULL = global
  sort_order      INTEGER DEFAULT 0
);

-- ============================================================
-- MODEL REGISTRY
-- ============================================================
CREATE TABLE models (
  id              TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  provider        TEXT NOT NULL,   -- 'openrouter' | 'anthropic' | 'google' | 'ollama'
  model_path      TEXT NOT NULL,   -- "openrouter/minimax/minimax-m2.7"
  strengths       TEXT,            -- JSON array: ['file_operations', 'fast_execution']
  agent_id        TEXT,            -- which CLI agent supports this
  alternation_index INTEGER,       -- 0 = even agents, 1 = odd agents
  is_active       INTEGER DEFAULT 1
);

-- ============================================================
-- OUTCOME STATISTICS
-- ============================================================
CREATE TABLE outcome_stats (
  agent_id        TEXT NOT NULL,
  task_type       TEXT NOT NULL,
  project_id      TEXT,
  total           INTEGER DEFAULT 0,
  done            INTEGER DEFAULT 0,
  failed          INTEGER DEFAULT 0,
  revised         INTEGER DEFAULT 0,
  avg_duration_s  REAL,
  PRIMARY KEY (agent_id, task_type, project_id)
);

-- ============================================================
-- FEATURE PLANS (Wave Orchestrator)
-- ============================================================
CREATE TABLE feature_plans (
  id              TEXT PRIMARY KEY,
  project_id      TEXT REFERENCES projects(id),
  slug            TEXT NOT NULL,
  docs_path       TEXT,            -- docs/YYYY-MM-DD-slug/
  status          TEXT DEFAULT 'planning', -- 'planning' | 'executing' | 'qa' | 'complete'
  detected_item_id TEXT,           -- if triggered by connector
  created_at      TEXT NOT NULL,
  completed_at    TEXT
);

CREATE TABLE plan_agents (
  id              TEXT PRIMARY KEY,
  plan_id         TEXT REFERENCES feature_plans(id),
  agent_ref       TEXT NOT NULL,   -- 'A1', 'A2', 'B1'
  task            TEXT NOT NULL,
  wave            INTEGER NOT NULL,
  model_id        TEXT REFERENCES models(id),
  depends_on      TEXT,            -- JSON array of agent_refs
  agent_id        TEXT REFERENCES agents(id),
  status          TEXT DEFAULT 'queued', -- 'queued'|'running'|'done'|'failed'|'manual'
  guideline_path  TEXT,
  handoff_path    TEXT,
  started_at      TEXT,
  completed_at    TEXT,
  retry_count     INTEGER DEFAULT 0
);

CREATE TABLE corrections (
  id              TEXT PRIMARY KEY,
  plan_id         TEXT REFERENCES feature_plans(id),
  agent_ref       TEXT NOT NULL,
  bug_desc        TEXT,
  root_cause      TEXT,
  fix_required    TEXT,
  test_required   TEXT,
  retry_number    INTEGER DEFAULT 1,
  resolved        INTEGER DEFAULT 0,
  created_at      TEXT NOT NULL
);

CREATE TABLE failure_analyses (
  id              TEXT PRIMARY KEY,
  session_id      TEXT REFERENCES sessions(id),
  pty_excerpt     TEXT,
  diagnosis       TEXT,            -- JSON: root_cause, evidence, fix, confidence
  created_at      TEXT NOT NULL
);

-- ============================================================
-- UPSTREAM CONNECTORS
-- ============================================================
CREATE TABLE connector_configs (
  id              TEXT PRIMARY KEY,
  platform        TEXT NOT NULL,   -- 'lark' | 'slack' | 'jira' | 'linear' | 'github'
  project_id      TEXT REFERENCES projects(id),
  mcp_server      TEXT NOT NULL,
  watch_targets   TEXT,            -- JSON array of channel/space/project IDs
  watch_keywords  TEXT,            -- JSON array
  poll_interval   INTEGER DEFAULT 15,
  auto_propose    TEXT,            -- JSON: which types to auto-propose
  approval_signals TEXT,           -- JSON array
  approval_timeout INTEGER DEFAULT 10080,
  reminder_after  INTEGER DEFAULT 1440,
  proposal_folder TEXT,
  delivery_log_id TEXT,
  is_active       INTEGER DEFAULT 1
);

CREATE TABLE detected_items (
  id              TEXT PRIMARY KEY,
  connector_id    TEXT REFERENCES connector_configs(id),
  platform_msg_id TEXT NOT NULL,
  sender          TEXT,
  thread_id       TEXT,
  raw_content     TEXT,
  classification  TEXT,            -- JSON: type, confidence, priority, summary
  status          TEXT DEFAULT 'pending', -- 'pending'|'proposed'|'approved'|'rejected'|'executing'|'complete'|'stale'
  detected_at     TEXT NOT NULL,
  proposal_doc_id TEXT,
  proposal_url    TEXT,
  approved_at     TEXT,
  approved_by     TEXT,
  plan_id         TEXT REFERENCES feature_plans(id),
  completed_at    TEXT
);

CREATE TABLE delivery_log (
  id              TEXT PRIMARY KEY,
  detected_item_id TEXT REFERENCES detected_items(id),
  plan_id         TEXT REFERENCES feature_plans(id),
  platform        TEXT NOT NULL,
  summary_msg_id  TEXT,
  changelog_doc_id TEXT,
  qa_doc_id       TEXT,
  platform_record_id TEXT,         -- Lark Base row, Linear issue, Jira ticket
  posted_at       TEXT NOT NULL
);

-- ============================================================
-- MEMORY CAPTURE CANDIDATES
-- ============================================================
CREATE TABLE memory_candidates (
  id              TEXT PRIMARY KEY,
  session_id      TEXT REFERENCES sessions(id),
  project_id      TEXT REFERENCES projects(id),
  content         TEXT NOT NULL,
  source_pattern  TEXT,            -- which pattern triggered detection
  status          TEXT DEFAULT 'pending', -- 'pending'|'added'|'skipped'
  created_at      TEXT NOT NULL
);

-- ============================================================
-- KNOWLEDGE COMPOUNDER
-- ============================================================
CREATE TABLE knowledge_items (
  id                  TEXT PRIMARY KEY,
  type                TEXT NOT NULL,   -- 'decision' | 'pattern' | 'anti_pattern' | 'runbook' | 'lesson'
  title               TEXT NOT NULL,
  content             TEXT NOT NULL,   -- Full markdown body
  tags                TEXT,            -- JSON array: ['#auth', '#jwt']
  stack_tags          TEXT,            -- JSON array: ['python', 'supabase', 'fastapi']
  agent_tags          TEXT,            -- JSON array: ['opencode', 'claude']
  project_id          TEXT REFERENCES projects(id),  -- NULL = global
  session_ids         TEXT,            -- JSON array of source session IDs
  plan_ids            TEXT,            -- JSON array of source feature plan IDs
  confidence          REAL DEFAULT 0.1,  -- 0.0–1.0, rises with confirmation_count
  confirmation_count  INTEGER DEFAULT 1,
  is_global           INTEGER DEFAULT 0,  -- 1 = applies across all projects
  first_seen          TEXT NOT NULL,
  last_confirmed      TEXT NOT NULL,
  status              TEXT DEFAULT 'active'  -- 'active' | 'flagged' | 'archived'
);

CREATE TABLE knowledge_relations (
  from_id       TEXT REFERENCES knowledge_items(id),
  to_id         TEXT REFERENCES knowledge_items(id),
  relation_type TEXT NOT NULL,   -- 'contradicts' | 'extends' | 'requires' | 'confirmed_by'
  created_at    TEXT NOT NULL,
  PRIMARY KEY (from_id, to_id, relation_type)
);

-- ============================================================
-- SUPABASE PROJECT CONFIG (per-project MCP feature groups)
-- ============================================================
CREATE TABLE supabase_configs (
  id              TEXT PRIMARY KEY,
  project_id      TEXT REFERENCES projects(id) UNIQUE,
  project_ref     TEXT,            -- Supabase project reference ID
  feature_groups  TEXT,            -- JSON array of enabled groups
  lockdown_migrations INTEGER DEFAULT 1,
  readonly_execute_sql INTEGER DEFAULT 1,
  updated_at      TEXT NOT NULL
);

-- ============================================================
-- GITHUB PROJECT CONFIG (per-project toolset + security)
-- ============================================================
CREATE TABLE github_configs (
  id              TEXT PRIMARY KEY,
  project_id      TEXT REFERENCES projects(id) UNIQUE,
  repo_owner      TEXT,
  repo_name       TEXT,
  repo_visibility TEXT DEFAULT 'private',  -- 'public' | 'private'
  lockdown_mode   INTEGER DEFAULT 0,       -- auto-set to 1 for public repos
  enabled_toolsets TEXT,                   -- JSON array of enabled toolsets
  default_branch  TEXT DEFAULT 'main',
  pr_template     TEXT,                    -- markdown template for auto-created PRs
  updated_at      TEXT NOT NULL
);
```

#### Required Indexes

These indexes must be created immediately after table creation. Without them, the query patterns ACC relies on — replay filtering, routing stats, knowledge preflight, connector polling — will perform full table scans and degrade visibly once data accumulates.

```sql
-- Session replay: filter + sort by session and time
CREATE INDEX idx_events_session    ON events(session_id, timestamp);
CREATE INDEX idx_events_agent      ON events(session_id, agent_id);
CREATE INDEX idx_events_type       ON events(session_id, event_type);

-- Outcome routing: filter by project for confidence stats
CREATE INDEX idx_outcomes_project  ON outcome_stats(project_id, agent_id);

-- Knowledge preflight: filter by stack + confidence level
CREATE INDEX idx_knowledge_query   ON knowledge_items(status, confidence, is_global);
CREATE INDEX idx_knowledge_stack   ON knowledge_items(status);  -- filtered in app layer by JSON stack_tags

-- Connector polling: filter pending detected items per connector
CREATE INDEX idx_detected_status   ON detected_items(connector_id, status);
CREATE INDEX idx_detected_platform ON detected_items(status);

-- ACB message bus: open signals per session
CREATE INDEX idx_messages_session  ON agent_messages(session_id, status);
CREATE INDEX idx_messages_wave     ON agent_messages(session_id, from_agent);

-- Token usage: aggregate by session and context type
CREATE INDEX idx_token_session     ON token_usage(session_id, context);

-- Limit events: look up unresolved events per wave agent
CREATE INDEX idx_limit_agent       ON limit_events(plan_agent_id, resolved);

-- Cron scheduler: find active jobs and execution history
CREATE INDEX idx_cron_jobs_next    ON cron_jobs(enabled, next_run_at);
CREATE INDEX idx_cron_exec_job     ON cron_executions(cron_job_id, status);
CREATE INDEX idx_cron_exec_plan    ON cron_executions(plan_id);

-- Token budgets: live counter lookup per session, active monitoring
CREATE INDEX idx_agent_budgets_session ON agent_budgets(session_id, state);
CREATE INDEX idx_agent_budgets_active  ON agent_budgets(state) WHERE state != 'completed';

-- Wave resumption plans: lookup by wave
CREATE INDEX idx_resumption_wave   ON wave_resumption_plans(wave_id);

-- Pending tasks: filter knowledge_items by pending_task type and status
CREATE INDEX idx_pending_tasks     ON knowledge_items(type, status) WHERE type = 'pending_task' AND status IN ('pending', 'reminded');
```

---

## 12. Agent Abstraction Layer

Every supported agent is one `AgentConfig` object. No agent-specific code paths.

```typescript
// src/lib/agents/types.ts

export type AgentTier = 1 | 2

export interface AgentConfig {
  id: string
  label: string
  spawnCmd: string           // 'claude' | 'opencode' | 'aider' | 'goose' | 'cline' | etc.
  defaultArgs: string[]
  memoryFile: string         // 'CLAUDE.md' | 'GEMINI.md' | 'AGENTS.md' | 'CONVENTIONS.md' | etc.
  globalConfigPath: string
  mcpConfigFile: string
  mcpConfigKey: string
  tier: AgentTier            // 1 = full PTY, 2 = full PTY with subscription auth
  requiresAuth?: string      // 'cursor-subscription' | 'goose-block-account'
  supportsSubagents: boolean // true if agent natively spawns parallel subagents
  subagentDetectionPattern?: RegExp  // PTY pattern signaling subagent spawn (Module 1 observability)
  waveCommand?: string       // Command pattern for Wave Orchestrator
                             // Absence of waveCommand = agent is NOT eligible for wave assignment
  waveEligible: boolean
  knownFlagVersions?: {      // Version-aware flag mapping — CLI flags change between releases
    [semverRange: string]: Partial<AgentConfig>
  }
}
```

**CLI Interface Instability — Version Awareness:**

The `waveCommand` templates hardcode specific CLI flags that change between agent releases. ACC tracks the installed version of each Tier 1 agent at startup (via `claude --version`, `opencode --version`, etc.) and matches against `knownFlagVersions` to select the correct flag syntax. When an agent updates to an unknown version, ACC surfaces a warning in Settings and disables wave commands for that agent until the config is verified. This prevents silent breakage from upstream flag changes.

```typescript
// Version check at startup (Rust backend)
// Stored in SQLite agent_versions table
// UI shows warning badge on affected agent panel
```

**IDE-only agents — explicitly excluded:**

Agents that exist only as IDE applications without a controllable headless CLI are not supported in ACC. This includes Windsurf Cascade and Antigravity. Their only "CLI" presence is a project launcher (`windsurf .`) that opens the IDE — there is no way for ACC to inject prompts, capture structured output, or participate in wave execution. Community wrappers exist (e.g. `wsc` for Windsurf using AppleScript-driven UI automation, macOS-only) but are too fragile for production integration. If these vendors ship a real headless CLI in future, they will be added as Tier 1 agents.

**Native subagent observability:**

Several Tier 1 agents natively spawn parallel subagents (Claude Code via the Agent tool; Cursor parallel agents; Cline native subagents v3.58+; Goose's roadmapped meta-agent). ACC observes these by detecting subagent-spawn patterns in the parent agent's PTY output (via `subagentDetectionPattern`) and registers each subagent as a tracked sub-session inside the parent panel — no separate panel, but each subagent gets its own status chip and event log. This is distinct from ACC's own Wave Orchestrator: native subagents are the agent's internal parallelism, while waves are ACC's external orchestration. Both can run simultaneously — a wave agent can itself spawn native subagents.

```typescript
// Built-in configs
export const AGENT_CONFIGS: AgentConfig[] = [
  {
    id: 'claude',
    label: 'Claude Code',
    spawnCmd: 'claude',
    defaultArgs: ['--dangerously-skip-permissions'],
    memoryFile: 'CLAUDE.md',
    globalConfigPath: '~/.claude/',
    mcpConfigFile: 'claude_desktop_config.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    supportsSubagents: true,
    subagentDetectionPattern: /Dispatching subagent|Agent\d+ started/i,
    waveCommand: 'claude --dangerously-skip-permissions "{prompt}"'
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    spawnCmd: 'opencode',
    defaultArgs: ['run'],
    memoryFile: '.opencode/memory/default.md',
    globalConfigPath: '~/.opencode/',
    mcpConfigFile: 'config.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    supportsSubagents: true,     // native subagents via Task tool (task() function)
    subagentDetectionPattern: /Dispatching subagent|subagent_type/i,
    waveCommand: 'opencode run --model {model} --dir {dir} --format json "{prompt}"'
  },
  {
    id: 'aider',
    label: 'Aider',
    spawnCmd: 'aider',
    defaultArgs: [],
    memoryFile: 'CONVENTIONS.md',  // Aider reads CONVENTIONS.md for project rules
    globalConfigPath: '~/.aider/',
    mcpConfigFile: '.aider.conf.yml',
    mcpConfigKey: 'mcp',
    tier: 1,
    waveEligible: true,
    supportsSubagents: false,
    waveCommand: 'aider --message "{prompt}" --yes --no-pretty'
    // --yes auto-confirms file edits; --no-pretty disables ANSI for cleaner ACC parsing
    // Aider auto-commits each change to git — works well in worktree-based wave isolation
  },
  {
    id: 'goose',
    label: 'Goose',
    spawnCmd: 'goose',
    defaultArgs: ['run'],
    memoryFile: '.goose/instructions.md',
    globalConfigPath: '~/.config/goose/',
    mcpConfigFile: 'config.yaml',
    mcpConfigKey: 'extensions',  // Goose calls them "extensions", same MCP underneath
    tier: 1,
    waveEligible: true,
    supportsSubagents: false,    // parallel sub-agents on roadmap, not yet shipped
    waveCommand: 'goose run --instructions "{prompt}"'
  },
  {
    id: 'cline',
    label: 'Cline CLI',
    spawnCmd: 'cline',
    defaultArgs: [],
    memoryFile: '.clinerules',
    globalConfigPath: '~/.cline/',
    mcpConfigFile: 'cline_mcp_settings.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    supportsSubagents: true,     // native subagents v3.58+
    subagentDetectionPattern: /Spawning subagent|Sub-task started/i,
    waveCommand: 'cline --task "{prompt}" --auto-approve'
  },
  {
    id: 'cursor',
    label: 'Cursor',
    spawnCmd: 'agent',
    defaultArgs: ['chat'],
    memoryFile: '.cursor/rules',
    globalConfigPath: '~/.cursor/',
    mcpConfigFile: 'mcp.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    requiresAuth: 'cursor-subscription',
    supportsSubagents: true,     // parallel subagents + background agents
    subagentDetectionPattern: /Background agent|Parallel agent/i,
    waveCommand: 'agent chat "{prompt}"'
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    spawnCmd: 'gemini',
    defaultArgs: ['--output-format', 'json'],
    memoryFile: 'GEMINI.md',
    globalConfigPath: '~/.gemini/',
    mcpConfigFile: 'settings.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    supportsSubagents: true,     // native subagents via @agent_name delegation + /agents command
    subagentDetectionPattern: /Delegating|subagent.*started|\/agents\s/i,
    waveCommand: 'gemini --output-format json "{prompt}"'
  },
  {
    id: 'qwen-code',
    label: 'Qwen Code',
    spawnCmd: 'qwen-code',
    defaultArgs: ['run'],
    memoryFile: 'qwen.md',
    globalConfigPath: '~/.qwen/',
    mcpConfigFile: 'settings.json',  // inherits Gemini CLI config structure
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    supportsSubagents: true,     // native subagents via Task tool (task() function)
    subagentDetectionPattern: /Dispatching subagent|subagent_type/i,
    waveCommand: 'qwen-code run --model {model} "{prompt}"'
    // Qwen Code is a Gemini CLI fork — most behavior matches the Gemini config above
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    spawnCmd: 'codex',
    defaultArgs: ['run'],
    memoryFile: 'AGENTS.md',
    globalConfigPath: '~/.codex/',
    mcpConfigFile: 'config.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    supportsSubagents: true,     // native subagents via spawn_agent tool + path-based addressing
    subagentDetectionPattern: /spawn_agent|Spawned agent/i,
    waveCommand: 'codex run --model {model} "{prompt}"'
  }
]
```

---

## 13. Connector Abstraction Layer

Every supported upstream platform is one `ConnectorConfig` object.

```typescript
// src/lib/connectors/types.ts

export interface ConnectorPlatformSpec {
  id: string
  label: string
  mcpServer: string
  structured: boolean           // Pre-classified (Jira/Linear) vs free-text (Slack/Lark)
  approvalSignals: string[]     // Default signals for this platform
  proposalMedium: string        // 'doc' | 'issue' | 'canvas' | 'message'
  reportMedium: string[]        // ['message', 'doc', 'record']
}

export const CONNECTOR_SPECS: ConnectorPlatformSpec[] = [
  {
    id: 'lark',
    label: 'Lark / Feishu',
    mcpServer: 'npx -y @larksuiteoapi/lark-mcp mcp',
    structured: false,
    approvalSignals: ['✅', 'approved', 'approve', 'go ahead', 'lgtm'],
    proposalMedium: 'doc',
    reportMedium: ['message', 'doc', 'base_record']
  },
  {
    id: 'slack',
    label: 'Slack',
    mcpServer: 'https://mcp.slack.com/mcp',
    structured: false,
    approvalSignals: ['✅', 'approved', 'lgtm', 'looks good'],
    proposalMedium: 'canvas',
    reportMedium: ['message']
  },
  {
    id: 'jira',
    label: 'Jira',
    mcpServer: 'https://mcp.atlassian.com/v1/sse',
    structured: true,
    approvalSignals: ['status:Approved', 'status:In Progress'],
    proposalMedium: 'issue',
    reportMedium: ['issue_update', 'attachment']
  }
]
```

---

## 14. Architecture Decision Records

### ADR-001: Tauri v2 over Electron
**Status:** Accepted | **Date:** 2026-03

**Decision:** Use Tauri v2 with React 19 + Vite 6 as the desktop shell.

**Reasons:** ~10MB binary vs 150MB+ Electron. Rust backend handles PTY, file ops, and encryption natively without shipping Node.js. Frontend is identical to web dev — same React component code works in browser mode.

**Against Electron:** `electron-rebuild` for `node-pty` and `better-sqlite3` breaks regularly on ARM macOS, Windows, and across Node version bumps. 1code (Electron) documents this pain directly in their repo. Tauri avoids this entirely.

**Tradeoff accepted:** Rust knowledge needed for custom Tauri commands. Mitigated by using official Tauri plugins for all system ops — custom Rust is minimal.

---

### ADR-002: Build from Scratch, Not Fork of 1code
**Status:** Accepted | **Date:** 2026-03

**Decision:** Build ACC on Tauri from scratch. Do not fork 1code despite its Apache 2.0 license.

**Reasons:** 1code uses Electron + tRPC + Jotai + Zustand + React Query — four state layers. Extending it requires understanding all four. Their cloud features (`1code.dev` backend) are unavailable to forks. Their `electron-rebuild` maintenance tax compounds over time.

**Alternative packages instead of fork:** `simple-git` for git operations, `@octokit/rest` for GitHub API, `diff2html` for diff rendering. These give 90% of 1code's valuable features with zero inherited complexity.

**Estimated effort to match relevant 1code features:** 3 weeks agentic coding vs. 3 weeks understanding their architecture to extend it safely.

---

### ADR-003: SQLite Local-First, Supabase Optional in v2
**Status:** Accepted | **Date:** 2026-03

**Decision:** SQLite via Tauri sql plugin as sole database in v1. No remote database required.

**Reasons:** All v1 features are single-user, local-machine. SQLite is zero-setup, offline-capable, fast for all query patterns needed. Supabase migration path is clear and non-breaking for v2.

---

### ADR-004: AgentConfig and ConnectorConfig as Extension Points
**Status:** Accepted | **Date:** 2026-03

**Decision:** All agent-specific and platform-specific logic lives in config objects, not code branches. Adding a new agent or connector is adding one object to an array.

**Reasons:** Future-proofs against the rapidly expanding agent ecosystem. Eliminates agent-specific code that requires rewrites as new tools emerge.

---

### ADR-005: Human Gate at Approval Stage Only
**Status:** Accepted | **Date:** 2026-03

**Decision:** The upstream connector loop auto-executes stages 1, 2, 3, 5, 6, 7. Stage 4 (await approval) is the only mandatory human gate. All other stages have optional confirmation modes.

**Reasons:** Full automation without approval is a trust risk — stakeholders lose confidence if the system acts without consent. Full manual control defeats the purpose. A single approval gate is the minimum viable trust contract.

---

### ADR-006: `.acc` Bundle as Open Zip Format
**Status:** Accepted | **Date:** 2026-03

**Decision:** `.acc` playbook bundles are standard zip archives with a versioned JSON manifest. Any zip tool can inspect them.

**Reasons:** Transparent, auditable, version-controllable (unzip into a repo), community-extensible. Open format enables ecosystem growth without ACC being the gatekeeper.

---

### ADR-007: MAFW Protocol as Native ACC Workflow
**Status:** Accepted | **Date:** 2026-03

**Decision:** ACC's Wave Orchestrator, Agent Guideline Generator, and Handoff Monitor directly implement the Multi-Agent Feature Workflow protocol proven in Edge8 production (grading system project, 2026-03-12).

**Reasons:** MAFW is not a theoretical framework — it is a protocol that ran 12 agents over 2 hours with documented failure modes and resolutions. Building ACC around MAFW means the tool is pre-validated against real production complexity. The "dogfood" principle means ACC is built using MAFW, which continuously validates the implementation.

---

### ADR-008: Supabase MCP Safe-by-Default Architecture
**Status:** Accepted | **Date:** 2026-03

**Decision:** Supabase MCP `development` feature group (which enables `execute_sql`) is locked by default and requires explicit per-session human confirmation to unlock. The `account` group is permanently disabled for all agents.

**Reasons:** Agents with unrestricted Supabase access can drop tables, truncate data, or apply broken migrations in production. A single misinterpreted instruction could cause irreversible data loss. The cost of one extra confirmation click is orders of magnitude less than the cost of a destructive migration on a client database.

**Tradeoff accepted:** Agents cannot apply migrations autonomously. This is intentional — migrations are the one operation where human review is non-negotiable. The workflow (write file → flag → human applies → agent verifies) adds ~2 minutes but eliminates catastrophic risk.

**Rejected alternative:** Allowing `execute_sql` with a "staging only" config — rejected because ACC cannot reliably determine if a Supabase project ref is staging vs. production without additional out-of-band verification.

---

### ADR-009: Knowledge Compounder as Async Non-Blocking Process
**Status:** Accepted | **Date:** 2026-03

**Decision:** The Knowledge Compounder runs entirely asynchronously after the workloop closes. It never blocks the developer's next task, never shows a loading state in the primary workflow, and surfaces results passively in the Knowledge Panel.

**Reasons:** Any synchronous knowledge extraction would add latency to the tail end of every workloop — exactly when the developer wants to move on or review results. Knowledge accumulation is valuable but never urgent. Async processing means zero perceived cost per session.

**Implementation:** Tauri async Rust task spawned after Feature Doc generation completes. Intelligence Layer invocation runs in background (Mode 1: OpenRouter HTTP call; Mode 2: non-interactive agent spawn). Results written to SQLite. Knowledge Panel badge increments when new items are ready. No toast, no modal, no blocking UI.

**Tradeoff accepted:** Knowledge items from the current session are not available immediately — they appear minutes later. This is acceptable because knowledge is retrospective by nature; it informs future sessions, not the current one.

---

### ADR-010: ACC Intelligence Layer — Dual Mode Design
**Status:** Accepted | **Date:** 2026-04

**Decision:** ACC's own AI-powered features (Failure Analyzer, Feature Doc Generator, Knowledge Compounder, Task Router v2, Architect Agent classification) are executed via a configurable Intelligence Layer with two modes:

- **Mode 1 (Default) — OpenRouter:** ACC calls OpenRouter directly via HTTP using a free/stable model. ACC ships a default key with a usage cap; users provide their own key when the cap is reached.
- **Mode 2 (Optional) — Agent-Mediated:** ACC spawns non-interactive Claude Code or OpenCode sessions for intelligence tasks, using the user's existing subscription.

**Reasons:**
- ACC must not require users to obtain and configure an API key just to use intelligence features on first launch. The default key covers the trial experience with zero setup.
- OpenRouter is preferred over a single-provider API (e.g., direct Anthropic) because it decouples ACC from one provider, supports free-tier models, and allows the default model to be changed without an app update.
- Agent-mediated mode gives users who want to maximise their existing subscription a path to do so, but must be opt-in with explicit warnings about plan sharing.
- The two modes are architecturally parallel — both produce identical structured output consumed by the same module logic. The mode selection affects only the transport layer.

**Tradeoff accepted:** Mode 1 introduces a dependency on OpenRouter's availability for intelligence features. If OpenRouter is down, Mode 1 intelligence features degrade. Mode 2 is not affected. Users in offline/airgapped environments should use Mode 2 with a locally-run agent (e.g., Ollama-backed OpenCode).

**Rejected alternatives:**
- Direct Anthropic API only: creates single-provider lock-in, requires users to have an Anthropic API key separate from their Claude Code subscription.
- Agent-mediated only: no path for users without a coding agent configured; intelligence fails until agent is set up. Unacceptable for first-run experience.

---

### ADR-011: Lark/Slack/Jira Connector Loop — Deferred
**Status:** Deferred | **Date:** 2026-04

**Decision:** The Lark, Slack, and Jira connector implementations (Phase 8) are deferred from the active build plan. The ConnectorConfig abstraction, the 7-stage loop architecture, and the Architect Agent design remain in the specification as the intended end-state.

**Reasons:** A custom Lark MCP and event-listening system is under development that will address the tool coverage and approval signal gaps identified in the architectural assessment. Building against the current official Lark MCP before the custom system is ready risks implementing workarounds that will need to be replaced. The deferral eliminates 10 weeks of implementation risk from the critical path.

**What remains active:**
- GitHub Issues as Tier 1 connector: implemented in Phase 7 using the existing GitHub MCP. This validates the full 7-stage loop without Lark/Slack/Jira dependency.
- ConnectorConfig abstraction: designed and implemented as part of Phase 7 so Lark/Slack/Jira can be added as config objects when the custom system is ready.
- Architect Agent background loop: designed but its Lark/Slack/Jira polling implementations are stubbed until the custom integration is available.

**Re-activation trigger:** Custom Lark integration system available and validated. At that point Phase 8 resumes with the custom system as the implementation foundation.

---

# PART 5 — EXECUTION

---

## 15. Build Roadmap

### Overview

```
Phase 1  Weeks 1–3    Foundation          PTY runner, preset buttons, SQLite schema + indexes + WAL
                      QA gate: agents spawn, PTY interactive stability confirmed on all OS targets
Phase 2  Weeks 4–6    Asset Manager       Skills, Memory, MCPs, Vault, Write Coordinator
                      QA gate: MCP toggle writes verified against all agent config formats
Phase 3  Weeks 7–9    Intelligence        Outcomes, Failure Analyzer, Replay, Token Guard + Limit Detector
                      QA gate: Intelligence Layer all 3 modes tested; rate limit + fallback paths verified
Phase 4  Weeks 10–11  Routing             Task Router, Model Router, Handoff Protocol
                      QA gate: routing suggestions verified against known outcome history
Phase 5  Weeks 12–16  Wave Protocol       Wave Orchestrator + Guidelines + Handoffs + Correction Loop
                      QA gate: full 6-agent parallel wave runs end-to-end; intra-wave dependency verified
Phase 5+ Weeks 17–18  Comm Bus (ACB)      Agent Communication Bus — stdout signals, routing, Message Bus Panel
                      QA gate: BLOCKER/RESOLVE cycle verified; wave correctly pauses and resumes
Phase 6  Weeks 19–20  Team Layer          Playbooks, Reactive Memory, Feature Docs (+ dogfood begins)
                      QA gate: .acc import/export round-trip verified; 4 docs generated from a real session
Phase 7  Weeks 21–23  Supabase & GitHub   First-class integrations + GitHub Issues as Tier 1 connector
                      QA gate: migration safety lock verified; CI gate tested green + red paths
Phase 8  DEFERRED     Connector Loop      Lark → Slack → Jira — deferred pending custom Lark integration (ADR-011)
Phase 9  Week 24      Knowledge Layer     Knowledge Compounder + Knowledge Panel
                      QA gate: knowledge items appear after real session; confidence increments across sessions
Phase 9+ Weeks 25-26  Autonomous Scheduler Cron Registry, Session Heartbeat, escalation policy, notifications
                      QA gate: scheduled job runs end-to-end unattended; escalation fires correctly on BLOCKER
Phase 9++ Weeks 27-28 Token Budget System Budget Planner, threshold ladder, WIP capture, Wave Resumption, pending tasks
                      QA gate: 95% threshold triggers WIP write; resumption picks up from checkpoint; pending tasks auto-inject
Phase 10 Month 8+     Expansion           Cloud sync, web version, marketplace
```

**Phase 5 scope note:** Phase 5 (Wave Protocol) is the most architecturally complex module in the system — parallel process management, dependency graph evaluation, handoff parsing with debounce, stall detection, correction loops, and a full UI layout mode. Three weeks is insufficient. Four weeks (Weeks 12–15) is the realistic minimum; five weeks (Weeks 12–16) includes buffer for Tauri PTY edge cases discovered during implementation. The schedule above allocates 5 weeks and should be treated as fixed, not compressed.

**Phase 5+ (ACB) as standalone phase:** ACB is listed as Phase 5+ to signal its dependency on Phase 5 completion, but it is a standalone two-week effort with its own QA gate. It must not be treated as a Phase 5 appendage — if Phase 5 runs long, ACB slides intact rather than getting compressed.

**Dogfood start — Phase 6, not Phase 5:** ADR-007 states ACC builds itself using MAFW from Phase 5 onward. In practice, the team runs MAFW manually during Phase 5 to build the Wave Orchestrator itself. ACC dogfooding — using the Wave Orchestrator to build subsequent features — begins in Phase 6. Phase 5 defects discovered during Phase 6 dogfooding feed back as Phase 5 corrections, which is why Phase 6 has a 2-week allocation rather than 1.

---

### Phase 1 — Foundation (Weeks 1–3)
**Goal:** Working multi-agent launcher. Ship something usable on Day 21.

**Critical Phase 1 Week 1 task — Tauri PTY stability validation:**
Before building any Runner UI, the team must validate that `@tauri-apps/plugin-shell` handles interactive CLI sessions correctly on all target OS (macOS ARM, macOS Intel, Windows). Claude Code's interactive prompts, confirmation dialogs, and paging behaviour must be tested against the PTY layer in week 1. If the plugin cannot handle these edge cases, a custom Rust PTY implementation (using the `portable-pty` crate) must be scoped and built before any Runner UI work begins. Discovering this in week 3 would require rebuilding the foundation.

**MAFW Wave Plan:**
```
A1: Tauri + React + Vite scaffold + SQLite schema + WAL pragmas + indexes
A2: xterm.js PTY component + Tauri shell spawn — PTY stability test suite (week 1)
B1: Claude Code PTY integration + preset button store
B2: OpenCode PTY integration + project path switcher
C1: Aider + Goose PTY integration (Tier 1, AgentConfig pattern with waveEligible flag)
C2: Cline + Cursor PTY integration (Tier 1; Cursor requires subscription auth check)
C3: Gemini CLI + Codex CLI + Qwen Code integration
D1: Session event logging to SQLite (lean events table + event_payloads)
D2: PTY two-stage processing pipeline (escape strip + 60fps rate limiter)
```

**QA Gate:** All supported agents spawn and respond to PTY write on macOS and Windows. Interactive confirmation prompts handled correctly. Two-stage PTY pipeline verified — escape-stripped stream matches raw stream content. SQLite WAL mode confirmed active.

**Milestone:** Launch any supported agent, fire preset commands, switch projects, see session logs.

---

### Phase 2 — Asset Manager (Weeks 4–6)
**Goal:** All agent materials managed from one panel.

**MAFW Wave Plan:**
```
A1: Skills Library (directory scanner + Monaco editor + inject)
A2: Memory Browser (CLAUDE.md / GEMINI.md diff + editor)
B1: MCP Registry (config file reader + toggle writer + test connection)
B2: Connector Vault (Stronghold init + OS keychain fallback + env inject)
C1: Memory File Write Coordinator (Rust async queue + file lock)
C2: Plugin Manager (extension scanner)
D1: Project Profile JSON (stack detector from package manifests)
D2: MCP suggestions from detected stack
```

**QA Gate:** MCP toggle writes verified against all agent config file formats (claude_desktop_config.json, opencode config.json, gemini settings.json). Stronghold init tested — OS keychain fallback activates correctly on Stronghold failure. Write coordinator: concurrent write attempts to CLAUDE.md serialise correctly without corruption. API keys injected as env vars on PTY spawn confirmed.

**Milestone:** MCP toggles write to real config files. API keys auto-load on agent spawn. Skills editable and injectable.

**MAFW Wave Plan:**
```
A1: Asset DB schema + Tauri file sync commands (Rust)
A2: Skills Library UI + Monaco editor integration
B1: MCP Registry UI + toggle → writes to agent config files
B2: Memory Browser UI + diff view component
C1: Connector Vault (Stronghold) + secret form UI
C2: Auto-inject secrets into PTY spawn env
D1: OpenClaw SKILL.md format import
D2: Plugin Manager (read extension directories)
```

**Milestone:** MCP toggles write to real config files. API keys auto-load on agent spawn. Skills editable and injectable.

---

### Phase 3 — Intelligence Layer (Weeks 7–9)
**Goal:** Outcomes tracked, failures diagnosed, sessions replayable.

**MAFW Wave Plan:**
```
A1: Idle detector + supplementary signal checker + outcome prompt UI (Done/Failed/Revised)
A2: Outcome stats computation + SQLite aggregation
B1: Outcome dashboard UI (per-agent × per-task-type grid)
B2: Session Replay timeline UI + event rendering (lean events table scan + payload fetch on demand)
C1: Failure Analyzer (Intelligence Layer call + structured output)
C2: Similar failure matching from SQLite history
D1: Failure diagnosis display panel
D2: Token Guard — limit event detector + PTY pattern matching for all known error signatures
D3: Intelligence Layer — Mode 1 (OpenRouter HTTP client + request queue + backoff)
D4: Intelligence Layer — Mode 2 (non-interactive agent spawn)
D5: Intelligence Layer — Mode 3 (interactive panel designation + query injection)
E1: Session Heartbeat — Rust async health check loop (PID check + activity probe + CRASHED/STALLED states)
```

**QA Gate:** Idle detector fires only when supplementary signal is present — verified by running a long API-bound agent task and confirming no false outcome prompt. Failure Analyzer tested on real failure output across all three Intelligence Layer modes. Limit event detector triggers correctly on injected plan limit error strings. Mode 1/2/3 fallback chain verified (Mode 3 panel closed → falls back to Mode 1). Request queue priority ordering verified under concurrent call load. Heartbeat correctly identifies a CRASHED session (process killed externally) and a THINKING session (long pause, no output).

**Milestone:** Know which agent succeeds at what. Diagnose failures in one click. Browse any past session. Intelligence Layer operational in all three modes. Session health monitored continuously.

---

### Phase 4 — Routing & Handoff (Weeks 10–11)
**Goal:** Smart task routing. Clean agent-to-agent handoffs.

**MAFW Wave Plan:**
```
A1: Task Router UI (input box + suggestion display with "estimated" confidence label)
A2: Model Registry (DB + UI for model management)
B1: Rules-based routing v1 (keyword → outcome stats → rank)
B2: Model Router (alternation logic + per-task suggestion)
C1: Agent Handoff Protocol (envelope builder + PTY injection)
C2: Project Intelligence auto-detection (stack scanner + waveEligible filter)
D1: Profile Loader (one-click project setup)
D2: AgentConfig version checker (startup version probe + known flag version mapping)
```

**QA Gate:** Routing suggestions verified against known outcome history — correct agent ranked first for task types with clear historical signal. Version checker detects mismatched CLI flags and surfaces warning correctly. Handoff envelope injected into target PTY and acknowledged. Project stack scanner correctly identifies all supported manifest formats.

**Milestone:** Type a task → get agent + model suggestion with estimated confidence. Hand off work between agents with one click. Agent version warnings surface on outdated CLI installs.

---

### Phase 5 — Wave Protocol (Weeks 12–16)
**Goal:** Full MAFW workflow running inside ACC UI.

**Scope note:** This is the most complex module in the system. Five weeks is the realistic allocation. Do not compress. Week 16 is a buffer week — if weeks 12–15 complete cleanly, week 16 absorbs integration testing and edge case fixes discovered during that testing.

**MAFW Wave Plan:**
```
A1: Wave Orchestrator data model + plan_agents table (with limit-paused status)
A2: Work Item Table Builder UI (agent grid + dependency UI, waveEligible filter)
B1: Dependency graph renderer (visual nodes + edges, per-node readiness evaluation)
B2: Parallel agent spawn (Wave N execution engine + intra-wave per-agent unlock)
C1: Handoff Monitor (fs.watch + 500ms debounce + HANDOFF schema validator)
C2: Handoff Panel UI (verify / approve / flag controls)
D1: Stall detector (configurable timer + alert + options)
D2: Agent Guideline Generator (form + GUIDELINE.md writer + Communication Protocol section)
E1: Orchestrator Mode layout toggle
E2: Correction Loop (CORRECTION.md generator + re-inject, limit events excluded)
F1: Wave conventions enforcement (zero-regression, new-files-first, feature flags)
F2: Wave Resilience — limit-paused state + recovery UI (Module 18 Wave component)
```

**QA Gate:** Full 6-agent parallel wave runs end-to-end: guidelines generated, agents spawn in parallel, handoffs detected with debounce (partial write test included), intra-wave unlock fires correctly when only direct dependencies are verified, correction loop fires on failed handoff, limit-paused state correctly suppresses correction loop, wave resumes after manual limit resolution. Zero-regression rule blocks wave advancement when existing tests fail.

**Milestone:** Run a full MAFW-protocol multi-agent feature from inside ACC. Wave progress visible. Handoffs auto-detected and validated against schema. Intra-wave dependency resolution working.

---

### Phase 5+ — Agent Communication Bus (Weeks 17–18)
**Goal:** Agents can signal each other mid-execution via ACC-mediated stdout routing. No files created. No storage debt.

**Standalone phase — not a Phase 5 appendage.** If Phase 5 runs long, Phase 5+ slides intact with its own two-week allocation.

**MAFW Wave Plan:**
```
A1: agent_messages SQLite table + index
A2: ACB signal line parser — prefix check (line.includes('[ACC:')) before regex
B1: Signal router — parse from/to/type/priority/id fields, dispatch to target PTY stdin
B2: ACK tracking — open signal registry in SQLite, resolved-on-RESOLVE logic
C1: Wave Orchestrator integration — ACK + BLOCKER signals pause wave; RESOLVE unblocks
C2: Handoff Monitor integration — open ACK signals block handoff verification
D1: Message Bus Panel UI (open signals list, force-resolve control, session log)
D2: Agent Guideline Generator — Communication Protocol section auto-appended to all guidelines
E1: Session Replay integration — acb_signal event type added to timeline
E2: Knowledge Compounder integration — recurring CONTRACT/BLOCKER patterns extractable
```

**QA Gate:** BLOCKER signal from agent correctly pauses wave advancement. RESOLVE signal correctly unblocks. Force Resolve from UI works. ACK-priority CONTRACT signal delivery verified end-to-end in a real 2-agent wave. Prefix check confirmed active — parser not invoked for non-ACC lines (profiling check). Zero files created during a full signal exchange.

**Milestone:** Parallel wave agents can negotiate shared interfaces, surface blockers, and broadcast status mid-execution. All signals visible in Message Bus Panel. Wave correctly blocked and unblocked by signal state.

---

### Phase 6 — Team Layer (Weeks 19–20)
**Goal:** Playbooks exportable, memory reactive, feature docs auto-generated.

**Dogfood begins this phase.** From Phase 6 onward, ACC development uses ACC's own Wave Orchestrator, Agent Guideline Generator, and Feature Doc Generator. Phase 5 defects discovered during Phase 6 dogfooding are logged and fixed in parallel. Two weeks is allocated (not one) to absorb this feedback loop.

**MAFW Wave Plan:**
```
A1: .acc bundle format (zip schema + manifest writer)
A2: Playbook export UI (asset selector + bundle preview)
B1: Playbook import UI (unzip + install + secret scaffolding)
B2: Reactive Memory Capture (PTY pattern detector, phase-gated to idle/reflection phase)
C1: Feature Documentation Generator (4 sequential Intelligence Layer calls + summarisation pre-step)
C2: Intermediate file cleanup workflow (post-generation, only after all 4 docs succeed)
D1: Session export as PDF + Markdown
```

**QA Gate:** .acc import/export round-trip verified — exported bundle imports cleanly on a fresh ACC install with correct asset layout and secret scaffolding. Feature Doc Generator produces all 4 docs from a real dogfood session; partial failure recovery tested (kill call 3, verify calls 1+2 preserved, retry call 3 succeeds). Reactive memory candidate prompt verified — does not fire during active file-writing phase.

**Milestone:** Export full client AI setup as `.acc` file. New team member imports → operational in 30 seconds. 4 canonical docs generated automatically post-feature. Dogfood loop active.

---

### Phase 7 — Supabase & GitHub (Weeks 21–23)
**Goal:** First-class Supabase and GitHub integrations live. GitHub Issues as Tier 1 connector.

**MAFW Wave Plan:**
```
A1: Supabase MCP registration + feature group toggle UI in MCP Registry
A2: GitHub MCP registration + toolset toggle UI + Lockdown Mode detector
B1: Supabase project config table + per-project feature group persistence
B2: GitHub project config table + repo visibility detection
C1: Supabase migration safety flow (fs.watch migrations/ + confirmation modal)
C2: GitHub QA gate flow (PR creation + Actions polling + local test fallback)
D1: GitHub Issues connector (7-stage loop using ConnectorConfig abstraction)
D2: Supabase Failure Analyzer integration (known error pattern recognition)
```

**QA Gate:** Supabase `development` group lock verified — `execute_sql` cannot be called without explicit per-session unlock. Migration file detection triggers confirmation modal. GitHub Actions polling resolves green correctly and triggers correction loop on red. Local test fallback activates when no `.github/workflows/` present. Lockdown Mode auto-enables on public repo detection. GitHub Issues full 7-stage loop tested end-to-end: issue filed → classified → proposed (comment) → approved (label) → wave executes → PR created → CI passes → issue closed.

**Milestone:** Agents safely read Supabase schema. Migrations require human confirmation. GitHub CI replaces or supplements test suite as QA signal. PR auto-created after wave. GitHub Issues trigger the connector loop.

**MAFW Wave Plan:**
```
A1: Supabase MCP registration + feature group toggle UI in MCP Registry
A2: GitHub MCP registration + toolset toggle UI + Lockdown Mode detector
B1: Supabase project config table + per-project feature group persistence
B2: GitHub project config table + repo visibility detection + lockdown auto-enable
C1: Migration safety protocol — fs.watch on supabase/migrations/ + confirmation modal
C2: GitHub CI/CD as QA signal — Actions polling + red/green branch in QA phase
D1: GitHub PR auto-creation post-wave (CHANGELOG as PR body, @octokit/rest)
D2: Supabase failure pattern recognition in Failure Analyzer
E1: GitHub Issues → Connector Loop (Tier 1) — issues as upstream connector source
E2: Supabase + GitHub items in Project Intelligence stack detection + MCP suggestions
```

**Milestone:** Agents safely read Supabase schema. Migrations require human confirmation. GitHub CI replaces or supplements test suite as QA signal. PR auto-created after wave. GitHub Issues trigger the connector loop.

---

### Phase 8 — Connector Loop — DEFERRED
**Status: DEFERRED** per ADR-011. A custom Lark MCP and event-listening system is under development. Phase 8 resumes when that system is available and validated.

**Preserved design:** The ConnectorConfig abstraction, Architect Agent architecture, 7-stage loop design, and Architect Agent resilience strategy (timeout, backoff, degraded state) remain in the specification as the intended implementation. The Architect Agent background loop stub is implemented in Phase 7 (for GitHub Issues) and extended when Phase 8 resumes.

**Pre-requisite QA before Phase 8 resumes:**
- Custom Lark MCP tool coverage audit (approval signal detection, Lark Doc creation, Lark Base write)
- Architect Agent Slack Canvas availability check (plan-gated feature verification)
- Webhook vs polling decision validated against custom system capabilities

---

### Phase 9 — Knowledge Layer (Week 24)
**Goal:** Knowledge Compounder live. Knowledge Panel accessible. Pre-load injections working.

**MAFW Wave Plan:**
```
A1: knowledge_items + knowledge_relations SQLite tables + indexes
A2: Knowledge Compounder async Rust task (triggers post-Feature Doc generation)
B1: Pass 1 — local pattern pre-pass (no Intelligence Layer call, candidate extraction)
B2: Pass 2 — focused Intelligence Layer call (candidates only, ~2-5k tokens)
C1: Confidence scoring — Jaccard similarity deduplication + confirmation_count increment
C2: Contradiction detection → knowledge_relations + flagging
D1: Knowledge Panel UI — list, search, filter, confidence bars
D2: Knowledge item detail view — full markdown, source sessions, relations
E1: Preflight integration in Agent Guideline Generator (anti-pattern warnings)
E2: Pre-load injection — stack-matched items appended to CLAUDE.md preamble
F1: "Add to Playbook" export — knowledge/ directory in .acc bundle
F2: supabase_configs + github_configs tables integration with knowledge tags
```

**QA Gate:** Knowledge items generated from a real dogfood session without user action. Confidence score increments correctly when same pattern appears in a second session (Jaccard similarity match verified). Anti-pattern warning fires in Guideline Generator for a known anti-pattern in the test knowledge base. Contradiction detection flags two opposing items correctly.

**Milestone:** After every completed feature, 3–5 structured learning items appear in Knowledge Panel without any user action. Relevant items auto-injected into next session's agent context. Anti-patterns surface as warnings in guideline generator.

---

### Phase 9+ — Autonomous Scheduler (Weeks 25–26)
**Goal:** Agents run scheduled tasks autonomously. Human is notified only when escalation conditions are met. Fully agentic team operation enabled.

**MAFW Wave Plan:**
```
A1: tokio-cron-scheduler integration in Rust backend + cron_jobs + cron_executions tables
A2: Cron Registry UI — job list, create/edit form, schedule preview, next-run display
B1: Escalation policy evaluator — subscribe to all escalation event sources
B2: Notification dispatcher — system notification + optional Slack/Lark/GitHub channel routing
C1: Session Heartbeat — Rust async health check loop, PID probe, CRASHED/UNRESPONSIVE states
C2: Heartbeat auto-restart logic for cron sessions (max 2 attempts before escalation)
D1: Wave execution from cron trigger — skip AWAIT stage, feed directly into Wave Orchestrator
D2: Cron execution lifecycle state machine (running → completed/escalated/failed)
E1: Escalation UI in Scheduler panel — active escalations, human action options
E2: Execution history view — past runs, outcomes, escalation reasons, docs generated
```

**QA Gate:** Cron job fires on schedule without human input. Full wave executes end-to-end. BLOCKER signal from agent triggers escalation notification (system notification fires, cron execution marked `escalated`, wave pauses). Limit-paused event triggers escalation. Heartbeat detects simulated CRASHED session and attempts auto-restart before escalating. Completion notification sent with Feature Docs link. Multiple overlapping cron jobs handled without race condition (concurrent poll guard verified).

**Milestone:** A cron job runs a multi-agent wave overnight, generates feature docs, and sends a completion summary. If a blocker is hit, the developer receives a notification with full context and their options. The team works while no one is watching.

---

### Phase 9++ — Token Budget System (Weeks 27–28)
**Goal:** Proactive token budget allocation, monitoring, and graceful WIP-based shutdown. Pending tasks persist and auto-resume.

**MAFW Wave Plan:**
```
A1: agent_budgets + wave_resumption_plans tables + indexes + pending_task_data column
A2: Budget Planner — task complexity classifier integration + historical p75 lookup + 85%/15% reserve calc
B1: Token consumption tracker — extends Module 18's PTY parser, adds rolling rate calc (5-min window)
B2: Threshold ladder — 60/80/95/100 state machine + PTY instruction injection at each threshold
C1: WIP_CHECKPOINT format — guideline template addition + fs.watch detector + parser
C2: Fallback WIP generator — auto-reconstruction from session data when agent fails to write
D1: Wave Resumption Plan — Intelligence Layer call to consolidate WIPs into ordered plan
D2: pending_task knowledge_item type — lifecycle (pending → reminded → in-progress → resolved)
E1: Auto-injection on agent spawn — pending task summary appended to context preamble
E2: Wave Orchestrator integration — checks for pending Wave Resumption Plan on wave start
F1: Cron Scheduler integration — pending tasks take priority over scheduled work in same project
F2: Budget UI panel — live progress bars per agent, wave totals, pending tasks list, accuracy stats
```

**QA Gate:** Budget allocated correctly for known task complexity (verified against historical p75). 60% / 80% / 95% threshold instructions inject correctly into PTY at the right times. Agent writes valid WIP_CHECKPOINT.md when 95% threshold fires. Fallback WIP generation works when agent fails to write. Wave Resumption Plan correctly consolidates 3 WIPs from a partial wave. Pending task auto-injects into next session's context preamble. Resume from WIP picks up at the documented checkpoint, not from scratch (verified by file change diff). Cron job correctly prioritises pending tasks over scheduled work.

**Milestone:** A wave hits its budget threshold mid-execution. Each affected agent writes a WIP. The orchestrator consolidates a Resumption Plan. The work is persisted as pending tasks. When the user (or cron) starts the next session, the agents automatically pick up where they left off. No work is lost. No starting from scratch.

---

### Phase 10 — Expansion (Month 8+)

**v2 — Team Product**
- Supabase backend: cloud sync of playbooks, outcomes, presets, and knowledge base across team
- Team workspace with shared playbook library, knowledge base, and access control
- Web version: Next.js frontend + Supabase (no Tauri required for web users)
- SSO / OAuth for organization login
- LLM-assisted Task Router v2 (full Claude API reasoning)
- Semantic search in Knowledge Panel via local embedding model (Ollama)

**v3 — Platform**
- `.acc` playbook marketplace: publish, discover, install agent workflows including knowledge items
- MCP discovery registry: browse and one-click install MCPs
- Client portal: share session replays and knowledge exports as read-only links
- API: external tools query ACC's outcome data and knowledge base
- Linear + additional connector expansion

---

## 16. Expansion Path & Commercial Strategy

### Edge8 Internal Value (Immediate)

ACC is built for Edge8's own work first. Internal value before any commercial consideration:
- Every client project gets a `.acc` playbook — onboarding new team members takes minutes, not days
- Lark connector loop eliminates the human relay on repetitive feature requests
- Session replay + feature doc generator produces client deliverables automatically
- Outcome tracker builds a real evidence base for which AI approaches work per domain
- Supabase safe-by-default prevents accidental data loss on client databases
- Knowledge Compounder builds Edge8's institutional knowledge automatically — no manual documentation

### Commercial Angles

**Angle 1 — Developer Tool (OSS + Pro)**
Open-source the runner and asset manager. Pro tier: connector loop, wave orchestrator, team playbooks, knowledge base. $15–29/month per developer.

**Angle 2 — Enterprise White-Label**
Edge8 clients get a branded version of ACC configured for their stack. Managed setup, pre-built playbooks per engagement, Supabase and GitHub pre-configured. Priced per engagement or per seat.

**Angle 3 — Playbook Marketplace**
Developers publish `.acc` bundles for specific stacks, frameworks, or domains — including knowledge items and stack runbooks. Revenue share model. Network effects grow the skill/MCP/knowledge ecosystem.

**Angle 4 — AI Consulting Evidence Layer**
Edge8 uses ACC's outcome data, session replays, and knowledge base as evidence of AI delivery quality. Knowledge items exported per engagement demonstrate institutional learning. Differentiates Edge8 in a market where "AI consulting" is often unproven.

**Angle 5 — Knowledge as a Product**
After sufficient project volume, Edge8's knowledge base contains verified patterns, runbooks, and anti-patterns for specific stacks (Next.js + Supabase, Python + FastAPI, etc.). These can be packaged as premium `.acc` knowledge bundles — a new product category unique to ACC.

### OpenClaw Integration (Distribution)

Register ACC as an OpenClaw skill:
- OpenClaw users (247k+) can invoke `@acc` from WhatsApp or iMessage
- OpenClaw routes the conversation; ACC executes the coding agent workflow
- Distribution without competing — complementary positioning

### The Flywheel

```
More projects run in ACC
    → More outcome data
        → Better task routing
            → Higher agent success rate
                → More sessions generate knowledge items
                    → Knowledge base compounds
                        → Agents start smarter every session
                            → Fewer failures, faster delivery
                                → More trust from users + clients
                                    → More Edge8 engagements use ACC
                                        → More playbooks + knowledge exported
                                            → Faster onboarding for new projects
                                                → More projects run in ACC
```

The knowledge compounding loop is the second flywheel inside the first. Outcome data makes routing smarter. Knowledge data makes agents smarter. Both reinforce each other. Over time, ACC becomes harder to replace — not because of lock-in, but because of accumulated institutional intelligence that doesn't exist anywhere else.

---

*Document: ACC Complete Project Documentation*
*Version: 2.7 | April 2026*
*Owner: Trac / Edge8 (edge8.ai)*
*Status: Pre-build specification — ready for Phase 1 scaffold*
*Modules: 21 | ADRs: 11 | Phases: 12 (Phase 8 deferred) | User Stories: 68 | Tier 1 agents: 9*

*v2.1: Module 17 — Agent Communication Bus (ACB).*
*v2.2: Intelligence Layer (3 modes), Module 18 — Session Resilience & Token Guard, ADR-010/011, Phase 8 deferred.*
*v2.3: Intelligence Mode 3 — Interactive Session.*
*v2.4: All 28 architectural assessment corrections applied.*
*v2.5: Module 19 — Session Heartbeat. Module 20 — Autonomous Task Scheduler.*
*v2.6: Module 21 — Intelligent Token Budget System.*
*v2.7: Agent lineup overhauled. Windsurf Cascade removed entirely (no controllable headless CLI — only third-party AppleScript wrapper available, macOS-only, too fragile for production). Tier 3 (log-watch) tier eliminated — no longer needed. Cursor promoted from Tier 2 to Tier 1 with full PTY control (`agent chat` CLI). Four new Tier 1 agents added: Aider (Git-native auto-commit, headless via --message), Goose (Block, Apache 2.0, MCP-native, headless via goose run), Cline CLI (CLI 2.0, native subagents v3.58+), Qwen Code (Apache 2.0, free, Gemini CLI fork by Alibaba). New AgentConfig fields: `supportsSubagents` and `subagentDetectionPattern` for native subagent observability. Native subagents now tracked as sub-sessions inside parent panels (distinct from ACC's own Wave Orchestrator). US-105 rewritten from "Windsurf log watcher" to "subagent observability". Agents schema simplified — `log_watch_path` field removed, `supports_subagents` added.*

*Sources: Market research (March 2026), Edge8 MAFW production workflow (grading system, 2026-03-12), competitive analysis of 15+ repos, Supabase MCP documentation, GitHub MCP documentation (co-developed with Anthropic), Lark OpenAPI MCP, Slack official MCP, Jira Atlassian Rovo MCP, ADRs from architecture sessions*
