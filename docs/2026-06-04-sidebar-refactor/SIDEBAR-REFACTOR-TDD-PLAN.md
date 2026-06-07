# ACC Sidebar Refactor — TDD Implementation Plan

**Date:** 2026-06-04  
**Source Assessment:** `docs/assessments/2026-06-04-sidebar-ux/SIDEBAR-UX-OVERLOAD-ASSESSMENT.md`  
**Status:** Ready for execution  
**Total Estimated Effort:** 6.5 days  
**Pattern:** TDD (Red → Green → Refactor) per component

---

## Executive Summary

Refactor the sidebar from **15 flat navigation items** into **6 collapsible, frequency-ordered groups** with **5 visible items by default**. Absorb Handoffs and Messages as tabs inside Orchestrate. Rename Connectors → Integrations. Add keyboard shortcuts. Persist collapse state.

---

## Architecture Decision: Keep Routes, Absorb Views

**Decision:** Handoffs and Messages remain as separate `<Route>` entries in `App.tsx` that **render inside the Orchestrate page** via nested routing, rather than deleting routes entirely.

**Rationale:**
- Preserves deep-linking: `/orchestrate/handoffs` still works
- No breaking changes to `orchestrationStore` (both pages already depend on it)
- Orchestrate page gains a tab bar — Handoffs and Messages render as tab panels
- Standalone routes (`/handoffs`, `/messages`) redirect to `/orchestrate/handoffs`, `/orchestrate/messages`
- This is the least-breaking change with the best UX outcome

**Route structure after refactor:**

```
/                        → redirect to /runner
/runner                  → Runner (unchanged)
/route                   → Route (unchanged)
/orchestrate             → Orchestrate (wave plan tab)
/orchestrate/handoffs    → Orchestrate (handoffs tab)
/orchestrate/messages    → Orchestrate (messages tab)
/handoffs                → redirect to /orchestrate/handoffs
/messages                → redirect to /orchestrate/messages
/assets                  → Assets (unchanged)
/outcomes                → Outcomes (unchanged)
/replay                  → Replay (unchanged)
/playbooks               → Playbooks (unchanged)
/integrations            → Integrations (renamed from /connectors)
/connectors              → redirect to /integrations
/knowledge               → Knowledge (unchanged)
/scheduler               → Scheduler (unchanged)
/costs                   → Costs (unchanged)
/settings                → Settings (unchanged)
```

---

## Phase 1: Foundation — Collapsible Sidebar Component (TDD)

### Test File: `src/__tests__/components/Sidebar.test.tsx`

**Test 1.1 — Renders all groups in correct order**

```typescript
describe("Sidebar", () => {
  it("renders groups in frequency order: WORK, REVIEW, CONFIGURE, AUTOMATE, SYSTEM", () => {
    render(<Sidebar />);
    const groups = screen.getAllByRole("button", { name: /^(WORK|REVIEW|CONFIGURE|AUTOMATE|SYSTEM)$/ });
    expect(groups).toHaveLength(5);
    expect(groups[0]).toHaveTextContent("WORK");
    expect(groups[1]).toHaveTextContent("REVIEW");
    expect(groups[2]).toHaveTextContent("CONFIGURE");
    expect(groups[3]).toHaveTextContent("AUTOMATE");
    expect(groups[4]).toHaveTextContent("SYSTEM");
  });
});
```

**Test 1.2 — Runner is always visible, not inside a collapsible group**

```typescript
  it("renders Runner as a persistent top item outside any group", () => {
    render(<Sidebar />);
    const runner = screen.getByRole("link", { name: /Runner/ });
    expect(runner).toBeInTheDocument();
    // Runner should NOT be inside a collapsible section
    expect(runner.closest("[data-collapsible]")).toBeNull();
  });
```

**Test 1.3 — WORK group is expanded by default**

```typescript
  it("expands WORK group by default", () => {
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /Orchestrate/ })).toBeVisible();
    expect(screen.getByRole("link", { name: /Knowledge/ })).toBeVisible();
  });
```

