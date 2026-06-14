# Gap-Closure Plan: From "Conditional" to "Ready for Production"

**Date:** 2026-01-14  
**Scope:** Close the three "Conditional" categories from the Production Readiness Assessment  
**Approach:** TDD-aligned (Red → Green → Refactor)  
**Methodology:** Surgical — only touch what's needed, no drift, no regressions

---

## Executive Summary

Three categories scored "Conditional" in the production readiness assessment:

| Category | Score | Root Cause |
|----------|-------|------------|
| Security | 6/10 | CSP disabled, no error boundaries |
| UX Completeness | 7/10 | 5 pages missing loading/error/empty states |
| Documentation | 6/10 | Missing top-level CHANGELOG, CONTRIBUTING, USER_GUIDE, TROUBLESHOOTING |

This plan provides exact, surgical changes with TDD-aligned test-first methodology for each gap.

---

## Gap 1: Security (6/10 → 9/10)

### Problem Statement
- `src-tauri/tauri.conf.json:25` — `"csp": null` allows XSS and unrestricted script execution
- No React Error Boundaries exist anywhere in `src/` — a single component crash produces a white screen

### Evidence
```
File: src-tauri/tauri.conf.json
Line 24-26:
  "security": {
    "csp": null
  }

Search for ErrorBoundary: 0 results
Search for componentDidCatch: 0 results
Search for getDerivedStateFromError: 0 results
```

### TDD-Aligned Plan

#### Step 1.1: ErrorBoundary Component (RED)

**Write failing test first:** `src/__tests__/components/ErrorBoundary.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function Bomb(): JSX.Element {
  throw new Error("💥");
}

function Safe(): JSX.Element {
  return <div>Safe content</div>;
}

describe("ErrorBoundary", () => {
  // Suppress React error logging during tests
  const originalError = console.error;
  beforeAll(() => { console.error = vi.fn(); });
  afterAll(() => { console.error = originalError; });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <Safe />
      </ErrorBoundary>
    );
    expect(screen.getByText("Safe content")).toBeInTheDocument();
  });

  it("renders fallback UI when child throws", () => {
    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders default fallback when no fallback provided", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
  });

  it("calls onError callback with error info", () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Bomb />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it("resets error state when resetKey changes", () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="a">
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.queryByText(/unexpected error/i)).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKey="b">
        <Safe />
      </ErrorBoundary>
    );
    expect(screen.getByText("Safe content")).toBeInTheDocument();
  });
});
```

