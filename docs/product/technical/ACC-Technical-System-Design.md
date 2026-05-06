# ACC — Technical System Design

**Source:** ACC-Complete-Project-Documentation-v2.7.md + ACC-Gap-Assessment (2026-05-02)
**Owner:** Trac / Edge8 (edge8.ai)
**Scope:** Condensed technical reference — feature specs, UX wireframes, integrations, full DB schema

---

## 6. Feature Specifications (Modules 1–21)

### Module 1: Agent Runner
**Purpose:** Spawn, control, and monitor 9 supported agents in parallel PTY sessions.
**Key Components:**
- Dynamic grid with collapsible/detachable panels; per-panel spawn/kill/restart/clear/screenshot controls
- PTY Output Processing Pipeline: raw → ANSI strip → 60fps rate-limited dispatch → xterm.js renderer + SQLite event logger + status inference + ACB signal parser
- Status chips (`idle`/`thinking`/`writing`/`running tests`/`done`/`failed`/`stalled`) — cosmetic only, not gating
- Preset button bar (project-scoped + global, tags, search, drag-to-reorder)
- Orchestrator Mode toggle: switches layout to orchestrator-at-top + sub-agent grid; only `waveEligible: true` agents in wave dropdowns.
  - **Native subagent path (7 agents — OpenCode, Claude Code, Cline, Cursor, Gemini CLI, Codex CLI, Qwen Code):** When the orchestrator agent supports native subagents, subagent sessions run inside the same PTY process. ACC observes them via PTY pattern matching (`subagentDetectionPattern`) and tracks each as a sub-session within the parent panel.
  - **External orchestration fallback (2 agents — Aider, Goose; also cross-tool):** When the orchestrator agent lacks native subagent support, ACC spawns additional CLI sessions of the configured agent via its `waveCommand` field. Each subagent runs as a separate PTY panel in the grid. The orchestrator panel launches them by issuing the `waveCommand` (e.g., `aider --message "{prompt}" --yes --no-pretty`) and ACC collects results via file-watch on `HANDOFF_<ID>.md` documents. This is the same mechanism used for cross-tool orchestration — the `waveCommand` defines the spawn command regardless of whether the subagent runs the same tool or a different one.
- 9 Tier-1 agents: Claude Code, OpenCode, Aider, Goose, Cline CLI, Cursor, Gemini CLI, Qwen Code, Codex CLI
**Status:** Phase 1–2

---

### Module 2: Asset Manager
**Purpose:** Unified management of skills, memory files, MCPs, connectors, plugins, and secrets.
**Key Components:**
- **Skills Library:** Sources from `~/.claude/skills/`, `~/.opencode/skills/`, `~/.gemini/skills/`, custom paths; OpenClaw `SKILL.md` format; Monaco editor inline; tag + search + sort
- **Memory Browser:** Manages `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, `.opencode/memory/`, `CONVENTIONS.md`, `.goose/instructions.md`, `.clinerules`, `.cursor/rules`, `qwen.md`; side-by-side diff; cross-agent sync
- **MCP Registry:** Reads configs from each agent; toggle per MCP per agent; add/test new MCPs inline; first-class MCPs (Supabase, GitHub) get expanded config panels
- **Connector Vault:** Tauri Stronghold AES-256 at rest; scope global/agent/project; auto-inject as env vars on PTY spawn; audit log; fallback to OS keychain if Stronghold unavailable; ACC Intelligence key stored under `acc-intelligence` scope with usage cap tracking
- **Memory File Write Coordinator:** Rust async single-writer queue per file path (acquire lock → read → apply change → write → release lock); reads not blocked; idle-window queuing for active agents
- **Plugin Manager:** Lists VSCode extensions, enable/disable per agent context, marketplace discovery links
**Status:** Phase 2

---

### Module 3: Project Intelligence
**Purpose:** Auto-detect project stack, test framework, and dependencies; persist as project profile JSON.
**Key Components:**
- Auto-detection via `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `requirements.txt`, `composer.json`
- Project Profile JSON: id, path, name, stack, test_framework, package_manager, active_agents, active_skills, active_mcps, preferred_models, memory_snapshot
- Integrates with Supabase/GitHub auto-suggestion, Knowledge Compounder preflight checks
**Status:** Phase 2

---

