# TECHNICAL_PLAN — Remaining Phases 9–10+

**Date:** 2026-05-03
**Motivation:** Close all remaining DB-to-backend gaps and PlaceholderPage stubs to achieve 13/13 route completion.

---

## Architecture Comparison

### Before
All 3 placeholder routes rendered the same 15-line stub. Four DB-backed subsystems had no backend logic:

```
/knowledge  → PlaceholderPage  | knowledge_items     → no backend
/scheduler  → PlaceholderPage  | cron_jobs           → no backend
/settings   → PlaceholderPage  | agent_budgets       → partial (intelligence.rs only)
                               | wave_resumption_plans → no backend
```

### After
Three new Rust modules (1,616 lines), three frontend pages (1,082 lines), four stores (457 lines):

```
knowledge.rs ──→ Knowledge.tsx ──→ knowledgeStore.ts
  │ +9 commands
scheduler.rs ──→ Scheduler.tsx ──→ schedulerStore.ts
  │ +9 commands
budget.rs ─────→ (Orchestrate integration) ──→ budgetStore.ts
  │ +9 commands
                Settings.tsx ──→ settingsStore.ts (localStorage)
```

---

## Component Specs

### knowledge.rs (541 lines)

**Purpose:** Knowledge Compounder engine. Extracts patterns, fixes, and insights from agent sessions and compounds them into a searchable knowledge graph.

**Structs:**
```
KnowledgeItem { id, type, title, content, tags, stack_tags, agent_tags,
  project_id, session_ids, plan_ids, confidence, confirmation_count,
  is_global, first_seen, last_confirmed, status, pending_task_data }
KnowledgeRelation { from_id, to_id, relation_type, created_at }
KnowledgeQuery { q, stack, agent, project_id, type, status, min_confidence,
  is_global, limit, offset }
KnowledgeItemInput { type, title, content, tags?, stack_tags?, agent_tags?,
  project_id?, session_ids?, plan_ids?, is_global? }
KnowledgeItemUpdate { title?, content?, tags?, confidence?, status?, ... }
```

**Functions:**
- `create_knowledge_item(db, &KnowledgeItemInput)` → INSERT with UUID + timestamps
- `get_knowledge_items(db, &KnowledgeQuery)` → Dynamically built WHERE clauses, ORDER BY confidence DESC
- `update_knowledge_item(db, id, &KnowledgeItemUpdate)` → UPDATE only non-None fields
- `delete_knowledge_item(db, id)` → DELETE CASCADE to knowledge_relations
- `compound_knowledge(db, project_id?)` → Find similar items (same type + LIKE title), merge content with "\n---\n", sum confirmation_count, weighted-average confidence, deactivate superseded items
- `add_knowledge_relation(db, from_id, to_id, relation_type)` → INSERT with duplicate check
- `get_knowledge_relations(db, from_id)` → SELECT by from_id
- `search_knowledge(db, q, limit)` → LIKE '%q%' across title, content, tags
- `get_knowledge_stats(db, project_id?)` → JSON return: {total, by_type: {}, by_status: {}, avg_confidence}

**DB Schema Used:** knowledge_items (20 columns), knowledge_relations (4 columns)

**Error Handling:** All rusqlite errors mapped to String via `.map_err(|e| e.to_string())?`

---

### scheduler.rs (641 lines)

**Purpose:** Autonomous cron scheduler with job management, expression evaluation, template expansion, and execution history.

**Structs:**
```
CronJob { id, name, description?, project_id?, schedule, task_template,
  wave_preset?, auto_approve, escalation_policy, notification_channels?,
  max_correction_retries, enabled, last_run_at?, next_run_at?, created_at, updated_at }
CronJobInput { name, description?, project_id?, schedule, task_template,
  wave_preset?, auto_approve?, escalation_policy?, notification_channels?,
  max_correction_retries?, enabled? }
CronExecution { id, cron_job_id, plan_id?, status, escalation_reason?,
  escalation_source?, started_at, completed_at?, notified_at? }
EscalationPolicy { max_retries, retry_delay_minutes, notify_on_escalation,
  escalation_channels }
```

