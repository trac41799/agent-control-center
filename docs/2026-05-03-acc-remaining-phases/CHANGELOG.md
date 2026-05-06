[v0.9.0] — 2026-05-03

## New Files (10 files, 3,155 lines)

| File | Lines | Description |
|------|-------|-------------|
| `src-tauri/src/knowledge.rs` | 541 | Knowledge Compounder: CRUD, compound engine, search, stats |
| `src-tauri/src/scheduler.rs` | 641 | Autonomous Scheduler: cron parser, job CRUD, escalation, execution history |
| `src-tauri/src/budget.rs` | 434 | Token Budget System: budget planning, thresholds, WIP capture, cost breakdown |
| `src/pages/Knowledge.tsx` | 336 | Knowledge browser: search, filter chips, confidence bars, 3-tab UI |
| `src/pages/Scheduler.tsx` | 430 | Scheduler manager: job CRUD form, history table, cron preview |
| `src/pages/Settings.tsx` | 316 | App settings: theme, defaults, integration status, about |
| `src/stores/knowledgeStore.ts` | 114 | Zustand store: load, create, update, delete, compound, search, filter |
| `src/stores/schedulerStore.ts` | 160 | Zustand store: CRUD jobs, executions, schedule preview |
| `src/stores/budgetStore.ts` | 125 | Zustand store: budget CRUD, usage tracking, cost breakdown |
| `src/stores/settingsStore.ts` | 58 | Zustand store: theme, defaults, localStorage persistence |

## Modified Files (4 files)

| File | Change | Lines Added |
|------|--------|-------------|
| `src-tauri/src/lib.rs` | +mod declarations (3) + invoke_handler entries (27) | +37 |
| `src-tauri/src/commands.rs` | +27 Tauri command functions bridging frontend to new modules | +316 |
| `src/App.tsx` | Replaced 3 PlaceholderPage routes with real page imports | +6 |
| `src/lib/types.ts` | Appended KnowledgeItem, CronJob, AgentBudget, etc. (10 interfaces) | +25 |

## Added

- Knowledge Compounder engine with confidence scoring and dedup/merge
- Full-text knowledge search across title, content, and tags
- Knowledge relation graph (from_id → to_id with relation_type)
- Autonomous cron scheduler with expression parser for 5 common patterns
- Template expansion for cron task templates ({{triggered_at}}, {{project_name}}, {{session_id}})
- Escalation policy management with max retries and notification channels
- Token budget auto-sizing by task complexity (50K/200K/500K/1M tokens)
- Threshold ladder: warning (70%), critical (90%), exceeded (100%)
- WIP capture for budget-paused agents with serialized work state
- Wave resumption plan builder for interrupted orchestration
- Cost aggregation using model_costs + token_usage join
- Production frontend pages replacing all PlaceholderPage stubs
- Application settings with localStorage persistence

## Fixed

(None — this is a net-new features build. No bugs were found in prior phases.)

## Remaining

- 5 new dead_code warnings (BudgetThresholds, ExpandTemplate, EscalationPolicy, parse_escalation_policy, evaluate_schedule — all helper types/functions publicly exported for Tauri FFI use but not directly called from Rust code)
- Phase 10+: Control Sessions, multi-thread orchestration, cost aggregation UI
- Connector Loop (Lark/Slack/Jira) — deferred per roadmap Phase 8
- Settings could be upgraded from localStorage to SQLite