### Module 4: Outcome Tracker
**Purpose:** Capture structured task outcomes with supplementary-signal gating for clean data.
**Key Components:**
- Trigger: PTY idle for N seconds (default 60s) AND at least one supplementary signal (HANDOFF written, tests passed, completion phrase detected)
- Outcome prompt: Done / Failed / Revised / Skip
- Per-outcome storage: agent, project, task, duration, session ID, timestamp
- Dashboard: per-agent × per-task-type success rate grid; feeds Task Router confidence scoring
- If no supplementary signal after 5 min idle → status query ("Still working?") instead of outcome prompt
**Status:** Phase 3

---

### Module 5: Task Router & Model Router
**Purpose:** Route tasks to the best agent and model using outcome history.
**Key Components:**
- **v1:** Keyword classification (refactor/review/test/implement/debug/document) → match outcome stats → rank by success rate; displays "estimated" confidence
- **v1.5:** Local embedding similarity via Ollama (when configured) — semantic matching without API calls
- **v2:** Agent-mediated routing via Intelligence Layer; returns structured recommendation (agent, model, wave structure suggestion, reasoning)
- Model alternation pattern applied to suggested model
- UI: task input → ranked agent suggestions with confidence and rationale → Send to selected agent(s)
**Status:** Phase 3 (v1), Phase 10+ (v1.5/v2)

---

### Module 6: Agent Handoff Protocol
**Purpose:** Structured handoff envelope between agents for seamless task handover.
**Key Components:**
- Handoff envelope JSON: original_task, completed_by, model_used, output_summary, changed_files, diff_preview, handoff_instruction, next_agent, next_model
- User preview → confirm → injected into target PTY as structured prompt
**Status:** Phase 5

---

### Module 7: Failure Analyzer & Correction Loop
**Purpose:** Diagnose agent failures and generate targeted corrections for re-injection.
**Key Components:**
- **Stage 1 — Diagnosis:** Last 200 lines PTY output + task description + project profile → ACC Intelligence Layer → root cause, evidence lines, suggested fix, confidence
- **Stage 2 — Correction Generation:** Structured markdown with bug, root cause, fix required, test that must pass
- **Stage 3 — Re-injection:** Original guideline + correction concatenated; monitors for updated HANDOFF with fresh test results; escalates after 2 retries
- Limit events (Module 18) excluded from failure analysis pipeline
**Status:** Phase 3

---

### Module 8: Session Replay & Feature Documentation Generator
**Purpose:** Visual timeline of all session events; automated generation of 4 canonical feature docs.
**Key Components:**
- Timeline event types: `read`, `edit`, `run`, `user_input`, `agent_output`, `error`, `handoff`, `correction`, `acb_signal`, `limit_event`
- Filters by agent, event type, file, time range, outcome; export Markdown/PDF
- **Feature Doc Generator:** 4 sequential focused calls (EXECUTIVE_PLAN.md → CHANGELOG.md → QA_REPORT.md → TECHNICAL_PLAN.md); optional pre-pass summarisation when session exceeds 20k token threshold; partial failure preserves completed docs; retry per-document
**Status:** Phase 5

---

### Module 9: Reactive Memory Capture
**Purpose:** Detect agent learnings in PTY output and surface as candidate memory additions.
**Key Components:**
- Patterns: "I see this project uses...", "I'll remember to...", "Note that..."/"Important:", repeated failure→fix pairs, user corrections
- **Phase-gated detection:** patterns suppressed during file-writing, active during idle/reflection and always active during user-correction phases — eliminates noise
- Non-blocking toast notification: "Add to memory file? [Add] [Edit] [Skip]"
- On Add: appends to project memory with timestamp + source session ID
**Status:** Phase 4

---

### Module 10: Team Playbooks
**Purpose:** Export/import project configuration as `.acc` bundles for team onboarding.
**Key Components:**
- `.acc` bundle format (standard zip): `manifest.json`, `profile.json` (no secrets), `skills/`, `memory/`, `mcps.json`, `presets.json`, `models.json`, `README.md`
- Secrets policy: key names only (scaffolding), values never included
- Import flow: select file → preview → confirm → assets installed, MCPs configured, presets loaded, secret scaffolding prompts displayed
**Status:** Phase 6

---