**Test 1.4 — REVIEW, CONFIGURE, AUTOMATE, SYSTEM are collapsed by default**

```typescript
  it("collapses REVIEW, CONFIGURE, AUTOMATE, SYSTEM groups by default", () => {
    render(<Sidebar />);
    expect(screen.queryByRole("link", { name: /Outcomes/ })).not.toBeVisible();
    expect(screen.queryByRole("link", { name: /Route/ })).not.toBeVisible();
    expect(screen.queryByRole("link", { name: /Scheduler/ })).not.toBeVisible();
    expect(screen.queryByRole("link", { name: /Costs/ })).not.toBeVisible();
  });
```

**Test 1.5 — Clicking a collapsed group header expands it**

```typescript
  it("expands a collapsed group on header click", async () => {
    render(<Sidebar />);
    const reviewHeader = screen.getByRole("button", { name: /REVIEW/ });
    await userEvent.click(reviewHeader);
    expect(screen.getByRole("link", { name: /Outcomes/ })).toBeVisible();
    expect(screen.getByRole("link", { name: /Replay/ })).toBeVisible();
  });
```

**Test 1.6 — Clicking an expanded group header collapses it**

```typescript
  it("collapses an expanded group on header click", async () => {
    render(<Sidebar />);
    const workHeader = screen.getByRole("button", { name: /WORK/ });
    await userEvent.click(workHeader);
    expect(screen.queryByRole("link", { name: /Orchestrate/ })).not.toBeVisible();
  });
```

**Test 1.7 — Only one group can be expanded at a time (accordion behavior)**

```typescript
  it("behaves as accordion — expanding one group collapses others", async () => {
    render(<Sidebar />);
    await userEvent.click(screen.getByRole("button", { name: /REVIEW/ }));
    await userEvent.click(screen.getByRole("button", { name: /CONFIGURE/ }));
    // Only CONFIGURE should show its children
    expect(screen.getByRole("link", { name: /Route/ })).toBeVisible();
    expect(screen.queryByRole("link", { name: /Outcomes/ })).not.toBeVisible();
  });
```

**Test 1.8 — Active route auto-expands its parent group**

```typescript
  it("auto-expands the group containing the active route", () => {
    window.history.pushState({}, "", "/outcomes");
    render(<Sidebar />);
    // REVIEW group should be expanded because /outcomes is active
    expect(screen.getByRole("link", { name: /Outcomes/ })).toBeVisible();
  });
```

**Test 1.9 — Knowledge badge renders on group header when collapsed and items exist**

```typescript
  it("shows new-items badge on collapsed Knowledge group", () => {
    // Mock knowledge store with 3 new items
    render(<Sidebar />);
    // Collapse WORK group
    const workHeader = screen.getByRole("button", { name: /WORK/ });
    // Badge should appear on collapsed header
    expect(workHeader).toHaveTextContent("3");
  });
```

**Test 1.10 — Keyboard shortcut Ctrl+1 navigates to Runner**

```typescript
  it("handles keyboard shortcuts", async () => {
    render(<Sidebar />);
    await userEvent.keyboard("{Control>}1{/Control}");
    expect(window.location.pathname).toBe("/runner");
  });
```

### Implementation: `src/components/layout/Sidebar.tsx`

**New interface:**

```typescript
interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
}
```

**Group definitions:**

