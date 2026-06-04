# ACC Build Roadmap

**Source:** ACC-Complete-Project-Documentation-v2.7.md, Sections 15–16
**Gap assessment incorporated:** ACC-Gap-Assessment.md (2026-05-02)
**Market gap analysis incorporated:** `docs/2026-06-02-gap-analysis/02-market-gap-analysis.md` (2026-06-03)
**SkillBridge integration milestones incorporated:** SkillBridge Compatibility Assessment, Section 5.5

---

## Phase Overview

```
Phase 1  Weeks 1–3    Foundation            PTY runner, preset buttons, SQLite schema + indexes + WAL
                       QA gate: agents spawn, PTY interactive stability confirmed on all OS targets
Phase 2  Weeks 4–6    Asset Manager         Skills, Memory, MCPs, Vault, Write Coordinator
                       QA gate: MCP toggle writes verified against all agent config formats
Phase 3  Weeks 7–9    Intelligence          Outcomes, Failure Analyzer, Replay, Token Guard + Limit Detector
                       QA gate: Intelligence Layer all 3 modes tested; rate limit + fallback paths verified
Phase 4  Weeks 10–11  Routing               Task Router, Model Router, Handoff Protocol
                       QA gate: routing suggestions verified against known outcome history
Phase 5  Weeks 12–16  Wave Protocol         Wave Orchestrator + Guidelines + Handoffs + Correction Loop
                       QA gate: full 6-agent parallel wave runs end-to-end; intra-wave dependency verified
Phase 5+ Weeks 17–18  Comm Bus (ACB)        Agent Communication Bus — stdout signals, routing, Message Bus Panel
                       QA gate: BLOCKER/RESOLVE cycle verified; wave correctly pauses and resumes
Phase 6  Weeks 19–20  Team Layer            Playbooks, Reactive Memory, Feature Docs (+ dogfood begins)
                       QA gate: .acc import/export round-trip verified; 4 docs generated from a real session
Phase 7  Weeks 21–23  Supabase & GitHub     First-class integrations + GitHub Issues as Tier 1 connector
                       QA gate: migration safety lock verified; CI gate tested green + red paths
Phase 8  DEFERRED      Connector Loop        Lark → Slack → Jira — deferred pending custom Lark integration (ADR-011)
Phase 9  Week 24       Knowledge Layer       Knowledge Compounder + Knowledge Panel
                       QA gate: knowledge items appear after real session; confidence increments across sessions
Phase 9+ Weeks 25–26   Autonomous Scheduler  Cron Registry, Session Heartbeat, escalation policy, notifications
                       QA gate: scheduled job runs end-to-end unattended; escalation fires correctly on BLOCKER
Phase 9++ Weeks 27–28  Token Budget System   Budget Planner, threshold ladder, WIP capture, Wave Resumption, pending tasks
                        QA gate: 95% threshold triggers WIP write; resumption picks up from checkpoint; pending tasks auto-inject
Phase 9+++ Weeks 29–32 Memory Layer Foundation Context compressor, extraction middleware, session checkpointing, sqlite-vec storage, hybrid retrieval
                        QA gate: 3-zone compression preserves decisions + constraints; write-before-compaction verified; cross-session resume functional
Phase 10a Weeks 33–36   Codebase Exploration  Repo map generator, AST-aware chunking, signature ladder, BM25+vector hybrid search, code coverage tracking
                        QA gate: repo map fits 2K token budget for 1000-file repo; hybrid retrieval relevance >85%; exploration coverage tracked
Phase 10b Weeks 37–40   Knowledge Graph v2     Embeddings, Leiden communities, GraphRAG local/global search, Cytoscape.js visualization, code↔KG bridge, git co-change mining
                        QA gate: community detection runs on 50K nodes <2s; multi-hop CTE query returns; KG explorer renders 1K nodes interactively
Phase 10c Weeks 41–44   Multi-Agent Memory    Cross-agent fact surfacing, memory decay reranking, collective memory synthesis, CLI inspection, memory inspection panel
                        QA gate: Agent A's discovery surfaces for Agent B within 5s; memory decay floor 0.3x verified; `acc memory stats` functional
Phase 11 Month 8+        Expansion + Gaps      Cloud sync, web version, marketplace, architectural gap closure
```

**Phase 5 scope note:** Phase 5 (Wave Protocol) is the most architecturally complex module in the system. Five weeks (Weeks 12–16) is the fixed allocation — week 16 is a buffer for integration testing and edge case fixes.

