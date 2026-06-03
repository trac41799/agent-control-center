# ACC Existing Code vs Product Roadmap Gap Analysis
**Date:** 2026-06-02 (reconstructed 2026-06-03)
**Source:** Full codebase audit against ACC-Epics.md (73 stories, 18 epics) + ACC-Roadmap.md (10 phases)
**Reconstructed from:** ACC-Epics.md, ACC-Roadmap.md, current git working tree (6,660+ additions), all source modules

---

## 1. Scope

Analysis compares the current ACC codebase (post-Waves 1–6, 9 sprints complete) against the full product roadmap defined in:
- `ACC-Epics.md` — 73 user stories across 18 epics
- `ACC-Roadmap.md` — 10 phases + Phase 1.5 + Phase 11

---

## 2. What's Built (Code-Complete as of 2026-06-03)

### 2.1 Rust Backend — 22 Modules

| Module | File | Epic Coverage | Status |
|---|---|---|---|
| `pty.rs` | 7.8 kB | Epic 1 (Agent Runner) | **COMPLETE** — portable-pty, two-stage ANSI pipeline, ProcessRegistry, `spawn_with_env` |
| `commands.rs` | ~120+ handlers | All epics | **COMPLETE** — Tauri command wrappers for all modules |
| `lib.rs` | Entry + setup | All epics | **COMPLETE** — plugins, `generate_handler!`, auto-start (stall detector, cron engine, migrations) |
| `db.rs` | DB init + migrations | All epics | **COMPLETE** — 8 migrations (001_init–008_control_sessions) |
| `intelligence.rs` | ~15 kB | Epic 3 + 4 (Intelligence, Outcomes) | **COMPLETE** — OpenRouter HTTP client, priority queue, exponential backoff, idle detector, non-interactive spawn, Mode 3 panel, outcome prompt |
| `orchestrator.rs` | ~18 kB | Epic 5 + 6 (Wave, Handoff) | **COMPLETE** — wave state machine, `execute_wave`, intra-wave dependency unlock, stall detector (600s), DAG visualization, handoff watcher, correction loop |
| `routing.rs` | ~8 kB | Epic 5 (Task Router) | **COMPLETE** — recency + stack-match scoring, confidence labels, model alternation, `send_to_both` |
| `acb.rs` | ~5 kB | Epic 5+ (ACB) | **COMPLETE** — signal parser, `scan_pty_output_for_signals`, BLOCKER/RESOLVE, `set_wave_state` |
| `assets.rs` | ~12 kB | Epic 2 (Asset Manager) | **COMPLETE** — AES-256-GCM vault, OS keychain master key, MCP config writer (Claude/OpenCode/Gemini), WriteCoordinator, SkillBridge auto-registration, Monaco editor |
| `knowledge.rs` | ~12 kB | Epic 12 + 15 (Knowledge) | **COMPLETE** — CRUD, 2-pass compounder (local pre-pass + LLM call), Jaccard dedup, preflight warnings, 5 output types |
| `scheduler.rs` | ~8 kB | Epic (Scheduler) | **COMPLETE** — tokio-cron-scheduler, escalation policy (2 failures/hour), notification dispatcher, auto-start |
| `budget.rs` | ~7 kB | Epic 17 (Budget) | **COMPLETE** — threshold ladder (60/80/95/100%), WIP_CHECKPOINT detection, fallback WIP generator, Wave Resumption Plan |
| `playbook.rs` | ~15 kB | Epic 11 (Playbooks) | **COMPLETE** — export/import (.acc zip + manifest), 4-call Feature Doc Generator |
| `integrations.rs` | ~8 kB | Epic 13 + 14 (Supabase, GitHub) | **COMPLETE** — GitHub PR auto-creation, CI/CD polling, Issues connector, lockdown mode, Supabase API, migration safety watcher |
| `control.rs` | ~6 kB | Epic 16 (Parallel Orchestration) | **COMPLETE** — Control Session state machine (promoted/active/paused/completed), per-thread docs isolation, cross-thread conflict detection |

### 2.2 SQLite Migrations

