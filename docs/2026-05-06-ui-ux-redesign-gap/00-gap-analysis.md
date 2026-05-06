# 08 - UI/UX Gap Analysis: Actual vs Wireframe

**Date:** 2026-05-06
**Wireframe:** `docs/2026-05-03-acc-ux-redesign/wireframe.html`
**Actual App:** Screenshots from `http://localhost:1420` (Vite dev build)

---

## Methodology

1. Opened wireframe HTML and extracted all CSS custom properties, component styles, and layout patterns
2. Navigated to 7 key ACC pages (Runner, Route, Orchestrate, Outcomes, Costs, Knowledge, Settings)
3. Took viewport and full-page screenshots
4. Compared wireframe design tokens, components, layouts, and interactions against actual implementation
5. Rated each gap by severity and estimated effort to close

---

## Executive Summary

| Category | Wireframe | Actual | Gap Count | Severity |
|----------|-----------|--------|-----------|----------|
| Visual Design (glassmorphism, gradients) | Rich | Flat | 6 | Medium-High |
| Layout & Spacing | Dense, 2-col grids | Sparse, mostly 1-col | 5 | Medium |
| Component Polish | Animated, glow, pulse | Static, minimal | 4 | Low-Medium |
| Empty/Error States | Styled cards with icons | Plain text or raw errors | 3 | High |
| Theme System | Full CSS variable swap | Partial (colors only) | 2 | Low |
| Responsive | Mobile breakpoint | None | 1 | Medium |

**Overall:** The actual app has the correct page structure, navigation, and content hierarchy. The major gap is visual polish — the wireframe defines a rich glassmorphic dark UI with animated status indicators, gradient accents, and styled empty states, while the actual implementation is significantly flatter and more minimal.

---

## Gap-by-Gap Analysis

### GAP-1: Glassmorphism Cards Missing (HIGH)

**Wireframe:**
```css
.card {
  background: var(--glass-20);        /* rgba(255,255,255,0.05) */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);       /* 0.75rem */
  box-shadow: var(--shadow-md);
}
```
Cards have translucent backgrounds with blur, subtle borders, and hover effects that brighten the border color.

**Actual:** Cards use flat solid backgrounds (`#161b22` / `bg-[#0d1117]`) with no `backdrop-filter`. Borders are static. No hover glow effect.

**Screenshots:**
- Wireframe Settings cards: translucent with visible background blur
- Actual Settings cards: opaque dark gray boxes

**Root Cause:** `backdrop-filter: blur()` was likely skipped because:
1. It can cause performance issues in Tauri webview on some systems
2. It requires careful fallback for browsers that don't support it
3. The shadcn/ui Card component used in the actual app doesn't include glassmorphism by default

**Fix:** Add glassmorphism as a `variant` on the Card component. Use `@supports (backdrop-filter: blur(12px))` for progressive enhancement. Fallback to solid color on unsupported browsers.

---

### GAP-2: Radial Gradient Background Missing (HIGH)

**Wireframe:**
```css
body {
  background:
    radial-gradient(ellipse 100% 100% at 0% 50%, rgba(99,102,241,0.04), transparent 50%),
    radial-gradient(ellipse 100% 100% at 100% 50%, rgba(6,182,212,0.03), transparent 50%),
    radial-gradient(ellipse 50% 80% at 50% 100%, rgba(168,85,247,0.04), transparent 70%);
  background-color: var(--bg-root);  /* #06040f */
}
```
Three overlapping radial gradients create a subtle colored depth effect behind content.

**Actual:** Body has flat dark background (`#06040f` or similar) with no gradient overlay.

**Root Cause:** The gradient system is purely aesthetic. It was likely deprioritized during the wave-based build process (functionality first, polish later). The CSS is already written in the wireframe — it just needs to be copied into the global styles.

**Fix:** Add the three radial gradients to `src/index.css` or the Tailwind global styles. Ensure `background-color` is set as fallback.

---

### GAP-3: Page Header Accent Bar Style Mismatch (MEDIUM)

**Wireframe:** Gradient vertical bar (indigo→cyan) with 3px width, 28px height, rounded.
```css
.page-header .accent-bar {
  width: 3px; height: 28px; border-radius: 2px;
  background: linear-gradient(180deg, var(--indigo-500), var(--cyan-500));
}
```

**Actual:** Single-color blue left border (`border-l-4 border-blue-500` or similar). No gradient.

**Root Cause:** The wireframe's `page-header` class wasn't carried over. The actual app uses Tailwind utility classes (`border-l-4`) which are simpler but less polished.

**Fix:** Create a reusable `PageHeader` component that renders the gradient accent bar + heading. Replace all page headers with this component.