**Market context — Phase 5 (Wave Protocol):** Dependency-aware wave execution with intra-wave unlock is a greenfield feature. Zero competitors have any form of dependency-aware parallel execution with handoff verification gates. The 5-week allocation reflects the architectural complexity of building a category-first capability. Every existing parallel solution (ClawTeam tmux, Agent-Swarm Docker, Composio worktree) is "fire and forget" — no feedback loop between parallel agents. ACC's wave state machine, handoff watcher, stall detector, and correction loop have no market equivalent.

**Market context — Phase 9 (Knowledge Layer):** The Knowledge Compounder is ACC's strongest defensible moat. Ruflo is the only competitor with any knowledge accumulation (Claude-only, 1-pass, vector DB), and zero competitors have 2-pass compounding, confidence scoring, contradiction detection, or preflight warnings. The compounding flywheel (more sessions → smarter agents → more sessions) cannot be replicated without both multi-agent data and the Compounder architecture. This phase should be prioritized for UX polish and user-facing visibility — it's the feature most likely to drive retention and word-of-mouth.

**Market context — Phase 9++ (Token Budget):** Token budget management is entirely uncontested. ccswarm has OTel observability but no proactive allocation, threshold ladder, WIP capture, or wave resumption. Every other product tracks at most cost summaries. The budget state machine with automatic shutdown and resume-from-checkpoint is a category-first capability. This phase is a strong differentiator but lower UX priority than Knowledge Compounding because it solves a problem users only feel after heavy usage.

**Market context — Phase 10+ (Architectural Gaps):** These gaps close the remaining competitive distance — parallel wave orchestrations, cost aggregation, token reallocation. None are v1 blockers per the market analysis. The market window for shipping v1 with the greenfield features above is now; architectural enhancements can follow.

---

## Phase 1 — Foundation (Weeks 1–3)

**Goal:** Working multi-agent launcher. Ship something usable on Day 21.

**Critical Week 1 task — Tauri PTY stability validation:**
Before any Runner UI, validate that `@tauri-apps/plugin-shell` handles interactive CLI sessions correctly on all target OS (macOS ARM, macOS Intel, Windows). If the plugin cannot handle edge cases (interactive prompts, confirmation dialogs, paging), a custom Rust PTY implementation (`portable-pty` crate) must be scoped and built first.

### MAFW Wave Plan

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

### SkillBridge Integration (0.5 weeks)

```
SB1: Process detection — pgrep/ps for SkillBridge process + app path check (macOS)
SB2: Config reader — read ~/.skillbridge/config.json for version, relay URL, MCP URL
SB3: skillbridge_status SQLite table (not-installed | installed | running | bridge-active)
SB4: Runner status bar indicator — "SkillBridge: ● Connected" in project header
SB5: Guided onboarding — first-launch detection, install prompt if SkillBridge not found
```

### QA Gate
All supported agents spawn and respond to PTY write on macOS and Windows. Interactive confirmation prompts handled correctly. Two-stage PTY pipeline verified — escape-stripped stream matches raw stream content. SQLite WAL mode confirmed active. SkillBridge detection fires correctly across all three states (not-installed / installed / running).

**Milestone:** Launch any supported agent, fire preset commands, switch projects, see session logs. SkillBridge status visible in status bar.

---

## Phase 2 — Asset Manager (Weeks 4–6)

**Goal:** All agent materials managed from one panel.

### MAFW Wave Plan

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

### SkillBridge Integration (2 weeks)

```
SB1: MCP Registry auto-registration — SkillBridge endpoint auto-registered as managed MCP entry
     (source: "skillbridge", managed_externally: true, read-only toggle)
SB2: Settings → Integrations panel — detected apps list, SkillBridge status, Copy MCP URL,
     Open SkillBridge button, install prompt when not detected
SB3: Unified Memory View — new sub-tab in Memory Browser: [Agent Memory] [SkillBridge Memory] [Unified]
     Cross-reference via keyword overlap (Jaccard similarity, no embeddings needed)
SB4: SkillBridge MCP entries show 🔗 badge, connection health indicator (green/grey/red)
```

### QA Gate
MCP toggle writes verified against all agent config file formats (claude_desktop_config.json, opencode config.json, gemini settings.json). Stronghold init tested — OS keychain fallback activates correctly on Stronghold failure. Write coordinator: concurrent write attempts to CLAUDE.md serialise correctly without corruption. API keys injected as env vars on PTY spawn confirmed. SkillBridge MCP auto-registered on detection, cross-reference between agent memory and claude-mem entries functional.

