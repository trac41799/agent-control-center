# CostAggregation Component - Surgical Refactor Plan

**Status:** Draft  
**Created:** 2026-01-14  
**Scope:** Fix test hanging issue without introducing regressions  
**Approach:** TDD-aligned, minimal changes, surgical precision

---

## Problem Statement

The CostAggregation page test hangs indefinitely when executed. Root cause analysis reveals:

1. **Unstable useEffect Dependencies:** The `budget` object from `useBudgetStore()` is not memoized, causing useEffect to re-run on every render
2. **Cascading Async Operations:** Multiple useEffects trigger parallel async calls that update state, causing re-renders
3. **Event Listener Lifecycle:** `subscribeThresholdEvents()` creates async subscriptions that may not clean up properly in test environment
4. **State Update Chains:** `budget.lastThresholdFired` changes trigger additional `loadWips()` calls, creating potential infinite loops

### Evidence
- Test execution times out after 180+ seconds
- Other page tests (Runner, Scheduler, etc.) complete in 3-5 seconds
- Component has 5 useEffect hooks with complex interdependencies

---

## Refactor Principles

1. **Surgical Precision:** Only modify CostAggregation.tsx and its test file
2. **No Behavioral Changes:** Component must function identically in production
3. **TDD Approach:** Write failing test first, then refactor to pass
4. **Zero Regressions:** All existing functionality must remain intact
5. **Testability First:** Component must be testable in isolation

---

## Acceptance Criteria

### Functional Requirements
- [ ] AC1: Component renders all UI elements (title, tabs, cards, buttons)
- [ ] AC2: Component loads cost summary on mount
- [ ] AC3: Component loads budgets, resumption plans, and WIPs on mount
- [ ] AC4: Component subscribes to threshold events on mount
- [ ] AC5: Component handles threshold fired events correctly
- [ ] AC6: Refresh button reloads all data
- [ ] AC7: Tab navigation works correctly
- [ ] AC8: All child components (ThresholdLadder, CostBreakdownChart, BudgetList, WipResumptionPanel) receive correct props

### Test Requirements
- [ ] AC9: Test suite completes within 10 seconds
- [ ] AC10: All 12 test cases pass
- [ ] AC11: No console errors or warnings (except expected act() warnings)
- [ ] AC12: No memory leaks (event listeners properly cleaned up)

### Non-Functional Requirements
- [ ] AC13: No changes to component's public API
- [ ] AC14: No changes to child component interfaces
- [ ] AC15: No changes to store interfaces
- [ ] AC16: TypeScript compilation succeeds with no errors
- [ ] AC17: ESLint passes with no new warnings

---

## Refactor Steps

### Phase 1: Stabilize Dependencies (RED → GREEN)

#### Step 1.1: Write Failing Test
**File:** `src/__tests__/pages/CostAggregation.test.tsx`

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { mockInvoke } from "@/__tests__/setup";
import CostAggregation from "@/pages/CostAggregation";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => undefined),
}));