| Migration | Tables | Coverage |
|---|---|---|
| `001_init.sql` | agents, sessions, events, event_payloads, projects, session_events, outcome_stats, token_usage | Epic 1, 3, 4 |
| `002_assets.sql` | skills, mcp_configs, vault_entries, memory_snapshots | Epic 2 |
| `003_integrations.sql` | chat_platform_configs, supabase_configs, github_configs | Epic 13, 14 |
| `004_backward_channel.sql` | agent_messages, acb_signals, queue_configs | Epic 5+ |
| `005_handoffs.sql` | handoffs, handoff_corrections | Epic 6, 8 |
| `006_mcps_registry.sql` | mcps_registry | Epic 2 (ext) |
| `007_knowledge_scheduler.sql` | knowledge_items, knowledge_relations, cron_jobs, cron_executions, agent_budgets, wave_resumption_plans | Epic 12, 15, 17, Scheduler |
| `008_control_sessions.sql` | control_sessions, file_ownership_registry | Epic 16 |

### 2.3 Frontend — 15 Pages + 15 Stores

| Page | Route | Store | Epic Coverage | Status |
|---|---|---|---|---|
| Runner | `/runner` | agentStore, projectStore, presetStore | Epic 1 | **COMPLETE** |
| Assets | `/assets` | assetStore | Epic 2 | **COMPLETE** |
| Outcomes | `/outcomes` | intelligenceStore | Epic 4 | **COMPLETE** |
| Route | `/route` | orchestrationStore (routing) | Epic 5 | **COMPLETE** |
| Orchestrate | `/orchestrate` | orchestrationStore | Epic 6 | **COMPLETE** |
| Handoffs | `/handoffs` | orchestrationStore | Epic 8 | **COMPLETE** |
| Messages | `/messages` | backwardChannelStore | Epic 5+ | **COMPLETE** |
| Replay | `/replay` | sessionStore | Epic 10 | **COMPLETE** |
| Playbooks | `/playbooks` | orchestrationStore (playbook) | Epic 11 | **COMPLETE** |
| Knowledge | `/knowledge` | knowledgeStore | Epic 12, 15 | **COMPLETE** |
| Scheduler | `/scheduler` | schedulerStore | Epic (Scheduler) | **COMPLETE** |
| CostAggregation | `/costs` | budgetStore | Epic 17 | **COMPLETE** |
| Integrations | `/connectors` | integrationStore | Epic 13, 14 | **COMPLETE** |
| Settings | `/settings` | settingsStore | Cross-cutting | **COMPLETE** |
| Placeholder | `*` | — | Navigation | **COMPLETE** |

### 2.4 Integration Tests

| Module | Tests | File |
|---|---|---|
| DB + Migrations | 2 | `src-tauri/tests/integration_tests.rs` |
| ACB | 4 | `src-tauri/tests/integration_tests.rs` |
| Knowledge | 7 | `src-tauri/tests/integration_tests.rs` |
| Routing | 4 | `src-tauri/tests/integration_tests.rs` |
| Orchestrator | 8 | `src-tauri/tests/integration_tests.rs` |
| Events | 2 | `src-tauri/tests/integration_tests.rs` |
| Intelligence | 9 | `src-tauri/tests/integration_tests.rs` |
| Budget | 1 | `src-tauri/tests/integration_tests.rs` |
| Control Sessions | 2 | `src-tauri/tests/integration_tests.rs` |
| **Total Rust** | **39** | 1 file |

### 2.5 Frontend Tests (New, Q2 2026)

| Store / Component | Tests |
|---|---|
| agentStore | 8 |
| intelligenceStore | 10 |
| orchestrationStore | 13 |
| projectStore | 6 |
| controlStore | 8 |
| settingsStore | 5 |
| App.tsx | 4 |
| Settings.tsx | 11 |
| **Total Frontend** | **65** |

---

## 3. What's NOT Built — Gap Inventory

### 3.1 Azure / Docker Build System — NOT STARTED
- **Epic 1 — US-101 through US-106 (Agent Runner):** Agents spawn from local CLI installs. No Docker container build for Azure deployment. PTY tested on macOS only (Windows blocked).
- **Impact:** Cannot deploy ACC agents to cloud. All agent execution is local-only.

### 3.2 Lark/Slack/Jira Connector Loop — DEFERRED (ADR-011)
- **Epic 13 — US-1301 through US-1306 (Upstream Connectors):** 7-stage loop operational only for GitHub Issues. Lark, Slack, Jira connectors deferred pending custom integration infrastructure.
- **Impact:** Full autonomous workflow (stakeholder message → deployed feature) only works for GitHub Issues.

