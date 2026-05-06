# CHANGELOG — ACC Phase 1 Foundation

**Date:** 2026-05-02
**Version:** 0.1.0-foundation

---

## Added

### App Shell
- Tauri v2 + React 19 + Vite 6 + TypeScript project scaffold
- Tailwind CSS v4 with dark theme (GitHub-style #0d1117/#161b22)
- shadcn/ui components: button, input, scroll-area, separator, tooltip
- React Router v7 with 13-section sidebar (lucide-react icons)
- Zustand v5 for state management
- 1400x900 window, title "Agent Control Center"

### Database (src-tauri/)
- Full SQLite schema: 34 tables, 22+ indexes, WAL mode
- Tables: projects, agents, sessions, events, event_payloads, assets, project_assets, mcps, presets, models, outcome_stats, feature_plans, plan_agents, corrections, failure_analyses, connector_configs, detected_items, delivery_log, memory_candidates, knowledge_items, knowledge_relations, supabase_configs, github_configs, agent_messages, token_usage, limit_events, cron_jobs, cron_executions, agent_budgets, wave_resumption_plans, agent_versions, skillbridge_config, model_costs, file_ownership_registry
- WAL pragmas: journal_mode=WAL, synchronous=NORMAL, foreign_keys=ON, 32MB cache

### Backend (Rust — src-tauri/src/)
- `main.rs` — Tauri entry point with 8 plugin registrations
- `lib.rs` — App builder, invoked handler with 10 commands registered
- `db.rs` — Database init with pragmas + migration execution via `include_str!`
- `pty.rs` — PTY manager: ProcessRegistry, PtyManager with spawn/kill/write/list/get_output_receiver, tokio async process management
- `commands.rs` — Tauri commands: spawn_agent, kill_agent, write_to_agent, list_agents, get_agent_output, log_event, log_event_with_payload, get_events, get_event_detail, check_skillbridge
- `events.rs` — Event logging: log_event, log_event_with_payload, get_session_events, get_session_event_detail (12 event types)
- `skillbridge.rs` — Detection: app path check, process check, config file check → not-installed/installed/running/bridge-active

### Frontend (React/TypeScript — src/)
- `src/pages/Runner.tsx` — Main Runner page with agent spawn dropdown, preset bar, session footer
- `src/components/runner/AgentGrid.tsx` — Dynamic CSS grid (auto-fill, min 400px columns)
- `src/components/runner/AgentPanel.tsx` — Per-agent panel with PTY terminal + Kill/Restart/Clear controls
- `src/components/runner/StatusChip.tsx` — Status indicator: idle/thinking/writing/tests/done/failed/stalled
- `src/components/runner/PresetBar.tsx` — One-click command injection bar with CRUD + search
- `src/components/runner/ProjectSwitcher.tsx` — Project selector with recent paths, browse, stack badges
- `src/components/terminal/PtyTerminal.tsx` — xterm.js React wrapper with GitHub-dark theme, fit addon, ResizeObserver
- `src/components/skillbridge/SkillBridgeBadge.tsx` — Connection status indicator
- `src/components/skillbridge/OnboardingModal.tsx` — First-launch guided install modal
- `src/components/layout/Sidebar.tsx` — 13-section navigation sidebar

### Libraries (src/lib/)
- `src/lib/types.ts` — 22+ TypeScript interfaces: AgentConfig, AgentStatus, Preset, ProjectProfile, SessionEvent, SkillBridgeStatus, ConnectorConfig, WavePlan, BudgetPlan, ACBSignal, etc.
- `src/lib/agents/configs.ts` — 9 built-in AgentConfig objects: Claude Code, OpenCode, Aider, Goose, Cline CLI, Cursor, Gemini CLI, Qwen Code, Codex CLI
- `src/lib/pty/pipeline.ts` — Two-stage PTY pipeline: ANSI strip + 60fps rate-limited dispatch
- `src/lib/pty/types.ts` — Pipeline and PipelineConsumer interfaces
- `src/lib/pty/commands.ts` — TypeScript wrappers for Tauri invoke: spawnAgent, killAgent, writeToAgent, listAgents, getAgentOutput
- `src/lib/project/detector.ts` — Stack auto-detection: Node.js, Python, Rust, Go, PHP, Supabase, GitHub Actions
- `src/lib/session/logger.ts` — Event logging API with event type constants
- `src/lib/commands/skillbridge.ts` — SkillBridge detection TypeScript wrapper

### State (src/stores/)
- `agentStore.ts` — Agent sessions, spawn/kill/write/status/output (ring buffer, 1000 lines)
- `presetStore.ts` — Preset CRUD with 5 defaults (Fix Tests, Review Code, Lint, Commit, Deploy Staging)
- `projectStore.ts` — Current project, recent projects, stack detection
- `sessionStore.ts` — Event log, session management
- `skillbridgeStore.ts` — SkillBridge status, version, relay/mcp URLs, onboarding state

---

## Build Verification

```
cargo check: ✅ passes (3 warnings, 0 errors)
npx tsc --noEmit: ✅ passes (0 errors)
Frontend source files: 35
Rust source files: 7
SQLite tables: 34
SQLite indexes: 22+
Tauri plugins: 8 (shell, sql, fs, store, dialog, notification, http, log)
Agent configs: 9 (5 untested — requires CLI installation)
```

---

## Known Limitations

- 5 of 9 agent CLIs not installed on build machine (Aider, Goose, Cline, Cursor, Gemini, Codex, Qwen) — AgentConfig objects exist but PTY spawn cannot be live-tested
- macOS ARM only — cross-platform PTY validation not performed
- Runner page not wired into React Router — needs manual App.tsx update to replace placeholder
- TypeScript strict mode has `noUnusedLocals: true` — all clean after cleanup pass
- `check_skillbridge` Tauri command registered but returns `SkillBridgeInfo` type — needs explicit import in commands.rs from skillbridge module; currently shows dead_code warning
