# UI/UX Redesign Gap - Implementation Plan

**Date:** 2026-05-06
**Scope:** Close all 20 UI/UX gaps between wireframe (`docs/2026-05-03-acc-ux-redesign/wireframe.html`) and actual implementation
**Target:** Zero visual regressions, all pages match wireframe spec

---

## Overview

| Priority | Gaps | Effort | Files |
|----------|------|--------|-------|
| P0 (Critical) | GAP-9, GAP-10, GAP-1, GAP-2 | 2-3 days | 8 modified, 3 new |
| P1 (High) | GAP-3, GAP-4, GAP-16, GAP-13 | 2 days | 12 modified, 2 new |
| P2 (Medium) | GAP-5, GAP-6, GAP-7, GAP-11, GAP-17 | 2 days | 6 modified, 3 new |
| P3 (Low) | GAP-8, GAP-12, GAP-14, GAP-15, GAP-18, GAP-19, GAP-20 | 1 day | 4 modified, 1 new |
| P4 (Functional) | GAP-5, GAP-6 (PTY wiring) | 1 day | 2 modified |

**Total estimated effort:** 6-8 days
**Total files:** ~30 modified, ~9 new

---

## Phase P0: Critical Visual Foundation

### P0.1 - Global CSS Variables & Background (GAP-1, GAP-2)

**Files:** `src/index.css` (MODIFY)

Add the wireframe's complete CSS custom property system and radial gradient background. This must be done FIRST because all subsequent changes depend on these variables.

**What to add:**
1. All CSS custom properties from the wireframe's `:root` and `[data-theme="dark"]` / `[data-theme="light"]` blocks
2. The three radial gradient `background` layers on `body`
3. Custom scrollbar styling
4. `backdrop-filter` utilities

**Key variables to add:**
- `--bg-root`, `--bg-void`, `--bg-abyss`, `--bg-nebula`
- `--glass-10` through `--glass-40`, `--glass-border`
- `--fg`, `--fg-muted`, `--fg-dim`
- `--indigo-400/500`, `--cyan-400/500`, `--purple-400/500`, `--red-400/500`, `--amber-400/500`, `--green-400/500`
- `--radius`, `--radius-sm`, `--radius-lg`
- `--shadow-sm`, `--shadow-md`, `--shadow-glow`, `--shadow-glow-lg`
- `--sidebar-w`

**Verification:**
- Body background shows subtle radial glow (indigo left, cyan right, purple bottom)
- Cards use translucent backgrounds when `backdrop-filter` is supported
- Light theme switch changes all variables correctly

### P0.2 - Glassmorphism Card Variant (GAP-1)

**Files:** `src/components/ui/card.tsx` (MODIFY)

Add a `glass` variant to the Card component that applies:
- `background: var(--glass-20)`
- `backdrop-filter: blur(12px)` (with `@supports` guard)
- `border: 1px solid var(--glass-border)`
- `box-shadow: var(--shadow-md)`
- Hover: `border-color: rgba(99,102,241,0.15)`, enhanced shadow

**Implementation strategy:**
```tsx
// Add to cardVariants cva:
variant: {
  default: "bg-[#161b22] border-[#30363d]",
  glass: "glass-card",
}
```

Where `.glass-card` is defined in global CSS with the wireframe's card styles.

**Fallback for unsupported browsers:**
```css
@supports not (backdrop-filter: blur(12px)) {
  .glass-card { background: #161b22; }
}
```

**Verification:**
- Cards on all pages show translucent background with blur
- Background radial gradient is visible THROUGH card backgrounds
- Hover brightens border color

### P0.3 - EmptyState Component (GAP-9)

**Files:** `src/components/EmptyState.tsx` (NEW)

Reusable empty state matching wireframe:
- Centered layout
- Icon in a circular background (`empty-state-icon` style)
- Title text (font-weight 500, 14px)
- Description text (smaller, muted)
- Optional action button

**Props:**
```tsx
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}
```

