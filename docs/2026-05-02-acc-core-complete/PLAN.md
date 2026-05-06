# PLAN — ACC Core Complete (Phases 1–7)

**Date:** 2026-05-02
**Source:** ACC Complete Project Documentation v2.7 + ACC Roadmap + ACC Epics + Gap Assessment
**Model:** DeepSeek v4 Pro orchestration via OpenCode

---

## Session Goal

Pick up from Phase 1 foundation handoff and implement ALL remaining phases until the app core and competitive features are production-usable. Each phase gets its own `<date>-<incident>` folder.

## Phase Coverage

| Phase | Docs Folder | Implementation Pattern |
|-------|------------|----------------------|
| 1 | `2026-05-02-acc-foundation/` | Pre-existing (17/17 QA passed) |
| 2 | `2026-05-02-acc-asset-manager/` | Single agent: 1 Rust module, 1 store, 1 page |
| 7 | `2026-05-02-acc-integrations/` | Parallel with Phase 2: 1 Rust module, 1 store, 1 page |
| 3 | `2026-05-02-acc-intelligence/` | Single agent: 1 Rust module (285 lines), 1 store, 2 pages |
| 4–6 | `2026-05-02-acc-routing/` + `acc-wave-protocol/` + `acc-acb/` + `acc-team-layer/` | Combined agent: 4 Rust modules, 1 unified store, 4 pages |

## Implementation Strategy

- Phases 2 & 7: Parallel (independent code paths)
- Phase 3: Solo (depends on Phase 2 for pattern refs)
- Phases 4–6: Combined (shared orchestration layer)
- Each phase: Backend Rust module → Tauri commands → Frontend store → Frontend pages → App.tsx wiring → Docs
- Final: Comprehensive cargo check + tsc verification

## Build Verification

```bash
cargo check    # 0 errors
npx tsc --noEmit  # 0 errors
```

## File Growth

| Metric | Phase 1 | Phase 1–7 |
|--------|---------|-----------|
| Rust modules | 7 | 14 |
| Tauri commands | 10 | ~95 |
| Frontend pages | 2 | 10 |
| Zustand stores | 5 | 9 |
| UI components | 12 | 16 |
| SQL migrations | 1 | 3 |
