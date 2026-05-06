# ACC Gap Assessment
**Date:** 2026-05-02
**Scope:** Competitive positioning, feature coverage, token management, parallel orchestration capability
**Source:** ACC-Complete-Project-Documentation-v2.7.md + GitHub market research

---

## 1. Competitive Landscape

Research conducted across 13 GitHub repositories and existing applications similar to ACC.

### 1.1 Market Comparison Table

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

### 1.2 Key Findings

- **No single project combines all ACC features.** The market is fragmented across agent clients (1code, Paseo), orchestrators (ClawTeam, Composio), and knowledge systems (Ruflo).
- **ClawTeam** is the closest architectural match — leader/worker pattern, tmux-based parallel, agent-agnostic. Lacks desktop UI, token tracking, knowledge compounding, and upstream connectors.
- **Agent-Swarm** has the most complete integration + memory story. Docker-based isolation, vector memory, multi-channel connectors. Web-only. No token budget management.
- **1code** and **Paseo** have the best desktop UX but are agent clients, not orchestrators. Neither has wave orchestration, outcome tracking, or knowledge compounding.
- **ccswarm** has the most ambitious vision (Rust-native, OTel token tracking, RAG, voting) but is largely incomplete. Closest architecture if finished.

### 1.3 ACC's Definitive Differentiators

1. 9-agent unification in one desktop app (nobody else exceeds 6)
2. Wave-based parallel execution with intra-wave DAG dependency resolution (unique to ACC)
3. Proactive token budget system with WIP checkpoint/resume (no competitor has this)
4. Knowledge Compounder that compounds across sessions automatically (Ruflo is closest, Claude-only)
5. Full 7-stage upstream connector loop (Agent-Swarm has connectors but no automated execution pipeline)
6. Tauri v2 native binary (~10MB) vs Electron (~150MB+)
7. Supabase + GitHub first-class integrations with architecture-enforced safety defaults

---

## 2. Token & Context Management Assessment

### 2.1 Coverage: COMPREHENSIVE

ACC has **two dedicated modules** covering token management — one reactive, one proactive. This is a genuine differentiator — no competitor has this dual-layer approach.

### 2.2 Module 18 — Session Resilience & Token Guard (Reactive)

| Component | Description |
|---|---|
| **Limit Event Detector** | PTY pattern matching for plan limits, rate limits, quota exhaustion, context exceeded across all 9 agents |
| **Wave Resilience** | `limit-paused` state — freezes wave slot, suppresses correction loop (limit ≠ code error), recovery UI with resume/switch-model/complete-manually/abort |
| **Token Guard** | Proactive monitoring from PTY parser + OpenRouter HTTP response headers. Tracks cumulative usage per session/day. Warnings at configurable thresholds |
| **Intelligence Layer Usage Panel** | Settings panel showing Mode 1 default quota (tokens used/cap), Mode 3 context bar (session context approaching limit), monthly stats |

### 2.3 Module 21 — Intelligent Token Budget System (Proactive)

| Component | Description |
|---|---|
| **Budget Planning** | Allocates per-agent token budget from task complexity × historical p75 × model context window. Reserves 15% for WIP capture. Wave-level total with quota warnings before execution |
| **Real-Time Monitoring** | Live budget counter per agent. Rolling rate calculator (5-min window) for trajectory-based warnings — predicts limit hit before it occurs |
| **Threshold Ladder** | 60% → `budget-warning` (yellow bar) · 80% → `budget-caution` (wrap up sub-task) · 95% → `budget-halt` (write WIP, stop all work) · 100% → `budget-exhausted` (ACC fallback WIP, session terminated) |
| **WIP Capture** | Structured `WIP_CHECKPOINT_<ID>.md` with 7 required sections (original task, completed, in-progress, not started, critical context, resumption approach, external state). Guideline template includes format instructions |
| **Fallback WIP** | If agent fails to write WIP at 95% halt, ACC reconstructs from session data — recent file changes, handoff state, ACB signals, last 200 lines of PTY output. Labeled auto-generated |
| **Wave Resumption Plan** | Orchestrator consolidates all WIPs from a partial wave into ordered resumption strategy via Intelligence Layer. Reconciles dependency chains |
| **Pending Task Memory** | Stored as `pending_task` type in `knowledge_items`. Auto-injected on: agent spawn (context preamble), wave start (candidate plan), cron job execution (priority context) |
| **Budget UI** | Dedicated panel — live per-agent budget bars, wave totals, pending tasks list, historical accuracy stats |

