# PLAN: Market Gap Response — Knowledge Compounder UX & Competitive Positioning

**Date:** 2026-06-03
**Target:** Strengthen ACC's strongest defensible moat (Knowledge Compounder) with UX enhancements informed by the 2026-06-02 competitive analysis, and embed competitive positioning into the product documentation and UI.
**Source spec:** `docs/2026-06-02-gap-analysis/02-market-gap-analysis.md`
**Analysis of:** 13 GitHub repos + existing applications; 8 uncontested features identified; 0 competitors with equivalent Knowledge Compounder

---

## Problem Statement

The market gap analysis of 13 competitor products (2026-06-02) revealed that **Knowledge Compounding is ACC's strongest defensible moat** — Ruflo is the only competitor with any knowledge accumulation (Claude-only, 1-pass, vector DB), and zero competitors have 2-pass compounding, confidence scoring, contradiction detection, or preflight warnings. The compounding flywheel (more sessions → smarter agents → more sessions) cannot be replicated without both multi-agent data and the Compounder architecture.

However, the Knowledge Compounder's UX currently under-communicates its value:

1. **Compounder requires manual trigger** via "Run Compounder" button — ADR-009 specifies async auto-trigger post-Feature Doc generation, but the Knowledge page UX doesn't surface results proactively when they arrive (no badge, no toast, no timeline of compounder runs).
2. **Knowledge items lack "why this matters" framing** — users see a list of patterns but no narrative about how the knowledge base is making their agents smarter over time.
3. **Zero competitive positioning in the UI** — none of ACC's 8 uncontested features are messaged to the user. The app doesn't tell users what makes it different from the 13 alternatives they could be using.
4. **Product documents were updated** (ACC-Product-Overview, ACC-Roadmap, ACC-Technical-Planning, ACC-Epics) with competitive matrix, uncontested features table, market validation notes, and per-epic market positioning. These updates need to be cross-referenced and validated.
5. **Knowledge Compounder test coverage** — the frontend knowledgeStore and Knowledge page have 0 dedicated Vitest tests. The Rust backend has 7 integration tests for knowledge.rs but no frontend test coverage for the compounder UX flow.

## Target State

After this work, the working tree must have:

- **Knowledge Compounder UX v1.5**: auto-trigger status surfaced in the Knowledge page (timeline of compounder runs, "new items available" badge, last-run timestamp), compounder health indicator, flywheel visualization showing knowledge growth over time
- **Competitive positioning UI**: a "Why ACC?" section in Settings or a dedicated positioning component that surfaces the 8 uncontested features, Tauri v2 advantage (~10MB vs 150MB+), and ACC's unique intersection of orchestration + knowledge + desktop + collaboration
- **Frontend test coverage**: 12+ Vitest tests for knowledgeStore (compounder lifecycle, preflight loading, item CRUD, confidence scoring display) and 6+ component tests for the Knowledge page (compound dialog, preflight tab, stats rendering)
- **Rust backend validation**: 3 additional integration tests covering `run_compounder` auto-trigger, `get_preflight_warnings` stack filtering, and `get_knowledge_stats` accuracy
- **Product docs cross-reference**: all 4 updated docs validated for consistency (epic count, phase references, market positioning language)
- **`npm run build`, `npm run lint`, `npm test`** all green

## Work Item Table

| Agent | Task | Depends On | Files | TDD Order |
|-------|------|------------|-------|-----------|
| MGR.A | Product doc cross-reference validation: verify all 4 updated docs are internally consistent (epic counts, phase refs, market language). Create `CHANGELOG.md` for this incident. | — | `docs/product/overview/ACC-Product-Overview.md`, `docs/product/planning/ACC-Roadmap.md`, `docs/product/planning/ACC-Technical-Planning.md`, `docs/product/requirements/ACC-Epics.md`, `docs/2026-06-03-market-gap-response/CHANGELOG.md` | — |
| MGR.B | Knowledge Compounder UX v1.5: auto-trigger status badge, compounder timeline, flywheel stats, "new items" indicator, last-run timestamp, compounder health indicator | MGR.A | `src/pages/Knowledge.tsx`, `src/stores/knowledgeStore.ts`, `src/lib/types.ts`, `src-tauri/src/knowledge.rs` (add `get_compounder_status` command) | **Write tests first** → implement → verify |
| MGR.C | Competitive positioning: Settings "Why ACC?" panel with uncontested features, Tauri v2 size advantage, market position visualization | MGR.A | `src/pages/Settings.tsx`, `src/components/layout/Sidebar.tsx` (optional nav entry), new `src/components/PositioningPanel.tsx` | **Write tests first** → implement → verify |
| QA | Independent verification: re-run build/lint/test, validate 12+ new frontend tests pass, validate 3 new Rust tests, validate doc cross-references, smoke-test Knowledge page UX, validate flywheel stats accuracy | MGR.A, MGR.B, MGR.C | `QA_REPORT.md` (this folder) | — |