### Module 11: Wave Orchestrator
**Purpose:** Define and execute multi-agent work plans with DAG dependency resolution.
**Key Components:**
- Work Item Table: Agent ID, Task, Depends On, Wave (auto-computed), Model, Guideline Path, Status (queued/running/done/failed/manual/limit-paused)
- **Intra-Wave DAG Resolution:** agents unlock when direct dependencies verified — not when entire preceding wave completes
- Visual dependency graph (nodes + edges, color-coded by wave)
- Stall detection: 10-min no-file-change timer → [Retry] [Complete Manually] [Terminate]
- Zero-Regression Rule, New-Files-First convention, Feature Flag Pattern auto-insertion
- `limit-paused` status (from Module 18) — freezes wave slot, suppresses correction loop
- `plan_agents` status set: `'queued' | 'running' | 'done' | 'failed' | 'manual' | 'limit-paused'`
> **Current limitation:** single `feature_plan` at a time per project. Multi-thread support is spec'd in Module 22.
**Status:** Phase 5

---

### Module 12: Agent Guideline Generator
**Purpose:** Generate structured `.md` guideline documents for wave agents.
**Key Components:**
- Input form: Agent ID, Task, Objective, Depends On, Model, Files to Create, Files NOT to Touch, Test Requirements, Input/Output Contracts
- Output: `AGENT_<ID>_GUIDELINE.md` → `docs/YYYY-MM-DD-slug/`
- Auto-appended sections: Communication Protocol (ACB), Budget Section + WIP Capture instructions
- CLI preview with Copy Command / Execute buttons
**Status:** Phase 5

---

### Module 13: Handoff Monitor
**Purpose:** Watch for and validate agent HANDOFF documents; gate wave advancement.
**Key Components:**
- Watches `docs/YYYY-MM-DD-slug/HANDOFF_*.md` via fs.watch with 500ms write-completion debounce
- **Required HANDOFF schema** (7 sections): Completed Work, Test Results, Interface Contracts Exposed, Files NOT Modified, Design Decisions, Handoff Instructions
- Validation rules: all 7 headings present; "All tests passing: yes" required for auto-approve; non-zero exit code = flag
- On approve: dependent agents unlock per intra-wave DAG; status → `verified`
- On flag: Correction Loop (Module 7) triggered
- Open ACK signals from ACB must be resolved before handoff marked verified
**Status:** Phase 5

---

### Module 14: Upstream Connector Loop
**Purpose:** 7-stage automated pipeline from external messages to deployed features.
**Key Components:**
- 7 Stages: MONITOR → DETECT → PROPOSE → AWAIT → EXECUTE → VERIFY → REPORT
- v1 Connectors: Lark, Slack, Jira (with MCP + approval signals + proposal/report mediums)
- v2 Connectors: Linear, GitHub Issues, Notion, Confluence
- Architect Agent: background Rust async task (not PTY); spawns non-interactive agent sessions for classification/proposal
- Resilience: 30s MCP timeout, exponential backoff after 3 consecutive failures, connector marked `degraded`, concurrent poll guard
- GitHub Issues as Tier 1 upstream connector — full 7-stage loop runs entirely inside GitHub
**Status:** Phase 8 (v1), Phase 10+ (v2)

---

### Module 15: Supabase & GitHub — First-Class Integrations
**Purpose:** Purpose-built integrations with feature group toggles, safety defaults, and cross-module intelligence.
**Key Components:**
- **Supabase:** 8 feature groups (docs/database/storage always on; debugging/functions/branching opt-in; development locked; account locked); safe migration workflow (agent writes → ACC flags → human applies → agent verifies); project-scoped config; error pattern recognition in Failure Analyzer
- **GitHub:** 7 toolsets (repos/issues/PRs/actions always on; code_security/projects/notifications opt-in); Lockdown Mode auto-enabled for public repos; GitHub Actions as QA signal (poll every 2 min, green→proceed, red→Failure Analyzer); local fallback QA when no Actions configured; GitHub Issues as Tier 1 upstream connector
**Status:** Phase 4 (core), Phase 8+ (connector integration)

---

