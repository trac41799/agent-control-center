# UX REDESIGN PLAN -- Glassmorphism + Futuristic Elegance

**Date:** 2026-05-04
**Theme:** "Orchestrated Intelligence" -- Deep space gradients, glass panels, cyan/purple glow accents
**From:** Generic dark-mode admin panel
**To:** Premium desktop app with depth, motion, and identity

---

## 1. Color Palette: Deep Space -> Cyan Glow

### Background Hierarchy
- `--color-deep-space: #06040f` -- Root bg, starfield base
- `--color-void: #0a0820` -- Secondary surfaces
- `--color-abyss: #0f0c2e` -- Sidebar, panels
- `--color-nebula: #1a1645` -- Card hover states

### Glass Surfaces (semi-transparent with blur)
- `--color-glass-10: rgba(255,255,255,0.03)` -- Thinnest
- `--color-glass-20: rgba(255,255,255,0.05)` -- Default
- `--color-glass-30: rgba(255,255,255,0.08)` -- Elevated
- `--color-glass-40: rgba(255,255,255,0.12)` -- Highest
- `--color-glass-border: rgba(255,255,255,0.08)`

### Accent Palette
```
cyan-400: #22d3ee | cyan-500: #06b6d4
purple-400: #c084fc | purple-500: #a855f7 | purple-600: #9333ea
indigo-400: #818cf8 | indigo-500: #6366f1
blue-400: #60a5fa | blue-500: #3b82f6
```

### Semantic Tokens (replace ALL existing)
```
background:    #06040f (deep-space)
foreground:    #e2e8f0 (slate-200)
card:          rgba(255,255,255,0.03) (glass-10)
primary:       #6366f1 (indigo-500)
secondary:     rgba(255,255,255,0.05) (glass-20)
muted:         rgba(255,255,255,0.05) (glass-20)
accent:        linear-gradient(135deg, #6366f1, #06b6d4)
border:        rgba(255,255,255,0.06)
input:         rgba(255,255,255,0.05)
ring:          #818cf8 (indigo-400)
radius:        0.75rem (up from 0.5rem)
```

### Gradient Map
```
Primary:   indigo-500 -> cyan-500 (buttons, headings)
Secondary: purple-500 -> indigo-500 (sidebar, panels)
Success:   cyan-400 -> cyan-500 (status "done")
Warning:   purple-400 -> purple-500 (status "thinking")
Danger:    red-400 -> red-500 (status "failed")
```

---

## 2. Glass Surface System (4-Level Depth)

```
Level 0: Background  -- bg-deep-space (solid, #06040f)
Level 1: Root        -- bg-glass-10 + backdrop-blur-sm (sidebar, panels)
Level 2: Default     -- bg-glass-20 + backdrop-blur-md + border-glass (cards)
Level 3: Elevated    -- bg-glass-30 + backdrop-blur-lg + border-glass + glow (hover, active)
Level 4: Modal       -- bg-glass-40 + backdrop-blur-2xl + border-glass + glow (popovers)
```

### Utility classes to add to globals.css:
```
.glass-card      -> bg-glass-20 backdrop-blur-md border border-glass-border rounded-xl
.glass-elevated  -> bg-glass-30 backdrop-blur-lg border border-glass-border shadow-glow
.glass-panel     -> bg-glass-10 backdrop-blur-sm border-r border-glass-border
.glass-input     -> bg-glass-20 border border-glass-border rounded-lg focus:border-indigo-500/50
.glass-hover     -> transition-all duration-200 hover:bg-glass-30 hover:shadow-glow
.button-glow     -> transition-all duration-150 hover:shadow-glow-lg active:scale-[0.98]
```

---

## 3. Typography

### Font Stack
```
--font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif
--font-mono: 'JetBrains Mono', ui-monospace, monospace
```

### Scale
| Usage | Class | Size | Weight |
|-------|-------|------|--------|
| Page Hero | text-2xl font-bold tracking-tight | 24px | 700 |
| Page Title | text-xl font-semibold tracking-tight | 20px | 600 |
| Section | text-lg font-semibold | 18px | 600 |
| Card Title | text-base font-semibold | 16px | 600 |
| Body | text-sm | 14px | 400 |
| Caption | text-xs | 12px | 400 |

---

## 4. Animations (added to globals.css)

```
@keyframes glow-pulse -> box-shadow pulse (indigo glow, 3s infinite)
@keyframes float -> translateY(-2px) float (3s infinite)
@keyframes border-glow -> border-color pulse (indigo, 4s infinite)
@keyframes fade-in-up -> opacity 0->1 + translateY(8px->0) (0.4s ease-out)
@keyframes shimmer -> gradient sweep (2s infinite)
```

---

## 5. Component Redesign