### 2.4 Handoff at Budget Exhaustion — STEP BY STEP

```
95% threshold hit
    → PTY instruction injected: "Write WIP_CHECKPOINT.md immediately"
    → Agent writes WIP (or ACC fallback if agent fails)
    → fs.watch detects WIP file
        ↓
Wave Orchestrator notified
    → Aggregates all WIPs from wave
    → Generates WAVE_RESUMPTION_PLAN.md via Intelligence Layer
    → Persists as pending_task in knowledge_items
        ↓
100% threshold hit (if WIP not yet written)
    → ACC writes fallback WIP
    → Agent session terminated
    → limit-paused state activated (Module 18)
        ↓
Next session / wave start / cron job
    → ACC queries knowledge_items for pending_tasks in project
    → Pending task summary injected into agent context preamble
    → Agent sees: "You have a pending task — see WIP_CHECKPOINT_A2.md"
    → Resumes from checkpoint, not from scratch
```

### 2.5 Token Management — Gaps

1. **No per-provider cost aggregation.** Token usage is tracked per-session/model but there is no cross-provider cost view (e.g., "this month: $12.40 OpenRouter + $20 Claude Pro"). The `token_usage` table has `tokens_in`/`tokens_out` but no cost field.

2. **PTY-based tracking is inherently approximate.** For Mode 2/3 (agent-mediated), token counts are parsed from agent stdout verbose output — which agents may not always emit. Accuracy depends on agent behavior. Mode 1 (OpenRouter HTTP) is exact, but Mode 2/3 has a margin of error.

3. **No model cost comparison.** The Model Registry has `model_path` and `strengths` but no cost-per-1k-tokens field. The Budget Planner can't optimize for cost — only for token limits.

4. **No budget rollover/borrowing between agents in a wave.** Each agent has an independent budget. If A1 finishes 40% under budget and A2 is at 95%, A2 still halts — the unused A1 tokens are not reallocated.

---

## 3. Parallel Orchestration Capability Assessment

### 3.1 What ACC Supports

| Capability | Status | Detail |
|---|---|---|
| Multiple independent chat sessions | **Supported** | Runner grid spawns any number of PTY panels simultaneously. Each is an independent agent session. User can type into any panel directly |
| Single wave orchestration | **Supported** | Orchestrator Mode manages one `feature_plan` at a time. DAG dependency graph. Per-agent intra-wave unlock |
| Parallel agents within a wave | **Supported** | Wave 1 spawns all independent agents simultaneously. Wave 2 unlocks per-agent as dependencies resolve |
| A/B testing (same task, 2 agents) | **Supported** | "Send to Both" in Task Router. Same prompt to two agents, compare results |
| Native subagent observability | **Supported** | PTY pattern detection for Claude Code subagents, Cursor parallel agents, Cline native subagents. Tracked as sub-sessions in parent panel |

### 3.2 What ACC Does NOT Support (Gaps)