### Module 16: Knowledge Compounder
**Purpose:** Asynchronously distill every completed workloop into structured, compounding learning materials.
**Key Components:**
- **Trigger:** Wave complete → QA pass → Feature Docs generated → async background activation
- **Two-Pass Extraction:** Pass 1 (local pattern matching — free) → Pass 2 (Intelligence Layer on candidates only, ~2k tokens)
- **Deduplication:** Fingerprint (type + tags + key phrase) → Jaccard token overlap scoring → confirmation count increment (≥0.6), relation creation (0.3–0.59), new item (<0.3); contradiction detection via Intelligence Layer
- **5 Output Formats:** Decision Log, Pattern Card, Anti-Pattern Warning, Stack Runbook, Lesson Brief
- **Confidence tiers:** Low (1–2, emerging pattern), Medium (3–5, context suggestion), High (6+, auto-injected into session preamble)
- **Preflight Integration:** Guideline Generator surfaces relevant warnings from knowledge base
- Storage: `knowledge_items` table + `knowledge_relations` (contradicts, extends, requires, confirmed_by)
**Status:** Phase 9

---

### Module 17: Agent Communication Bus (ACB)
**Purpose:** Real-time, ACC-mediated peer communication between agents in the same wave via stdout signal lines.
**Key Components:**
- Signal format: `[ACC:<TYPE> from=<ID> to=<ID|ALL> priority=<P> id=<MSGID>] <body>` — prefix sentinel, structured key-value, topic-style addressing, priority field
- Types: CONTRACT, QUERY, STATUS, BLOCKER, CONFLICT, RESOLVE
- Priorities: INFO (fire-and-forget), ACK (acknowledged delivery required), HIGH (immediate escalation)
- PTY delivery: injected into target PTY stdin with reply syntax instruction
- Wave Orchestrator integration: ACK-priority/BLOCKER signals pause wave; RESOLVE unblocks
- Handoff Monitor integration: open ACK signals must be resolved before handoff verified
- Message Bus Panel: open/resolved signal table with Force Resolve / Inject to Target controls
- SQLite: `agent_messages` table (id, session_id, wave, from_agent, to_agent, type, priority, body, ref_id, status, created_at, resolved_at)
**Status:** Phase 6

---

### Module 18: Session Resilience & Token Guard
**Purpose:** Reactive detection and recovery from plan limits, API quotas, and token overruns.
**Key Components:**
- **Limit Event Detector:** PTY pattern matching for plan limits, rate limits, quota exhaustion, context exceeded across all 9 agents
- **Wave Resilience:** `limit-paused` status in plan_agents; suppresses correction loop; recovery UI: Resume / Switch model / Complete manually / Abort
- **Token Guard:** proactive monitoring from PTY parser + OpenRouter HTTP headers; cumulative usage tracked per session/day
- **Intelligence Layer Usage Panel** (Settings): Mode 1 quota bar (tokens used/cap), Mode 3 context bar, monthly call stats
- Limit events excluded from failure analysis; `limit_event` event type added to session replay
**Status:** Phase 3 (core), Phase 5 (wave integration)

---

### Module 19: Session Heartbeat
**Purpose:** Active health monitoring distinguishing crashed from stalled from thinking.
**Key Components:**
- Health states: HEALTHY, THINKING, STALLED, CRASHED, UNRESPONSIVE
- Heartbeat cycle (every 2 min): PID check → activity timestamp → classification → gentle PTY probe (empty line, 60s timeout)
- **CRASHED handling:** auto-restart for cron sessions; alert immediately for manual sessions
- Complements passive Stall Detector (Module 11); both run in parallel
- Logs to `events` table as `event_type = 'heartbeat'`; no new table
**Status:** Phase 3 extension

---

### Module 20: Autonomous Task Scheduler
**Purpose:** Cron-like scheduling for autonomous agent task execution with event-driven human escalation.
**Key Components:**
- **Cron Registry:** per-job name, description, project, cron expression, task template, wave_preset, auto_approve toggle, escalation_policy (JSON), notification_channels, max_correction_retries
- **Escalation Policies:** Full Auto / Semi-Auto / Supervised / Custom presets; defines which events notify human
- **Escalation Sources:** ACB BLOCKER, limit-paused, correction exhausted, QA fail, session CRASHED, low confidence, destructive patterns
- **Execution Lifecycle:** schedule fires → create feature_plans + cron_executions → spawn wave (skip AWAIT) → monitor → escalation or completion → notify
- Reuses Architect Agent's execution infrastructure; time-based trigger on top of existing pipeline
- UI: Cron Registry panel listing active/paused/escalated jobs; next scheduled display
**Status:** Phase 9+