```typescript
const navGroups: NavGroup[] = [
  {
    id: "work",
    label: "WORK",
    items: [
      { path: "/orchestrate", label: "Orchestrate", icon: Workflow },
      { path: "/knowledge", label: "Knowledge", icon: Brain },
    ],
  },
  {
    id: "review",
    label: "REVIEW",
    items: [
      { path: "/outcomes", label: "Outcomes", icon: BarChart3 },
      { path: "/replay", label: "Replay", icon: Clock },
    ],
  },
  {
    id: "configure",
    label: "CONFIGURE",
    items: [
      { path: "/route", label: "Route", icon: Map },
      { path: "/assets", label: "Assets", icon: FolderOpen },
      { path: "/integrations", label: "Integrations", icon: BookMarked },
    ],
  },
  {
    id: "automate",
    label: "AUTOMATE",
    items: [
      { path: "/scheduler", label: "Scheduler", icon: Clock4 },
      { path: "/playbooks", label: "Playbooks", icon: Boxes },
    ],
  },
  {
    id: "system",
    label: "SYSTEM",
    items: [
      { path: "/costs", label: "Costs", icon: DollarSign },
      { path: "/settings", label: "Settings", icon: Settings },
    ],
  },
];
```

**Collapse state management:**

```typescript
// In settingsStore.ts
interface SettingsState {
  // ... existing fields
  sidebarCollapsed: Record<string, boolean>; // { "review": true, "configure": true }
  toggleSidebarGroup: (groupId: string) => void;
}

// Default: WORK open, all others collapsed
const DEFAULT_SETTINGS = {
  // ... existing
  sidebarCollapsed: {
    work: false,
    review: true,
    configure: true,
    automate: true,
    system: true,
  },
};
```

**Component logic:**

```typescript
export function Sidebar() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { sidebarCollapsed, toggleSidebarGroup } = useSettingsStore();
  const newItems = useKnowledgeStore((s) => s.newItemsSinceLastVisit);

  // Auto-expand group containing active route
  useEffect(() => {
    const activeGroup = navGroups.find(g =>
      g.items.some(i => location.pathname.startsWith(i.path))
    );
    if (activeGroup && sidebarCollapsed[activeGroup.id]) {
      toggleSidebarGroup(activeGroup.id);
    }
  }, [location.pathname]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const shortcuts: Record<string, string> = {
          "1": "/runner",
          "2": "/orchestrate",
          "3": "/knowledge",
          "4": "/outcomes",
          "5": "/replay",
          ",": "/settings",
        };
        const target = shortcuts[e.key];
        if (target) {
          e.preventDefault();
          window.location.href = target;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full w-[240px] flex-col glass-panel relative">
        {/* ... header unchanged ... */}

        {/* Persistent Runner */}
        <div className="p-2">
          <SidebarLink
            path="/runner"
            label="Runner"
            icon={Rocket}
            isActive={location.pathname === "/runner"}
            shortcut="Ctrl+1"
          />
        </div>
        <Separator className="border-glass-border" />

        <ScrollArea className="flex-1">
          <div className="flex flex-col p-2">
            {navGroups.map((group) => {
              const isCollapsed = sidebarCollapsed[group.id] ?? true;
              const groupActive = group.items.some(i =>
                location.pathname.startsWith(i.path)
              );
              const badgeCount = group.id === "work" ? newItems : 0;

              return (
                <CollapsibleGroup
                  key={group.id}
                  label={group.label}
                  isCollapsed={isCollapsed}
                  isActive={groupActive}
                  badgeCount={isCollapsed ? badgeCount : 0}
                  onToggle={() => toggleSidebarGroup(group.id)}
                >
                  {group.items.map((item) => (
                    <SidebarLink
                      key={item.path}
                      path={item.path}
                      label={item.label}
                      icon={item.icon}
                      isActive={location.pathname === item.path}
                      shortcut={item.shortcut}
                    />
                  ))}
                </CollapsibleGroup>
              );
            })}
          </div>
        </ScrollArea>

        {/* Theme toggle unchanged */}
      </div>
    </TooltipProvider>
  );
}
```

### New Component: `src/components/layout/CollapsibleGroup.tsx`