| Capability | Status | Why It Matters |
|---|---|---|
| **Multiple parallel wave orchestrations** | **Not supported** | Cannot run Wave A (auth feature) and Wave B (dashboard feature) as two concurrent orchestration threads. `feature_plans` has single `status` field. The Orchestrator Mode is a single-wave view |
| **Chat sessions as control centers** | **Not supported** | Agent panels are raw PTY terminals. You cannot "promote" a panel to become a mini-orchestrator that manages its own sub-wave of agents. The Orchestrator is the only entity that spawns/manages sub-agents |
| **Swarm-based parallel product threads** | **Not supported** | No concept of multiple autonomous orchestration threads running concurrently with independent dependency graphs, handoff queues, and budgets |
| **Cross-thread conflict detection** | **Not supported** | If two parallel orchestration threads both touch `src/auth.ts`, ACC has no mechanism to detect or resolve the conflict |
| **Thread-scoped docs folders** | **Not supported** | Single `docs/YYYY-MM-DD-slug/` per feature plan. Multiple parallel threads would need separate docs scopes |

### 3.3 Architecture Comparison

```
ACC TODAY (serial orchestration with parallel agents):
  Feature A: Wave 1 (A1∥A2) → Wave 2 (B1∥B2) → Wave 3 (C1) → done
  Feature B:                                                   → Wave 1 → done
  (sequential — Feature B waits for Feature A to complete)

WHAT'S MISSING (multi-threaded control):
  Thread 1: [Chat Session → controls Wave A-1 → Wave A-2 → done]
  Thread 2: [Chat Session → controls Wave B-1 → Wave B-2 → done]
  (parallel — both features develop simultaneously)
```

### 3.4 What Would Close This Gap

A **"Control Session" abstraction** — any agent panel can be promoted from raw PTY to mini-orchestrator:

```
Current:  [Orchestrator Mode] — one global orchestrator manages all waves
Needed:   [Control Session]   — any panel promoted to lead its own wave
                               — multiple control sessions run in parallel
                               — each has independent: dependency graph, handoff queue, docs scope, budget
```

Required architectural changes:
1. **`feature_plans` needs concurrency support** — allow multiple plans in `executing` state per project
2. **Docs scope isolation** — per-thread `docs/THREAD_ID/YYYY-MM-DD-slug/`
3. **Per-thread file watchers** — scoped to each thread's docs folder
4. **Cross-thread conflict detection** — file ownership registry. If Thread A claims `src/auth.ts`, Thread B is warned
5. **Control Session promotion** — right-click panel → "Promote to Control Session" → panel header shows 🎯 badge → has embedded mini wave grid
6. **Global budget view across threads** — aggregate token usage across all active control sessions

This would map naturally to the existing Runner grid and ACB infrastructure. Each control session would reuse the existing Wave Orchestrator, Handoff Monitor, and Correction Loop — just scoped to a thread rather than global.

### 3.5 Build Placement

This is a **Phase 10+** candidate. Requires: Wave Orchestrator (Phase 5), ACB (Phase 5+), Token Budget System (Phase 9++), and Knowledge Compounder (Phase 9) to all be complete first, since multi-thread orchestration touches every preceding module.

---

## 4. Summary — Strategic Gap Rankings

### Critical Gaps (should close before v1 launch)

| # | Gap | Severity | Effort |
|---|---|---|---|
| 1 | Phase 8 (Lark/Slack/Jira) deferred — full upstream loop only works with GitHub Issues | High | 10 weeks (when custom integration ready) |
| 2 | No v1 semantic routing — keyword-based only until Phase 10 Ollama embeddings | Medium | Low (v1.5 upgrade path exists) |
| 3 | CLI flag fragility — agent `waveCommand` templates break on upstream CLI changes | Medium | Ongoing maintenance |

### Architectural Gaps (Phase 10+ candidates)