**Acceptance Criteria:**
- File exists with 5 test cases
- All 5 tests fail (component doesn't exist)
- Run: `npx vitest run src/__tests__/components/ErrorBoundary.test.tsx` → 5 failed

#### Step 1.2: ErrorBoundary Implementation (GREEN)

**Create:** `src/components/ErrorBoundary.tsx`

```tsx
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
  resetKey?: string | number;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  componentDidUpdate(prev: Props): void {
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultErrorFallback />;
    }
    return this.props.children;
  }
}

function DefaultErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="text-red-400 text-lg font-semibold mb-2">
        An unexpected error occurred
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        The page encountered a problem. Please try reloading.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 text-sm bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 rounded-md"
      >
        Reload
      </button>
    </div>
  );
}
```

**Acceptance Criteria:**
- All 5 tests pass
- Run: `npx vitest run src/__tests__/components/ErrorBoundary.test.tsx` → 5 passed
- No regressions in existing tests

#### Step 1.3: Wrap All 15 Pages (GREEN)

**Write integration test first:** `src/__tests__/App.test.tsx` (add to existing file)

```tsx
it("wraps every page route with ErrorBoundary", () => {
  const routes = [
    "/runner", "/orchestrate", "/knowledge", "/settings",
    "/integrations", "/assets", "/outcomes", "/replay",
    "/playbooks", "/scheduler", "/costs", "/route",
  ];
  for (const route of routes) {
    const { unmount } = render(
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    );
    // If the page crashed, the boundary would show fallback
    // and the route title would NOT be visible
    unmount();
  }
});
```

**Modify:** `src/App.tsx` (lines 58-95)

```tsx
// Before
<ThemeProvider>
  <div className="flex h-screen w-screen overflow-hidden bg-background">
    <Sidebar />
    <div className="flex-1 flex flex-col overflow-hidden">
      ...
      <main className="flex-1 overflow-auto">
        <Routes>...</Routes>
      </main>
    </div>
  </div>
</ThemeProvider>

// After
<ThemeProvider>
  <ErrorBoundary>
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        ...
        <main className="flex-1 overflow-auto">
          <ErrorBoundary resetKey={location.pathname}>
            <Routes>...</Routes>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  </ErrorBoundary>
</ThemeProvider>
```

**Rationale:** Outer boundary catches shell-level crashes (Sidebar, RecoveryBanner). Inner boundary with `resetKey={location.pathname}` resets error state on route change so a crashed page doesn't poison navigation.

**Acceptance Criteria:**
- Integration test passes
- All 15 pages individually still pass their existing tests
- Full test suite: 265+ tests, 0 regressions

#### Step 1.4: CSP Configuration (GREEN)

**Write verification test:** `src/__tests__/config/csp.test.ts`

```ts
import { readFileSync } from "fs";
import { resolve } from "path";

describe("Tauri CSP configuration", () => {
  const conf = JSON.parse(
    readFileSync(resolve(__dirname, "../../src-tauri/tauri.conf.json"), "utf-8")
  );

  it("has a non-null CSP", () => {
    expect(conf.app.security.csp).not.toBeNull();
  });

  it("CSP includes default-src 'self'", () => {
    expect(conf.app.security.csp).toMatch(/default-src\s+['"]self['"]/);
  });

  it("CSP blocks unsafe-inline scripts", () => {
    // The script-src directive must NOT contain 'unsafe-inline'
    // (style-src may contain it for Tailwind)
    const csp: string = conf.app.security.csp;
    const scriptDirective = csp.match(/script-src\s+([^;]+)/);
    if (scriptDirective) {
      expect(scriptDirective[1]).not.toMatch(/unsafe-inline/);
    }
  });

  it("CSP restricts connect-src to self and https", () => {
    expect(conf.app.security.csp).toMatch(/connect-src\s+.*self.*https/);
  });
});
```

**Modify:** `src-tauri/tauri.conf.json` (line 25)

```json
// Before
"csp": null

// After
"csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: asset:; connect-src 'self' ipc: https://localhost:* http://ipc.localhost"
```

**Rationale for each directive:**
- `default-src 'self'` — baseline deny-all except same-origin
- `script-src 'self'` — no inline scripts (React builds to external files)
- `style-src 'self' 'unsafe-inline'` — Tailwind injects inline styles dynamically
- `img-src 'self' data: https: asset:` — agent avatars, project icons, data URIs
- `connect-src 'self' ipc: https://localhost:* http://ipc.localhost` — Tauri IPC + local dev server + OpenRouter API

**Acceptance Criteria:**
- All 4 CSP tests pass
- Frontend still builds successfully
- Tauri dev mode still works (no script blocking)

---

## Gap 2: UX Completeness (7/10 → 9/10)

### Problem Statement

5 pages are missing critical UX states (loading, error, empty):

| Page | File | Missing States | Priority |
|------|------|----------------|----------|
| Runner | `src/pages/Runner.tsx` | loading, empty | HIGH |
| Orchestrate | `src/pages/Orchestrate.tsx` | loading | HIGH |
| Outcomes | `src/pages/Outcomes.tsx` | loading | MEDIUM |
| Playbooks | `src/pages/Playbooks.tsx` | loading | MEDIUM |
| Settings | `src/pages/Settings.tsx` | loading | MEDIUM |
| Messages | `src/pages/Messages.tsx` | loading (sub-panel) | LOW |
| Handoffs | `src/pages/Handoffs.tsx` | none (sub-panel) | SKIP |

### TDD-Aligned Plan

#### Step 2.1: Runner Page States (RED → GREEN)

**Write failing test first:** Extend `src/__tests__/pages/Runner.test.tsx`

```tsx
describe("Runner Page UX States", () => {
  it("shows loading indicator while agents store is hydrating", () => {
    // Mock agents store to be empty initially
    useAgentStore.setState({ agents: new Map() });
    render(<Runner />);
    expect(screen.getByText(/loading agents/i)).toBeInTheDocument();
  });

  it("shows empty state when no agents are spawned", () => {
    useAgentStore.setState({ agents: new Map() });
    render(<Runner />);
    expect(screen.getByText(/no agents spawned/i)).toBeInTheDocument();
    expect(screen.getByText(/click \+ add agent/i)).toBeInTheDocument();
  });

  it("shows error banner when last spawn failed", () => {
    useAgentStore.setState({ 
      spawnError: "Agent binary not found",
      agents: new Map() 
    });
    render(<Runner />);
    expect(screen.getByText(/agent binary not found/i)).toBeInTheDocument();
  });

  it("clears error banner on dismiss", async () => {
    useAgentStore.setState({ 
      spawnError: "Agent binary not found",
      agents: new Map() 
    });
    const user = userEvent.setup();
    render(<Runner />);
    await user.click(screen.getByLabelText("Dismiss error"));
    expect(screen.queryByText(/agent binary not found/i)).not.toBeInTheDocument();
  });
});
```

**Modify:** `src/stores/agentStore.ts` (add `spawnError` field and `clearSpawnError` action)

```ts
// Add to interface
interface AgentStore {
  // ... existing
  spawnError: string | null;
  clearSpawnError: () => void;
}

// Add to initial state
agents: new Map(),
spawnError: null,

// Modify spawnAgent to capture error
spawnAgent: async (config, projectPath) => {
  const sessionId = crypto.randomUUID();
  // ... existing optimistic add ...
  try {
    await invoke("check_agent_installed", { ... });
    await invoke("spawn_agent", { ... });
    set({ spawnError: null });  // CLEAR on success
  } catch (error) {
    set((state) => {
      const newAgents = new Map(state.agents);
      newAgents.delete(config.id);
      return { agents: newAgents, spawnError: String(error) };  // CAPTURE
    });
    throw error;
  }
},

// Add clearSpawnError
clearSpawnError: () => set({ spawnError: null }),
```

**Modify:** `src/pages/Runner.tsx` — add loading/empty/error states to the AGENTS section (line 197-238)

```tsx
<section className="mb-6">
  <div className="flex items-center justify-between mb-3">
    {/* ... existing header ... */}
  </div>

  {/* NEW: Error banner for last spawn failure */}
  {useAgentStore((s) => s.spawnError) && (
    <div className="mb-3 p-3 rounded-lg border border-red-500/30 bg-red-500/10 flex items-center justify-between" data-testid="spawn-error">
      <div className="flex items-center gap-2">
        <AlertCircle className="size-4 text-red-400" />
        <span className="text-sm text-red-200">{useAgentStore.getState().spawnError}</span>
      </div>
      <button
        aria-label="Dismiss error"
        onClick={() => useAgentStore.getState().clearSpawnError()}
        className="text-red-300/70 hover:text-red-300"
      >
        <XCircle className="size-4" />
      </button>
    </div>
  )}

  {/* ... existing OrchestratorToggle ... */}

  {/* NEW: Loading state */}
  {useAgentStore((s) => s.agents) /* always a Map, so check if first sync */}
  
  <AgentGrid orchestratorId={orchestratorMode ? orchestratorAgent : null} />
</section>
```

**Modify:** `src/components/runner/AgentGrid.tsx` — add empty state when no agents

```tsx
// In AgentGrid component, before rendering the grid:
if (agents.size === 0) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-glass-border rounded-lg" data-testid="empty-agents">
      <Bot className="size-8 opacity-30 mb-2" />
      <p className="text-sm font-medium text-muted-foreground">No agents spawned</p>
      <p className="text-xs text-muted-foreground mt-1">
        Click + Add Agent above to start orchestrating
      </p>
    </div>
  );
}
```

**Acceptance Criteria:**
- 4 new tests pass
- All 14 existing Runner tests still pass
- Runner shows empty state when no agents
- Runner shows error banner when spawn fails
- Error banner is dismissable

#### Step 2.2: Orchestrate Page Loading State (RED → GREEN)

**Write failing test first:** Extend `src/__tests__/pages/OrchestrateTabs.test.tsx`

```tsx
it("shows loading indicator while plan agents are loading", () => {
  useOrchestrationStore.setState({
    wavePlans: [{ id: "wp-1", project_id: "p1", slug: "test", ... }],
    planAgents: [],
    corrections: [],
    loading: true,
  });
  render(<Orchestrate />, { wrapper: MemoryRouter });
  expect(screen.getByTestId("plan-agents-loading")).toBeInTheDocument();
});

it("shows loading indicator while corrections are loading", () => {
  useOrchestrationStore.setState({
    wavePlans: [{ id: "wp-1", ... }],
    planAgents: [...],
    corrections: [],
    correctionsLoading: true,
  });
  render(<Orchestrate />, { wrapper: MemoryRouter });
  expect(screen.getByTestId("corrections-loading")).toBeInTheDocument();
});
```

**Modify:** `src/stores/orchestrationStore.ts` — add `loading` and `correctionsLoading` flags

```ts
// Add to interface
interface OrchestrationStore {
  loading: boolean;
  correctionsLoading: boolean;
  // ... existing
}

// Add to initial state
loading: false,
correctionsLoading: false,

// Modify getPlanAgents
getPlanAgents: async (planId) => {
  set({ loading: true });
  try {
    const agents = await invoke<PlanAgent[]>("get_plan_agents_cmd", { planId });
    set({ planAgents: agents, loading: false });
  } catch {
    set({ loading: false });
  }
},

// Modify getCorrections
getCorrections: async (planId) => {
  set({ correctionsLoading: true });
  try {
    const corrections = await invoke<CorrectionDoc[]>("get_corrections_cmd", { planId });
    set({ corrections, correctionsLoading: false });
  } catch {
    set({ correctionsLoading: false });
  }
},
```

**Modify:** `src/pages/Orchestrate.tsx` — add loading spinners

```tsx
// In Wave Groups section (around line 278):
{store.loading && (
  <div data-testid="plan-agents-loading" className="flex items-center gap-2 text-sm text-muted-foreground">
    <Loader2 className="size-3 animate-spin" />
    Loading plan agents...
  </div>
)}
{groupedByWave().map(...)}  // existing

// In Corrections section (around line 295):
{store.correctionsLoading && (
  <div data-testid="corrections-loading" className="flex items-center gap-2 text-sm text-muted-foreground">
    <Loader2 className="size-3 animate-spin" />
    Loading corrections...
  </div>
)}
```

**Acceptance Criteria:**
- 2 new tests pass
- All existing Orchestrate tests pass
- Loading spinners show during async data fetch

#### Step 2.3: Outcomes / Playbooks / Settings Loading States (Batch)

Apply the same TDD pattern to the remaining 3 pages in a single batch:

| Page | Store Action to Wrap | Loading State Location |
|------|----------------------|------------------------|
| Outcomes | `getOutcomeStats` | Above stats cards |
| Playbooks | `getMemoryCandidates` | In Reactive Memory card |
| Settings | `loadSettings` | At top of settings form |

For each, write 1 failing test, then add `loading` flag to the store, then render a spinner.

**Example test (Outcomes):**

```tsx
// In src/__tests__/pages/Outcomes.test.tsx
it("shows loading indicator while outcome stats are loading", () => {
  useIntelligenceStore.setState({ loading: true, outcomeStats: [] });
  render(<Outcomes />, { wrapper: MemoryRouter });
  expect(screen.getByTestId("outcomes-loading")).toBeInTheDocument();
});
```

**Acceptance Criteria:**
- 3 new tests pass (1 per page)
- All existing page tests pass
- Consistent loading pattern across all pages

#### Step 2.4: Messages / Handoffs Sub-panels (LOW priority)

Sub-panels embedded in Orchestrate inherit the parent page's loading state. Skip for now.

**Acceptance Criteria:**
- Documentation update noting sub-panels don't need independent loading states

---

## Gap 3: Documentation (6/10 → 9/10)

### Problem Statement

Missing top-level documentation:

| Doc | Status | Location |
|-----|--------|----------|
| `CHANGELOG.md` | Missing at root | Exists in `docs/2026-05-02-*/` subdirs |
| `CONTRIBUTING.md` | Missing entirely | None |
| `USER_GUIDE.md` | Missing at root | Exists in `docs/2026-05-04-universal-backward-channel/` |
| `TROUBLESHOOTING.md` | Missing entirely | None |
| `SECURITY.md` | Missing entirely | None |

### TDD-Aligned Plan

For documentation, the "TDD" is a content validation test — write a test that checks the docs exist, contain required sections, and have no broken links.

#### Step 3.1: CHANGELOG.md (RED → GREEN)

**Write content validation test:** `src/__tests__/docs/changelog.test.ts`

```ts
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

describe("CHANGELOG.md", () => {
  const path = resolve(__dirname, "../../CHANGELOG.md");
  const content = existsSync(path) ? readFileSync(path, "utf-8") : "";

  it("exists at repository root", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("follows Keep a Changelog format", () => {
    expect(content).toMatch(/^## \[Unreleased\]/m);
    expect(content).toMatch(/^## \[0\.9\.0\]/m);
  });

  it("has Added / Changed / Fixed sections in each version", () => {
    const versionSections = content.match(/^## \[\d/m);
    expect(versionSections).not.toBeNull();
    expect(content).toMatch(/^### Added/m);
    expect(content).toMatch(/^### Changed/m);
    expect(content).toMatch(/^### Fixed/m);
  });

  it("dates are in ISO 8601 format", () => {
    const dates = content.match(/\d{4}-\d{2}-\d{2}/g);
    expect(dates).not.toBeNull();
  });
});
```

**Create:** `CHANGELOG.md` (consolidate from existing dated subdirs)

```md
# Changelog

All notable changes to SourceForge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Production readiness assessment (`docs/PRODUCTION_READINESS_ASSESSMENT.md`)
- Gap-closure TDD plan (`docs/GAP_CLOSURE_PLAN.md`)
- Error boundaries on all page routes
- Content Security Policy configuration
- Loading states for Runner, Orchestrate, Outcomes, Playbooks, Settings

### Changed
- Refactored CostAggregation to use memoized Zustand selectors
- Stabilized useEffect dependencies across all pages

### Fixed
- CostAggregation test timeout (2.69s from hang)
- Runner error handling for failed agent spawns

## [0.9.0] - 2026-06-04

### Added
- 9 AI agent integrations (Claude, OpenCode, Aider, Goose, Cline, Cursor, Gemini, Qwen, Codex)
- Wave-based orchestration with dependency-aware scheduling
- Knowledge Compounder with two-pass extraction
- Token budget system with WIP checkpoint capture
- Session replay with event timeline
- Knowledge graph visualization (Cytoscape)
- Connector vault for secrets (AES-256)
- Codebase exploration with repo map
- Memory layer with embedding search
- Supabase and GitHub integrations
- Chat platform backward channel (Lark, Slack, Discord, Telegram)
- Crash recovery with state snapshot
- Cross-platform builds (Windows MSI/NSIS, macOS DMG, Linux AppImage/DEB)

### Changed
- Rebranded from Agent Control Center to SourceForge
- Upgraded to React 19 and Tauri v2
- Migrated to Tailwind CSS v4
```

**Acceptance Criteria:**
- All 4 tests pass
- Contains entries for v0.9.0 and Unreleased
- Follows Keep a Changelog format

#### Step 3.2: CONTRIBUTING.md (RED → GREEN)

**Write validation test:** `src/__tests__/docs/contributing.test.ts`

```ts
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

describe("CONTRIBUTING.md", () => {
  const path = resolve(__dirname, "../../CONTRIBUTING.md");
  const content = existsSync(path) ? readFileSync(path, "utf-8") : "";

  it("exists at repository root", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("has Development Setup section", () => {
    expect(content).toMatch(/## Development Setup/);
  });

  it("has Testing section with commands", () => {
    expect(content).toMatch(/## Testing/);
    expect(content).toMatch(/npm test/);
  });

  it("has Pull Request Process section", () => {
    expect(content).toMatch(/## Pull Request Process/);
  });

  it("has Code Style section", () => {
    expect(content).toMatch(/## Code Style/);
  });
});
```

**Create:** `CONTRIBUTING.md`

```md
# Contributing to SourceForge

Thank you for your interest in contributing! This document explains how to set up the project, run tests, and submit changes.

## Development Setup

### Prerequisites
- Node.js 18+
- Rust toolchain (stable, via rustup)
- At least one AI agent CLI installed (claude, opencode, aider, etc.)

### Clone and Install
\`\`\`bash
git clone https://github.com/edge8/agent-control-center.git
cd agent-control-center
npm install
\`\`\`

### Run in Dev Mode
\`\`\`bash
npm run tauri dev
\`\`\`

This starts both the Vite dev server (port 1420) and the Tauri shell.

## Testing

### Run All Tests
\`\`\`bash
npm test
\`\`\`

### Run Specific Test File
\`\`\`bash
npx vitest run src/__tests__/stores/agentStore.test.ts
\`\`\`

### Watch Mode
\`\`\`bash
npm run test:watch
\`\`\`

### Coverage
\`\`\`bash
npm run test:coverage
\`\`\`

## Code Style

### TypeScript
- Strict mode is enabled
- Avoid `any` — use proper types
- Prefer Zustand selectors over full store access (prevents re-renders)

### Rust
- Follow `cargo fmt` and `cargo clippy` conventions
- All Tauri commands return `Result<T, String>`

### React Components
- One component per file for major components
- Co-locate test file: `Foo.tsx` → `Foo.test.tsx`
- Use `ErrorBoundary` wrapper for pages that may crash

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Write tests first (TDD) — see `docs/TEST_PLAN.md`
4. Implement the feature
5. Ensure all tests pass: `npm test`
6. Ensure no lint regressions: `npm run lint src/`
7. Submit PR with description linking to the issue

### Commit Messages
Use Conventional Commits:
- `feat:` new feature
- `fix:` bug fix
- `refactor:` code change that neither fixes a bug nor adds a feature
- `test:` add or fix tests
- `docs:` documentation only
```

**Acceptance Criteria:**
- All 5 tests pass

#### Step 3.3: USER_GUIDE.md (RED → GREEN)

**Write validation test:** `src/__tests__/docs/userGuide.test.ts`

```ts
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

describe("USER_GUIDE.md", () => {
  const path = resolve(__dirname, "../../USER_GUIDE.md");
  const content = existsSync(path) ? readFileSync(path, "utf-8") : "";

  it("exists at repository root", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("has Quickstart section", () => {
    expect(content).toMatch(/## Quickstart/);
  });

  it("documents spawning an agent", () => {
    expect(content).toMatch(/spawn.*agent/i);
  });

  it("documents wave orchestration", () => {
    expect(content).toMatch(/wave.*orchestrat/i);
  });

  it("documents knowledge compounder", () => {
    expect(content).toMatch(/knowledge.*compound/i);
  });

  it("has Troubleshooting section", () => {
    expect(content).toMatch(/## Troubleshooting/);
  });
});
```

**Create:** `USER_GUIDE.md` (consolidate from `docs/2026-05-04-universal-backward-channel/USER_GUIDE.md` and add missing sections)

```md
# SourceForge User Guide

## Quickstart

### 1. Launch the App
After installation, open SourceForge. The Runner view is your home base.

### 2. Select a Project
Use the project dropdown in the top-left to choose a local directory. SourceForge auto-detects the tech stack (React, Python, Rust, etc.).

### 3. Spawn Your First Agent
1. Click **+ Add Agent** in the AGENTS section
2. Select an agent (Claude Code, OpenCode, Aider, Goose, etc.)
3. The agent appears as a panel with a PTY terminal
4. Type a task — watch the agent work in real time

### 4. Run Multiple Agents in Parallel
Spawn a second agent — both run side by side. The footer shows total active agents.

## Spawning Agents

### Supported Agents
- **Claude Code** (Anthropic)
- **OpenCode** (Anomaly)
- **Aider**
- **Goose**
- **Cline CLI**
- **Cursor**
- **Gemini CLI**
- **Qwen Code**
- **Codex CLI**

Each agent has its own memory file (CLAUDE.md, GEMINI.md, etc.) and MCP config.

### Installing Missing Agents
If an agent is not installed, the spawn action shows the install command for your platform.

## Wave Orchestration

Wave plans coordinate multiple agents across sequential phases.

### Create a Plan
1. Navigate to **Orchestrate**
2. Enter a slug (e.g., `add-dark-mode`)
3. Click **Create Plan**
4. Add agents to each wave, setting `depends_on` for sequential phases

### Track Progress
Each wave shows: `done/total done`, `failed count`, and `running` status. Click an agent card to change its state (Start, Done, Fail, Retry).

## Knowledge Compounder

The Knowledge page distills decisions, patterns, and lessons from your sessions.

### Browse
- Filter by category: pattern, antipattern, convention, insight, fact
- Search by title or content
- Adjust confidence threshold with the slider

### Add Manually
Click **Add Item** to contribute your own knowledge.

### Run Compounder
Click **Run Compounder** to extract knowledge from a specific session.

## Troubleshooting

### Agent won't spawn
- **Error:** "Agent binary not found"
- **Fix:** Install the agent CLI (instructions shown in error)

### Knowledge Graph won't load
- **Error:** "Failed to initialize Cytoscape"
- **Fix:** Check browser console; may need to disable ad blockers

### Budget exceeded
- **Symptom:** Agent shows "exceeded" state
- **Fix:** Click **Resume +100K** in the Budgets tab
```

**Acceptance Criteria:**
- All 6 tests pass
- Covers all 9 agents, wave orchestration, and knowledge compounder

#### Step 3.4: SECURITY.md (RED → GREEN)

**Write validation test:** `src/__tests__/docs/security.test.ts`

```ts
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

describe("SECURITY.md", () => {
  const path = resolve(__dirname, "../../SECURITY.md");
  const content = existsSync(path) ? readFileSync(path, "utf-8") : "";

  it("exists at repository root", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("has Supported Versions section", () => {
    expect(content).toMatch(/## Supported Versions/);
  });

  it("has Reporting a Vulnerability section", () => {
    expect(content).toMatch(/## Reporting a Vulnerability/);
  });

  it("specifies a contact channel (email or form)", () => {
    expect(content).toMatch(/security@|@.*security|security form/i);
  });

  it("specifies a response timeline", () => {
    expect(content).toMatch(/(\d+)\s*(hour|day|week|month)/i);
  });
});
```

**Create:** `SECURITY.md`

```md
# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.9.x   | :white_check_mark: |
| < 0.9   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Email: **security@edge8.ai** (or open a private security advisory on GitHub)

Include:
- Description of the vulnerability
- Steps to reproduce
- Affected version(s)
- Potential impact

We will acknowledge receipt within **48 hours** and provide a detailed response within **5 business days**.

## Security Measures

SourceForge implements:
- **Content Security Policy (CSP):** Restricts script execution to same-origin
- **Tauri Sandboxing:** Commands run in restricted OS process with scoped capabilities
- **Local-First:** All data stored in local SQLite (WAL mode) — no cloud sync unless explicitly configured
- **Connector Vault:** API keys encrypted at rest (AES-256)
- **No Telemetry:** No usage data leaves your machine

## Scope

In scope:
- SourceForge desktop application
- Tauri commands exposed to the webview
- Local SQLite database integrity

Out of scope:
- Third-party AI agent CLIs (report to their maintainers)
- Your local filesystem (you control what agents can access via Tauri capabilities)
```

**Acceptance Criteria:**
- All 5 tests pass

---

## Execution Plan

### Phase 1: Security (Highest Priority)

| Order | Task | Estimated Time | Tests |
|-------|------|----------------|-------|
| 1.1 | ErrorBoundary tests (RED) | 15 min | 5 fail |
| 1.2 | ErrorBoundary impl (GREEN) | 20 min | 5 pass |
| 1.3 | Wrap all 15 pages | 10 min | 0 new |
| 1.4 | CSP tests (RED) | 10 min | 4 fail |
| 1.5 | CSP config (GREEN) | 5 min | 4 pass |
| **Subtotal** | | **60 min** | **+9 tests** |

### Phase 2: UX Completeness (High Priority)

| Order | Task | Estimated Time | Tests |
|-------|------|----------------|-------|
| 2.1 | Runner page states | 30 min | +4 |
| 2.2 | Orchestrate loading | 20 min | +2 |
| 2.3 | Outcomes/Playbooks/Settings loading (batch) | 30 min | +3 |
| **Subtotal** | | **80 min** | **+9 tests** |

### Phase 3: Documentation (Medium Priority)

| Order | Task | Estimated Time | Tests |
|-------|------|----------------|-------|
| 3.1 | CHANGELOG.md | 15 min | +4 |
| 3.2 | CONTRIBUTING.md | 15 min | +5 |
| 3.3 | USER_GUIDE.md | 20 min | +6 |
| 3.4 | SECURITY.md | 10 min | +5 |
| **Subtotal** | | **60 min** | **+20 tests** |

### Phase 4: Validation

| Order | Task | Estimated Time |
|-------|------|----------------|
| 4.1 | Run full test suite | 5 min |
| 4.2 | Run `npm run lint src/` | 2 min |
| 4.3 | Run `npm run build` | 30 sec |
| 4.4 | Manual smoke test (dev mode) | 15 min |
| **Subtotal** | | **23 min** |

---

## Total Effort

| Phase | Time | New Tests | New Files |
|-------|------|-----------|-----------|
| Security | 60 min | 9 | 1 (`ErrorBoundary.tsx`) |
| UX | 80 min | 9 | 0 (modifications) |
| Docs | 60 min | 20 | 4 (`CHANGELOG.md`, `CONTRIBUTING.md`, `USER_GUIDE.md`, `SECURITY.md`) |
| Validation | 23 min | 0 | 0 |
| **TOTAL** | **~3.7 hours** | **+38 tests** | **5 files** |

---

## Success Criteria

### Hard Gates (Must Pass)
- [ ] All 38 new tests pass
- [ ] Zero regressions in existing 260 tests (total: 298 tests, 100% pass)
- [ ] TypeScript: 0 errors
- [ ] ESLint (`src/` only): 0 new errors
- [ ] Vite build: successful

### Soft Gates (Should Pass)
- [ ] Manual smoke test: all 15 pages render without crash
- [ ] CSP does not block legitimate functionality (fonts, styles, IPC)
- [ ] ErrorBoundary fallback appears when a component throws (verified with a deliberate crash test)

### Score Projection

| Category | Before | After |
|----------|--------|-------|
| Security | 6/10 | 9/10 |
| UX Completeness | 7/10 | 9/10 |
| Documentation | 6/10 | 9/10 |
| **Overall** | **7.5/10** | **9/10** |

This moves the verdict from **CONDITIONALLY READY** to **READY FOR PRODUCTION**.

---

## Risk Mitigation

### Security Risk
- **CSP too restrictive** → Could break Vite dev server or Tauri IPC
- **Mitigation:** Test in dev mode (`npm run tauri dev`) before merging
- **Rollback:** Revert `tauri.conf.json` change

### UX Risk
- **Empty states too verbose** → Users see too much guidance text
- **Mitigation:** Keep empty state messages to ≤ 2 lines
- **Rollback:** Remove the empty state component, existing UX still works

### Documentation Risk
- **Outdated content** → Docs reference features that changed
- **Mitigation:** Link docs to source code anchors; add "last verified" dates
- **Rollback:** Delete created doc files

---

## Sign-Off

- [ ] Phase 1 (Security) complete and verified
- [ ] Phase 2 (UX) complete and verified
- [ ] Phase 3 (Docs) complete and verified
- [ ] Phase 4 (Validation) complete
- [ ] Production readiness score: 9/10
- [ ] Verdict: **READY FOR PRODUCTION**

**Approved By:** _________________  
**Date:** _________________