```typescript
interface CollapsibleGroupProps {
  label: string;
  isCollapsed: boolean;
  isActive: boolean;
  badgeCount?: number;
  onToggle: () => void;
  children: React.ReactNode;
}

export function CollapsibleGroup({
  label,
  isCollapsed,
  isActive,
  badgeCount,
  onToggle,
  children,
}: CollapsibleGroupProps) {
  return (
    <div data-collapsible>
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 w-full px-2 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/60 hover:text-muted-foreground transition-colors",
          isActive && "text-indigo-400/80"
        )}
        aria-expanded={!isCollapsed}
      >
        <ChevronRight
          className={cn(
            "size-3 transition-transform duration-150",
            !isCollapsed && "rotate-90"
          )}
        />
        {label}
        {badgeCount !== undefined && badgeCount > 0 && (
          <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {badgeCount}
          </span>
        )}
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-150",
          isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
        )}
      >
        <div className="flex flex-col gap-0.5 pl-1">{children}</div>
      </div>
    </div>
  );
}
```

---

## Phase 2: Absorb Handoffs & Messages into Orchestrate (TDD)

### Test File: `src/__tests__/pages/OrchestrateTabs.test.tsx`

**Test 2.1 — Orchestrate renders with 3 tabs**

```typescript
describe("Orchestrate tabs", () => {
  it("renders three tabs: Wave Plan, Handoffs, Messages", () => {
    render(<Orchestrate />);
    expect(screen.getByRole("tab", { name: /Wave Plan/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Handoffs/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Messages/ })).toBeInTheDocument();
  });
});
```

**Test 2.2 — Wave Plan tab is active by default**

```typescript
  it("shows Wave Plan tab as active by default", () => {
    render(<Orchestrate />);
    const wavePlanTab = screen.getByRole("tab", { name: /Wave Plan/ });
    expect(wavePlanTab).toHaveAttribute("aria-selected", "true");
    // Wave plan content should be visible
    expect(screen.getByText(/Create Wave Plan/i)).toBeInTheDocument();
  });
```

**Test 2.3 — Clicking Handoffs tab shows handoff panel**

```typescript
  it("switches to Handoffs panel on tab click", async () => {
    render(<Orchestrate />);
    await userEvent.click(screen.getByRole("tab", { name: /Handoffs/ }));
    expect(screen.getByText(/Handoff Envelope/i)).toBeInTheDocument();
  });
```

**Test 2.4 — Clicking Messages tab shows message bus**

```typescript
  it("switches to Messages panel on tab click", async () => {
    render(<Orchestrate />);
    await userEvent.click(screen.getByRole("tab", { name: /Messages/ }));
    expect(screen.getByText(/Agent Communication Bus/i)).toBeInTheDocument();
  });
```

**Test 2.5 — Handoffs tab shows active handoff count badge**

```typescript
  it("shows pending handoff count on Handoffs tab badge", () => {
    // Mock orchestrationStore with 3 active handoffs
    render(<Orchestrate />);
    const handoffsTab = screen.getByRole("tab", { name: /Handoffs/i });
    expect(handoffsTab).toHaveTextContent("3");
  });
```

**Test 2.6 — Messages tab shows open signal count badge**

```typescript
  it("shows open signal count on Messages tab badge", () => {
    // Mock orchestrationStore with 2 open ACB signals
    render(<Orchestrate />);
    const messagesTab = screen.getByRole("tab", { name: /Messages/i });
    expect(messagesTab).toHaveTextContent("2");
  });
```

**Test 2.7 — Nested route /orchestrate/handoffs opens Handoffs tab directly**

```typescript
  it("opens Handoffs tab when navigating to /orchestrate/handoffs", () => {
    window.history.pushState({}, "", "/orchestrate/handoffs");
    render(<Orchestrate />);
    expect(screen.getByRole("tab", { name: /Handoffs/ })).toHaveAttribute("aria-selected", "true");
  });
```

**Test 2.8 — Legacy /handoffs redirects to /orchestrate/handoffs**

```typescript
  it("redirects /handoffs to /orchestrate/handoffs", () => {
    window.history.pushState({}, "", "/handoffs");
    render(<App />);
    expect(window.location.pathname).toBe("/orchestrate/handoffs");
  });
```

### Implementation: `src/pages/Orchestrate.tsx`

