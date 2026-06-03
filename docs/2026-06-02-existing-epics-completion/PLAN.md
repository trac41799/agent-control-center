# PLAN: ACC Existing Epics Completion — Wave 6

**Date:** 2026-06-03
**Target:** Close remaining runtime gaps from the 2026-06-02 codebase audit and lock down a clean, testable build
**Source spec:** `docs/2026-06-02-gap-analysis/01-existing-epics-gap-analysis.md`

---

## Problem Statement

The full-codebase audit (`01-existing-epics-gap-analysis.md`) identified the application as 14 epics complete, 4 partial, 0 not-started, with the frontend and Rust backend code-complete. However:

1. Migration `008_control_sessions.sql` was missing from the migrations directory; the `control_sessions` table was being created via an inline `CREATE TABLE IF NOT EXISTS` fallback inside `control.rs::promote_to_control`. That is a hidden bootstrap path that bypasses the migration framework.
2. `Cargo.toml` did not list a `zip` crate, while `playbook.rs` exports `.acc` zip bundles. The W4 playbook export code uses a custom hand-rolled writer, but the gap analysis flagged the missing dependency as a runtime risk.
3. `controlStore.ts` invoked `get_control_sessions_cmd`, a Tauri command that does not exist. The Tauri command surface for `control.rs` was never wrapped in `#[tauri::command]` functions.
4. The Rust integration test suite was referenced in the audit (39 tests claimed) but was not present on disk in a single `tests/integration_tests.rs` file. Only stub test scaffolding existed.
5. `smoke-test.sh` had drifted to 7 check groups that were stale with respect to current file layout.
6. The 4 "partial" epics (13, 16, 17, 18) had data model + state machine code but no coverage in the test suite for their newly added code paths.

## Target State

After Wave 6, the working tree must have:

- A real, registered `008_control_sessions.sql` migration loaded in `db.rs::init_db` and `db.rs::init_db_path`
- No `todo!()` or `unimplemented!()` calls anywhere in `src-tauri/src/`
- A `tests/integration_tests.rs` file with 39 `#[test]` functions covering DB, ACB, Knowledge, Routing, Orchestrator, Events, Intelligence, Budget, Control Sessions
- A `smoke-test.sh` covering Rust modules, migration files, frontend, npm lint, npm build, and vitest
- `npm run build`, `npm run lint`, and `npm test` all green from a clean working tree
- A clear handoff of what is **not** in scope: Docker/Azure deployment, Lark/Slack/Jira connectors, semantic routing v1.5, multi-thread concurrent orchestration, cost aggregation, token reallocation, web/mobile clients — all explicitly deferred per ADR-011/ADR-013

## Work Item Table

| Agent | Task | Depends On | Files |
|-------|------|------------|-------|
| W6.A  | Close remaining runtime gaps: create migration 008, add zip crate, wire controlStore.ts to real Tauri commands, fix inline bootstrap in control.rs, restore `ControlSession` export type | — | `src-tauri/migrations/008_control_sessions.sql`, `src-tauri/Cargo.toml`, `src-tauri/src/db.rs`, `src-tauri/src/control.rs`, `src/stores/controlStore.ts` |
| W6.B  | Build Rust integration test suite (39 `#[test]` functions across 9 modules) + `tempfile` dev-dep + `pub` exposure of `jaccard_similarity` + expand `smoke-test.sh` to 9 check groups | W6.A | `src-tauri/tests/integration_tests.rs`, `smoke-test.sh`, `src-tauri/Cargo.toml`, `src-tauri/src/knowledge.rs` |
| W6.C  | Final build verification (npm build, npm lint) + project status summary + identify known blockers | W6.A, W6.B | `docs/2026-06-02-existing-epics-completion/handoffs/W6.C-final-verification-handoff.md` |
| QA    | Independent re-verification of the plan from a clean read: re-run build/lint/test, count modules/migs/tests, check for stubs, check Cargo.toml, check `db.rs` migration loading | W6.A, W6.B, W6.C | `QA_REPORT.md` (this folder) |

## Scope Boundaries

### In Scope

- Migration 008 creation and wiring
- Adding `zip = "2"` to `Cargo.toml`
- Aligning `controlStore.ts` invoke calls with the real Tauri command surface
- Writing 39 Rust integration tests using in-memory SQLite + `tempfile`
- Expanding `smoke-test.sh`
- Verifying `cargo check` is the only env-blocker (not a code issue)

### Out of Scope (Explicitly Deferred)

- Docker/Azure container build for agents (Epic 1, US-101–US-106) — Phase 10+
- Lark/Slack/Jira connectors (Epic 13, US-1301–US-1306) — deferred per ADR-011
- Semantic routing v1.5 (Ollama embedding upgrade) — v1.5 roadmap
- Multi-thread parallel orchestration (Epic 16 concurrency) — Phase 10+
- Per-provider cost aggregation dashboard (Epic 17, US-1701) — Phase 10+
- Pool-wide token reallocation (Epic 17, US-1702/1703) — Phase 10+
- Playbook cloud sync / team workspace (Epic 11, US-1101/1102) — v2
- Web version (Next.js + Supabase) — v2
- Mobile companion / OpenClaw — not in current roadmap

## Test Strategy

| Layer | Tool | Coverage |
|-------|------|----------|
| Rust unit/integration | `cargo test` (env-blocked) | 39 tests, source-level review only |
| TypeScript compile | `tsc && vite build` | full strict mode, 1682 modules |
| ESLint | `eslint .` | 0 errors, 0 warnings |
| Vitest | `vitest run` | 65 tests across 8 files |
| Smoke | `bash smoke-test.sh` | 9 check groups (file structure, Rust sanity, Python syntax, npm lint, npm build, vitest) |

## Working Directory

`D:\TRANSFER DATA\Coding\OpenCode\agent-control-center`

## Definition of Done

- [x] `npm run build` exits 0
- [x] `npm run lint` exits 0
- [x] `npm test` shows 65 / 65 passing
- [x] `src-tauri/tests/integration_tests.rs` contains 39 `#[test]` functions
- [x] `src-tauri/migrations/008_control_sessions.sql` exists and is loaded in `db.rs`
- [x] `Cargo.toml` lists `zip`, `tempfile`, `tokio-cron-scheduler`, `ureq`
- [x] `src-tauri/src/**/*.rs` contains 0 `todo!()` or `unimplemented!()` macros
- [x] `smoke-test.sh` is present with 9 check groups
- [ ] `cargo check` / `cargo test` — env-blocked (Windows 10 SDK missing); no code-side blocker
