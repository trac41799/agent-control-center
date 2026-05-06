# 02 — Bug Log

---

## BUG #1 — CRITICAL
### Tauri IPC Bridge Unavailable in Browser Mode

**Severity:** Critical
**Affected pages:** Messages, Outcomes, Replay, Playbooks (4 silent), Assets, Connectors, Costs (3 inline error)

**Root Cause:**
Pages call `window.__TAURI__.invoke()` via Zustand stores on component mount (`useEffect`). When running outside Tauri webview (browser dev mode), `@tauri-apps/api/core` returns `undefined` for the `invoke` function, triggering:

```
TypeError: Cannot read properties of undefined (reading 'invoke')
```

**Affected call sites:**

| Page | Store | Function | File:Line |
|------|-------|----------|-----------|
| Messages | orchestrationStore | getOpenSignals | `src/stores/orchestrationStore.ts:69` |
| Outcomes | intelligenceStore | getOutcomeStats | `src/stores/intelligenceStore.ts:20` |
| Replay | intelligenceStore | getFailureAnalyses | `src/stores/intelligenceStore.ts:29` |
| Playbooks | orchestrationStore | getMemoryCandidates | `src/stores/orchestrationStore.ts:83` |
| Assets | assetStore | (mount effects) | `src/stores/assetStore.ts` |
| Connectors | integrationStore | (mount effects) | `src/stores/integrationStore.ts` |
| Costs | budgetStore | getBudgetSummary | `src/stores/budgetStore.ts` |

**Impact:**
- 4 pages fail silently (no data loads, empty states remain)
- 3 pages show raw `TypeError` text inline in the UI header area
- All backend-dependent functionality is broken in browser dev mode

**Fix:**
```typescript
// In each store, wrap invoke calls:
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!window.__TAURI__) {
    console.warn(`[ACC] Tauri not available — skipping ${cmd}`);
    return null;
  }
  return invoke<T>(cmd, args);
}
```

Additionally, components should show a "Tauri backend unavailable" banner when running in browser mode.

---

## BUG #2 — MEDIUM
### Silent Failure on Tauri-Dependent Button Actions

**Severity:** Medium
**Affected:** Route (Route Task), Orchestrate (Create Plan), Handoffs (Generate Handoff)

**Root Cause:**
Button click handlers call `invoke()` without `.catch()` error handling. When the call fails (e.g., in browser mode), no error toast, loading state, or fallback message is shown. The UI appears frozen with no feedback to the user.

**Affected files:**
- `src/pages/Route.tsx` — Route Task button handler
- `src/pages/Orchestrate.tsx` — Create Plan button handler
- `src/pages/Handoffs.tsx` — Generate Handoff button handler

**Fix:**
Add `.catch()` to all invoke calls that surface user-visible error toasts or fallback UI states.

---

## BUG #3 — LOW
### Instruction Text Persists After User Action

**Severity:** Low
**Affected:** Route page (`/route`)

**Root Cause:**
The instruction panel ("Enter a task description and click Route Task...") remains visible after the user fills the form and clicks Route Task. There is no conditional rendering based on form state.

**Fix:**
```tsx
{!taskDescription && (
  <InstructionPanel>
    Enter a task description and click Route Task...
  </InstructionPanel>
)}
```

---

## BUG #4 — LOW
### Dead Code in Rust Backend (17 Warnings)

**Severity:** Low
**Affected:** `src-tauri/src/`

**Unused items:**

| File | Unused Symbol | Type |
|------|--------------|------|
| `assets.rs:181` | `read_memory_file` | Function |
| `budget.rs:59` | `BudgetThresholds` | Struct |
| `control.rs:21` | `ThreadSession` | Struct |
| `db.rs:39` | `init_db_path` | Function |
| `intelligence.rs:163` | `update_failure_diagnosis` | Function |
| `intelligence.rs:559` | `IntelligenceRequest` | Struct |
| `intelligence.rs:567` | `IntelligenceResponse` | Struct |
| `intelligence.rs:574` | `build_intelligence_prompt` | Function |
| `intelligence.rs:586` | `extract_pty_context` | Function |
| `intelligence.rs:597` | `suggest_outcome` | Function |
| `playbook.rs:28` | `FeatureDocRequest` | Struct |
| `pty.rs:12-15` | `AgentStatus::{Starting, Stopped, Error}` | Enum variants |
| `pty.rs:87` | `registry()` method | Method |
| `scheduler.rs:153` | `expand_template` | Function |
| `scheduler.rs:170` | `EscalationPolicy` | Struct |
| `scheduler.rs:177` | `parse_escalation_policy` | Function |
| `scheduler.rs:416` | `evaluate_schedule` | Function |

**Impact:** No runtime impact — compiles cleanly with warnings. Indicates incomplete backend wiring (functions exist but no command registers them).

**Fix:** Either wire these functions to Tauri commands, or remove/`#[allow(dead_code)]` if planned for future use.

---

## BUG #5 — MEDIUM
### Raw Error Text Displayed in Page Header

**Severity:** Medium
**Affected:** Assets, Connectors, Costs pages

**Root Cause:**
Same as BUG #1, but these pages render the caught error text as inline DOM content (e.g., "TypeError: Cannot read properties of undefined (reading 'invoke')") in the page header area alongside functional UI elements.

**Fix:** Wrap in error boundary or conditional rendering. Replace raw error text with a styled warning banner.

---

## BUG #6 — LOW
### "Add Entry" Button Permanently Disabled on Knowledge Page

**Severity:** Low
**Affected:** Knowledge page (`/knowledge`)

**Root Cause:**
The "Add Entry" button is rendered with the `disabled` attribute and no condition to enable it. There is no form, dialog, or trigger to create knowledge entries manually — the page relies entirely on auto-population from agent sessions.

**Fix:** Add a modal/dialog to enable manual knowledge entry creation, or wire the button to a form that enables it.
