# PLAN: ACC Intelligence Layer — Phase 3

**Date:** 2026-05-02
**Target:** Outcome tracking, failure diagnosis, session replay, token guard, heartbeat

## Modules Implemented

| Module | Name | Components |
|--------|------|------------|
| 4 | Outcome Tracker | Record outcomes, aggregate stats per agent/task, success rate dashboard |
| 7 | Failure Analyzer | Create/query/stored diagnosis, PTY excerpt storage, structured JSON results |
| 18 | Token Guard | 15+ known limit patterns, limit event recording, resolution pipeline |
| 19 | Session Heartbeat | Health states (HEALTHY/THINKING/STALLED/CRASHED/UNRESPONSIVE), PID check, activity probe |

## Intelligence Layer Modes

- Mode 1: OpenRouter HTTP (ureq-based prompt builder)
- Mode 2: Non-interactive agent spawn (via existing PTY manager)
- Mode 3: Interactive panel designation (via existing Runner)

## Source Files

### Backend
- `src-tauri/src/intelligence.rs` — 12 functions, 8 structs
- `src-tauri/src/commands.rs` — 11 new Tauri commands

### Frontend
- `src/stores/intelligenceStore.ts` — 13 async actions
- `src/pages/Outcomes.tsx` — Outcome dashboard with sort/filter/success bars
- `src/pages/Replay.tsx` — Session Replay with failure analysis detail view
- `src/components/ui/badge.tsx` — shadcn/ui Badge component
- `src/components/ui/card.tsx` — shadcn/ui Card component
