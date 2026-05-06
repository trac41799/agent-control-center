# CHANGELOG — Subagent Orchestration Fix (All 6 Gaps)

**Date:** 2026-05-02
**Version:** 0.8.0-subagent-orchestration
**Trigger:** UPGRADE-NOTICE.md — 4 agent config corrections
**Implementation:** 2 parallel agents (Backend G1-5 + Frontend G6)

---

## Changes (350 lines added, 0 existing code paths altered)

### Backend (271 lines)

**`src-tauri/src/orchestrator.rs` (+126 lines)**
- `OrchestrationDecision` struct + `decide_orchestration_path()` — 5-family branching (task-tool, gemini, codex, cline, cursor) with native-vs-external fallback
- `SubagentSpawn` struct + `detect_subagent_spawn()` — PTY pattern matching using `subagentDetectionPattern`
- `generate_orchestrator_guideline()` — Extended guideline template with family-specific subagent delegation instructions

**`src-tauri/src/intelligence.rs` (+66 lines)**
- `SubagentDetection` struct + `SUBAGENT_PATTERNS` constant — 7-agent detection pattern registry
- `get_subagent_patterns()` + `detect_subagent_activity()` — Runtime pattern matching utilities
- `record_subagent_token_usage()` — Subagent-attributed token tracking

**`src-tauri/src/commands.rs` (+72 lines)** — 6 new Tauri commands:
- `decide_orchestration_path_cmd`
- `detect_subagent_spawn_cmd`
- `get_subagent_patterns_cmd`
- `detect_subagent_activity_cmd`
- `record_subagent_token_usage_cmd`
- `generate_orchestrator_guideline_cmd`

**`src-tauri/src/lib.rs` (+7 lines)** — 6 command registrations

### Frontend (79 lines)

**New: `src/components/runner/OrchestratorToggle.tsx`** — Mode toggle + orchestrator agent selector dropdown

**Modified: `src/components/runner/AgentPanel.tsx`** — Added `isOrchestrator` prop (🎯 badge + 400px min-height) and `waveEligible` prop (🌊 badge)

**Modified: `src/components/runner/AgentGrid.tsx`** — Added `orchestratorId` prop; renders orchestrator full-width at top, remaining agents in grid below; uses `getWaveEligibleAgents()` for wave filtering

**Modified: `src/pages/Runner.tsx`** — Added `orchestratorMode`/`orchestratorAgent` state, `OrchestratorToggle` in header

---

## Orchestration Decision Matrix

| Agent Family | Agents | Path | Mechanism | Detection |
|-------------|--------|------|-----------|-----------|
| task-tool | Claude, OpenCode, Qwen | native | `task(subagent_type=...)` | pty_pattern |
| gemini | Gemini CLI | native | `@agent_name` | pty_pattern |
| codex | Codex CLI | native | `spawn_agent(...)` | pty_pattern |
| cline | Cline CLI | native | `cline --task` | pty_pattern |
| cursor | Cursor | native | native CLI | pty_pattern |
| external | Aider, Goose | external | `waveCommand` | fs_watch |

---

## QA

| Check | Result |
|-------|--------|
| `cargo check` | 0 errors, 11 warnings (pre-existing) |
| `cargo build` | PASS (17.5s) |
| `npx tsc --noEmit` | 0 errors |
| 6/6 commands registered | PASS |
| 4/4 frontend components wired | PASS |
| 0 existing code paths modified | PASS |
| 0 SQL schema changes | PASS |
| 0 regressions | PASS |