**Pages to update:**
- `src/pages/Runner.tsx` — "No agents running"
- `src/pages/Orchestrate.tsx` — "Create a wave plan..."
- `src/pages/Knowledge.tsx` — "No knowledge entries..."
- `src/pages/Scheduler.tsx` — "No scheduled jobs..."
- `src/pages/Playbooks.tsx` — "No memory candidates..."
- `src/pages/Replay.tsx` — "No failure analyses..."

### P0.4 - ErrorState Component (GAP-10)

**Files:** `src/components/ErrorState.tsx` (NEW)

Reusable error state matching wireframe's `error-card`:
- Red circular icon background
- Error title (bold)
- Description (smaller)
- Dismiss button

**Props:**
```tsx
interface ErrorStateProps {
  title?: string;
  description: string;
  onDismiss?: () => void;
}
```

**Pages to update:**
- `src/pages/Costs.tsx` — Replace raw TypeError text
- `src/pages/Assets.tsx` — Replace raw TypeError text
- `src/pages/Connectors.tsx` — Replace raw TypeError text

**Integration with Tauri guard:** When `safeInvoke` returns null, render `<ErrorState>` instead of the raw error text.

---

## Phase P1: Layout & Structure

### P1.1 - PageHeader Component (GAP-3)

**Files:** `src/components/PageHeader.tsx` (NEW)

Wireframe's page header with gradient accent bar:
- 3px wide, 28px tall gradient bar (indigo→cyan)
- Heading text (24px, bold)
- Optional badge or subtitle
- Optional action button (right-aligned)

**Props:**
```tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: { text: string; variant: string };
  action?: React.ReactNode;
}
```

**Pages to update (replace all existing page headers):**
- `src/pages/Runner.tsx`
- `src/pages/Route.tsx`
- `src/pages/Orchestrate.tsx`
- `src/pages/Handoffs.tsx`
- `src/pages/Messages.tsx`
- `src/pages/Assets.tsx`
- `src/pages/Outcomes.tsx`
- `src/pages/Replay.tsx`
- `src/pages/Playbooks.tsx`
- `src/pages/Connectors.tsx`
- `src/pages/Knowledge.tsx`
- `src/pages/Scheduler.tsx`
- `src/pages/Costs.tsx`
- `src/pages/Settings.tsx`

### P1.2 - SectionTitle Component (GAP-4)

**Files:** `src/components/SectionTitle.tsx` (NEW)

Wireframe's section title with accent dot:
- 6px colored dot (indigo-500)
- Text (15px, weight 600)
- Optional badge or count

**Props:**
```tsx
interface SectionTitleProps {
  title: string;
  badge?: string;
}
```

**Pages to update:**
- `src/pages/Runner.tsx` — "AGENTS", "PRESETS"
- `src/pages/Route.tsx` — "Agent Suggestions"
- `src/pages/Orchestrate.tsx` — "Create Wave Plan", "Wave Groups"
- `src/pages/Handoffs.tsx` — "Build Handoff Envelope", "Validate Schema"
- `src/pages/Messages.tsx` — "Signal Parser"
- `src/pages/Assets.tsx` — "Skills Library" etc.
- `src/pages/Playbooks.tsx` — "Export Playbook", "Import Playbook"
- `src/pages/Connectors.tsx` — "Auto-Detection", "Connection Config"
- `src/pages/Knowledge.tsx` — Already has section titles in tabs
- `src/pages/Scheduler.tsx` — Table header area
- `src/pages/Costs.tsx` — "Overview", "Models", "Projects", "Sessions"

### P1.3 - Two-Column Layout Utilities (GAP-13)

**Files:** `src/index.css` (MODIFY)

Add wireframe's grid utilities:
```css
.col2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.col3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.col4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
```

**Pages to update:**
- `src/pages/Route.tsx` — Task Type + Project ID should be side by side
- `src/pages/Orchestrate.tsx` — Slug + Project ID should be side by side
- `src/pages/Handoffs.tsx` — Original Task/Completed By + Model Used/Next Agent in 2x2 grid
- `src/pages/Connectors.tsx` — Form fields in 2-col where appropriate
- `src/pages/Settings.tsx` — Already uses grid in some places