**Functions:**
- `create_cron_job(db, &CronJobInput)` → Auto-calculate next_run_at from schedule, INSERT
- `get_cron_jobs(db, project_id?, enabled_only)` → SELECT with optional filters
- `update_cron_job(db, id, &CronJobInput)` → Recalculate next_run_at if schedule changed
- `delete_cron_job(db, id)` → DELETE (cascade to executions via FK)
- `toggle_cron_job(db, id, enabled)` → UPDATE enabled + recalculate next_run_at
- `evaluate_schedule(db, id, count)` → Parse cron string, compute next N occurrence timestamps
- `get_cron_executions(db, job_id?, status?)` → SELECT with optional filters
- `record_cron_execution(db, job_id, plan_id?)` → INSERT, update parent job's last_run_at/next_run_at
- `update_cron_execution(db, id, status, completed, escalation_reason?, escalation_source?)` → UPDATE status, completed_at, escalation fields

**Cron Expression Parser:** Handles 5 common patterns:
- `"0 9 * * *"` → Daily at 9:00 AM
- `"0 9 * * 1-5"` → Weekdays at 9:00 AM
- `"0 */4 * * *"` → Every 4 hours
- `"0 0 * * 0"` → Weekly on Sunday at midnight
- `"*/30 * * * *"` → Every 30 minutes

**Template Variables:** `{{triggered_at}}`, `{{project_name}}`, `{{session_id}}`

**DB Schema Used:** cron_jobs (17 columns), cron_executions (10 columns)

---

### budget.rs (434 lines)

**Purpose:** Token budget management and cost control. Auto-sizes budgets by task complexity, monitors thresholds, captures WIP state, and builds wave resumption plans.

**Structs:**
```
AgentBudget { id, session_id?, plan_agent_id?, agent_id, task_complexity?,
  model?, budget_total, budget_used, state, wip_path?, usage_percent,
  created_at, updated_at }
BudgetInput { session_id?, plan_agent_id?, agent_id, task_complexity?,
  model?, budget_total? }
BudgetThresholds { warning_pct: 70.0, critical_pct: 90.0, halt_pct: 100.0 }
WaveResumptionPlan { id, wave_id, pending_task_id?, plan_path,
  agents_completed?, agents_wipd?, agents_pending?,
  estimated_remaining_tokens?, created_at }
CostBreakdown { model?, tokens_in, tokens_out, estimated_cost_usd }
```

**Functions:**
- `create_budget(db, &BudgetInput)` → Auto-size if budget_total not provided, INSERT
- `get_budgets(db, session_id?, plan_agent_id?, state?)` → SELECT with filters
- `update_budget_usage(db, budget_id, tokens_used)` → Increment budget_used, check thresholds, return updated state
- `capture_wip(db, budget_id, wip_path)` → Set state="exceeded", store wip_path
- `resume_budget(db, budget_id, additional_tokens)` → Add tokens to budget_total, set state="active"
- `create_resumption_plan(db, ...)` → INSERT with agent completion/pending/WIP state
- `get_resumption_plan(db, wave_id)` → SELECT by wave_id
- `get_cost_breakdown(db, session_id)` → JOIN token_usage + model_costs, compute USD cost
- `check_budget_thresholds(db)` → Find all budgets exceeding thresholds

**Budget Auto-Sizing:**
| Complexity | Default Tokens |
|------------|---------------|
| low | 50,000 |
| medium | 200,000 |
| high | 500,000 |
| extreme / None | 1,000,000 |

**Threshold Ladder:**
| Threshold | State | Action |
|-----------|-------|--------|
| >= 70% | warning | Log alert |
| >= 90% | critical | Notify, suggest WIP capture |
| >= 100% | exceeded | Halt agent, capture WIP |