| # | Gap | Severity | Effort |
|---|---|---|---|
| 4 | No parallel wave orchestrations | Medium-High | Large (6+ weeks) |
| 5 | No Control Session abstraction (chat sessions as orchestrators) | Medium | Large (depends on #4) |
| 6 | No swarm-based parallel product threads | Medium | Large (depends on #4, #5) |
| 7 | No cross-thread conflict detection | Medium | Medium |
| 8 | No per-provider cost aggregation | Low | Small |
| 9 | No model cost comparison in registry | Low | Small |
| 10 | No token budget reallocation between wave agents | Low | Medium |

### Differentiator Moat (what protects ACC from competition)

| Differentiator | Competitor Coverage | ACC Moat Depth |
|---|---|---|
| 9-agent unification | Max 6 by Agent-Swarm | 1.5× |
| Wave + DAG parallel execution | ClawTeam (tmux, no DAG) | Significant |
| Token budget + WIP + resume | Zero competitors | Unique |
| Knowledge Compounder | Ruflo (Claude-only) | Significant |
| Upstream connector loop | Agent-Swarm (no execution pipeline) | Significant |
| Tauri native desktop | Only 1code/Paseo (both Electron) | Moderate |

---

*Assessment conducted against ACC-Complete-Project-Documentation-v2.7.md (4153 lines, 21 modules, 11 ADRs, 68 user stories, 9 Tier 1 agents). Market research covers 13 competitor repositories and applications as of May 2026.*

---

## 6. Gap Closure Status & Document Cross-References

Each gap identified above is now addressed in the ACC documentation suite (2026-05-02 redistribution).

### 6.1 Gap → Document Resolution Map

| # | Gap | Resolved In | Status |
|---|---|---|---|
| **1** | Phase 8 deferred — upstream loop GitHub Issues-only | `docs/product/overview/ACC-Product-Overview.md` (Known Limitations), `docs/product/planning/ACC-Roadmap.md` (Phase 8) | Acknowledged |
| **2** | No v1 semantic routing | `docs/product/overview/ACC-Product-Overview.md` (Known Limitations), `docs/product/technical/ACC-Technical-System-Design.md` (Module 5) | v1.5 path spec'd |
| **3** | CLI flag fragility | `docs/product/technical/ACC-Technical-Overview.md` (Agent Abstraction — CLI Flag Stability note) | Acknowledged |
| **4** | No parallel wave orchestrations | `docs/product/technical/ACC-Technical-Overview.md` (Control Sessions), `docs/product/requirements/ACC-Epics.md` (Epic 16), `docs/product/technical/ACC-Technical-System-Design.md` (Module 22) | Phase 10+ spec'd |
| **5** | No Control Session abstraction | Same as #4 | Phase 10+ spec'd |
| **6** | No swarm-based product threads | Same as #4 | Phase 10+ spec'd |
| **7** | No cross-thread conflict detection | Same as #4 | Phase 10+ spec'd |
| **8** | No per-provider cost aggregation | `docs/product/requirements/ACC-Epics.md` (Epic 17), `docs/product/planning/ACC-Roadmap.md` (Phase 10b) | Phase 10+ user stories |
| **9** | No model cost comparison | `docs/product/requirements/ACC-Epics.md` (Epic 17), `docs/product/technical/ACC-Technical-System-Design.md` (`model_costs` table) | Phase 10a spec'd |
| **10** | No budget reallocation | `docs/product/requirements/ACC-Epics.md` (Epic 17), `docs/product/planning/ACC-Roadmap.md` (Phase 10c) | Phase 10+ user stories |
| **—** | SkillBridge integration | `docs/product/overview/ACC-Product-Overview.md` (Product Ecosystem), `docs/product/requirements/ACC-Epics.md` (Epic 18), `docs/product/technical/ACC-Technical-System-Design.md` (Module 23) | Cross-phase spec'd |

### 6.2 Document Suite Structure

```
docs/
├── assessments/
│   └── 2026-05-02/
│       └── ACC-Gap-Assessment.md              ← THIS FILE
├── product/
│   ├── ACC-Complete-Project-Documentation-v2.7.md  ← Original (preserved)
│   ├── overview/
│   │   ├── ACC-Product-Overview.md            ← Vision, market, personas, principles, ecosystem
│   │   └── SkillBridge-Product-Description.md ← Standalone product spec (built)
│   ├── requirements/
│   │   └── ACC-Epics.md                      ← 73 user stories across 18 epics
│   ├── planning/
│   │   ├── ACC-Roadmap.md                    ← Phases 1-10+ with MAFW plans, QA gates
│   │   └── ACC-Technical-Planning.md         ← ADRs (14 total), expansion, commercial strategy
│   └── technical/
│       ├── ACC-Technical-Overview.md          ← Architecture, flows, agent/connector abstractions
│       ├── ACC-Technical-Stack.md             ← Core stack, plugins, packages, Intelligence Layer
│       └── ACC-Technical-System-Design.md     ← Modules 1-23, UI/UX, Supabase/GitHub, full SQLite schema
```

### 6.3 Reading Guide by Role

| Role | Primary Docs | Secondary Docs |
|---|---|---|
| **Product Manager / Stakeholder** | Overview → Epics | Roadmap |
| **Engineering Lead** | Technical Overview → System Design | Stack → Roadmap |
| **Developer (implementation)** | System Design → Stack → Technical Overview | Epics (acceptance criteria) |
| **Architect** | Technical Planning (ADRs) → Technical Overview | System Design |
| **QA / Tester** | Epics (acceptance criteria) → System Design (module specs) | Roadmap (QA gates) |
| **New Team Member** | Overview → Epics → Technical Overview | Stack

---

## 5. SkillBridge Compatibility & Integration Assessment

**Source:** SkillBridge-Product-Description.md (v1.0 — production-ready) + ACC-Complete-Project-Documentation-v2.7.md
**Status:** SkillBridge is built and tested. ACC is pre-build specification. The two products should NOT merge — SkillBridge remains standalone. ACC should detect, surface, and integrate.

### 5.1 Compatibility Matrix

| Dimension | SkillBridge | ACC | Compatibility |
|---|---|---|---|
| **App Shell** | Tauri v2 | Tauri v2 | ✅ Identical — shared binary architecture |
| **Frontend** | React 18 + TypeScript + Tailwind | React 19 + TypeScript + Tailwind | ✅ Minor version gap, same stack |
| **State** | Zustand | Zustand | ✅ Identical |
| **Security** | Stronghold (AES-256) | Stronghold (AES-256) + OS keychain fallback | ✅ Identical vault system |
| **Database** | SQLite | SQLite (WAL mode) | ✅ Compatible — different DB files, no collision |
| **Workers** | Node.js sidecar (claude-mem, context-mode) | PTY shell spawn (claude, opencode, etc.) | ✅ Non-overlapping — different spawn mechanisms |
| **Protocol** | MCP over SSE + WebSocket via Deno relay | MCP configured in agent config files (local) | ✅ Complementary — SkillBridge exposes MCP to cloud, ACC manages local MCP configs |
| **Memory** | `~/.claude-mem/` (persistent memory bank) | Agent memory files (`CLAUDE.md`, `GEMINI.md`, etc.) | ⚠️ Different formats — claude-mem is structured, agent memory is markdown |
| **Relay** | Deno Deploy edge relay | None (local-first, no cloud dependency) | ✅ ACC has no relay — no conflict |

### 5.2 Product Relationship

These two products occupy complementary, non-overlapping roles in the same ecosystem:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AGENT CONTROL CENTER                         │
│                                                                     │
│  ┌──────────────────────────┐    ┌──────────────────────────────┐  │
│  │   LOCAL AGENT CONTROL    │    │    CLOUD MEMORY BRIDGE       │  │
│  │                          │    │                              │  │
│  │  • 9-agent PTY launcher  │    │  • claude-mem ↔ web relay    │  │
│  │  • Wave orchestrator     │    │  • context-mode sandbox      │  │
│  │  • Token budget system   │    │  • Encrypted tunnel          │  │
│  │  • Knowledge compounder  │    │  • Machine-scoped tokens     │  │
│  │  • Outcome tracker       │    │                              │  │
│  │  • Upstream connectors   │    │  ┌────────────────────┐      │  │
│  │                          │    │  │   SKILLBRIDGE      │      │  │
│  │  (ACC — built by ACC)    │    │  │   (standalone app)  │      │  │
│  └──────────────────────────┘    │  └────────────────────┘      │  │
│           ▲                      │           ▲                  │  │
│           │                      │           │                  │  │
│           │                      │  ACC detects SkillBridge     │  │
│           │                      │  via app path / process      │  │
│           │                      │  check + surfaces in UI      │  │
│           │                      └──────────────────────────────┘  │
│           │                                   ▲                    │
│           │                                   │                    │
│           │            ACC → SkillBridge integration points:        │
│           │            • MCP Registry lists SkillBridge endpoint    │
│           │            • Knowledge Compounder reads claude-mem      │
│           │            • Unified vault shares Stronghold backend    │
│           │            • Settings shows bridge status inline        │
│           └────────────────────────────────────────────────────────┤
│                                                                     │
│  ACC does NOT:                                                     │
│  ✗ Manage the Deno relay connection                                │
│  ✗ Spawn claude-mem or context-mode workers                        │
│  ✗ Control SkillBridge's bridge state                              │
│  ✗ Replace SkillBridge's relay URL configuration                   │
│                                                                     │
│  ACC DOES:                                                          │
│  ✓ Detect SkillBridge installation                                 │
│  ✓ Surface bridge status / connection health                       │
│  ✓ Register SkillBridge MCP endpoint in MCP Registry               │
│  ✓ Read claude-mem as a knowledge source for the Compounder        │
│  ✓ Show unified memory view (CLAUDE.md + claude-mem entries)       │
│  ✓ Guide users through SkillBridge install if not detected         │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Integration Feature Specification

#### 5.3a — Detection & Status Surface

ACC detects SkillBridge at startup via the Rust backend:

```
Detection methods (tried in order):
1. Process check: pgrep/ps for "SkillBridge" process
2. App path check: /Applications/SkillBridge.app (macOS)
3. Config file check: ~/.skillbridge/config.json (if standardized)
4. Port/relay check: attempt GET to local worker port (if exposed)

Detection result stored in SQLite:
  skillbridge_status: 'not-installed' | 'installed' | 'running' | 'bridge-active'
  skillbridge_version: semver string
  skillbridge_relay_url: from config
  skillbridge_mcp_url: from config (the /mcp/<machine_id>/sse endpoint)
```

**UI surface — two locations:**

**1. Settings → Integrations panel:**
```
┌── Integrations ───────────────────────────────────────────────────────┐
│                                                                         │
│  ── Detected Applications ───────────────────────────────────────     │
│                                                                         │
│  🔗 SkillBridge    ● Running — Bridge Active                          │
│     v1.0.0    Relay: skillbridge.automation-edge8.deno.net             │
│     MCP URL:  https://<relay>/mcp/<machine_id>/sse                     │
│     [Copy MCP URL]  [Open SkillBridge]  [Manage in MCP Registry →]    │
│                                                                         │
│  ⚠️ SkillBridge not detected                                          │
│     SkillBridge bridges your local memory to Claude.ai web.            │
│     [Install SkillBridge →]  [Learn more →]                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**2. Runner view — status bar:**
```
┌─── Project: /projects/client-x  [switch ▾]  ─────────────────────┐
│  Agents: 2 active │ SkillBridge: ● Connected │ Budget: 45%      │
└──────────────────────────────────────────────────────────────────┘
```

#### 5.3b — MCP Registry Integration

SkillBridge's MCP endpoint is auto-registered as a managed MCP entry:

```json
// ACC auto-creates this in the MCP Registry on detection
{
  "id": "skillbridge-claude-mem",
  "name": "SkillBridge — claude-mem",
  "type": "sse",
  "url": "https://skillbridge.automation-edge8.deno.net/mcp/<machine_id>/sse",
  "agent_scope": ["claude", "opencode", "gemini"],
  "is_connector": 0,
  "source": "skillbridge",          // ← marks it as detected, not user-created
  "managed_externally": true,       // ← ACC doesn't edit; changes must happen in SkillBridge
  "is_active": true
}
```

In the MCP Registry UI, SkillBridge entries show:
- A 🔗 badge indicating external source
- Read-only toggle (user can enable/disable per-agent, but cannot edit connection params)
- "Configure in SkillBridge" link that opens the app
- Connection health indicator (green dot = bridge active, grey = bridge stopped, red = relay unreachable)

#### 5.3c — Knowledge Compounder: claude-mem as Input Source

The Knowledge Compounder (Module 16) gains an additional input source when SkillBridge is detected:

```
Existing sources:                   New source (when SkillBridge detected):
  Session event log                     claude-mem entries
  HANDOFF documents                     (structured memory bank
  CORRECTION documents                  with categories, tags,
  Failure analyses                      and usage frequency)
  Outcome records
  Feature Docs
  PTY output patterns
```

**Extraction approach:**
- ACC reads `~/.claude-mem/` directory structure (read-only — never writes)
- claude-mem entries with high usage frequency or recent access dates are candidates
- Pass 1 (local pattern pre-pass) already handles structured candidates — claude-mem entries match this pattern naturally
- Entries tagged with the current project's stack tags are prioritized

**Surface in Knowledge Panel:**
- Items sourced from claude-mem show a `📡 SkillBridge` source badge
- Distinguishable from session-derived knowledge (`🔄 Session` badge)
- User can filter by source: All / Session / SkillBridge

#### 5.3d — Unified Memory View

A new sub-tab in the Memory Browser (Module 2b) when SkillBridge is detected:

```
┌── Memory Browser ─────────────────────────────────────────────────────┐
│  [Agent Memory]  [SkillBridge Memory]  [Unified]                      │
│                                                                        │
│  ── Agent Memory Files ──                          ── claude-mem ──   │
│  CLAUDE.md  (12 entries)                           ● 47 entries        │
│  GEMINI.md  (3 entries)                            Categories:         │
│  AGENTS.md  (1 entry)                              auth, patterns,     │
│  CONVENTIONS.md (8 entries)                        architecture,       │
│                                                    supabase            │
│  ── Cross-Reference ──                                                 │
│  CLAUDE.md "JWT auth pattern" ← matches → claude-mem "auth/jwt-impl"  │
│  [Merge] [Keep Separate]                                               │
│                                                                        │
│  💡 Tip: claude-mem entries tagged "supabase" match your project       │
│     stack. [View 12 entries →]                                         │
└────────────────────────────────────────────────────────────────────────┘
```

Cross-reference is done via keyword overlap (same Jaccard approach as knowledge dedup) — no embedding required in v1.

#### 5.3e — Guided Onboarding Flow

When ACC is first launched and SkillBridge is NOT detected:

```
┌── Welcome to ACC ────────────────────────────────────────────────────┐
│                                                                        │
│  ACC manages your local coding agents. To also connect your local     │
│  memory to Claude.ai web, install SkillBridge:                        │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  1. Download SkillBridge                                     →  │  │
│  │  2. Install and launch                                        →  │  │
│  │  3. ACC will auto-detect and connect the integration            │  │
│  │                                                                  │  │
│  │  What this gives you:                                           │  │
│  │  • Claude.ai web can access your local project memory           │  │
│  │  • Memory syncs bidirectionally                                 │  │
│  │  • ACC Knowledge Compounder learns from your web sessions       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  [Install SkillBridge]  [Skip — I only need local agents]             │
└────────────────────────────────────────────────────────────────────────┘
```

This is shown once on first launch and remains accessible from Settings → Integrations.

### 5.4 Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER'S MACHINE                                │
│                                                                     │
│  ┌──────────────────────────────────────────┐                       │
│  │              ACC (Tauri v2)               │                       │
│  │                                          │                       │
│  │  ┌────────────────────────────────────┐  │                       │
│  │  │  SkillBridge Integration Layer     │  │                       │
│  │  │  (Rust backend + React frontend)   │  │                       │
│  │  │                                    │  │                       │
│  │  │  • Process detector                │  │                       │
│  │  │  • Config reader                   │  │  reads               │
│  │  │  • MCP endpoint registrar          │──┼──────────┐           │
│  │  │  • claude-mem reader               │  │          │           │
│  │  │  • Status poller (every 30s)       │  │          ▼           │
│  │  └────────────────────────────────────┘  │  ┌────────────────┐  │
│  │                                          │  │  SkillBridge   │  │
│  │  ┌────────────────────────────────────┐  │  │  (Tauri v2)    │  │
│  │  │  ACC Core (unchanged)              │  │  │                │  │
│  │  │  • MCP Registry ← SkillBridge MCP  │  │  │  Bridge State  │  │
│  │  │  • Knowledge Panel ← claude-mem src│  │  │  Relay URL     │  │
│  │  │  • Memory Browser ← unified view   │  │  │  MCP URL       │  │
│  │  │  • Settings ← integration status   │  │  │  Workers       │  │
│  │  └────────────────────────────────────┘  │  │  (unchanged)   │  │
│  └──────────────────────────────────────────┘  └────────────────┘  │
│                                                                     │
│  ACC reads SkillBridge state. ACC never writes SkillBridge config.  │
│  Integration layer is additive — zero changes to SkillBridge code.   │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.5 Build Placement & Effort

| Component | Phase | Effort | Dependencies |
|---|---|---|---|
| Process detection + config reader | Phase 1 (Foundation) | 0.5 weeks | None — standalone Rust module |
| MCP Registry auto-registration | Phase 2 (Asset Manager) | 0.5 weeks | MCP Registry must exist first |
| Settings → Integrations panel | Phase 2 (Asset Manager) | 0.5 weeks | Settings panel |
| Runner status bar indicator | Phase 1 (Foundation) | 0.25 weeks | Runner UI |
| Knowledge Compounder claude-mem source | Phase 9 (Knowledge Layer) | 0.5 weeks | Knowledge Compounder complete |
| Unified Memory View | Phase 2 extension | 1 week | Memory Browser |
| Guided onboarding flow | Phase 1 (Foundation) | 0.25 weeks | First-launch detection |

**Total: ~3.5 weeks spread across phases. Zero changes to SkillBridge codebase.**

### 5.6 What Must NOT Happen (Anti-Patterns)

| Do NOT | Because |
|---|---|
| Merge SkillBridge code into ACC | SkillBridge is a standalone product with its own user base and relay infrastructure. It must remain independently installable and updatable |
| Have ACC control SkillBridge's bridge state | SkillBridge's relay connection is security-critical. ACC should never start/stop the bridge — only surface its status |
| Have ACC write to `~/.claude-mem/` | claude-mem is SkillBridge's domain. ACC reads only. SkillBridge writes. Single-writer principle |
| Create a hard dependency | ACC must be fully functional without SkillBridge. Integration is an enhancement, not a requirement |
| Replicate SkillBridge's relay | ACC is local-first (Design Principle P3). Adding a relay would violate the architecture. SkillBridge owns that concern |

### 5.7 Strategic Summary

| Aspect | Assessment |
|---|---|
| **Stack compatibility** | Near-identical — Tauri v2, React/TypeScript, Tailwind, Zustand, Stronghold |
| **Feature overlap** | None — complementary roles. ACC = local agent control. SkillBridge = cloud memory bridge |
| **Integration complexity** | Low — read-only detection + surface. No shared state, no IPC, no API dependency |
| **Risk to either product** | Zero — SkillBridge codebase is untouched. ACC integration is entirely additive |
| **User value** | Significant — unified view of local + cloud-side memory. One-click MCP registration. Knowledge from web sessions feeds the Compounder |
| **Build cost** | ~3.5 weeks total, distributed across existing phases |
| **Strategic fit** | SkillBridge proves the Tauri + MCP + relay architecture. ACC proves the multi-agent orchestration. Together they form a complete AI development cockpit |