---

### GAP-4: Section Title Style Mismatch (MEDIUM)

**Wireframe:** Section titles use a small colored dot + text:
```css
.section-title {
  font-size: 15px; font-weight: 600;
  display: flex; align-items: center; gap: 8px;
}
.section-title .accent-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--indigo-500);
}
```

**Actual:** Section titles use a vertical blue left border (similar to page header but smaller). Examples: "AGENTS", "PRESETS" on Runner page.

**Root Cause:** Inconsistent styling between page headers and section titles. The wireframe separates these clearly.

**Fix:** Create a `SectionTitle` component with the accent-dot style. Use it consistently across all pages.

---

### GAP-5: Status Dots with Glow/Pulse Animations Missing (HIGH)

**Wireframe:**
```css
.status-dot.active { background: var(--green-400); box-shadow: 0 0 6px var(--green-400); }
.status-dot.thinking { background: var(--purple-400); box-shadow: 0 0 6px var(--purple-400); animation: pulse 2s ease-in-out infinite; }
.status-dot.running { background: var(--cyan-400); box-shadow: 0 0 6px var(--cyan-400); animation: pulse 2s ease-in-out infinite; }
```

**Actual:** No status dots visible in the Runner empty state. When agents are running, status is shown as text badges ("running", "thinking") without the colored dot indicators.

**Root Cause:** The PTY output parser that detects agent status (writing, thinking, idle, etc.) exists in the Rust backend but may not be wired to update the React UI status chips. The empty state doesn't show dots because no agents are running.

**Fix:** 
1. Add the status dot CSS animations to the global styles
2. Wire the PTY status inference to update the status dot component
3. Show status dots in the agent card header even in empty state (as "idle")

---

### GAP-6: Agent Card Glow-Border Animation Missing (MEDIUM)

**Wireframe:** Active agents have an animated glow border:
```css
.agent-card.active {
  border-color: rgba(99,102,241,0.3);
  box-shadow: 0 0 25px rgba(99,102,241,0.12);
  animation: glow-border 4s ease-in-out infinite;
}
@keyframes glow-border {
  0%,100% { border-color: rgba(99,102,241,0.15) }
  50% { border-color: rgba(99,102,241,0.35) }
}
```

**Actual:** Agent cards are static. No glow effect on active agents.

**Root Cause:** Same as GAP-5 — the active state isn't visually distinguished beyond a text badge.

**Fix:** Add the `glow-border` keyframe animation and apply `.active` class to agent cards when status is "running" or "thinking".

---

### GAP-7: Theme Toggle is Not a Segmented Control (MEDIUM)

**Wireframe:** Single segmented control with gradient active state:
```css
.theme-toggle {
  display: flex; background: var(--glass-20);
  border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 4px;
}
.theme-toggle button.active {
  background: linear-gradient(135deg, var(--indigo-500), var(--cyan-500));
  color: #fff; box-shadow: 0 0 10px rgba(99,102,241,0.25);
}
```

**Actual:** Two separate buttons side by side. Active state uses a solid blue background, not gradient.

**Root Cause:** The wireframe's custom theme toggle was replaced with simpler shadcn/ui Button components for faster implementation.

**Fix:** Replace the two separate buttons with a single `ThemeToggle` component that uses the segmented control style from the wireframe.

---

### GAP-8: Sidebar Brand Icon Missing Gradient Glow (LOW)

**Wireframe:**
```css
.sidebar-brand-icon {
  background: linear-gradient(135deg, var(--indigo-500), var(--cyan-500));
  box-shadow: 0 0 12px rgba(99,102,241,0.3);
}
```

**Actual:** Flat blue icon with no glow.

**Root Cause:** Minor styling omission. Easy fix.

**Fix:** Update the sidebar brand icon CSS to use gradient + glow.

---

### GAP-9: Empty States Missing Icon + Action Button (HIGH)

**Wireframe:** Empty states have a centered icon, text, subtext, AND an action button:
```html
<div class="empty-state">
  <div class="empty-state-icon"><svg>...</svg></div>
  <p>No scheduled jobs.</p>
  <small>Create your first cron job to automate agent tasks.</small>
  <button class="btn btn-primary" style="margin-top:12px">New Job</button>
</div>
```