---

### Module 21: Intelligent Token Budget System
**Purpose:** Proactive per-agent token budget allocation, monitoring, WIP capture, and orchestrated resumption.
**Key Components:**
- **Budget Planning:** allocates from task complexity × historical p75 × model context window; reserves 15% for WIP capture; wave-level total check before execution
- **Real-Time Monitoring:** live budget counter per agent; rolling rate calculator (5-min window) for trajectory-based warning
- **Threshold Ladder:** 60% → `budget-warning` · 80% → `budget-caution` · 95% → `budget-halt` (write WIP) · 100% → `budget-exhausted` (ACC fallback WIP, session terminated)
- **WIP Capture:** structured `WIP_CHECKPOINT_<ID>.md` with 7 required sections; fallback auto-generation from session data
- **Wave Resumption Plan:** Orchestrator consolidates all WIPs → Intelligence Layer synthesizes → ordered agent restart strategy
- **Persistent Pending Task Memory:** stored as `pending_task` type in `knowledge_items`; auto-injected on agent spawn, wave start, and cron job execution
- Budget UI: live per-agent bars, wave totals, pending tasks list, historical accuracy stats
> **Current limitation:** no inter-agent budget reallocation. If A1 finishes 40% under budget and A2 is at 95%, A2 still halts. See Module 22 and gap assessment.
**Status:** Phase 9++

---

### Module 22: Control Sessions — Multi-Thread Orchestration (Phase 10+ Design)
**Purpose:** Upgrade from single-wave serial orchestration to concurrent multi-thread control sessions — any agent panel promoted to mini-orchestrator with independent dependency graphs, handoff queues, docs scopes, and budgets.
**Key Components:**
- **`feature_plans` concurrency:** allow multiple plans in `executing` state per project (upgrade from single `status` field to per-thread tracking)
- **Docs scope isolation:** per-thread `docs/THREAD_ID/YYYY-MM-DD-slug/` to prevent HANDOFF file collisions between parallel threads
- **Per-thread file watchers:** each control session watches its own docs folder independently
- **Cross-thread conflict detection:** `file_ownership_registry` table (project_id, file_path, claimed_by_thread_id, claimed_at); if Thread A claims `src/auth.ts`, Thread B warned on conflict
- **Control Session promotion UI:** right-click agent panel → "Promote to Control Session" → panel header shows badge → embedded mini wave grid; multiple control sessions visible in Orchestrator Mode as parallel timelines
- **Global budget view:** aggregate token usage across all active control sessions; per-thread budget allocation
- **Architecture impact:** `plan_agents` gains `thread_id` FK; per-thread handoff queues; per-thread ACB namespace scoping (signals prefixed by thread context)
**Status:** Phase 10+ planned (post-Phase 9 core)

---

### Module 23: SkillBridge Integration Layer (Cross-Phase)
**Purpose:** Detect, surface, and integrate SkillBridge (standalone Tauri v2 app bridging local memory to Claude.ai web) as a read-only enhancement — ACC reads SkillBridge state but never controls it.
**Key Components:**
- **Detection:** process check (pgrep/ps) → app path check (`/Applications/SkillBridge.app`) → config file check (`~/.skillbridge/config.json`) → port/relay check; result persisted in `skillbridge_config` SQLite table
- **MCP Registry auto-registration:** SkillBridge's `/mcp/<machine_id>/sse` endpoint auto-registered as managed MCP entry with external source badge; read-only toggle (enable/disable per-agent, cannot edit connection params); connection health indicator (green/grey/red)
- **claude-mem reader:** reads `~/.claude-mem/` directory (read-only, never writes); entries with high usage frequency or recent access become Knowledge Compounder candidates in Pass 1; items show `📡 SkillBridge` source badge in Knowledge Panel
- **Unified Memory View:** new sub-tab in Memory Browser — Agent Memory / SkillBridge Memory / Unified views; cross-reference via keyword overlap (Jaccard); merge suggestions for matching entries
- **Settings → Integrations panel:** shows bridge status, version, relay URL, MCP URL; Copy MCP URL / Open SkillBridge / Manage in MCP Registry actions
- **Runner status bar:** `SkillBridge: ● Connected` indicator in main Runner view
- **Guided onboarding:** first-launch detection prompt if SkillBridge not installed; offers Install / Skip options; accessible from Settings → Integrations
- **Anti-patterns enforced:** never merge SkillBridge code, never control bridge state, never write to `~/.claude-mem/`, no hard dependency, never replicate relay
**Status:** Cross-phase (Phase 1 detection + Phase 2 MCP reg + Phase 2 extension unified view + Phase 9 knowledge source)

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