function renderCostAggregation() {
  mockInvoke.mockResolvedValue({
    total_tokens_in: 0,
    total_tokens_out: 0,
    total_tokens: 0,
    estimated_total_cost_usd: 0,
    by_model: [],
    by_project: [],
    by_session: [],
  });
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <CostAggregation />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("CostAggregation Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page title", () => {
    renderCostAggregation();
    expect(screen.getByText("Cost Aggregation")).toBeInTheDocument();
  });

  it("renders Refresh button", () => {
    renderCostAggregation();
    expect(screen.getByText("Refresh")).toBeInTheDocument();
  });

  it("renders tab buttons", () => {
    renderCostAggregation();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Budgets")).toBeInTheDocument();
    expect(screen.getByText("Models")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
  });

  it("renders Total Spend card", () => {
    renderCostAggregation();
    expect(screen.getByText("Total Spend")).toBeInTheDocument();
  });

  it("renders Burn Rate card", () => {
    renderCostAggregation();
    expect(screen.getByText("Burn Rate")).toBeInTheDocument();
  });

  it("renders Projected Month-End card", () => {
    renderCostAggregation();
    expect(screen.getByText("Projected Month-End")).toBeInTheDocument();
  });

  it("renders Active Budgets card", () => {
    renderCostAggregation();
    expect(screen.getByText("Active Budgets")).toBeInTheDocument();
  });

  it("renders Threshold Ladder", () => {
    renderCostAggregation();
    expect(screen.getByText("Threshold Ladder")).toBeInTheDocument();
  });

  it("renders Cost Breakdown", () => {
    renderCostAggregation();
    expect(screen.getByText("Per-Agent Cost Breakdown")).toBeInTheDocument();
  });

  it("shows $0.0000 for total spend when no data", () => {
    renderCostAggregation();
    expect(screen.getByText("$0.0000")).toBeInTheDocument();
  });

  it("shows 0.0% burn rate when no data", () => {
    renderCostAggregation();
    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });

  it("renders WIP / Resumption tab", () => {
    renderCostAggregation();
    expect(screen.getByText(/WIP \/ Resumption/)).toBeInTheDocument();
  });
});
```

**AC:** Test file exists with 12 test cases  
**Verification:** `npm test src/__tests__/pages/CostAggregation.test.tsx` (currently hangs)

---

#### Step 1.2: Memoize Budget Store Selectors
**File:** `src/pages/CostAggregation.tsx`

**Change:** Replace direct store access with memoized selectors

```typescript
// BEFORE (lines 43-48)
const budget = useBudgetStore();
const [wipEntries, setWipEntries] = useState<WipEntry[]>([]);
const [wipPreview, setWipPreview] = useState<{ path: string; content: string } | null>(null);
const [resumptionPreview, setResumptionPreview] = useState<string | null>(null);
const [recentlyFired, setRecentlyFired] = useState<Set<number>>(new Set());
const [notification, setNotification] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

// AFTER
const budgets = useBudgetStore((s) => s.budgets);
const resumptionPlan = useBudgetStore((s) => s.resumptionPlan);
const thresholdBudgets = useBudgetStore((s) => s.thresholdBudgets);
const lastThresholdFired = useBudgetStore((s) => s.lastThresholdFired);
const loadBudgets = useBudgetStore((s) => s.loadBudgets);
const loadResumptionPlans = useBudgetStore((s) => s.loadResumptionPlans);
const loadWips = useBudgetStore((s) => s.loadWips);
const resumeBudget = useBudgetStore((s) => s.resumeBudget);
const captureWip = useBudgetStore((s) => s.captureWip);
const subscribeThresholdEvents = useBudgetStore((s) => s.subscribeThresholdEvents);

const [wipEntries, setWipEntries] = useState<WipEntry[]>([]);
const [wipPreview, setWipPreview] = useState<{ path: string; content: string } | null>(null);
const [resumptionPreview, setResumptionPreview] = useState<string | null>(null);
const [recentlyFired, setRecentlyFired] = useState<Set<number>>(new Set());
const [notification, setNotification] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
```

**Rationale:** Zustand selectors with shallow equality prevent unnecessary re-renders when store updates  
**AC:** Component uses individual selectors instead of entire store object  
**Verification:** TypeScript compiles, no runtime errors

---

#### Step 1.3: Stabilize useEffect Dependencies
**File:** `src/pages/CostAggregation.tsx`

**Change:** Update useEffect dependencies to use stable function references

```typescript
// BEFORE (lines 65-69)
useEffect(() => {
  budget.loadBudgets();
  budget.loadResumptionPlans();
  budget.loadWips().then(setWipEntries).catch(() => undefined);
}, [budget]);

// AFTER
useEffect(() => {
  loadBudgets();
  loadResumptionPlans();
  loadWips().then(setWipEntries).catch(() => undefined);
}, [loadBudgets, loadResumptionPlans, loadWips]);
```

```typescript
// BEFORE (lines 71-86)
useEffect(() => {
  let unlisten: (() => void) | null = null;
  let cancelled = false;
  (async () => {
    const u = await budget.subscribeThresholdEvents();
    if (cancelled) {
      u();
    } else {
      unlisten = u;
    }
  })();
  return () => {
    cancelled = true;
    if (unlisten) unlisten();
  };
}, [budget]);