### P1.4 - Wave Group UI (GAP-16)

**Files:** `src/components/WaveGroup.tsx` (NEW)

Collapsible wave group matching wireframe:
- Header: Wave number + progress badge (e.g., "3/3 done")
- Click to collapse/expand
- Body: List of agents with status dots, file counts, status badges
- Agent rows: status dot, agent ref + task, status badge, file count

**Props:**
```tsx
interface WaveGroupProps {
  waveNumber: number;
  agents: Array<{
    ref: string;
    task: string;
    status: 'done' | 'running' | 'queued' | 'failed';
    lines?: number;
    model?: string;
  }>;
}
```

**Pages to update:**
- `src/pages/Orchestrate.tsx` — Render wave groups after plan is created

**State management:** When `createWavePlan` succeeds, the plan agents should be fetched and grouped by wave number for display.

---

## Phase P2: Component Polish

### P2.1 - StatusDot Component with Animations (GAP-5, GAP-6)

**Files:** `src/components/StatusDot.tsx` (NEW)

Animated status dots matching wireframe:
- `idle`: gray, static
- `active`/`done`: green, subtle glow
- `thinking`: purple, pulse animation
- `running`: cyan, pulse animation
- `failed`: red, glow
- `stalled`: amber, glow

**CSS animations to add:**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@keyframes glow-border {
  0%, 100% { border-color: rgba(99,102,241,0.15); }
  50% { border-color: rgba(99,102,241,0.35); }
}
```

**Pages to update:**
- `src/pages/Runner.tsx` — Add status dots to agent cards
- `src/components/WaveGroup.tsx` — Status dots per agent row
- Any other page showing agent status

### P2.2 - ThemeToggle Segmented Control (GAP-7)

**Files:** `src/components/ThemeToggle.tsx` (NEW)

Replace the two separate Dark/Light buttons with a single segmented control:
- Container: rounded pill, glass background, border
- Buttons: flex children, no border-radius on container children
- Active state: gradient background (indigo→cyan), white text, glow shadow
- Inactive: transparent, muted text
- Supports 3 modes: Dark, Light, System

**Pages to update:**
- `src/App.tsx` or sidebar component — Replace existing theme buttons

### P2.3 - ProgressBar Component (GAP-11)

**Files:** `src/components/ProgressBar.tsx` (NEW)

Gradient progress bars:
- Height: 6px, rounded
- Background track: glass-20
- Fill: gradient based on color prop
- Colors: green (green→cyan), yellow (amber→amber), red (red→red), indigo (indigo→purple)
- Animated width transition (0.5s ease)

**Props:**
```tsx
interface ProgressBarProps {
  value: number; // 0-100
  color: 'green' | 'yellow' | 'red' | 'indigo';
}
```

**Pages to update:**
- `src/pages/Route.tsx` — Confidence bars in suggestion cards
- `src/pages/Outcomes.tsx` — Success rate bars (optional)

### P2.4 - SignalCard Component (GAP-17)

**Files:** `src/components/SignalCard.tsx` (NEW)

Styled signal card for ACB messages:
- Glass card styling
- Header: from_agent (indigo), arrow, to_agent (purple), priority badge, type badge, wave badge, timestamp
- Body: monospace font, glass-10 background, rounded, max-height with scroll
- Footer: session ID, Resolve button

**Props:**
```tsx
interface SignalCardProps {
  signal: ACBSignal;
  onResolve: (id: string) => void;
}
```

**Pages to update:**
- `src/pages/Messages.tsx` — Replace generic Card with SignalCard

### P2.5 - Sidebar Brand Icon Glow (GAP-8)

**Files:** `src/components/Sidebar.tsx` or `src/App.tsx` (MODIFY)

Update brand icon styling:
- Gradient background (indigo→cyan)
- `box-shadow: 0 0 12px rgba(99,102,241,0.3)`

**Verification:** Icon has visible colored glow in dark mode.

---

## Phase P3: Low-Priority Polish

### P3.1 - KPI Card Borders (GAP-12)

**Files:** `src/pages/Outcomes.tsx` (MODIFY)

Add colored left borders to stat cards:
- Total Sessions: indigo
- Successful: green
- Failed: red
- Success Rate: green/yellow/red based on value

**CSS:**
```css
.kpi-card { border-left: 3px solid transparent; }
.kpi-card.green { border-left-color: var(--green-400); }
.kpi-card.red { border-left-color: var(--red-400); }
```

### P3.2 - Custom Scrollbar (GAP-14)

**Files:** `src/index.css` (MODIFY)

Add wireframe scrollbar styles:
```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--glass-30); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--glass-40); }
```

### P3.3 - Fade-In-Up Animation (GAP-15)

**Files:** `src/index.css` (MODIFY)

Add keyframe and utility:
```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.anim-fade-up { animation: fade-in-up 0.5s ease-out; }
```

**Apply to:** Stat grids, agent grids, knowledge entries on initial load.

### P3.4 - Responsive Media Queries (GAP-18)

**Files:** `src/index.css` (MODIFY)

Add wireframe's responsive breakpoint:
```css
@media (max-width: 900px) {
  .sidebar { display: none; }
  .main { margin-left: 0; padding: 16px; }
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .page-grid { grid-template-columns: 1fr; }
  .col2, .col3, .col4 { grid-template-columns: 1fr; }
}
```

### P3.5 - Custom Toggle Switch (GAP-19)

**Files:** `src/components/ui/switch.tsx` (MODIFY)

Override shadcn/ui Switch styles to match wireframe:
- Width: 40px, height: 22px, border-radius: 11px
- Off: glass-30 background, glass-border
- On: gradient background (indigo→cyan)
- Knob: white circle with smooth slide transition

### P3.6 - Drop Zone Styling (GAP-20)

**Files:** `src/pages/Playbooks.tsx` (MODIFY)

Style the import drop zone:
- Dashed border (glass-border)
- Hover: border-color indigo-500, background rgba(99,102,241,0.03)
- Padding: 40px 20px
- Centered text

---

## Phase P4: Functional Wiring (Not Just Visual)

### P4.1 - PTY Status Inference → Status Dots (GAP-5, GAP-6)

**Files:** `src/pages/Runner.tsx`, `src-tauri/src/pty.rs` (if needed)

The PTY output parser in Rust already detects status patterns (writing, thinking, idle, etc.). The React UI needs to:
1. Poll or receive WebSocket/push updates for agent status changes
2. Update the status dot color and animation state
3. Apply the `active` class to agent cards when status is "running" or "thinking"

**Implementation:**
- The `PtyManager` already tracks process status
- Add a Tauri event emitter for status changes
- React side listens for `agent-status-changed` events
- Updates Zustand store, which triggers re-render with new status dot

---

## Verification Checklist

### Per-Page Visual Audit

| Page | Check | Wireframe Match |
|------|-------|-----------------|
| Runner | Background gradient visible | Yes |
| Runner | Cards have glassmorphism | Yes |
| Runner | Status dots with glow/pulse | Yes |
| Runner | Active agent cards glow-border | Yes |
| Runner | Empty state has icon + button | Yes |
| Runner | Section titles use accent-dot | Yes |
| Route | 2-col layout (type + project) | Yes |
| Route | Progress bars for confidence | Yes |
| Route | Suggestion cards match wireframe | Yes |
| Orchestrate | Page header gradient bar | Yes |
| Orchestrate | Wave groups collapsible | Yes |
| Orchestrate | Agent rows with status dots | Yes |
| Handoffs | 2-col form grid | Yes |
| Handoffs | Section titles with accent-dot | Yes |
| Messages | Signal cards styled | Yes |
| Messages | Monospace signal body | Yes |
| Assets | Cards glassmorphic | Yes |
| Outcomes | KPI cards with colored borders | Yes |
| Outcomes | Stat grid fade-in animation | Yes |
| Costs | No raw error text | Yes |
| Costs | Styled empty state | Yes |
| Knowledge | Cards glassmorphic | Yes |
| Settings | 2-col grid layout | Yes |
| Settings | Cards glassmorphic | Yes |
| Settings | Page header gradient bar | Yes |
| Sidebar | Brand icon glow | Yes |
| Sidebar | Theme toggle segmented | Yes |
| All | Custom scrollbar | Yes |
| All | No console errors | Yes |
| All | Responsive at <900px | Yes |

### Build Verification

```bash
cd /Applications/E8/Innovations/agent-control-center
npm run build        # Must pass (0 TS errors, 0 Vite errors)
cargo check          # Must pass (0 new warnings)
npm run lint         # Must pass (0 ESLint errors)
bash smoke-test.sh   # All 7 tests pass
```

### Regression Tests

1. **Theme switching:** Dark → Light → System. All variables swap correctly.
2. **Card hover:** All cards show border brightening on hover.
3. **Glassmorphism fallback:** In browsers without `backdrop-filter`, cards show solid background.
4. **Empty states:** All pages with no data show styled empty state with icon.
5. **Error states:** Browser mode shows styled error card, not raw TypeError.
6. **Navigation:** All 14 sidebar links work, active state highlighted.
7. **Tauri desktop:** When run in Tauri webview, all functionality works AND new visual styles apply.

---

## File Inventory

### New Files (9)

| File | Purpose |
|------|---------|
| `src/components/EmptyState.tsx` | Reusable empty state with icon, text, action |
| `src/components/ErrorState.tsx` | Reusable error state with red icon, dismiss |
| `src/components/PageHeader.tsx` | Page header with gradient accent bar |
| `src/components/SectionTitle.tsx` | Section title with accent dot |
| `src/components/StatusDot.tsx` | Animated status dots with glow/pulse |
| `src/components/ThemeToggle.tsx` | Segmented control theme toggle |
| `src/components/ProgressBar.tsx` | Gradient progress bars |
| `src/components/SignalCard.tsx` | Styled ACB signal card |
| `src/components/WaveGroup.tsx` | Collapsible wave group with agents |

### Modified Files (~21)

| File | Changes |
|------|---------|
| `src/index.css` | Add CSS variables, radial gradients, scrollbar, animations, grid utilities, responsive |
| `src/components/ui/card.tsx` | Add `glass` variant |
| `src/components/ui/switch.tsx` | Custom gradient toggle styling |
| `src/App.tsx` | Replace theme toggle, add glass background |
| `src/pages/Runner.tsx` | PageHeader, SectionTitle, StatusDot, EmptyState, WaveGroup |
| `src/pages/Route.tsx` | PageHeader, SectionTitle, col2 layout, ProgressBar |
| `src/pages/Orchestrate.tsx` | PageHeader, SectionTitle, WaveGroup, col2 layout, EmptyState |
| `src/pages/Handoffs.tsx` | PageHeader, SectionTitle, col2 layout |
| `src/pages/Messages.tsx` | PageHeader, SignalCard, ErrorState |
| `src/pages/Assets.tsx` | PageHeader, ErrorState |
| `src/pages/Outcomes.tsx` | PageHeader, KPI borders, fade-in animation |
| `src/pages/Replay.tsx` | PageHeader, EmptyState |
| `src/pages/Playbooks.tsx` | PageHeader, drop zone styling, EmptyState |
| `src/pages/Connectors.tsx` | PageHeader, col2 layout, ErrorState |
| `src/pages/Knowledge.tsx` | PageHeader, EmptyState |
| `src/pages/Scheduler.tsx` | PageHeader, EmptyState |
| `src/pages/Costs.tsx` | PageHeader, ErrorState, EmptyState |
| `src/pages/Settings.tsx` | PageHeader, col2/col3 layout |

---

## Rollback Strategy

All changes are additive or style-only:
- CSS variables: safe to add, existing classes still work
- Card `glass` variant: opt-in, `default` variant unchanged
- New components: imported and used, no existing code removed
- Layout utilities: CSS classes, only applied where explicitly used
- No JavaScript logic changes except visual rendering

If any issue arises, revert individual component imports to previous versions.