## 10. First-Class Integrations: Supabase & GitHub

These two services receive dedicated treatment beyond generic MCP toggling — granular feature groups, safety defaults enforced by architecture, and cross-module intelligence integration.

### Supabase

**MCP Server:** `https://mcp.supabase.com/mcp` — official, OAuth 2.0, zero install

**8 Feature Groups:**

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

**Safe Migration Protocol (ACC-enforced):**

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

**Cross-module intelligence:** Project Intelligence auto-suggests Supabase MCP; Knowledge Compounder generates Supabase-specific Stack Runbooks; Failure Analyzer recognizes RLS violations, connection pool exhaustion, missing env vars, auth token expiry.

### GitHub

**MCP Server:** `https://api.githubcopilot.com/mcp/` — official, co-developed with Anthropic, auto-scopes to OAuth token permissions

**7 Toolsets:**

| Toolset | ACC Default | What Agents Can Do |
|---|---|---|
| `repos` | ✅ On | Read files, directory structure, commits, branches |
| `issues` | ✅ On | Read, create, update, close issues |
| `pull_requests` | ✅ On | Create PRs, read comments, request reviews |
| `actions` | ✅ On | Monitor CI/CD runs, read workflow logs |
| `code_security` | ⚠️ Opt-in | Dependabot alerts, code scanning results |
| `projects` | ⚠️ Opt-in | GitHub Projects board management |
| `notifications` | ⚠️ Opt-in | Watch mentions, review requests |

**Lockdown Mode:** Auto-enabled for public repos. Content sanitization prevents prompt injection attacks from malicious issue/PR content. Visible indicator in MCP Registry panel.

**GitHub as QA Signal:**

```
Wave final agent completes → HANDOFF verified
              ↓
ACC creates PR via GitHub MCP
PR title = feature slug | PR body = CHANGELOG.md content
              ↓
GitHub Actions triggered automatically (if configured)
              ↓
ACC polls Actions API every 2 minutes (max 60 min timeout)
              ↓
✅ Green CI → QA pass → proceed to Report stage
❌ Red CI  → Failure Analyzer (Actions log as input) → Correction loop
```

**QA gate fallback — projects without GitHub Actions:** ACC detects workflow directory presence on project load. If none: runs local test command from project profile (pytest, npm test, cargo test, etc.). If no test command configured: surfaces warning — never silently promotes wave without QA check or explicit manual approval.

**GitHub Issues as Tier 1 Upstream Connector:** Full 7-stage loop runs entirely inside GitHub: issue filed → ACC classifies → proposes as issue comment → approved via label or `/approve` → wave executes → PR created and linked → CI passes → issue auto-closed with summary.

---

## 11. Data Models & Schema

### Complete SQLite Schema

#### Database Initialisation Pragmas

These pragmas **must** be executed at database creation time in the Rust backend before any table is created. They are not optional — without WAL mode, parallel wave write contention will serialize all writes through a single lock.

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