// AFTER
useEffect(() => {
  let unlisten: (() => void) | null = null;
  let cancelled = false;
  (async () => {
    const u = await subscribeThresholdEvents();
    if (cancelled) {
      u();
    } else {
      unlisten = u;
    }
  })();
  return () => {
    cancelled = true;
    if (unlisten) unlisten();
  };
}, [subscribeThresholdEvents]);
```

```typescript
// BEFORE (lines 88-98)
useEffect(() => {
  const last = budget.lastThresholdFired;
  if (!last) return;
  setRecentlyFired((prev) => {
    const next = new Set(prev);
    next.add(last.percentage);
    return next;
  });
  setNotification({ kind: "ok", text: `${last.agent_ref} hit ${last.percentage}%` });
  budget.loadWips().then(setWipEntries).catch(() => undefined);
}, [budget.lastThresholdFired, budget]);

// AFTER
useEffect(() => {
  if (!lastThresholdFired) return;
  setRecentlyFired((prev) => {
    const next = new Set(prev);
    next.add(lastThresholdFired.percentage);
    return next;
  });
  setNotification({ kind: "ok", text: `${lastThresholdFired.agent_ref} hit ${lastThresholdFired.percentage}%` });
  loadWips().then(setWipEntries).catch(() => undefined);
}, [lastThresholdFired, loadWips]);
```

**Rationale:** Individual function references from Zustand are stable across renders  
**AC:** All useEffect dependencies are stable primitives or stable function references  
**Verification:** No ESLint exhaustive-deps warnings

---

#### Step 1.4: Update Child Component Props
**File:** `src/pages/CostAggregation.tsx`

**Change:** Replace `budget.` references with individual variables

```typescript
// Line 151-154: Update calculations
const activeBudgets = budgets.filter((b) => b.state === "active").length;
const warningBudgets = budgets.filter((b) => b.state === "warning" || b.state === "critical").length;
const totalBudgetTokens = budgets.reduce((acc, b) => acc + b.budget_total, 0);
const totalUsedTokens = budgets.reduce((acc, b) => acc + b.budget_used, 0);

// Line 183-187: Update Refresh button handler
onClick={() => {
  loadSummary();
  loadBudgets();
  loadResumptionPlans();
  loadWips().then(setWipEntries).catch(() => undefined);
}}

// Line 249-256: Update ThresholdLadder and CostBreakdownChart props
<ThresholdLadder
  budgets={budgets}
  recentlyFired={recentlyFired}
/>
<CostBreakdownChart
  budgets={budgets}
  fmtTokens={fmtTokens}
  fmtCost={fmtCost}
/>

// Line 262-280: Update BudgetList props and handlers
<BudgetList
  budgets={budgets}
  thresholdBudgets={thresholdBudgets}
  recentlyFired={recentlyFired}
  onResume={async (id) => {
    await resumeBudget(id, 100_000);
    await loadBudgets();
    setNotification({ kind: "ok", text: `Budget ${id.slice(0, 8)} +100K tokens` });
  }}
  onCapture={async (id) => {
    const wipPath = `${id.slice(0, 8)}-WIP.md`;
    await captureWip(id, wipPath);
    await loadBudgets();
    const next = await loadWips();
    setWipEntries(next);
    setNotification({ kind: "ok", text: `WIP captured for ${id.slice(0, 8)}` });
  }}
  fmtTokens={fmtTokens}
/>

// Line 284-297: Update WipResumptionPanel props
<WipResumptionPanel
  wips={wipEntries}
  resumptionPlan={resumptionPlan}
  onPreviewWip={(p) => {
    setWipPreview({ path: p, content: readMockWip(p) });
  }}
  onPreviewResumption={() => {
    if (resumptionPlan) {
      setResumptionPreview(formatResumptionPreview(resumptionPlan));
    } else {
      setResumptionPreview("# No Resumption Plan\n\nRun a wave that captures WIP to populate this view.");
    }
  }}