## Scope Boundaries

### In Scope

- Knowledge Compounder UX enhancements: auto-trigger status badge, compounder timeline (last 5 runs), flywheel stats panel showing knowledge growth, "new items since last visit" indicator
- New Tauri command: `get_compounder_status` returning last run timestamp, item count delta since last page visit, compounder health (ok/stale/error)
- Competitive positioning panel in Settings with ACC's 8 uncontested features, Tauri v2 comparison, market position summary
- Frontend tests: knowledgeStore.test.ts (12+ tests), Knowledge page component tests (6+ tests), Settings page tests (5+ tests for positioning panel)
- Rust integration tests: 3 new tests for compounder auto-trigger, preflight stack filter, knowledge stats accuracy
- Product doc cross-reference validation
- CHANGELOG.md for this incident

### Out of Scope (Explicitly Deferred)

- Compounder auto-trigger from Rust backend (ADR-009 — already designed, gated on background task infrastructure; this plan only adds UX to surface triggers when they happen)
- Full web version competitive positioning (v2)
- Lark/Slack/Jira connector loop (ADR-011 — deferred)
- Semantic routing v1.5 (Phase 10+ — Ollama embeddings)
- Multi-thread parallel orchestration (Phase 10+)
- Per-provider cost aggregation (Phase 10+)
- Token budget reallocation (Phase 10+)
- Any backend architectural changes beyond the `get_compounder_status` command

## Detailed Implementation

### MGR.A — Product Doc Cross-Reference Validation

**Acceptance Criteria:**
1. All 4 product docs reference the same epic counts: 18 epics, 73 stories
2. Phase numbering is consistent across Roadmap and Epics (Phase 1–10+)
3. Market positioning language is consistent: "UNCONTESTED" labels match the 8 features in the gap analysis
4. ADR-013's updated market validation paragraph matches the Roadmap's market context notes
5. No stale references to pre-update content (e.g., "13 competitors" must be consistent)
6. CHANGELOG.md created in this incident folder documenting all changes

**Files:**
- `docs/product/overview/ACC-Product-Overview.md` — Updated Section 2 (competitive matrix, uncontested features, risk assessment)
- `docs/product/planning/ACC-Roadmap.md` — Added market context notes to Phase 5, 9, 9++, 10+
- `docs/product/planning/ACC-Technical-Planning.md` — ADR-013 updated with market validation paragraph
- `docs/product/requirements/ACC-Epics.md` — Summary table extended with Market Position column

