# IMPLEMENTATION PLAN - Close All ACC E2E Bugs and Design Gaps

**Date:** 2026-05-06
**Based on:** `docs/2026-05-06-e2e-test/` findings
**Goal:** Close all 6 bugs and 5 design gaps with zero regressions

---

## Overview

| Phase | Scope | Files Changed | Risk |
|-------|-------|--------------|------|
| P1 | Tauri Guard + Browser Degradation | 3 new, 7 modified | Low |
| P2 | Error Handling on Button Actions | 3 modified | Low |
| P3 | UI Polish | 2 modified | Low |
| P4 | Rust Dead Code Wiring | 1 modified | Medium |
| P5 | Design Gap Closure | 4 new, 4 modified | Medium |
| P6 | Verification | 0 (lint+build+test) | Low |

---

## PHASE 1: Tauri Guard + Browser-Mode Graceful Degradation

**Bugs closed:** #1 (CRITICAL), #5 (MEDIUM)

### 1a. Create `src/lib/tauriGuard.ts` (NEW)

Create a utility module that provides two exports:

- `isTauri(): boolean` - checks `window.__TAURI__` once and caches result
- `safeInvoke<T>(cmd, args?)` - wraps `invoke()` with guard, returns `null` or calls `invoke`, never throws

This is the single source of truth for Tauri availability checks. All stores and pages import from here instead of calling `invoke` directly.

### 1b. Create `src/components/TauriNotAvailableBanner.tsx` (NEW)

A dismissible banner component that renders when `isTauri()` is false. Shows:
- Icon + "Running in browser mode - Tauri backend unavailable"
- "Some features require the desktop app" helper text
- Dismiss button that stores preference in localStorage

Import and render this banner once in the main App layout (sidebar area or top of main content).

### 1c. Update All 7 Zustand Stores

Replace direct `invoke()` calls with `safeInvoke()` in these stores:

**`src/stores/orchestrationStore.ts`** - lines 69, 73, 83, 143, 161-237
- `getOpenSignals` - wrap with safeInvoke
- `getMemoryCandidates` - wrap with safeInvoke
- `routeTask` - wrap with safeInvoke, return early with `[]` on null
- `createWavePlan` - wrap, return null on failure
- All other invoke calls - consistent wrapping

**`src/stores/intelligenceStore.ts`** - lines 20, 29, 101-181
- `getOutcomeStats` - wrap with safeInvoke
- `getFailureAnalyses` - wrap with safeInvoke
- All other invoke calls - consistent wrapping

**`src/stores/agentStore.ts`** - lines 46, 64, 73
- `spawn_agent`, `kill_agent`, `write_to_agent` - wrap with safeInvoke

**`src/stores/assetStore.ts`** - lines 133, 151, 168
- `write_memory`, `toggle_mcp`, `store_secret` - wrap with safeInvoke

**`src/stores/integrationStore.ts`** - lines 91, 100, 126, 135
- All Supabase/GitHub config commands - wrap with safeInvoke

**`src/stores/knowledgeStore.ts`** - line 86
- `delete_knowledge_item_cmd` - wrap with safeInvoke

**`src/stores/backwardChannelStore.ts`** - lines 64, 74, 84, 93, 103
- All chat platform daemon commands - wrap with safeInvoke

**`src/stores/schedulerStore.ts`** - lines 112, 123
- `delete_cron_job_cmd`, `toggle_cron_job_cmd` - wrap with safeInvoke

### 1d. Update Pages That Use Effects Directly

**`src/pages/Messages.tsx`** - line 36
- Wrap `store.getOpenSignals()` call in try/catch, or let safeInvoke handle it silently

**`src/pages/Outcomes.tsx`** - line 19
- Wrap `getOutcomeStats()` in try/catch

**`src/pages/Replay.tsx`** - line 18
- Wrap `getFailureAnalyses()` in try/catch

**`src/pages/Playbooks.tsx`** - line 25
- Wrap `getMemoryCandidates()` in try/catch

**`src/pages/Assets.tsx`** - locate all useEffect invoke calls
- Wrap with try/catch, show banner instead of raw error text in header

**`src/pages/Connectors.tsx`** - locate error text display
- Replace raw "TypeError: Cannot read..." text with the TauriNotAvailableBanner

**`src/pages/Costs.tsx`** - locate error text display
- Same fix as Connectors

---

## PHASE 2: Error Handling for Tauri-Dependent Button Actions

**Bug closed:** #2 (MEDIUM)

### 2a. Add Toast Notification System

If not already present, add a simple toast/hook:
- `src/hooks/useToast.ts` (NEW) - provides `showToast(message, type)` function
- Renders a non-blocking notification at the bottom-right

### 2b. Update Button Handlers

**`src/pages/Route.tsx`** - `handleRoute` function (line 18-23)
- Wrap `await routeTask(...)` in try/catch
- On error: show toast "Routing failed - try running in Tauri desktop mode"
- On null result: show "No routing data available" empty state
- Kill the loading spinner on both success and error paths