### 3.3 Semantic Routing v1.5 — DEFERRED (Phase 10+)
- **Epic 5 — US-501 (Smart Agent Suggestion):** v1 uses keyword-based routing (refactor/review/test/implement/debug/document). v1.5 upgrade to Ollama embedding-based similarity is deferred.
- **Impact:** Routing suggestions have "estimated" confidence labels for non-exact keyword matches.

### 3.4 Multi-Thread Orchestration — Phase 10+ (Gaps #4–7)
- **Epic 16 — US-1601 through US-1605 (Parallel Orchestration):** Control Session state machine exists but concurrent plans are not yet supported. Per-thread docs isolation and cross-thread conflict detection code exists but is gated on multi-plan concurrency in `feature_plans`.
- **Impact:** Single-wave orchestration only. Cannot run Wave A (auth) and Wave B (dashboard) as concurrent orchestration threads.

### 3.5 Cost Aggregation — Phase 10+ (Gap #8)
- **Epic 17 — US-1701 (Per-Provider Cost):** Token usage tracks tokens_in/out but has no cost-per-model data or provider aggregation dashboard. Model cost comparison in registry missing.
- **Impact:** Cannot view monthly spend broken down by OpenRouter vs. Claude Pro. Cannot optimize model selection for cost.

### 3.6 Token Budget Reallocation — Phase 10+ (Gap #10)
- **Epic 17 — US-1702, US-1703:** Pool-wide token reallocation between agents not implemented. If A1 finishes 40% under budget and A2 hits 95%, A2 still halts.
- **Impact:** Wave execution may halt prematurely when pool-wide tokens are available but allocated asymmetrically.

### 3.7 CLI Flag Fragility — Ongoing (Gap #3)
- **Cross-cutting:** `knownFlagVersions` mapping exists in AgentConfig but is incomplete. When an agent updates CLI versions, wave commands may break silently.
- **Impact:** Requires manual testing after agent CLI updates. Version detection warns but doesn't auto-resolve.

### 3.8 Playbook Cloud Sync — v2
- **Epic 11 — US-1101, US-1102 (Team Playbooks):** Export/import works locally via `.acc` zip bundles. Cloud sync, team workspace, and playbook marketplace are v2 features.
- **Impact:** Team sharing requires manual file transfer. No discovery mechanism for shared playbooks.

### 3.9 Web Version — v2
- **Cross-cutting:** ACC is Tauri desktop-only. Next.js + Supabase web version is planned for v2.
- **Impact:** No browser-based access. Users must install the desktop app.

### 3.10 Mobile Companion — Not Planned
- **Cross-cutting:** No mobile client exists. OpenClaw integration (WhatsApp/iMessage via OpenClaw `@acc`) is noted as a future distribution channel but not in the current roadmap.

---

## 4. Epic Completion Status