-- ============================================================
-- AGENT COMMUNICATION BUS (ACB)
-- ============================================================
CREATE TABLE agent_messages (
  id          TEXT PRIMARY KEY,
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

-- ============================================================
-- TOKEN USAGE (Module 18)
-- ============================================================
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
  escalation_source TEXT,                   -- module that generated the event
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

-- ============================================================
-- ADDITIONAL TABLES (Gap Assessment — 2026-05-02)
-- ============================================================

-- SKILLBRIDGE INTEGRATION (Module 23)
-- Detection result stored on app startup via Rust backend process check
CREATE TABLE skillbridge_config (
  id              TEXT PRIMARY KEY DEFAULT 'default',
  status          TEXT NOT NULL DEFAULT 'not-installed',  -- 'not-installed' | 'installed' | 'running' | 'bridge-active'
  version         TEXT,                                   -- semver string
  relay_url       TEXT,                                   -- SkillBridge relay URL from config
  mcp_url         TEXT,                                   -- /mcp/<machine_id>/sse endpoint
  detected_at     TEXT,
  updated_at      TEXT NOT NULL
);

-- MODEL COSTS (Gap Assessment Section 2.5 — addresses missing per-provider cost aggregation)
-- Enables Budget Planner to optimize for cost, not just token limits
CREATE TABLE model_costs (
  id                TEXT PRIMARY KEY,
  model_id          TEXT REFERENCES models(id) NOT NULL,
  cost_per_1k_input REAL NOT NULL,                       -- in currency units (e.g. USD cents)
  cost_per_1k_output REAL NOT NULL,                      -- in currency units
  provider          TEXT NOT NULL,                       -- 'openrouter' | 'anthropic' | 'google' | 'ollama'
  currency          TEXT DEFAULT 'USD',                  -- ISO 4217
  updated_at        TEXT NOT NULL
);

-- FILE OWNERSHIP REGISTRY (Module 22 — cross-thread conflict detection)
-- When Thread A claims a file, Thread B is warned before touching it
CREATE TABLE file_ownership_registry (
  id                  TEXT PRIMARY KEY,
  project_id          TEXT REFERENCES projects(id) NOT NULL,
  file_path           TEXT NOT NULL,                      -- relative path within project
  claimed_by_thread_id TEXT NOT NULL,                     -- feature_plans.id of the controlling thread
  claimed_at          TEXT NOT NULL,
  released_at         TEXT,
  UNIQUE(project_id, file_path)
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
CREATE INDEX idx_knowledge_stack   ON knowledge_items(status);

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

-- File ownership: quick lookup for conflict detection
CREATE INDEX idx_file_ownership_project ON file_ownership_registry(project_id, file_path);
CREATE INDEX idx_file_ownership_thread  ON file_ownership_registry(claimed_by_thread_id);

-- Model costs: lookup by model for budget planner
CREATE INDEX idx_model_costs_model ON model_costs(model_id);
```

#### knowledge_items Extension (Module 21 + 22)

```sql
-- Extends knowledge_items with pending_task functionality
ALTER TABLE knowledge_items ADD COLUMN pending_task_data TEXT;
-- JSON blob: {wave_id, agent_id, wip_path, resumption_plan_path,
--             original_task, blocking_reason, priority, created_at, last_reminded_at}
```

#### plan_agents Extension (Module 22 — Control Sessions)

```sql
-- Adds thread-scoping for multi-thread orchestration
ALTER TABLE plan_agents ADD COLUMN thread_id TEXT REFERENCES feature_plans(id);
-- thread_id allows multiple concurrent feature_plans to own plan_agents independently
```

---

## Module Summary & Status Grid

| Module | Name | Status |
|---|---|---|
| 1 | Agent Runner | Phase 1–2 |
| 2 | Asset Manager | Phase 2 |
| 3 | Project Intelligence | Phase 2 |
| 4 | Outcome Tracker | Phase 3 |
| 5 | Task Router & Model Router | Phase 3 (v1), Phase 10+ (v1.5/v2) |
| 6 | Agent Handoff Protocol | Phase 5 |
| 7 | Failure Analyzer & Correction Loop | Phase 3 |
| 8 | Session Replay & Feature Doc Generator | Phase 5 |
| 9 | Reactive Memory Capture | Phase 4 |
| 10 | Team Playbooks | Phase 6 |
| 11 | Wave Orchestrator | Phase 5 |
| 12 | Agent Guideline Generator | Phase 5 |
| 13 | Handoff Monitor | Phase 5 |
| 14 | Upstream Connector Loop | Phase 8 (v1), Phase 10+ (v2) |
| 15 | First-Class Integrations (Supabase & GitHub) | Phase 4 (core), Phase 8+ (connector) |
| 16 | Knowledge Compounder | Phase 9 |
| 17 | Agent Communication Bus (ACB) | Phase 6 |
| 18 | Session Resilience & Token Guard | Phase 3 (core), Phase 5 (wave int.) |
| 19 | Session Heartbeat | Phase 3 extension |
| 20 | Autonomous Task Scheduler | Phase 9+ |
| 21 | Intelligent Token Budget System | Phase 9++ |
| 22 | Control Sessions (Multi-Thread Orchestration) | Phase 10+ planned |
| 23 | SkillBridge Integration Layer | Cross-phase |