**Milestone:** MCP toggles write to real config files. API keys auto-load on agent spawn. Skills editable and injectable. SkillBridge MCP endpoint visible in MCP Registry with read-only badge. Unified memory view cross-references CLAUDE.md entries with claude-mem entries.

---

## Phase 3 — Intelligence Layer (Weeks 7–9)

**Goal:** Outcomes tracked, failures diagnosed, sessions replayable.

### MAFW Wave Plan

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

### QA Gate
Idle detector fires only when supplementary signal is present. Failure Analyzer tested on real failure output across all three Intelligence Layer modes. Limit event detector triggers correctly on injected plan limit error strings. Mode 1/2/3 fallback chain verified (Mode 3 panel closed → falls back to Mode 1). Request queue priority ordering verified under concurrent call load. Heartbeat correctly identifies CRASHED and THINKING sessions.

**Milestone:** Know which agent succeeds at what. Diagnose failures in one click. Browse any past session. Intelligence Layer operational in all three modes. Session health monitored continuously.

---

## Phase 4 — Routing & Handoff (Weeks 10–11)

**Goal:** Smart task routing. Clean agent-to-agent handoffs.

### MAFW Wave Plan

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

### QA Gate
Routing suggestions verified against known outcome history — correct agent ranked first for task types with clear historical signal. Version checker detects mismatched CLI flags and surfaces warning correctly. Handoff envelope injected into target PTY and acknowledged. Project stack scanner correctly identifies all supported manifest formats.

**Milestone:** Type a task → get agent + model suggestion with estimated confidence. Hand off work between agents with one click. Agent version warnings surface on outdated CLI installs.

---

## Phase 5 — Wave Protocol (Weeks 12–16)

**Goal:** Full MAFW workflow running inside ACC UI.

**Scope note:** This is the most complex module in the system. Five weeks is the realistic allocation. Do not compress. Week 16 is a buffer week.

### MAFW Wave Plan

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

### QA Gate
Full 6-agent parallel wave runs end-to-end: guidelines generated, agents spawn in parallel, handoffs detected with debounce (partial write test included), intra-wave unlock fires correctly when only direct dependencies are verified, correction loop fires on failed handoff, limit-paused state correctly suppresses correction loop, wave resumes after manual limit resolution. Zero-regression rule blocks wave advancement when existing tests fail.

**Milestone:** Run a full MAFW-protocol multi-agent feature from inside ACC. Wave progress visible. Handoffs auto-detected and validated against schema. Intra-wave dependency resolution working.

---

## Phase 5+ — Agent Communication Bus (Weeks 17–18)

**Goal:** Agents can signal each other mid-execution via ACC-mediated stdout routing. No files created. No storage debt.

**Standalone phase — not a Phase 5 appendage.** If Phase 5 runs long, Phase 5+ slides intact with its own two-week allocation.

### MAFW Wave Plan

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

### QA Gate
BLOCKER signal from agent correctly pauses wave advancement. RESOLVE signal correctly unblocks. Force Resolve from UI works. ACK-priority CONTRACT signal delivery verified end-to-end in a real 2-agent wave. Prefix check confirmed active — parser not invoked for non-ACC lines. Zero files created during a full signal exchange.

**Milestone:** Parallel wave agents can negotiate shared interfaces, surface blockers, and broadcast status mid-execution. All signals visible in Message Bus Panel. Wave correctly blocked and unblocked by signal state.

---

## Phase 6 — Team Layer (Weeks 19–20)

**Goal:** Playbooks exportable, memory reactive, feature docs auto-generated.

**Dogfood begins this phase.** From Phase 6 onward, ACC development uses ACC's own Wave Orchestrator, Agent Guideline Generator, and Feature Doc Generator. Two weeks allocated to absorb the feedback loop.

### MAFW Wave Plan

```
A1: .acc bundle format (zip schema + manifest writer)
A2: Playbook export UI (asset selector + bundle preview)
B1: Playbook import UI (unzip + install + secret scaffolding)
B2: Reactive Memory Capture (PTY pattern detector, phase-gated to idle/reflection phase)
C1: Feature Documentation Generator (4 sequential Intelligence Layer calls + summarisation pre-step)
C2: Intermediate file cleanup workflow (post-generation, only after all 4 docs succeed)
D1: Session export as PDF + Markdown
```