**Verification checklist:**
- [ ] Epic count: 18 across all 4 docs
- [ ] Story count: 73 across Roadmap and Epics
- [ ] Phase count: 10+1 (Phases 1–10 + 5+ + 9+ + 9++) consistent
- [ ] "UNCONTESTED" label count: 8 features in Product-Overview, 7 epics in Epics.md (Epic 8 is part of Epic 6's handoff → counted once)
- [ ] Uncontested features table in Product-Overview matches market-gap-analysis.md Section 5
- [ ] ADR-013 references "2026-06-03" and "13 products" correctly
- [ ] No broken cross-references (e.g., "see Section X" where X changed)

### MGR.B — Knowledge Compounder UX v1.5

**TDD Strategy — Write Tests First:**

#### Test File 1: `src/__tests__/stores/knowledgeStore.test.ts` (12+ tests)

```
Test 1:  compounderRunning starts false, toggles true during run, resets false after
Test 2:  runCompounder dispatches invoke call with correct session_id
Test 3:  runCompounder on success refreshes items list
Test 4:  runCompounder on failure sets error state, resets compounderRunning
Test 5:  loadPreflight dispatches get_preflight_warnings_cmd with stack filter
Test 6:  loadPreflight populates preflight array on success
Test 7:  loadPreflight clears preflight on empty stack input
Test 8:  fetchItems returns KnowledgeItem[] sorted by created_at desc
Test 9:  createItem dispatches and refreshes list on success
Test 10: deleteItem removes item and refreshes list
Test 11: fetchRelations populates relations array
Test 12: fetchStats returns KnowledgeStats with total, avg_confidence, distinct_types
Test 13: newItemsSinceLastVisit returns 0 when no new items exist
Test 14: newItemsSinceLastVisit returns correct count when items created after lastVisit
```

#### Test File 2: `src/__tests__/pages/Knowledge.test.tsx` (6+ tests)

```
Test 1:  renders "Knowledge Compounder" page title
Test 2:  renders 4 stat cards (Total Items, Avg Confidence, Active Items, Top Confirmed)
Test 3:  renders 4 tabs (Browse, Relations, Stats, Preflight)
Test 4:  "Run Compounder" button calls store.runCompounder on click
Test 5:  CompounderDialog opens with session ID input
Test 6:  Preflight tab shows "Load" button, dispatches loadPreflight on click
Test 7:  PreflightCard renders antipattern badge with correct confidence bar width
Test 8:  Flywheel stats panel renders when compounder has run at least once
```

#### Test File 3: `src-tauri/tests/integration_tests.rs` (3 new tests)

```
Test 40: test_compounder_auto_trigger_status — verifies compounder status returns
         last_run timestamp, items_since_last, health status after compounder execution
Test 41: test_preflight_warnings_stack_filter — verifies preflight warnings filter
         correctly by stack tag (only anti-patterns matching stack returned)
Test 42: test_knowledge_stats_accuracy — verifies stats (total, avg_confidence,
         distinct_types) match actual knowledge_items table content
```

**Implementation — UI Changes to `Knowledge.tsx`:**

1. **Add `compounderStatus` to store** (new interface `CompounderStatus`):
```ts
interface CompounderStatus {
  last_run: string | null;        // ISO timestamp
  items_since_last_run: number;
  total_items: number;
  health: 'ok' | 'stale' | 'error';  // ok = ran <24h ago, stale = >24h, error = last run failed
  total_runs: number;
  flywheel: {                      // for flywheel visualization
    sessions_processed: number;
    knowledge_items_created: number;
    confidence_avg: number;
    contradictions_found: number;
  };
}
```

2. **Add "New items" badge** on the Knowledge sidebar entry in `Sidebar.tsx`:
   - Red dot + count when `newItemsSinceLastVisit > 0`
   - Auto-clears when user visits Knowledge page

3. **Add compounder timeline** below the stat cards in Knowledge.tsx:
   - Horizontal scrollable timeline of last 5 compounder runs
   - Each entry: timestamp, items generated, session ID, health dot (green/yellow/red)

4. **Add flywheel stats panel** in the Stats tab:
   - Visual representation of the compounding loop
   - Stats: sessions processed → knowledge items created → avg confidence trend
   - "Knowledge is compounding" message with growth rate

5. **Auto-trigger status indicator** in the header bar:
   - When compounder is running: amber pulse + "Compounding..."
   - When compounder completed: green check + "X new items" (fades after 5s)
   - When compounder is stale (>24h since last run): yellow clock + "Run compounder to extract learnings"

**Implementation — New Tauri Command in `knowledge.rs`:**

```rust
#[tauri::command]
pub async fn get_compounder_status(state: tauri::State<'_, AppState>) -> Result<CompounderStatus, String> {
    // Query last run from cron_executions or knowledge_items
    // Count items created since last Knowledge page visit (stored in app state)
    // Determine health: ok (<24h), stale (>24h), error (last run failed)
    // Return flywheel stats from aggregate queries
}
```

**Implementation — Store Changes to `knowledgeStore.ts`:**

- Add `compounderStatus: CompounderStatus | null` state
- Add `lastVisitTimestamp: string` state (persisted to localStorage)
- Add `newItemsSinceLastVisit: number` computed
- Add `fetchCompounderStatus()` action — calls `get_compounder_status_cmd`
- Add `markVisited()` action — updates `lastVisitTimestamp`, clears badge
- Add `flywheelStats` derived from compounderStatus

**Acceptance Criteria:**
1. "Run Compounder" button still works as before (no regression)
2. After compounder runs, Knowledge sidebar entry shows red badge with count
3. Visiting Knowledge page clears the badge
4. Compounder timeline shows last 5 runs with correct timestamps
5. Flywheel stats panel shows sessions_processed, knowledge_items_created, confidence_avg, contradictions_found
6. Stale indicator shows when no compounder run in >24 hours
7. Preflight tab still loads antipattern warnings correctly
8. All existing Knowledge page functionality preserved (no regression)
9. `npm run build` exits 0
10. `npm run lint` exits 0 with 0 errors, 0 warnings
11. All 12+ new knowledgeStore tests pass
12. All 8 new Knowledge page tests pass
13. All 3 new Rust integration tests pass (source-level verification if cargo blocked)

### MGR.C — Competitive Positioning Panel

**TDD Strategy — Write Tests First:**

#### Test File: `src/__tests__/pages/Settings.test.tsx` (5 new tests, extend existing 11)

```
Test 12: renders "Why ACC?" section with heading
Test 13: renders 8 uncontested feature items with descriptions
Test 14: renders Tauri v2 size comparison (~10MB vs 150MB+)
Test 15: renders market position summary (orchestration + knowledge + desktop + collaboration)
Test 16: renders "Learn More" link pointing to product overview docs
```

**Implementation — New Component `PositioningPanel.tsx`:**

```tsx
// src/components/PositioningPanel.tsx
// Renders a glass card with:
// 1. Header: "Why ACC?" with gradient accent
// 2. Uncontested features grid (2×4): each feature card with icon, title, description, "0 competitors" badge
// 3. Tauri v2 advantage callout: ~10MB vs 150MB+ Electron with binary size comparison bar
// 4. Market position summary: "ACC is the only tool at the intersection of..."
// 5. Footnote: "Based on competitive analysis of 13 products, May 2026"
```

**Feature cards (8 uncontested features):**
1. **Dependency-Aware Wave Execution** — Icon: GitBranch — "Parallel agents with DAG-based dependency resolution. Zero competitors."
2. **Handoff Verification Gates** — Icon: ShieldCheck — "Schema validation + approve/flag before next wave unlocks. Zero competitors."
3. **Proactive Token Budget** — Icon: Gauge — "Threshold ladder (60/80/95/100%) with PTY injection. Zero competitors."
4. **WIP Checkpoint & Resume** — Icon: PauseCircle — "Auto-capture + resume from checkpoint. Zero competitors."
5. **2-Pass Knowledge Compounding** — Icon: Brain — "Local pre-pass + LLM across all 9 agents. Ruflo is closest (1-pass, Claude-only)."
6. **7-Stage Connector Loop** — Icon: ArrowLeftRight — "Detect → Propose → Approve → Execute → Verify → Report. Zero competitors."
7. **Correction Loop** — Icon: RefreshCw — "Max 2 auto-retries with escalation. Zero competitors."
8. **SkillBridge Ecosystem** — Icon: Plug — "Local ↔ cloud memory bridge. Unique to ACC."

**Implementation — Settings.tsx Integration:**

Add a new section below the existing Integrations panel:
```tsx
{/* Competitive Positioning Section */}
<section className="space-y-4">
  <div className="flex items-center gap-2">
    <Trophy className="w-5 h-5 text-indigo-400" />
    <h2 className="text-lg font-semibold">Why ACC?</h2>
  </div>
  <PositioningPanel />
</section>
```

**Acceptance Criteria:**
1. "Why ACC?" section renders in Settings page at bottom
2. All 8 uncontested features render with correct icons, titles, descriptions
3. "0 competitors" badge renders for greenfield features
4. Tauri v2 comparison renders with correct MB values
5. Market position summary shows 4-category intersection
6. Footnote cites "May 2026" analysis
7. Panel uses existing glass card styling (consistent with app theme)
8. Responsive: 2-column grid on desktop, 1-column on mobile
9. No regression on existing Settings page functionality
10. All 5 new Settings tests pass (total: 16)
11. `npm run build` exits 0
12. `npm run lint` exits 0

## Test Strategy

| Layer | Tool | Before | After | New Tests |
|-------|------|--------|-------|-----------|
| Rust integration | `cargo test` | 39 tests | **42 tests** | +3 (compounder status, preflight filter, stats accuracy) |
| Frontend store tests | Vitest | 65 tests across 8 files | **79+ tests across 9 files** | +14 (knowledgeStore: 12, Settings: 2 of 5 new) |
| Frontend page tests | Vitest | (included in 65) | (included in 79+) | +8 (Knowledge page) +5 (Settings positioning) |
| TypeScript compile | `tsc && vite build` | 1682 modules | 1682+ modules | — |
| ESLint | `eslint .` | 0 errors, 0 warnings | 0 errors, 0 warnings | — |
| Vitest total | `vitest run` | 65 tests | **84+ tests** | +19 minimum |

### Test Suite Expansion Plan

**Phase 1 — This incident (19+ new tests):**
- knowledgeStore.test.ts: 12 tests (compounder lifecycle, preflight, CRUD, new-items tracking)
- Knowledge.test.tsx: 8 tests (page render, tabs, compounder dialog, preflight, flywheel)
- integration_tests.rs: 3 tests (compounder status, preflight filter, stats accuracy)
- Settings.test.tsx: +5 tests (positioning panel)

**Phase 2 — Follow-up (candidate tests for next incident):**
- Knowledge.test.tsx: +6 tests (filter interactions, search, relation CRUD, stats chart rendering)
- knowledgeStore.test.ts: +4 tests (contradiction detection, export-to-playbook, pagination)
- Integration tests: +2 tests (knowledge relations CRUD, contradiction flagging)
- E2E (Playwright): Knowledge page full flow — run compounder → view results → filter → export

**Phase 3 — Full coverage target:**
- All 15 frontend stores: minimum 8 tests each (120 total)
- All 15 frontend pages: minimum 4 tests each (60 total)
- Rust integration: 60+ tests covering all 19 modules

## Test Data Requirements

### Knowledge Store Tests

```ts
// Mock knowledge items for test data
const mockItems: KnowledgeItem[] = [
  {
    id: 1, title: "Use React.memo for list items", category: "PatternCard",
    content: "...", stack: "react", agent: "claude", confidence: 0.85,
    confirmation_count: 4, status: "active", is_global: false,
    created_at: "2026-06-01T10:00:00Z", session_count: 3
  },
  {
    id: 2, title: "Avoid nested useEffects", category: "AntiPattern",
    content: "...", stack: "react", agent: "opencode", confidence: 0.92,
    confirmation_count: 7, status: "active", is_global: true,
    created_at: "2026-05-28T14:00:00Z", session_count: 5
  },
  // ... 3 more items for pagination/confidence tests
];

const mockCompounderStatus: CompounderStatus = {
  last_run: "2026-06-03T09:00:00Z",
  items_since_last_run: 3,
  total_items: 47,
  health: "ok",
  total_runs: 12,
  flywheel: {
    sessions_processed: 34,
    knowledge_items_created: 47,
    confidence_avg: 0.73,
    contradictions_found: 5
  }
};
```

### Rust Integration Test Data

```rust
// Test 40: compounder auto-trigger status
// 1. Insert 2 mock sessions with event data
// 2. Insert 3 knowledge_items created from those sessions
// 3. Call get_compounder_status
// 4. Assert last_run matches most recent item created_at
// 5. Assert items_since_last_run matches count
// 6. Assert health is "ok" (within 24h)
// 7. Assert flywheel.sessions_processed = 2
// 8. Assert flywheel.knowledge_items_created = 3

// Test 41: preflight warnings stack filter
// 1. Insert 3 anti-pattern items: stack="react", stack="python", stack="react"
// 2. Call get_preflight_warnings with stack="react"
// 3. Assert returns 2 items (both react)
// 4. Assert 0 items when stack="rust" (no matches)

// Test 42: knowledge stats accuracy
// 1. Insert 5 items with varying confidence: 0.5, 0.7, 0.8, 0.9, 0.95
// 2. Insert 2 items with status="archived"
// 3. Call get_knowledge_stats
// 4. Assert total = 7
// 5. Assert avg_confidence ≈ 0.77 ((0.5+0.7+0.8+0.9+0.95)/5)
// 6. Assert distinct_types = count of unique categories
```

## Definition of Done

- [ ] `npm run build` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` shows 84+ tests passing (65 existing + 19+ new)
- [ ] `src-tauri/tests/integration_tests.rs` contains 42 `#[test]` functions (39 existing + 3 new)
- [ ] `src-tauri/src/knowledge.rs` exports `get_compounder_status` as `#[tauri::command]`
- [ ] knowledgeStore.test.ts contains 12+ tests
- [ ] Knowledge.test.tsx contains 8+ tests
- [ ] Settings.test.tsx contains 16+ tests (11 existing + 5 new)
- [ ] Knowledge page shows compounder timeline, flywheel stats, new-items badge
- [ ] Sidebar Knowledge entry shows unread badge when new items exist
- [ ] Settings page shows "Why ACC?" positioning panel with 8 uncontested features
- [ ] PositioningPanel component renders correctly in light and dark mode
- [ ] Product doc cross-references validated (4 docs consistent)
- [ ] CHANGELOG.md created in this incident folder
- [ ] `cargo check` / `cargo test` — env-blocked (Windows 10 SDK); source-level verification only

## Working Directory

`D:\TRANSFER DATA\Coding\OpenCode\agent-control-center`

---

*Plan derived from: `docs/2026-06-02-gap-analysis/02-market-gap-analysis.md` (13-product competitive analysis, May 2026)*
*Product doc updates: `docs/product/overview/ACC-Product-Overview.md`, `docs/product/planning/ACC-Roadmap.md`, `docs/product/planning/ACC-Technical-Planning.md`, `docs/product/requirements/ACC-Epics.md`*
