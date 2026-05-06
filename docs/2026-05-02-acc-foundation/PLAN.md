# PLAN: ACC Foundation — Phase 1

**Date:** 2026-05-02
**Target:** Working multi-agent launcher desktop app
**Source spec:** docs/product/technical/ACC-Technical-System-Design.md

---

## Problem Statement

Zero code exists. Only docs/. Need a Tauri v2 + React 19 + Vite 6 desktop app that spawns coding agents in PTY panels with preset buttons, project switching, session logging, and SkillBridge detection.

## Target State

A macOS ARM desktop app that:
- Opens Runner grid with Claude Code + OpenCode PTY sessions
- Shows all 9 agent configs (untested agents as AgentConfig objects only)
- Fires preset commands into any PTY
- Switches projects, auto-detects stacks
- Logs session events to SQLite
- Shows SkillBridge connection status
- Has proper navigation shell (sidebar with all sections)

## Work Item Table

| Agent | Task | Depends On | Wave | Files |
|---|---|---|---|---|
| A1 | Tauri v2 scaffold + shadcn/ui + Tailwind + Zustand + React Router shell | — | A | package.json, vite.config.ts, tauri.conf.json, src-tauri/, src/ |
| A2 | Full SQLite schema: 30+ tables, WAL pragmas, 15+ indexes | — | A | src-tauri/src/db.rs, src-tauri/migrations/ |
| A3 | TypeScript types: AgentConfig, ConnectorConfig, all 9 built-in agent configs, project profile type | — | A | src/lib/types.ts, src/lib/agents/configs.ts |
| B1 | xterm.js PTY component + two-stage pipeline (ANSI strip + 60fps rate limiter) | A1, A2 | B | src/components/terminal/PtyTerminal.tsx, src/lib/pty/pipeline.ts |
| B2 | PTY spawner Rust commands (Tauri shell plugin wrapper) + process manager | A1, A3 | B | src-tauri/src/pty.rs, src-tauri/src/commands.rs |
| B3 | Zustand stores: agents, presets, projects, sessions, skillbridge | A1, A3 | B | src/stores/ |
| C1 | Runner UI: agent grid, per-panel controls, status chips, PTY output display | B1, B2, B3 | C | src/pages/Runner.tsx, src/components/runner/ |
| C2 | Preset button bar + project switcher + stack auto-detector | B3, C1 | C | src/components/runner/PresetBar.tsx, src/components/runner/ProjectSwitcher.tsx, src/lib/project/detector.ts |
| C3 | SkillBridge detector (Rust) + status bar indicator + guided onboarding UI | B2, B3 | C | src-tauri/src/skillbridge.rs, src/components/skillbridge/ |
| C4 | Session event logger + SQLite write commands for events, payloads | B2 | C | src-tauri/src/events.rs, src/lib/session/logger.ts |
| QA | Integration: wire all modules, verify PTY spawn on Claude Code + OpenCode, verify SQLite writes, npm run tauri dev check | C1, C2, C3, C4 | D | — |

## Model Strategy
- Default: `opencode/minimax-m2.5-free` for all agents
- Rate limit fallback: `opencode/qwen3.5-plus`
- QA agent uses same model

## Working Directory
`/Applications/E8/Innovations/agent-control-center`

## Test Strategy
- Agent spawns Claude Code and OpenCode → verify PTY output visible
- Preset button injects text into PTY
- Project switcher changes directory
- SQLite writes verified with direct query
- Status chips change on PTY output patterns
- SkillBridge detection runs (will return not-installed since SB not running)

## File Structure Target
```
agent-control-center/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── pages/
│   │   └── Runner.tsx
│   ├── components/
│   │   ├── terminal/PtyTerminal.tsx
│   │   ├── runner/
│   │   │   ├── AgentGrid.tsx
│   │   │   ├── AgentPanel.tsx
│   │   │   ├── PresetBar.tsx
│   │   │   ├── ProjectSwitcher.tsx
│   │   │   └── StatusChip.tsx
│   │   ├── skillbridge/
│   │   │   ├── SkillBridgeBadge.tsx
│   │   │   └── OnboardingModal.tsx
│   │   └── layout/
│   │       └── Sidebar.tsx
│   ├── lib/
│   │   ├── types.ts
│   │   ├── agents/
│   │   │   └── configs.ts
│   │   ├── project/
│   │   │   └── detector.ts
│   │   ├── pty/
│   │   │   └── pipeline.ts
│   │   └── session/
│   │       └── logger.ts
│   ├── stores/
│   │   ├── agentStore.ts
│   │   ├── presetStore.ts
│   │   ├── projectStore.ts
│   │   ├── sessionStore.ts
│   │   └── skillbridgeStore.ts
│   └── styles/
│       └── globals.css
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── db.rs
│   │   ├── pty.rs
│   │   ├── commands.rs
│   │   ├── events.rs
│   │   └── skillbridge.rs
│   └── migrations/
│       └── 001_init.sql
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
└── index.html
```