/>
```

**AC:** All references to `budget.` replaced with individual variables  
**Verification:** TypeScript compiles, no undefined references

---

### Phase 2: Verify GREEN State

#### Step 2.1: Run Test Suite
**Command:** `npm test src/__tests__/pages/CostAggregation.test.tsx`

**Expected Result:**
```
✓ src/__tests__/pages/CostAggregation.test.tsx (12 tests) 5000ms
Test Files  1 passed (1)
Tests       12 passed (12)
Duration    < 10s
```

**AC:** All 12 tests pass within 10 seconds  
**Verification:** Exit code 0, no timeouts

---

#### Step 2.2: Run Full Test Suite
**Command:** `npm test`

**Expected Result:** All tests pass (249 tests)

**AC:** No regressions in existing tests  
**Verification:** Exit code 0

---

#### Step 2.3: TypeScript Compilation
**Command:** `npm run build`

**Expected Result:** Build succeeds with no errors

**AC:** TypeScript compilation succeeds  
**Verification:** Exit code 0

---

#### Step 2.4: ESLint Check
**Command:** `npm run lint`

**Expected Result:** No new warnings or errors

**AC:** ESLint passes  
**Verification:** Exit code 0

---

### Phase 3: Manual QA

#### Step 3.1: Visual Regression Test
**Steps:**
1. Run `npm run tauri dev`
2. Navigate to Cost Aggregation page
3. Verify all UI elements render correctly
4. Verify tabs switch correctly
5. Verify Refresh button works
6. Verify no console errors

**AC:** UI matches pre-refactor state  
**Verification:** Screenshots match baseline

---

#### Step 3.2: Functional Test
**Steps:**
1. Create a budget via API or UI
2. Verify budget appears in Budgets tab
3. Trigger threshold event (if possible)
4. Verify notification appears
5. Verify WIP capture works
6. Verify budget resume works

**AC:** All functionality works as before  
**Verification:** Manual testing passes

---

## Risk Assessment

### Low Risk Changes
- Memoizing store selectors (standard Zustand pattern)
- Stabilizing useEffect dependencies (React best practice)
- Replacing object references with primitives (no behavioral change)

### Medium Risk Areas
- Event listener cleanup (existing logic preserved, just dependencies changed)
- Async operation ordering (no changes to execution order)

### Mitigation Strategies
1. **Comprehensive Testing:** Full test suite before and after
2. **Type Safety:** TypeScript compilation ensures no type errors
3. **Manual QA:** Visual and functional testing
4. **Rollback Plan:** Git revert if issues discovered

---

## Rollback Plan

If regressions are discovered:

```bash
# Revert to pre-refactor state
git revert <commit-hash>

# Or restore from backup
git checkout HEAD~1 -- src/pages/CostAggregation.tsx
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Execution Time | < 10s | Vitest duration |
| Test Pass Rate | 100% | 12/12 tests pass |
| Full Suite Pass Rate | 100% | 249/249 tests pass |
| TypeScript Errors | 0 | `npm run build` exit code |
| ESLint Warnings | 0 new | `npm run lint` output |
| Bundle Size Impact | < 1% | Build artifact comparison |
| Manual QA Pass | 100% | All test scenarios pass |

---

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Refactor | 30 min | Refactored component |
| Phase 2: Verification | 15 min | Passing test suite |
| Phase 3: QA | 30 min | QA sign-off |
| **Total** | **75 min** | **Production-ready code** |

---

## Sign-Off

- [ ] Code Review Complete
- [ ] Test Suite Passing
- [ ] TypeScript Compilation Successful
- [ ] ESLint Clean
- [ ] Manual QA Complete
- [ ] No Regressions Detected
- [ ] Documentation Updated

---

**Approved By:** _________________  
**Date:** _________________