### QA Gate
.acc import/export round-trip verified — exported bundle imports cleanly on a fresh ACC install with correct asset layout and secret scaffolding. Feature Doc Generator produces all 4 docs from a real dogfood session; partial failure recovery tested. Reactive memory candidate prompt verified — does not fire during active file-writing phase.

**Milestone:** Export full client AI setup as `.acc` file. New team member imports → operational in 30 seconds. 4 canonical docs generated automatically post-feature. Dogfood loop active.

---

## Phase 7 — Supabase & GitHub (Weeks 21–23)

**Goal:** First-class Supabase and GitHub integrations live. GitHub Issues as Tier 1 connector.

### MAFW Wave Plan

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
     (7-stage loop: file → classify → propose → approve → wave → PR → CI → close)
E2: Supabase + GitHub items in Project Intelligence stack detection + MCP suggestions
```

### QA Gate
Supabase `development` group lock verified — `execute_sql` cannot be called without explicit per-session unlock. Migration file detection triggers confirmation modal. GitHub Actions polling resolves green correctly and triggers correction loop on red. Local test fallback activates when no `.github/workflows/` present. Lockdown Mode auto-enables on public repo detection. GitHub Issues full 7-stage loop tested end-to-end.

**Milestone:** Agents safely read Supabase schema. Migrations require human confirmation. GitHub CI replaces or supplements test suite as QA signal. PR auto-created after wave. GitHub Issues trigger the connector loop.

---

## Phase 8 — Connector Loop — DEFERRED

**Status: DEFERRED** per ADR-011. Full upstream connector loop (Lark → Slack → Jira) is gated on availability of a custom Lark MCP and event-listening system.

**Re-activation trigger:** When the custom Lark integration is available and validated against:
- Lark MCP tool coverage audit (approval signal detection, Lark Doc creation, Lark Base write)
- Architect Agent Slack Canvas availability check (plan-gated feature verification)
- Webhook vs polling decision validated against custom system capabilities

**Preserved design:** The ConnectorConfig abstraction, Architect Agent architecture, 7-stage loop design, and Architect Agent resilience strategy (timeout, backoff, degraded state) remain in the specification as the intended implementation. The Architect Agent background loop stub implemented in Phase 7 (for GitHub Issues) is extended when Phase 8 resumes.

**Pre-requisite QA before Phase 8 resumes:**
- Custom Lark MCP tool coverage audit (approval signal detection, Lark Doc creation, Lark Base write)
- Architect Agent Slack Canvas availability check (plan-gated feature verification)
- Webhook vs polling decision validated against custom system capabilities

---

## Phase 9 — Knowledge Layer (Week 24)

**Goal:** Knowledge Compounder live. Knowledge Panel accessible. Pre-load injections working.

### MAFW Wave Plan

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

### SkillBridge Integration (0.5 weeks)

```
SB1: Knowledge Compounder claude-mem source — read ~/.claude-mem/ directory (read-only)
     Entries with high usage frequency or recent access dates become candidates
     Pass 1 local pattern pre-pass handles structured claude-mem entries naturally
SB2: Source badges in Knowledge Panel — 📡 SkillBridge vs 🔄 Session, filter by source
     Stack-tagged claude-mem entries prioritized for matching current project
