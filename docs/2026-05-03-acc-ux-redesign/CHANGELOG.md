[v0.10.0] — 2026-05-04

## Glassmorphism UI Redesign — "Orchestrated Intelligence"

Full-stack visual redesign from generic dark-mode admin panel to premium desktop app with depth, motion, and identity. Dual light/dark mode support with theme persistence.

---

## New Files (1)

| File | Lines | Description |
|------|-------|-------------|
| `src/components/ThemeProvider.tsx` | 60 | React context for theme state, localStorage persistence, system preference detection via `matchMedia` |

## Modified Files (20)

| File | Change Summary |
|------|---------------|
| `src/styles/globals.css` | Complete rewrite: deep space palette (indigo→cyan gradients), 4-level glass surface tokens, light mode "Morning Aurora" palette, 5 CSS animations (glow-pulse, border-glow, fade-in-up, shimmer, status-pulse), background gradient nebulas for both modes, glass utility classes |
| `src/components/ui/button.tsx` | Gradient primary variant (indigo→cyan with glow shadow + hover lift + active scale), glass secondary, red glass destructive, glass outline, glass ghost |
| `src/components/ui/card.tsx` | Now fully glass by default: `bg-glass-20` + `backdrop-blur-md` + `border-glass-border` + hover glow + 300ms transition |
| `src/components/ui/badge.tsx` | Indigo glass default, semi-transparent status colors (destructive=red, outline=glass) |
| `src/components/ui/input.tsx` | Glass bg, indigo focus ring, glass border, smooth transitions |
| `src/components/layout/Sidebar.tsx` | Full rewrite: glass panel (`glass-panel` class), gradient accent line on right edge (indigo→cyan→transparent), indigo active state with border, theme toggle pill (Dark/Light) with gradient active state, brand logo with gradient bg + glow |
| `src/components/runner/AgentPanel.tsx` | Glass cards (`glass-card`), glow border animation on active agents, gradient spawn/restart buttons, red glass kill button, glass clear button, Orch/Wave badges with indigo/cyan accents |
| `src/components/runner/StatusChip.tsx` | Gradient-colored status dots with glow pulse on active states (purple=thinking, indigo=writing, cyan=testing, emerald=done, amber=stalled, red=failed), bordered semi-transparent backgrounds |
| `src/components/runner/AgentGrid.tsx` | Updated empty state text color |
| `src/App.tsx` | Wrapped in ThemeProvider, root div simplified to `bg-background` |
| `src/pages/Runner.tsx` | **Major unification**: all hardcoded GitHub colors removed (#0d1117, #161b22, #30363d, #1f6feb, #238636, #da3633, #21262d) → replaced with glass tokens, gradient buttons, `page-header` with accent bar, `glass-hover` presets |
| `src/pages/Knowledge.tsx` | `page-header` with `gradient-accent-bar`, removed header icon |
| `src/pages/Scheduler.tsx` | `page-header` with `gradient-accent-bar`, removed header icon |
| `src/pages/Settings.tsx` | `page-header` with `gradient-accent-bar`, wired theme radio to `useTheme().setTheme()`, instant theme switching |
| `src/pages/CostAggregation.tsx` | `page-header` with `gradient-accent-bar`, removed header icon |
| `src/pages/Route.tsx` | `page-header` with `gradient-accent-bar`, removed Zap icon |
| `src/pages/Orchestrate.tsx` | `page-header` with `gradient-accent-bar`, removed Waves icon |
| `src/pages/Handoffs.tsx` | `page-header` with `gradient-accent-bar`, removed ArrowLeftRight icon |
| `src/pages/Messages.tsx` | `page-header` with `gradient-accent-bar`, removed header icon |
| `src/pages/Assets.tsx` | `page-header` with `gradient-accent-bar`, removed header icon |
| `src/pages/Outcomes.tsx` | `page-header` with `gradient-accent-bar`, removed header icon |
| `src/pages/Replay.tsx` | `page-header` with `gradient-accent-bar`, removed header icon |
| `src/pages/Playbooks.tsx` | `page-header` with `gradient-accent-bar`, removed header icon |
| `src/pages/Integrations.tsx` | `page-header` with `gradient-accent-bar`, removed Link2 icon |

## Added

- Dark mode: "Deep Space" — 4-layer indigo background hierarchy (#06040f → #0a0820 → #0f0c2e → #1a1645), 3 radial gradient nebulas, glass surfaces at rgba(3/5/8/12%)
- Light mode: "Morning Aurora" — warm lavender white (#f5f3ff) with soft violet nebulas, frosted white glass surfaces at rgba(60/75/85/92%)
- Dual theme: `data-theme` attribute on `<html>`, 0.5s smooth CSS transition on background/color changes
- Theme toggle: Sidebar footer pill switch (Moon/Sun) + Settings page radio group (Dark/Light/System) — both wired to ThemeProvider
- Glass depth system: 4-level blur (sm → 2xl) for background → sidebar → cards → modals
- Gradient buttons: `gradient-primary` utility (indigo-500 → cyan-500) with glow shadow, hover lift, active scale
- Gradient accent bars: `gradient-accent-bar` class (3px × 28px bar) replacing icons in all 14 page headers
- 5 CSS animations: glow-pulse, border-glow, fade-in-up, shimmer, status-pulse
- Status dot glow: colored shadows with pulse on active agent states

## Fixed

- Bug: Settings page theme radio buttons were not wired to ThemeProvider — clicking Dark/Light/System now instantly switches theme via `useTheme().setTheme()`
- Runner.tsx: eliminated all hardcoded GitHub-dark colors that diverged from the design system
- Removed 4 unused icon imports (ArrowLeftRight, Link2, Zap, Settings) from page files

## Removed

- Old opaque color tokens: #0a0a0a, #171717, #262626, #a3a3a3, #3b82f6 flat accent
- All hardcoded `bg-[#...]`, `text-gray-*`, `border-[#...]` colors from Runner.tsx and AgentPanel.tsx
- Header icons from all page headers (replaced by gradient accent bars)
- `rounded-md` → `rounded-lg` for buttons and inputs (increased border radius)

## Backend

Zero changes. `cargo check` passes with 0 new errors (23 pre-existing warnings, unchanged).