**Changes:**

1. Add tab bar at top of page:

```typescript
const TABS = [
  { id: "plan", label: "Wave Plan", icon: Waves },
  { id: "handoffs", label: "Handoffs", icon: ClipboardList },
  { id: "messages", label: "Messages", icon: MessageSquare },
] as const;

type TabId = typeof TABS[number]["id"];
```

2. Derive active tab from URL:

```typescript
const location = useLocation();
const activeTab: TabId = location.pathname.includes("/handoffs")
  ? "handoffs"
  : location.pathname.includes("/messages")
  ? "messages"
  : "plan";
```

3. Navigate on tab click using `useNavigate()`:

```typescript
const navigate = useNavigate();
const handleTabChange = (tabId: TabId) => {
  const paths: Record<TabId, string> = {
    plan: "/orchestrate",
    handoffs: "/orchestrate/handoffs",
    messages: "/orchestrate/messages",
  };
  navigate(paths[tabId]);
};
```

4. Render Handoffs and Messages as inline components (not separate pages). Export their content as `<HandoffPanel />` and `<MessagePanel />` from their respective files, then import and conditionally render in Orchestrate:

```typescript
import { HandoffPanel } from "@/components/orchestrate/HandoffPanel";
import { MessagePanel } from "@/components/orchestrate/MessagePanel";

// In render:
{activeTab === "plan" && <WavePlanView />}
{activeTab === "handoffs" && <HandoffPanel />}
{activeTab === "messages" && <MessagePanel />}
```

5. Extract `<HandoffPanel />` from `Handoffs.tsx` and `<MessagePanel />` from `Messages.tsx` — they keep all their logic but export a named component instead of being the default export page.

### File Changes:

| File | Change |
|------|--------|
| `src/pages/Orchestrate.tsx` | Add tab bar, tabs state, conditional rendering, HandoffPanel + MessagePanel imports |
| `src/pages/Handoffs.tsx` | Export `HandoffPanel` named component; keep default export for legacy route compatibility |
| `src/pages/Messages.tsx` | Export `MessagePanel` named component; keep default export for legacy route compatibility |
| `src/App.tsx` | Add nested routes `/orchestrate/handoffs`, `/orchestrate/messages`; add redirects from `/handoffs` → `/orchestrate/handoffs`, `/messages` → `/orchestrate/messages` |

---

## Phase 3: Rename Connectors → Integrations (TDD)

### Test File: `src/__tests__/pages/Integrations.test.tsx`

**Test 3.1 — /integrations renders the integrations page**

```typescript
describe("Integrations page", () => {
  it("renders at /integrations route", () => {
    window.history.pushState({}, "", "/integrations");
    render(<App />);
    expect(screen.getByText(/Integrations/i)).toBeInTheDocument();
  });
});
```

**Test 3.2 — /connectors redirects to /integrations**

```typescript
  it("redirects /connectors to /integrations", () => {
    window.history.pushState({}, "", "/connectors");
    render(<App />);
    expect(window.location.pathname).toBe("/integrations");
  });
});
```

**Test 3.3 — Sidebar shows "Integrations" not "Connectors"**

```typescript
  it("sidebar shows Integrations label in CONFIGURE group", () => {
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /Integrations/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Connectors/ })).not.toBeInTheDocument();
  });
});
```

### Implementation:

1. Update `Integrations.tsx` page title from "Connectors" to "Integrations"
2. Add route in `App.tsx`: `<Route path="/integrations" element={<Integrations />} />`
3. Add redirect: `<Route path="/connectors" element={<Navigate to="/integrations" replace />} />`
4. Update sidebar group: `{ path: "/integrations", label: "Integrations", icon: BookMarked }`
5. Remove old `/connectors` route (keep redirect)

---

## Phase 4: Keyboard Shortcuts + Accessibility (TDD)

### Test File: `src/__tests__/components/SidebarKeyboard.test.tsx`

**Test 4.1 — Ctrl+1 navigates to Runner**