```

### QA Gate
Knowledge items generated from a real dogfood session without user action. Confidence score increments correctly when same pattern appears in a second session (Jaccard similarity match verified). Anti-pattern warning fires in Guideline Generator for a known anti-pattern. Contradiction detection flags two opposing items correctly. claude-mem sourced items appear with SkillBridge source badge and filter correctly.

**Milestone:** After every completed feature, 3–5 structured learning items appear in Knowledge Panel without any user action. Relevant items auto-injected into next session's agent context. Anti-patterns surface as warnings in guideline generator. claude-mem entries feed the Knowledge Compounder when SkillBridge is active.

---

## Phase 9+ — Autonomous Scheduler (Weeks 25–26)

**Goal:** Agents run scheduled tasks autonomously. Human is notified only when escalation conditions are met.

### MAFW Wave Plan

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

### QA Gate
Cron job fires on schedule without human input. Full wave executes end-to-end. BLOCKER signal from agent triggers escalation notification (system notification fires, cron execution marked `escalated`, wave pauses). Limit-paused event triggers escalation. Heartbeat detects simulated CRASHED session and attempts auto-restart before escalating. Completion notification sent with Feature Docs link. Multiple overlapping cron jobs handled without race condition.

**Milestone:** A cron job runs a multi-agent wave overnight, generates feature docs, and sends a completion summary. If a blocker is hit, the developer receives a notification with full context. The team works while no one is watching.

---

## Phase 9++ — Token Budget System (Weeks 27–28)

**Goal:** Proactive token budget allocation, monitoring, and graceful WIP-based shutdown. Pending tasks persist and auto-resume.

### MAFW Wave Plan

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

### QA Gate
Budget allocated correctly for known task complexity (verified against historical p75). 60% / 80% / 95% threshold instructions inject correctly into PTY at the right times. Agent writes valid WIP_CHECKPOINT.md when 95% threshold fires. Fallback WIP generation works when agent fails to write. Wave Resumption Plan correctly consolidates 3 WIPs from a partial wave. Pending task auto-injects into next session's context preamble. Resume from WIP picks up at the documented checkpoint (verified by file change diff). Cron job correctly prioritises pending tasks over scheduled work.

**Milestone:** A wave hits its budget threshold mid-execution. Each affected agent writes a WIP. The orchestrator consolidates a Resumption Plan. When the next session starts, agents automatically pick up where they left off. No work is lost. No starting from scratch.

---

## Phase 9+++ — Memory Layer Foundation (Weeks 29–32)

**Goal:** Agents maintain coherent context across sessions. Long sessions compress without losing critical information. Memory persists and is retrievable.

**Prerequisites:** Phase 9++ (Token Budget System — compressor needs token tracking), Phase 9 (Knowledge Layer — extraction feeds into Compounder)

**Source Spec:** `docs/2026-06-04-memory-layer/ACC-Memory-Layer-Feature-Spec.md`

### MAFW Wave Plan

```
A1: sqlite-vec integration — load extension, create vec0 virtual tables, partition by agent_id
A2: memory_facts + session_checkpoints SQLite tables + indexes
B1: Extraction middleware — async background thread, heuristic pass + LLM extraction fallback
B2: Circuit breaker — 5 consecutive failures → 2-min cooldown, agent continues without memory
C1: Context compressor — 3-zone (head-summary-tail), 50% threshold, write-before-compaction hook
C2: Anti-thrashing lock — if compression fires twice with <10% savings → permanent disable for session
D1: Session checkpointing — save on session end, load on session start, inject top-10 memory facts
D2: Retrieval engine — hybrid BM25 + vector (cosine via sqlite-vec MATCH) + entity matching + memory decay
E1: Multi-scope identity — user_id, agent_id, session_id, org_id, file_id partitioning
E2: Memory Panel UI — fact timeline, search bar, filter chips, fact cards with confidence bars
F1: Extraction-to-retrieval cost tracking — measure token ratio monthly, cap at 5% of session tokens
F2: Compression status indicator in Runner header — green/yellow/orange/red dots
```

### QA Gate
3-zone compression preserves exact values (write-before-compaction verified — all 5 risk categories survived). Two sessions with same agent resume with prior context intact. Extraction latency <200ms heuristic, <2s LLM (async, non-blocking). Circuit breaker activates on 5 failures and recovers after cooldown. Hybrid retrieval returns relevant facts for code-specific queries (BM25 catches exact function names). Anti-thrashing lock prevents compression loops.

**Milestone:** Agents resume sessions with past context injected. Context compresses at 50% window threshold with fact extraction before compression. Memory Panel shows chronologically extracted facts with type badges and confidence.

---

## Phase 10a — Codebase Exploration (Weeks 33–36)

**Goal:** Agents receive structured, compact, relevance-ranked codebase context on demand. No more blind exploration.

**Prerequisites:** Phase 9+++ (Memory Layer — sqlite-vec storage and embedding pipeline shared)

**Source Spec:** `docs/2026-06-04-codebase-exploration/ACC-Codebase-Exploration-Feature-Spec.md`

### MAFW Wave Plan

```
A1: tree-sitter integration — Rust crate + TypeScript/Python/Rust/Go grammars
A2: Repo map generator — AST symbol extraction → dependency graph → PageRank ranking → 2K token budget
B1: AST-aware chunking — adaptive granularity (file → class → method → control-flow)
B2: BM25 index — in-memory Rust implementation, incrementally refreshed on file change
C1: Embedding pipeline — chunk via all-MiniLM-L6-v2, store in sqlite-vec vec0 table
C2: Hybrid retrieval — BM25 + vector fusion (0.6/0.4), entity boost, graph expansion from seeds
D1: Signature ladder — L0 skeleton / L1 signatures / L2 annotated / L3 full body, on-demand expansion
D2: Context cache with LRU eviction — max token budget, graph-aware eviction policy
E1: Tauri commands — build_repo_map, search_codebase, get_code_chunk, get_file_context
E2: Exploration coverage tracking — per-file status (unexplored/mapped/summarized/analyzed)
```

### QA Gate
Repo map for 1000-file codebase fits within 2K token budget. AST-aware chunks preserve syntactic units — no function split across chunks. BM25 search returns exact function/file name matches <50ms. Vector search returns semantically similar code chunks <10ms. Signature ladder: agent requests L1 → gets file skeleton; requests L3 → gets full body. Coverage stats display correctly: "87% mapped, 43% summarized, 12% analyzed."

**Milestone:** Agent spawns with repo map injected as context preamble. Types "find auth logic" → ACC returns ranked chunks (function signatures + implementations). Agent requests specific file → gets full body. Never reads entire codebase — only what it needs.

---

## Phase 10b — Knowledge Graph v2 (Weeks 37–40)

**Goal:** A rich, queryable, visualizable knowledge graph constructed automatically from agent activity, connected to code structure.

**Prerequisites:** Phase 9 (Knowledge Compounder), Phase 9+++ (sqlite-vec), Phase 10a (code entities)

**Source Spec:** `docs/2026-06-04-knowledge-graph/ACC-Robust-Knowledge-Graph-Feature-Spec.md`

### MAFW Wave Plan

```
A1: Schema migration — embeddings, canonical_name, temporal columns, provenance, communities, contradictions, code entities, co-change
A2: LLM-driven extraction pipeline — replace heuristic-only Pass 1, structured JSON output with confidence
B1: Multi-factor confidence model — source credibility + corroboration + recency + agent tier
B2: Enhanced relation types — caused_by, fixed_by, similar_to, precedes, supersedes, applies_to, derived_from, exemplifies
C1: Leiden community detection — hierarchical 3-level clustering, incremental on >10% new items
C2: Community summary generation — LLM synthesis per community, stored with embeddings
D1: GraphRAG Local Search — BFS subgraph expansion from seeds, depth-2, confidence-filtered
D2: GraphRAG Global Search — community summary matching, top-3 communities → partial answers → reduce
E1: Multi-hop reasoning — recursive CTE for path queries: "find root cause of these 3 errors"
E2: Code↔knowledge bridge — tree-sitter code entities linked to knowledge items via bridge table
F1: Git co-change mining — Jaccard similarity on commit co-occurrence, >0.3 threshold
F2: Cytoscape.js KG Explorer — force-directed layout, type-colored nodes, confidence-sized, community-colored
G1: Human-in-the-loop curation — inline edit, drag-to-create edges, merge suggestions, contradiction resolution
G2: Temporal scrubber — view KG state at historical points in time
```

### QA Gate
Leiden community detection on 50K nodes completes <2 seconds. Community summaries generated with correct hierarchical structure (local → mid → global). Local search returns relevant subgraph for entity-focused query within 100ms. Global search returns synthesized answer from matched communities. Multi-hop CTE query traces error → caused_by → root cause in 3 hops. Code bridge query: "patterns for src/auth.ts" returns 3 linked items. Git co-change detected for file pairs with >0.3 Jaccard. Cytoscape.js renders 1K nodes + 2K edges <1 second with interactive force layout.

**Milestone:** After every completed feature, knowledge items appear with embeddings, community membership, and multi-factor confidence. Knowledge graph is visualizable, searchable, and bridgeable to code. GraphRAG queries answer both specific ("why did auth fail 3 times?") and holistic ("what's the health of this project?") questions.

---

## Phase 10c — Multi-Agent Memory Synthesis (Weeks 41–44)

**Goal:** Agents benefit from each other's discoveries in real-time. Memory becomes a coordination primitive, not just a personal notepad.

**Prerequisites:** Phase 9+++ (Memory Layer), Phase 10b (Knowledge Graph v2), Phase 10d (Control Sessions)

**Source Spec:** `docs/research/consolidation-and-recommendations.md` (Phase 4)

### MAFW Wave Plan

```
A1: Cross-agent fact surfacing — shared org_id scope, agent attribution metadata on every fact
A2: "Recent discoveries" retrieval filter — facts from other agents active in same time window
B1: Agent-to-agent memory handoff protocol — ACB signal integration, memory push via Message Bus
B2: Memory decay soft reranking — recency_factor [0.3x, 1.5x], floor preserves old knowledge
C1: Collective memory synthesis — Intelligence Layer consolidates N agents' facts into unified org view
C2: Memory inspection CLI — `acc memory list <agent>`, `acc memory search <query>`, `acc memory stats`
D1: Memory injection optimization — per-agent pre-fetch, background thread, zero-latency injection
D2: Memory quality dashboard — confidence trends, agent contribution breakdown, contradiction heatmap
E1: Memory conflict resolution — when Agent A and Agent B report conflicting facts, surface for human review
E2: Memory tier promotion — low-confidence facts promoted to medium/high when corroborated across agents
```

### QA Gate
Agent A discovers a bug in auth module → Agent B working on login flow receives the discovery within 5 seconds. Memory decay: facts accessed 30 days ago rank at 0.3x floor but still retrievable. `acc memory stats` shows per-agent breakdown: Claude 47 facts, OpenCode 32 facts, aid cod 18 facts. Cross-agent fact conflict detector flags contradictory patterns from different agents. Memory injection adds <500ms to session start time.

**Milestone:** The memory flywheel: Agent A learns something → Agent B benefits without Agent A explicitly communicating it → Knowledge Compounder extracts structured learning → Confidence rises → Learning auto-injected into future sessions → All 9 agents get smarter collectively.

---

## Phase 11 — Expansion & Architectural Gap Closure (Month 8+)

Phase 10 encompasses the v2/v3 expansion path (Section 16) and closes the architectural gaps identified in the 2026-05-02 gap assessment (gaps #4–10).

### Phase 10a — Model Registry Enhancements (Gap #9)

**Gap:** No model cost comparison in registry. The Model Registry has `model_path` and `strengths` but no cost-per-1k-tokens field. The Budget Planner can't optimize for cost — only for token limits.

```
10a-A1: cost_per_1k_input + cost_per_1k_output columns in model_registry table
10a-A2: Model comparison view — side-by-side cost, context window, latency, strengths
10a-B1: Budget Planner cost optimization — cheapest model that satisfies context window requirements
10a-B2: Cost projection on Task Router — estimated cost displayed alongside confidence label
```

**QA Gate:** Model cost data populated for all registered models. Budget Planner suggests cheapest viable model for a given task. Cost projection updates in real time as user changes task scope.

### Phase 10b — Per-Provider Cost Aggregation (Gap #8)

**Gap:** No cross-provider cost view. `token_usage` table tracks `tokens_in`/`tokens_out` but has no cost field.

```
10b-A1: cost_est field in token_usage + cost_log table (provider, date, model, tokens, cost)
10b-A2: Provider cost aggregation view — "this month: $12.40 OpenRouter + $20 Claude Pro"
10b-B1: Historical cost charts (daily/weekly/monthly) + per-project breakdown
10b-B2: Budget alert — "OpenRouter spend at 80% of monthly cap"
```

**QA Gate:** Cost aggregation view shows accurate breakdown by provider and model. Historical charts render correctly. Budget alert fires at configurable threshold.

### Phase 10c — Token Budget Reallocation (Gap #10)

**Gap:** No budget rollover/borrowing between agents in a wave. If A1 finishes 40% under budget and A2 is at 95%, A2 still halts.

```
10c-A1: budget_pool table — wave-level token pool with per-agent allocation + reserve
10c-A2: Reallocation engine — if agent finishes under budget, unused tokens flow to remaining agents
10c-B1: Threshold adjustment — 95% halt threshold dynamically raised if pool has surplus
10c-B2: Reallocation UI — live pool balance, per-agent allocation delta, reallocation log
```

**QA Gate:** Agent A1 finishes under budget → A2 and A3 receive proportional allocation increases. 95% halt fires only when pool-wide reserve is exhausted. UI shows real-time pool rebalancing.

### Phase 10d — Control Session Abstraction & Parallel Wave Orchestrations (Gaps #4–7)

**Gaps closed:** Multiple parallel wave orchestrations (#4), Control Session abstraction (#5), swarm-based parallel product threads (#6), cross-thread conflict detection (#7).

This is the most architecturally significant Phase 10 sub-phase. It requires Wave Orchestrator (Phase 5), ACB (Phase 5+), Token Budget System (Phase 9++), and Knowledge Compounder (Phase 9) to all be complete first.

**Required architectural changes:**

1. `feature_plans` concurrency support — allow multiple plans in `executing` state per project
2. Docs scope isolation — per-thread `docs/THREAD_ID/YYYY-MM-DD-slug/`
3. Per-thread file watchers — scoped to each thread's docs folder
4. Cross-thread conflict detection — file ownership registry; if Thread A claims `src/auth.ts`, Thread B is warned
5. Control Session promotion — right-click panel → "Promote to Control Session" → panel header shows 🎯 badge → embedded mini wave grid
6. Global budget view across threads — aggregate token usage across all active control sessions

```
10d-A1: feature_plans schema refactor — multi-plan concurrency + thread_id column
10d-A2: Control Session state machine — promoted/active/paused/completed per-agent-panel
10d-B1: Docs scope isolation — per-thread docs/ directory, per-thread fs.watch scoping
10d-B2: Cross-thread conflict detector — file ownership registry + conflict warning UI
10d-C1: Control Session promotion UI — right-click → promote, 🎯 badge, embedded mini wave grid
10d-C2: Per-thread Handoff Monitor + Correction Loop (scoped to thread, not global)
10d-D1: Global budget view — aggregate token usage across all active control sessions
10d-D2: Thread lifecycle management — pause/resume/terminate individual threads
10d-E1: Swarm-based parallel product threads — multiple autonomous orchestration threads
      with independent dependency graphs, handoff queues, and budgets