### Button variants
- default: gradient button (indigo->cyan) with glow shadow
- secondary: glass button (bg-glass-20 + border)
- ghost: transparent with glass hover
- destructive: red glass (bg-red-500/15 + border-red-500/30)
- outline: border-only with glass hover

### Card (now glass by default)
bg-glass-20, backdrop-blur-md, border-glass-border, rounded-xl, deep shadow, glow on hover

### Badge (status colours)
default=indigo, success=cyan, warning=amber, destructive=red, outline=glass

### Input (glass)
bg-glass-20, border-glass-border, rounded-lg, indigo focus ring

---

## 6. Page-by-Page Unification

### Runner.tsx (highest priority)
Replace ALL hardcoded GitHub colors (#0d1117, #161b22, #30363d, #1f6feb, #238636, #da3633) with glass tokens and gradient buttons.

### Sidebar.tsx
bg-glass-10 + backdrop-blur-sm + gradient accent line on right edge

### All pages (Knowledge, Scheduler, Settings, Costs, etc.)
- Glass cards by default (via updated Card component)
- Gradient page headers (1px bar + icon)
- Glow-illustrated empty states

### StatusChip.tsx / AgentPanel.tsx
- Active agent: glow-bordered glass panel with animate-glow-pulse
- Status dots: gradient-colored with pulse on active states

---

## 7. Background Richness

```css
body {
  background:
    radial-gradient(ellipse 100% 100% at 0% 50%, rgba(99,102,241,0.04), transparent 50%),
    radial-gradient(ellipse 100% 100% at 100% 50%, rgba(6,182,212,0.03), transparent 50%),
    radial-gradient(ellipse 50% 80% at 50% 100%, rgba(168,85,247,0.04), transparent 70%);
  background-color: #06040f;
}
```

---

## 8. Implementation Order

| Step | What | Files | ~Lines |
|------|------|-------|--------|
| 1 | Rewrite globals.css: new tokens, glass utils, animations, background | globals.css | 150 |
| 2 | Update button.tsx, card.tsx, badge.tsx, input.tsx with glass | 4 files | 80 |
| 3 | Unify Runner.tsx: GitHub colors -> glass tokens | Runner.tsx | 60 |
| 4 | Glass sidebar + all page headers unified | Sidebar + 14 pages | 130 |
| 5 | Agent panels + status chips with glow/pulse | AgentPanel, StatusChip, AgentGrid | 60 |
| 6 | Verification: tsc --noEmit + E2E all routes | -- | -- |

**Total: ~480 lines across ~25 files. 0 backend changes.**

---

## 9. Dual-Mode Design (Light + Dark)

### Theme Switch Mechanism
- Toggle in Settings page: radio group (Dark / Light / System)
- CSS class `[data-theme="light"]` on `<html>` or `[data-theme="dark"]`
- Tailwind v4 dark mode via `@media (prefers-color-scheme: dark)` + class-based override
- LocalStorage persistence via settingsStore
- Smooth transition: `transition-colors duration-500` on body

### Light Mode Palette — "Morning Aurora"
```
Background:      #f5f3ff (warm lavender white)
Surface/Void:    #ede9fe (soft violet tint)
Card base:       #ffffff (pure white)
Card elevated:   rgba(255,255,255,0.85) (glass white)
Glass-10:        rgba(255,255,255,0.60)
Glass-20:        rgba(255,255,255,0.75)
Glass-30:        rgba(255,255,255,0.85)
Glass-40:        rgba(255,255,255,0.92)
Border:          rgba(99,102,241,0.12)
Foreground:      #1e1b4b (deep indigo)
Muted text:      #6b7280 (gray-500)
Card text:       #1e1b4b
Primary:         #6366f1 (indigo-500, same as dark)
Input:           #ffffff
```

### Light Mode Background
```css
[data-theme="light"] body {
  background:
    radial-gradient(ellipse 80% 80% at 0% 20%, rgba(99,102,241,0.06), transparent 60%),
    radial-gradient(ellipse 60% 60% at 100% 80%, rgba(6,182,212,0.05), transparent 60%),
    radial-gradient(ellipse 40% 60% at 50% 100%, rgba(168,85,247,0.04), transparent 70%);
  background-color: #f5f3ff;
}
```

### Light Mode Glass Cards
- White semi-transparent bg with backdrop-blur
- Soft lavender shadow instead of dark shadow
- Glass border: rgba(99,102,241,0.1)
- Hover: slightly elevated + indigo tinge

### Light Mode Buttons
- Gradient buttons: same indigo→cyan gradient (pops on white bg)
- Secondary: gray-100 bg with gray-200 border
- Ghost: gray-100 hover

### Light Mode Sidebar
- bg-white/80 + backdrop-blur-md
- border-r with lavender tint
- Gradient accent line on right edge