```typescript
describe("Sidebar keyboard shortcuts", () => {
  it("Ctrl+1 navigates to /runner", async () => {
    render(<Sidebar />);
    await userEvent.keyboard("{Control>}1{/Control}");
    expect(window.location.pathname).toBe("/runner");
  });
});
```

**Test 4.2 — Ctrl+2 navigates to Orchestrate**

```typescript
  it("Ctrl+2 navigates to /orchestrate", async () => {
    render(<Sidebar />);
    await userEvent.keyboard("{Control>}2{/Control}");
    expect(window.location.pathname).toBe("/orchestrate");
  });
});
```

**Test 4.3 — Ctrl+, navigates to Settings**

```typescript
  it("Ctrl+, navigates to /settings", async () => {
    render(<Sidebar />);
    await userEvent.keyboard("{Control>},{/Control}");
    expect(window.location.pathname).toBe("/settings");
  });
});
```

**Test 4.4 — Groups are accessible via keyboard (Enter toggles)**

```typescript
  it("Enter key toggles a collapsed group", async () => {
    render(<Sidebar />);
    const reviewHeader = screen.getByRole("button", { name: /REVIEW/ });
    reviewHeader.focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("link", { name: /Outcomes/ })).toBeVisible();
  });
});
```

**Test 4.5 — Tab navigation moves linearly through sidebar**

```typescript
  it("supports Tab key navigation through Runner → group headers → items", async () => {
    render(<Sidebar />);
    await userEvent.tab();
    expect(screen.getByRole("link", { name: /Runner/ })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: /WORK/ })).toHaveFocus();
  });
});
```

### Implementation:

- Add `useEffect` with `keydown` listener in `Sidebar.tsx` (see Phase 1 implementation)
- Use `onKeyDown` with Enter/Space on group headers
- Use `tabIndex={0}` on group headers for keyboard focusability
- Use `aria-expanded`, `aria-controls`, `role="button"` on group headers
- Use `aria-label` on nav links for screen readers

---

## Phase 5: Collapse State Persistence (TDD)

### Test File: `src/__tests__/stores/settingsStore.test.ts` (extend existing)

**Test 5.1 — sidebarCollapsed defaults are correct**

```typescript
describe("settingsStore — sidebar collapse", () => {
  it("defaults: WORK open, all others collapsed", () => {
    const { sidebarCollapsed } = useSettingsStore.getState();
    expect(sidebarCollapsed.work).toBe(false);
    expect(sidebarCollapsed.review).toBe(true);
    expect(sidebarCollapsed.configure).toBe(true);
    expect(sidebarCollapsed.automate).toBe(true);
    expect(sidebarCollapsed.system).toBe(true);
  });
});
```

**Test 5.2 — toggleSidebarGroup flips the boolean**

```typescript
  it("toggleSidebarGroup flips collapse state", () => {
    const { toggleSidebarGroup } = useSettingsStore.getState();
    toggleSidebarGroup("review");
    expect(useSettingsStore.getState().sidebarCollapsed.review).toBe(false);
    toggleSidebarGroup("review");
    expect(useSettingsStore.getState().sidebarCollapsed.review).toBe(true);
  });
});
```

**Test 5.3 — collapse state persists to localStorage**

```typescript
  it("persists collapse state to localStorage on save", () => {
    const { toggleSidebarGroup, saveSettings } = useSettingsStore.getState();
    toggleSidebarGroup("configure");
    saveSettings({});
    const saved = JSON.parse(localStorage.getItem("acc-settings")!);
    expect(saved.sidebarCollapsed.configure).toBe(false);
  });
});
```

**Test 5.4 — collapse state loads from localStorage on init**

```typescript
  it("loads collapse state from localStorage on init", () => {
    localStorage.setItem("acc-settings", JSON.stringify({
      sidebarCollapsed: { work: true, review: false, configure: true, automate: true, system: true },
    }));
    useSettingsStore.getState().loadSettings();
    const { sidebarCollapsed } = useSettingsStore.getState();
    expect(sidebarCollapsed.work).toBe(true);
    expect(sidebarCollapsed.review).toBe(false);
  });
});
```