**Actual:** Empty states are plain text only. Examples:
- Runner: "No agents running" / "Spawn an agent to get started" (no icon, no button)
- Orchestrate: "Create a wave plan to begin orchestrating agents." (no icon, no button)
- Knowledge: "No knowledge entries found." / "Agents will populate this..." (no icon, no button)
- Costs: Raw TypeError text instead of styled empty state (BUG #5)

**Root Cause:** Empty states were implemented as quick placeholders during feature development. The wireframe's empty state component wasn't created as a reusable component.

**Fix:** Create a reusable `EmptyState` component that accepts icon, title, description, and optional action button. Replace all plain-text empty states.

---

### GAP-10: Error States Show Raw TypeError Instead of Styled Card (HIGH)

**Wireframe:** Styled error card with red icon:
```html
<div class="card error-card">
  <div class="error-card-icon"><svg>...</svg></div>
  <p style="font-weight:600">Connection Unavailable</p>
  <small>Connect to a Supabase project or run agents to populate data.</small>
</div>
```

**Actual:** "TypeError: Cannot read properties of undefined (reading 'invoke')" displayed as plain text in the page header area (Costs, Assets, Connectors pages).

**Root Cause:** The same as BUG #1 and BUG #5 — Tauri invoke fails in browser mode, and the error is caught and rendered as text instead of being replaced with a styled fallback.

**Fix:** Same as Phase 1 of implementation plan — guard invoke calls and show the styled error card from the wireframe when Tauri is unavailable.

---

### GAP-11: Progress Bars Missing (MEDIUM)

**Wireframe:** Gradient progress bars for confidence scores:
```css
.progress-bar { height: 6px; border-radius: 3px; background: var(--glass-20); }
.progress-fill.green { background: linear-gradient(90deg, var(--green-400), var(--cyan-400)); }
.progress-fill.yellow { background: linear-gradient(90deg, var(--amber-400), var(--amber-500)); }
```
Used in Route page for agent confidence and success rate.

**Actual:** Route page shows success rate as a text badge + a simple colored div bar. No gradient fill.

**Root Cause:** The progress bar component exists in the wireframe CSS but wasn't extracted into a React component.

**Fix:** Create a `ProgressBar` component with gradient fills. Use it in Route page for confidence bars.

---

### GAP-12: KPI Cards with Colored Left Borders Missing (LOW)

**Wireframe:**
```css
.kpi-card {
  border-left: 3px solid transparent;
}
.kpi-card.green { border-left-color: var(--green-400); }
.kpi-card.red { border-left-color: var(--red-400); }
```

**Actual:** Outcomes page stat cards are simple boxes with no colored border accent.

**Root Cause:** Minor styling omission.

**Fix:** Add colored left border to stat cards based on their metric type.

---

### GAP-13: Two-Column Form Layouts Missing (MEDIUM)

**Wireframe:** Forms use `.col2` (2-column grid) and `.col3` (3-column grid):
```css
.col2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
```
Used in: Orchestrate (slug + project), Handoffs (2x2 grid of fields), Route (type + project).

**Actual:** Forms are mostly single-column. Example: Route page stacks Task Description, Task Type, and Project ID vertically. Orchestrate has slug and Project ID on one row but not in a proper 2-col grid.

**Root Cause:** Layout utilities from wireframe weren't carried over. The actual app uses Flexbox instead of CSS Grid for form layouts.

**Fix:** Add `.col2` and `.col3` utility classes. Update form layouts on Route, Orchestrate, Handoffs, and Connectors pages.

---

### GAP-14: Custom Scrollbar Styling Missing (LOW)

**Wireframe:**
```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-thumb { background: var(--glass-30); border-radius: 3px; }
```

**Actual:** Default browser scrollbars (wider, different color).

**Root Cause:** Webkit scrollbar styling is easy to add but was likely forgotten.

**Fix:** Add the wireframe's scrollbar CSS to `src/index.css`.

---

### GAP-15: Fade-In-Up Animation Missing (LOW)

**Wireframe:**
```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.anim-fade-up { animation: fade-in-up .5s ease-out; }
```
Applied to stat grids and agent grids.

**Actual:** No entry animations. Content appears instantly.

**Root Cause:** Animations are cosmetic and were deprioritized.

**Fix:** Add the keyframe and utility class. Apply to content grids on page load.

---

### GAP-16: Wave Group Collapsible Sections Missing (MEDIUM)

**Wireframe:** Orchestrate page shows collapsible wave groups with progress badges:
```html
<div class="wave-group">
  <div class="wave-group-header">
    <span style="font-weight:600">Wave 1</span>
    <span class="badge badge-success">3/3 done</span>
  </div>
  <div class="wave-group-body">...</div>
</div>
```

**Actual:** Orchestrate page only shows the "Create Wave Plan" form. No wave groups, no agent list, no collapsible sections.

**Root Cause:** The wave group UI was not implemented — the page is stuck at the "create plan" step. After a plan is created, the UI doesn't render the plan's agents or wave structure.

**Fix:** Implement the wave group list that appears after a plan is created. Show agents per wave with status dots, file counts, and done/running/queued badges.

---

### GAP-17: Signal Card Styling Missing (MEDIUM)

**Wireframe:** ACB messages use styled signal cards:
```css
.signal-card {
  background: var(--glass-20); backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border); border-radius: var(--radius);
}
.signal-body {
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
  background: var(--glass-10); border-radius: var(--radius-sm);
}
```

**Actual:** Messages page has basic Card components. No monospace font for signal body, no glass styling.

**Root Cause:** The signal card styling from the wireframe wasn't applied. The Messages page uses generic shadcn/ui Card components.

**Fix:** Add signal-card specific styles or create a `SignalCard` component with the wireframe's styling.

---

### GAP-18: Responsive Design Missing (MEDIUM)

**Wireframe:** Has a responsive breakpoint:
```css
@media(max-width:900px) {
  .sidebar { display: none; }
  .main { margin-left: 0; padding: 16px; }
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .page-grid { grid-template-columns: 1fr; }
}
```

**Actual:** No responsive styles visible. The sidebar is always shown. Layouts don't adapt to smaller screens.

**Root Cause:** Mobile/responsive design was not prioritized for a desktop app.

**Fix:** Add the wireframe's responsive media queries to the global CSS.

---

### GAP-19: Toggle Switches Are Native, Not Custom (LOW)

**Wireframe:** Custom toggle switch with gradient background:
```css
.toggle {
  width: 40px; height: 22px; border-radius: 11px;
  background: var(--glass-30); border: 1px solid var(--glass-border);
}
.toggle.on {
  background: linear-gradient(135deg, var(--indigo-500), var(--cyan-500));
}
```

**Actual:** Connectors page uses native HTML `<input type="checkbox">` or `<Switch>` components with default styling.

**Root Cause:** The custom toggle wasn't implemented. shadcn/ui Switch was used instead.

**Fix:** Either style the shadcn/ui Switch to match, or replace with the custom toggle component.

---

### GAP-20: Drop Zone Styling Missing (LOW)

**Wireframe:** Styled drop zone for playbook import:
```css
.drop-zone {
  border: 2px dashed var(--glass-border); border-radius: var(--radius);
  padding: 40px 20px; text-align: center;
}
.drop-zone:hover {
  border-color: var(--indigo-500);
  background: rgba(99,102,241,0.03);
}
```

**Actual:** Playbooks page has a basic "Drop a .acc playbook file here" area without dashed border or hover effect.

**Root Cause:** The drop zone component wasn't styled to match the wireframe.

**Fix:** Apply the wireframe's drop-zone CSS to the Playbooks import area.

---

## Root Cause Analysis Summary

| Root Cause | Gaps Caused | Fix Priority |
|------------|-------------|--------------|
| **Glassmorphism skipped for performance/compatibility** | GAP-1, GAP-2, GAP-17 | High |
| **shadcn/ui defaults used instead of custom components** | GAP-7, GAP-8, GAP-19, GAP-20 | Low |
| **Empty/error states not implemented as reusable components** | GAP-9, GAP-10 | High |
| **Layout utilities (col2, col3) not carried over** | GAP-13 | Medium |
| **Animations deprioritized** | GAP-5, GAP-6, GAP-15 | Low |
| **PTY status inference not wired to UI** | GAP-5, GAP-6 | High (functional) |
| **Wave group UI not implemented** | GAP-16 | Medium |
| **Responsive design not prioritized** | GAP-18 | Medium |
| **Scrollbar styling forgotten** | GAP-14 | Low |
| **Progress bar component not extracted** | GAP-11 | Low |

---

## Recommended Fix Order

1. **High impact, low effort:** GAP-9 (EmptyState component), GAP-10 (ErrorState component), GAP-14 (scrollbar CSS)
2. **High impact, medium effort:** GAP-1 (glassmorphism cards), GAP-2 (gradient background), GAP-3 (page header accent bar)
3. **Medium impact, low effort:** GAP-4 (section titles), GAP-8 (brand icon), GAP-12 (KPI borders), GAP-20 (drop zone)
4. **Medium impact, medium effort:** GAP-13 (2-col layouts), GAP-16 (wave groups), GAP-17 (signal cards), GAP-18 (responsive)
5. **Low impact, low effort:** GAP-7 (theme toggle), GAP-11 (progress bars), GAP-15 (animations), GAP-19 (toggles)
6. **Functional (not just visual):** GAP-5, GAP-6 (status dots + glow) — requires PTY wiring