**Cost Formula:** `(tokens_in/1000 * cost_per_1k_input) + (tokens_out/1000 * cost_per_1k_output)`

**DB Schema Used:** agent_budgets (12 columns), wave_resumption_plans (9 columns), model_costs (7 columns), token_usage (8 columns)

---

## Frontend Pages

### Knowledge.tsx (336 lines)
3-tab layout: Browse (search+filter+cards), Relations (table), Stats (summary cards). Uses Cards with type badges, confidence bars, and tag chips. Pattern follows Outcomes.tsx table conventions.

### Scheduler.tsx (430 lines)
2-tab layout: Jobs (CRUD table + dialog form), History (execution timeline). Form includes schedule picker, task template with variable hints, escalation policy JSON textarea. Pattern follows Playbooks.tsx.

### Settings.tsx (316 lines)
4-section page: Appearance (theme toggle, font size), Defaults (project path, agent, model), Integrations (SkillBridge/Supabase/GitHub status), About (version info). Uses localStorage-backed settingsStore.

---

## Feature Flag Wiring

No feature flags needed. All changes are net-new additive features. No existing behavior was modified.

---

## File Inventory

### New Production Files (10)
```
src-tauri/src/knowledge.rs          541 lines  Rust
src-tauri/src/scheduler.rs          641 lines  Rust
src-tauri/src/budget.rs             434 lines  Rust
src/pages/Knowledge.tsx             336 lines  TypeScript/React
src/pages/Scheduler.tsx             430 lines  TypeScript/React
src/pages/Settings.tsx              316 lines  TypeScript/React
src/stores/knowledgeStore.ts        114 lines  TypeScript
src/stores/schedulerStore.ts        160 lines  TypeScript
src/stores/budgetStore.ts           125 lines  TypeScript
src/stores/settingsStore.ts          58 lines  TypeScript
───────────────────────────────────────────────
Total: 3,155 lines
```

### Modified Files (4)
```
src-tauri/src/lib.rs               +37 lines  Rust
src-tauri/src/commands.rs          +316 lines Rust
src/App.tsx                         +6 lines  TypeScript
src/lib/types.ts                   +25 lines  TypeScript
```

---

## Model Configuration

| Agent | Model | Purpose |
|-------|-------|---------|
| A1 - Knowledge | Inherited (deepseek-v4-pro) | Knowledge CRUD + compounding |
| A2 - Scheduler | Inherited (deepseek-v4-pro) | Cron scheduler + execution tracking |
| A3 - Budget | Inherited (deepseek-v4-pro) | Budget planning + cost calculation |
| A4 - Frontend | Inherited (deepseek-v4-pro) | React pages + stores |
| B1 - Integration | Inherited (deepseek-v4-pro) | Reconciliation + QA verification |

---

## Rollback Instructions

All changes are additive. To rollback:
1. Remove `src-tauri/src/knowledge.rs`, `scheduler.rs`, `budget.rs`
2. Remove `src/pages/Knowledge.tsx`, `Scheduler.tsx`, `Settings.tsx`
3. Remove `src/stores/knowledgeStore.ts`, `schedulerStore.ts`, `budgetStore.ts`, `settingsStore.ts`
4. Restore `lib.rs`, `commands.rs`, `App.tsx`, `types.ts` from git
OR: `git revert` the commit

No database migration rollback needed (tables pre-existed and are unchanged).

---

## Compatibility Notes

- Tauri v2: Auto-converts snake_case Rust fields to camelCase TypeScript/JavaScript
- SQLite: Uses parameterized queries throughout (no SQL injection)
- Zustand v4: Immer-free, direct state mutations via set()
- React Router v6: Uses `<Route element={}>` pattern (same as existing routes)
- All new code uses UUID v4 for IDs and RFC3339 for timestamps (consistent with existing codebase)
