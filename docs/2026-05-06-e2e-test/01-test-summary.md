# 01 — Test Summary

## Build & Launch

| Test | Result | Detail |
|------|--------|--------|
| Frontend build (`tsc && vite build`) | PASS | 1677 modules, 21.78s, 802KB JS bundle |
| Rust compilation (`cargo check`) | PASS | 17 dead-code warnings, no errors |
| Smoke test (`smoke-test.sh`) | 7/7 PASS | Python syntax, YAML, Rust, TypeScript, daemon, plist — all valid |
| Tauri desktop launch (`npx tauri dev`) | PASS | Window created 1400x900, SQLite initialized, Vite at :1420 |
| Vite dev server (port 1420) | PASS | 200 OK, React SPA loaded, routing functional |
| Zero React render crashes | PASS | All 14 routes mount without React error boundaries |

## Module-by-Module Results

| # | Module | Route | Renders | Console Errors | Tauri Calls | Verdict |
|---|--------|-------|---------|----------------|-------------|---------|
| 1 | Runner | `/runner` | Yes | 0 | spawn/kill/write | OK |
| 2 | Route | `/route` | Yes | 1 (on click) | route_task | BUG #2 |
| 3 | Orchestrate | `/orchestrate` | Yes | 0 | create_plan | OK |
| 4 | Handoffs | `/handoffs` | Yes | 1 (on click) | none (pure UI) | BUG #2 |
| 5 | Messages | `/messages` | Yes | 2 (on mount) | getOpenSignals | BUG #1 |
| 6 | Assets | `/assets` | Yes | 0* | scan/write | BUG #5 |
| 7 | Outcomes | `/outcomes` | Yes | 2 (on mount) | getOutcomeStats | BUG #1 |
| 8 | Replay | `/replay` | Yes | 2 (on mount) | getFailureAnalyses | BUG #1 |
| 9 | Playbooks | `/playbooks` | Yes | 2 (on mount) | getMemoryCandidates | BUG #1 |
| 10 | Connectors | `/connectors` | Yes | 0* | save/toggle configs | BUG #5 |
| 11 | Knowledge | `/knowledge` | Yes | 0 | delete_knowledge_item | OK |
| 12 | Scheduler | `/scheduler` | Yes | 0 | crud cron jobs | OK |
| 13 | Costs | `/costs` | Yes | 0* | get_cost_data | BUG #5 |
| 14 | Settings | `/settings` | Yes | 0 | none (pure UI) | OK |

*Shows raw error text inline rather than console-only.

## Interactive Feature Tests

| Feature | Result | Notes |
|---------|--------|-------|
| Task Router: text input enables button | PASS | "Route Task" disabled→enabled on text entry |
| Task Router: click Route Task | FAIL | Triggers Tauri invoke, fails silently |
| Orchestrate: slug input enables Create Plan | PASS | Button enables when slug text entered |
| Orchestrate: click Create Plan | FAIL | Triggers Tauri invoke, fails silently |
| Handoffs: fill all form fields | PASS | All 8 inputs accept text |
| Handoffs: click Generate Handoff | FAIL | Triggers Tauri invoke, fails silently |
| Theme toggle: Dark → Light | PASS | Body background changes correctly |
| Theme toggle: Light → Dark | PASS | `rgb(6, 4, 15)` dark background confirmed |
| Settings: appearance defaults | PASS | Theme radio, font size combobox functional |
| Settings: agent defaults | PASS | Agent/model dropdowns populated, Save/Reset buttons present |
| Settings: integration status | PASS | SkillBridge/Supabase/GitHub show "Connected" |
| Settings: About info | PASS | Version 0.9.0, Build 5/6/2026, Environment: Development |
| Playbooks: Export checkboxes | PASS | Skills/Memory/Presets checkboxes toggleable |
| Playbooks: Import drop zone | PASS | File selector button present |
| Playbooks: Feature Docs buttons | PASS | 4 doc type buttons rendered (EXECUTIVE PLAN, CHANGELOG, QA REPORT, TECHNICAL PLAN) |

## Backend Verification

- **50+ Tauri commands** declared in `src-tauri/src/commands.rs`
- **~25 frontend invoke calls** across 7 Zustand stores
- **SQLite database** initialized on launch with 4 migration files
- **Rust modules**: control, orchestrator, routing, intelligence, assets, integrations, knowledge, scheduler, budget, acb, backward_channel, skillbridge, playbook, events, db, pty

## Environment

- **OS:** macOS (darwin)
- **Node:** Vite 6.4.2 / TypeScript 5.7 / React 19
- **Rust:** Tauri v2, edition 2021
- **Test browser:** Playwright (Chromium)
- **ACC version:** 0.9.0 (Development)