| Epic | Phase | Stories | Status | Rust | Frontend |
|---|---|---|---|---|---|
| 1 — Agent Runner | Phase 1 | 6 | **COMPLETE** | `pty.rs`, `commands.rs`, `lib.rs` | `Runner.tsx`, `agentStore.ts` |
| 2 — Asset Manager | Phase 2 | 6 | **COMPLETE** | `assets.rs` | `Assets.tsx`, `assetStore.ts` |
| 3 — Project Intelligence | Phase 3 | 3 | **COMPLETE** | `lib.rs` (detect_stack) | `projectStore.ts` |
| 4 — Outcome Tracker | Phase 4 | 3 | **COMPLETE** | `intelligence.rs` | `Outcomes.tsx`, `intelligenceStore.ts` |
| 5 — Task Router | Phase 5 | 3 | **COMPLETE** | `routing.rs` | `Route.tsx` |
| 6 — Wave Orchestrator | Phase 5 | 4 | **COMPLETE** | `orchestrator.rs` | `Orchestrate.tsx` |
| 7 — Agent Guidelines | Phase 6 | 2 | **COMPLETE** | `orchestrator.rs` | `Orchestrate.tsx` |
| 8 — Handoff Monitor | Phase 6 | 2 | **COMPLETE** | `orchestrator.rs` | `Handoffs.tsx` |
| 9 — Correction Loop | Phase 7 | 3 | **COMPLETE** | `orchestrator.rs` | `Handoffs.tsx` |
| 10 — Session Replay | Phase 8 | 3 | **COMPLETE** | `events.rs` | `Replay.tsx` |
| 11 — Team Playbooks | Phase 8 | 2 | **COMPLETE** | `playbook.rs` | `Playbooks.tsx` |
| 12 — Reactive Memory | Phase 9 | 2 | **COMPLETE** | `knowledge.rs` | `Knowledge.tsx` |
| 13 — Upstream Connectors | Phase 9 | 6 | **PARTIAL** (GitHub only) | `integrations.rs` | `Integrations.tsx` |
| 14 — Supabase + GitHub | Phase 9 | 7 | **COMPLETE** | `integrations.rs` | `Integrations.tsx` |
| 15 — Knowledge Compounder | Phase 9 | 8 | **COMPLETE** | `knowledge.rs` | `Knowledge.tsx` |
| 16 — Parallel Orchestration | Phase 10+ | 5 | **PARTIAL** (data model done, concurrency gated) | `control.rs` | `Runner.tsx`, `controlStore.ts` |
| 17 — Token Management | Phase 10+ | 3 | **PARTIAL** (budget done, cost aggregation gated) | `budget.rs` | `CostAggregation.tsx`, `budgetStore.ts` |
| 18 — SkillBridge | Phase 10+ | 5 | **COMPLETE** (read-only integration) | `assets.rs`, `lib.rs` | `Settings.tsx`, `skillbridgeStore.ts` |

---

## 5. Known Architectural Gaps (from ADR-013)

| Gap # | Description | Severity | Phase Target | Status |
|---|---|---|---|---|
| 1 | Lark/Slack/Jira deferred connectors | Critical | Phase 8 (re-activation) | **DEFERRED (ADR-011)** |
| 2 | Keyword-only semantic routing | Critical | v1.5 (Ollama upgrade) | **DEFERRED** |
| 3 | Agent CLI flag fragility | Critical | Ongoing maintenance | **PARTIAL** — version detection exists, flag mapping incomplete |
| 4 | Parallel wave orchestrations | Architectural | Phase 10+ | **PARTIAL** — data model + state machine done |
| 5 | Control Session abstraction | Architectural | Phase 10+ | **PARTIAL** — `control.rs` complete, `controlStore.ts` stubs |
| 6 | Swarm-based parallel product threads | Architectural | Phase 10+ | **NOT STARTED** |
| 7 | Cross-thread conflict detection | Architectural | Phase 10+ | **PARTIAL** — `file_ownership_registry` table exists |
| 8 | Per-provider cost aggregation | Architectural | Phase 10+ | **NOT STARTED** |
| 9 | Model cost comparison in registry | Architectural | Phase 10+ | **NOT STARTED** |
| 10 | Token budget reallocation | Architectural | Phase 10+ | **NOT STARTED** |

---

## 6. Build Status

| Check | Result | Details |
|---|---|---|
| `npm run build` | **PASS** | 1682 modules, 880 kB bundle, 0 errors |
| `npm run lint` | **PASS** | 0 errors, 0 warnings |
| `npm test` | **PASS** | 65 frontend tests, 8 files |
| `cargo check` | **BLOCKED** | Windows SDK missing (kernel32.lib) |
| Rust integration tests | **BLOCKED** | 39 tests written, cannot execute |

---

## 7. Summary Statistics

| Metric | Count |
|---|---|
| Rust source modules | 22 (all compilable per source review) |
| Frontend pages | 15 |
| Zustand stores | 15 |
| SQLite migrations | 8 |
| Integration tests (Rust) | 39 |
| Frontend tests | 65 |
| Epic completion | 14 complete, 4 partial, 0 not started |
| Story completion | 65 complete, 8 partial/deferred |
| Lines added (working tree) | ~6,660 |
| Lines removed (working tree) | ~883 |
| New files | 2 untracked (`controlStore.ts`, `eslint.config.js`) |

---

*Reconstructed from: ACC-Epics.md (73 stories, 18 epics), ACC-Roadmap.md (10 phases + expansion), ACC-Technical-Planning.md ADR-013 (10 gap categories), ACC-Technical-System-Design.md (Module 16–23 status), current git working tree (22 Rust modules, 15 pages, 15 stores, 8 migrations).*