### Implementation:

1. Add `sidebarCollapsed` to `SettingsState` interface and `DEFAULT_SETTINGS`
2. Add `toggleSidebarGroup(groupId: string)` method
3. Include `sidebarCollapsed` in `saveSettings` and `loadSettings` localStorage round-trip
4. No new file — extend existing `src/stores/settingsStore.ts`

---

## Phase 6: Integration — Wire Everything in App.tsx (TDD)

### Test File: `src/__tests__/App.test.tsx` (extend existing)

**Test 6.1 — App renders sidebar with groups, not flat items**

```typescript
describe("App integration", () => {
  it("renders sidebar with 5 collapsible groups", () => {
    render(<App />);
    const groups = screen.getAllByRole("button", { name: /(WORK|REVIEW|CONFIGURE|AUTOMATE|SYSTEM)/ });
    expect(groups).toHaveLength(5);
  });
});
```

**Test 6.2 — Runner is the default route at /**

```typescript
  it("redirects / to /runner", () => {
    render(<App />);
    expect(window.location.pathname).toBe("/runner");
    expect(screen.getByText(/Runner/i)).toBeInTheDocument();
  });
});
```

**Test 6.3 — All legacy routes still work**

```typescript
  const routes = ["/route", "/assets", "/outcomes", "/replay", "/playbooks", "/knowledge", "/scheduler", "/costs", "/settings"];
  it.each(routes)("%s renders without error", (route) => {
    window.history.pushState({}, "", route);
    render(<App />);
    // No "not found" or blank screen
    expect(document.querySelector("main")).not.toBeEmptyDOMElement();
  });
});
```

**Test 6.4 — Legacy redirects work**

```typescript
  it("redirects /handoffs → /orchestrate/handoffs", () => {
    window.history.pushState({}, "", "/handoffs");
    render(<App />);
    expect(window.location.pathname).toBe("/orchestrate/handoffs");
  });

  it("redirects /messages → /orchestrate/messages", () => {
    window.history.pushState({}, "", "/messages");
    render(<App />);
    expect(window.location.pathname).toBe("/orchestrate/messages");
  });

  it("redirects /connectors → /integrations", () => {
    window.history.pushState({}, "", "/connectors");
    render(<App />);
    expect(window.location.pathname).toBe("/integrations");
  });
});
```

### Implementation: `src/App.tsx`

**Updated routes:**

```typescript
<Routes>
  <Route path="/" element={<Navigate to="/runner" replace />} />
  <Route path="/runner" element={<Runner />} />
  <Route path="/route" element={<RoutePage />} />
  <Route path="/orchestrate" element={<Orchestrate />} />
  <Route path="/orchestrate/handoffs" element={<Orchestrate />} />
  <Route path="/orchestrate/messages" element={<Orchestrate />} />
  <Route path="/handoffs" element={<Navigate to="/orchestrate/handoffs" replace />} />
  <Route path="/messages" element={<Navigate to="/orchestrate/messages" replace />} />
  <Route path="/assets" element={<Assets />} />
  <Route path="/outcomes" element={<Outcomes />} />
  <Route path="/replay" element={<Replay />} />
  <Route path="/playbooks" element={<Playbooks />} />
  <Route path="/integrations" element={<Integrations />} />
  <Route path="/connectors" element={<Navigate to="/integrations" replace />} />
  <Route path="/knowledge" element={<Knowledge />} />
  <Route path="/scheduler" element={<Scheduler />} />
  <Route path="/costs" element={<CostAggregation />} />
  <Route path="/settings" element={<Settings />} />
  <Route path="*" element={<PlaceholderPage />} />
</Routes>
```

---

## Execution Order (TDD Red-Green-Refactor)

```
STEP 1 — settingsStore.ts           ▸ Add sidebarCollapsed + toggleSidebarGroup   [write tests first, RED]
                                    ▸ Implement                                 [GREEN]
                                    ▸ Persist to localStorage                   [REFACTOR]
                                          ↓
STEP 2 — CollapsibleGroup.tsx        ▸ Build standalone component               [write tests first, RED]
                                    ▸ Implement collapse/expand animation       [GREEN]
                                    ▸ Accessibility: aria-expanded, tabIndex    [REFACTOR]
                                          ↓
STEP 3 — Sidebar.tsx                 ▸ Wire groups + CollapsibleGroup           [write tests first, RED]
                                    ▸ Auto-expand on active route               [GREEN]
                                    ▸ Keyboard shortcuts                        [REFACTOR]
                                          ↓
STEP 4 — Orchestrate.tsx (tabs)     ▸ Add tab bar + conditional rendering       [write tests first, RED]
                                    ▸ Wire to URL state                         [GREEN]
                                    ▸ Extract HandoffPanel + MessagePanel       [REFACTOR]
                                          ↓
STEP 5 — App.tsx (routes)           ▸ Add nested routes + redirects             [write tests first, RED]
                                    ▸ Wire all pages correctly                  [GREEN]
                                    ▸ Remove dead /handoffs, /messages routes   [REFACTOR]
                                          ↓
STEP 6 — Integrations rename        ▸ /connectors → /integrations               [write tests first, RED]
                                    ▸ Update sidebar label + route              [GREEN]
                                    ▸ Clean up imports                          [REFACTOR]
                                          ↓
STEP 7 — Integration QA             ▸ Run full test suite                       [ALL GREEN]
                                    ▸ Manual walkthrough: all routes work
                                    ▸ Check no broken links in codebase
                                          ↓
STEP 8 — Commit                     ▸ Squash commits by phase
```

---

## Files Created/Modified Summary

| File | Action | Tests |
|------|--------|:-----:|
| `src/__tests__/components/Sidebar.test.tsx` | **Create** | 10 tests |
| `src/__tests__/components/CollapsibleGroup.test.tsx` | **Create** | 6 tests |
| `src/__tests__/pages/OrchestrateTabs.test.tsx` | **Create** | 8 tests |
| `src/__tests__/pages/Integrations.test.tsx` | **Create** | 3 tests |
| `src/__tests__/components/SidebarKeyboard.test.tsx` | **Create** | 5 tests |
| `src/__tests__/stores/settingsStore.test.ts` | **Extend** | +4 tests |
| `src/__tests__/App.test.tsx` | **Extend** | +8 tests |
| `src/stores/settingsStore.ts` | **Modify** | Add sidebarCollapsed + toggle |
| `src/components/layout/CollapsibleGroup.tsx` | **Create** | New component |
| `src/components/layout/Sidebar.tsx` | **Rewrite** | Groups, collapse, shortcuts |
| `src/components/orchestrate/HandoffPanel.tsx` | **Create** | Extract from Handoffs.tsx |
| `src/components/orchestrate/MessagePanel.tsx` | **Create** | Extract from Messages.tsx |
| `src/pages/Orchestrate.tsx` | **Modify** | Tab bar, conditional panels |
| `src/pages/Handoffs.tsx` | **Modify** | Export HandoffPanel; keep legacy default export |
| `src/pages/Messages.tsx` | **Modify** | Export MessagePanel; keep legacy default export |
| `src/pages/Integrations.tsx` | **Modify** | Title update: Connectors → Integrations |
| `src/App.tsx` | **Modify** | New routes, redirects |

**Total: 44 tests, 12 files created/modified**

---

## Rollback Plan

If issues arise post-deploy:

1. Revert `App.tsx` routes to restore `/handoffs`, `/messages`, `/connectors` as standalone routes
2. Revert `Sidebar.tsx` to flat array (keep old file in git)
3. Orchestrate.tsx tab bar is additive — can be removed without breaking anything
4. Legacy redirects mean old bookmarks still work even during transition