**`src/pages/Orchestrate.tsx`** - `handleCreatePlan` function
- Wrap in try/catch with toast on failure
- Show appropriate fallback UI

**`src/pages/Handoffs.tsx`** - Generate Handoff + Validate Schema handlers
- Wrap both in try/catch with toast on failure
- Validate Schema: show "Schema is valid" or list missing fields in UI

---

## PHASE 3: UI Polish

**Bugs closed:** #3 (LOW), #6 (LOW)

### 3a. Hide Instruction Panel When Form Has Content

**`src/pages/Route.tsx`** - lines 102-108
- Change condition from `suggestions.length === 0` to `suggestions.length === 0 && !taskDesc.trim()`
- When taskDesc is filled but suggestions is empty (no data), show a different empty state:
  "No suggestions available. The router may need outcome data to make recommendations."

### 3b. Enable "Add Entry" on Knowledge Page

**`src/pages/Knowledge.tsx`** - line 78
- Remove `disabled` prop from the Add Entry button
- Add an `onClick` handler that opens a modal/dialog with:
  - Title input
  - Content textarea
  - Type selector (context/pattern/handoff/correction/insight/fact)
  - Stack tags input
  - Agent tags input
  - Project ID input (optional)
  - Save/Cancel buttons
- Save calls `create_knowledge_item_cmd` via the knowledge store
- On success, refresh the items list

Create `src/components/AddKnowledgeDialog.tsx` (NEW) for the modal.

---

## PHASE 4: Rust Dead Code Wiring

**Bug closed:** #4 (LOW)

### 4a. Wire Unused Intelligence Functions

**`src-tauri/src/commands.rs`** - Add new Tauri commands:

1. `update_failure_diagnosis_cmd` - wraps `intelligence::update_failure_diagnosis`
   - Parameters: analysis_id, diagnosis, root_cause, suggested_fix, confidence
   
2. `build_intelligence_prompt_cmd` - wraps `intelligence::build_intelligence_prompt`
   - Parameters: task, context, format_hint
   - Returns: String (the constructed prompt)
   
3. `extract_pty_context_cmd` - wraps `intelligence::extract_pty_context`
   - Parameters: output, last_n_lines
   - Returns: String (last N lines of PTY output)
   
4. `suggest_outcome_cmd` - wraps `intelligence::suggest_outcome`
   - Parameters: pty_output, idle_seconds
   - Returns: Option<String> (suggested outcome)

### 4b. Wire Unused Scheduler Functions

**`src-tauri/src/commands.rs`** - Add:

5. `expand_template_cmd` - wraps `scheduler::expand_template`
   - Parameters: template, variables (HashMap)
   - Returns: String

6. `parse_escalation_policy_cmd` - wraps `scheduler::parse_escalation_policy`
   - Parameters: json (String)
   - Returns: EscalationPolicy

7. `evaluate_schedule_cmd` - wraps `scheduler::evaluate_schedule`
   - Parameters: id, count
   - Returns: Vec<String>

### 4c. Wire Unused Asset Function

8. `read_memory_file_cmd` - wraps `assets::read_memory_file`
   - Parameters: path
   - Returns: MemoryFileEntry

### 4d. Add Frontend Store Methods for New Commands

Add corresponding store methods in `intelligenceStore.ts` and `schedulerStore.ts` to call these new commands via `safeInvoke`.

---

## PHASE 5: Design Gap Closure

### 5a. E7 - Guideline Generator Standalone Page (NEW)

Create `src/pages/Guidelines.tsx` with:
- Agent ID selector dropdown
- Task description input
- Objective input (one sentence)
- Depends on multi-select
- Model selector from Model Registry
- Files to create (dynamic path+purpose pairs)
- Files NOT to touch (dynamic path+reason pairs)
- Test requirements checklist (happy path, error paths, edge cases)
- Input contracts / Output contracts fields
- "Generate Guideline" button calling `generateGuideline`
- Preview panel showing the generated guideline markdown
- "Copy CLI Command" button showing `opencode run --model X --dir Y` preview

Add this page to the router and sidebar under a new nav entry or as a sub-page of Orchestrate.

Update `src/App.tsx` to add the `/guidelines` route.

### 5b. E9 - Failure Analyzer Wiring

Update `src/pages/Replay.tsx`:
- Add "Analyze" button on each failure analysis row
- On click: calls `create_failure_analysis_cmd` with PTY excerpt
- Shows analysis result in detail panel: root cause, evidence lines, suggested fix, confidence
- Add "Generate Correction" button that creates `CORRECTION_ID.md` content
- Add retry counter display
- After 2 retries: show escalation prompt

### 5c. E12 - Reactive Memory PTY Integration

The pattern detection logic exists in Rust (`playbook::detect_memory_candidate`) but is not connected to the PTY output stream. Wire it:

In the Runner page or agent session component:
- After agent PTY output is captured, call `detect_memory_candidate_cmd` with the output
- If a candidate is returned, show a non-blocking toast: "Agent noted: [excerpt]. Add to memory?"
- Three options: [Add] [Edit] [Skip]
- On Add: call `create_memory_candidate_cmd` with session_id, project_id, content
- The candidate then appears in the Playbooks > Reactive Memory section

### 5d. E13 - Chat Platform UI in Connectors

Update `src/pages/Connectors.tsx` Chat tab:
- Add platform cards for Lark, Slack, Discord, Telegram
- Each card shows: platform icon, connection status, config fields
- Lark: app_id, app_secret, channels list
- Slack: signing_secret, bot_token, channels list
- Discord: public_key, bot_token, channels list
- Telegram: bot_token, chat_ids list
- Each card has: Enable/Disable toggle, Test Connection button, Save button
- Bottom section: Daemon Controls (Start/Stop/Status/Logs)
- Uses `backwardChannelStore` for all state

### 5e. E15 - Knowledge Manual Creation + Stats/Relations Tabs

Already partially addressed in Phase 3b (Add Entry dialog).

Additionally:
- Wire `get_knowledge_stats_cmd` to the Stats tab (currently shows local counts only)
- Wire `get_knowledge_relations_cmd` to the Relations tab
- Add "Compound" button on Browse tab that calls `compound_knowledge_cmd`
- The Browse tab should call `get_knowledge_items_cmd` on mount with current filters instead of using the empty placeholder array

---

## PHASE 6: Verification

### 6a. Build Verification
```bash
cd /Applications/E8/Innovations/agent-control-center
npm run build        # TypeScript compile + Vite bundle - must pass
cargo check          # Rust compilation - must have 0 new warnings
npm run lint         # ESLint - must pass
bash smoke-test.sh   # All 7 tests must pass
```

### 6b. Regression Test Checklist

| Test | Expected Result |
|------|-----------------|
| App loads at `localhost:1420` | 200 OK, no console errors |
| All 14 nav links work | Each page renders |
| No raw error text on any page | All error states use banner/toast |
| Route Task button enables on text | Button goes from disabled to enabled |
| Create Plan button enables on slug | Button goes from disabled to enabled |
| Route Task click in browser | Shows toast "Running in browser mode" |
| Create Plan click in browser | Shows toast "Running in browser mode" |
| Theme toggle Dark/Light | Works bidirectionally |
| Knowledge Add Entry | Opens dialog, accepts input |
| Guideline Generator page | Loads at /guidelines, form functional |
| Connectors Chat tab | Shows 4 platform cards |
| Settings page unchanged | All defaults, integrations, about intact |
| TauriNotAvailableBanner | Shows in browser, dismissible |
| TauriNotAvailableBanner in Tauri | Does NOT show when in desktop app |
| `npm run build` | 0 errors |
| `cargo check` | 0 errors, 0 new warnings |

### 6c. File Change Summary

| Action | File |
|--------|------|
| NEW | `src/lib/tauriGuard.ts` |
| NEW | `src/components/TauriNotAvailableBanner.tsx` |
| NEW | `src/components/AddKnowledgeDialog.tsx` |
| NEW | `src/hooks/useToast.ts` |
| NEW | `src/pages/Guidelines.tsx` |
| MODIFY | `src/stores/orchestrationStore.ts` |
| MODIFY | `src/stores/intelligenceStore.ts` |
| MODIFY | `src/stores/agentStore.ts` |
| MODIFY | `src/stores/assetStore.ts` |
| MODIFY | `src/stores/integrationStore.ts` |
| MODIFY | `src/stores/knowledgeStore.ts` |
| MODIFY | `src/stores/backwardChannelStore.ts` |
| MODIFY | `src/stores/schedulerStore.ts` |
| MODIFY | `src/pages/Route.tsx` |
| MODIFY | `src/pages/Orchestrate.tsx` |
| MODIFY | `src/pages/Handoffs.tsx` |
| MODIFY | `src/pages/Messages.tsx` |
| MODIFY | `src/pages/Outcomes.tsx` |
| MODIFY | `src/pages/Replay.tsx` |
| MODIFY | `src/pages/Playbooks.tsx` |
| MODIFY | `src/pages/Assets.tsx` |
| MODIFY | `src/pages/Connectors.tsx` |
| MODIFY | `src/pages/Costs.tsx` |
| MODIFY | `src/pages/Knowledge.tsx` |
| MODIFY | `src/App.tsx` (add /guidelines route) |
| MODIFY | `src-tauri/src/commands.rs` (add 8 commands) |

**Total: 5 new files, 21 modified files**

---

## Rollback / Safety

- Phase 1 is purely additive (new utility, guard wrapping) - cannot break Tauri behavior since guard only activates outside Tauri
- Phase 2 adds try/catch around existing calls - fails open (shows toast instead of crashing silently)
- Phase 3 is purely UI conditional rendering
- Phase 4 adds new commands, doesn't change existing ones
- Phase 5 adds new pages/components, doesn't remove anything
- Each phase is independently testable and revertible via git