```

**QA Gate:** Two control sessions execute parallel waves simultaneously with zero interference. Cross-thread conflict detector correctly warns when Thread B touches a file claimed by Thread A. Per-thread docs folders are isolated and correctly scoped. Global budget view aggregates token usage from both threads accurately. Thread pause/resume preserves dependency graph state and handoff queue.

### Expansion Path — v2 (Team Product)

- Supabase backend: cloud sync of playbooks, outcomes, presets, and knowledge base across team
- Team workspace with shared playbook library, knowledge base, and access control
- Web version: Next.js frontend + Supabase (no Tauri required for web users)
- SSO / OAuth for organization login
- LLM-assisted Task Router v2 (full Claude API reasoning)
- Semantic search in Knowledge Panel via local embedding model (Ollama)

### Expansion Path — v3 (Platform)

- `.acc` playbook marketplace: publish, discover, install agent workflows including knowledge items
- MCP discovery registry: browse and one-click install MCPs
- Client portal: share session replays and knowledge exports as read-only links
- API: external tools query ACC's outcome data and knowledge base
- Linear + additional connector expansion

### Commercial Strategy

**Edge8 Internal Value (Immediate)**
- Every client project gets a `.acc` playbook — onboarding new team members takes minutes
- Lark connector loop eliminates the human relay on repetitive feature requests
- Session replay + feature doc generator produces client deliverables automatically
- Outcome tracker builds a real evidence base for which AI approaches work per domain
- Supabase safe-by-default prevents accidental data loss on client databases
- Knowledge Compounder builds Edge8's institutional knowledge automatically

**Commercial Angles**
- **Developer Tool (OSS + Pro):** Open-source runner and asset manager. Pro tier includes connector loop, wave orchestrator, team playbooks, knowledge base. $15–29/month per developer
- **Enterprise White-Label:** Branded ACC for client stacks, managed setup, pre-built playbooks per engagement, priced per engagement or per seat
- **Playbook Marketplace:** Developers publish `.acc` bundles for specific stacks, revenue share, network effects
- **AI Consulting Evidence Layer:** Outcome data, session replays, and knowledge base as evidence of AI delivery quality
- **Knowledge as a Product:** Verified patterns, runbooks, and anti-patterns as premium `.acc` knowledge bundles

**OpenClaw Integration (Distribution)**
Register ACC as an OpenClaw skill — 247k+ users can invoke `@acc` from WhatsApp or iMessage. OpenClaw routes the conversation; ACC executes the coding agent workflow.

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

---

*Roadmap extracted from ACC-Complete-Project-Documentation-v2.7.md (Sections 15–16). Gap assessment incorporated from ACC-Gap-Assessment.md (2026-05-02). Market gap analysis from `docs/2026-06-02-gap-analysis/02-market-gap-analysis.md` (2026-06-03) integrated for market context notes on Phases 5, 9, 9++, 10+, 10a–10c, 11. SkillBridge integration milestones incorporated from SkillBridge Compatibility Assessment (Section 5.5). Memory layer phases (9+++, 10a–10c) added from memory architecture research (2026-06-04).*
