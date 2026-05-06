# 03 — Design Compliance Assessment

## Core Design Principles (from ACC Spec v2.7)

| Principle | Compliance | Evidence |
|-----------|-----------|----------|
| **P1: Human in the Loop** | PARTIAL | Route suggests, never auto-fires. Orchestrate has approve gates. But no approval UX visible without backend data. Design principle is encoded in UI architecture but untestable in browser mode. |
| **P2: Files Are Source of Truth** | YES | Skills Library scans native paths (`~/.claude/skills/`). Memory Browser references actual CLAUDE.md files. MCP Registry reads native JSON configs. No proprietary DB layer for agent config. |
| **P3: Local First, Cloud Optional** | YES | SQLite via Rusqlite (bundled). Settings shows offline-capable. No account required. Supabase/GitHub are optional connectors, not hard dependencies. |
| **P4: Transparent, Not Magic** | PARTIAL | Route Task spec shows reasoning + confidence. v1 explicitly labels "estimated" confidence. However, browser-mode failures are opaque — zero feedback on why an action failed. |
| **P5: Expandable From Day One** | YES | Agent panels are dynamic (not hardcoded). ConnectorConfig abstraction in UI. Agent type selector in Settings. Adding a new agent is config-only. |
| **P6: Dogfood the Product** | YES | Codebase built with MAFW protocol. Handoff documents present (`HANDOFF_B1.md` through `HANDOFF_C2.md`). Wave-based development evidence in docs directory. |

**Overall principle compliance: 5/6 PARTIAL or YES. P4 (Transparency) needs work on error states.**

---

## Epic-by-Epic Feature Completeness

| Epic | User Stories | UI Exists | Functional (Browser) | Needs Tauri | Percentage |
|------|-------------|-----------|---------------------|-------------|------------|
| E1: Agent Runner | 6 | All panels, presets, layout | Preset buttons, project selector | PTY spawn/kill/write | 60% |
| E2: Asset Manager | 6 | 5 sub-tabs, scan path, search | UI shell, paths | Read/write/mcp/stronghold | 40% |
| E3: Project Intelligence | 3 | Project selector, Load Profile | Dropdown selector | Auto-detection, MCP suggestions | 50% |
| E4: Outcome Tracker | 3 | Dashboard, table, filters | Stats cards, sortable headers | Data fetch, prompt trigger | 40% |
| E5: Task Router | 3 | Full form, type dropdown | Input validation, button enable | Route logic, confidence | 50% |
| E6: Wave Orchestrator | 4 | Create Plan form | Slug/project inputs | Plan creation, DAG, execution | 30% |
| E7: Guideline Generator | 2 | Not found as standalone | — | Embedded in Orchestrate? | 10% |
| E8: Handoff Monitor | 2 | Full envelope form, validator | All 8 form inputs | File watcher, detect, approve | 60% |
| E9: Failure Analyzer | 3 | Via Replay page | Search, filter UI | Diagnosis, correction loop | 20% |
| E10: Session Replay | 3 | Replay page, search | Layout, search box | Event data, timeline, export | 30% |
| E11: Team Playbooks | 2 | Export/Import UI, drop zone | Checkboxes, file selector | Manifest gen, bundle ops | 50% |
| E12: Reactive Memory | 2 | Playbooks → Memory section | Empty state UI | PTY pattern detection | 20% |
| E13: Upstream Connectors | 6 | Connectors → Chat tab (shell) | Tab selector | Lark/Slack/Jira polling | 15% |
| E14: Supabase/GitHub | 7 | Full config forms, toggles | All inputs, switches, tabs | API calls, scan, lock | 50% |
| E15: Knowledge Compounder | 8 | Full page, 5 filters | Search, type/stack/agent/status | Extraction, relations, inject | 30% |

**Overall UI completeness: ~85% (pages render with correct structure)**
**Overall functional completeness (browser): ~40% (only pure-UI features work)**
**Estimated functional completeness (Tauri desktop): ~70% (backend commands exist but some unused)**

---

## Spec vs Implementation Gaps

1. **E7 Guideline Generator**: No standalone page found. May be embedded in Orchestrate but not surfaced as described in spec (CLI preview, input form).
2. **E9 Failure Analyzer**: Diagnosis logic defined in Rust (`intelligence.rs`) but `update_failure_diagnosis`, `build_intelligence_prompt`, `extract_pty_context`, `suggest_outcome` are all unused functions.
3. **E12 Reactive Memory**: Pattern detection logic spec'd but the 5 detection patterns are not wired to the Rust backend — `MemoryFileWriteCoordinator` exists but PTY output is not being piped through the pattern matcher.
4. **E13 Upstream Connectors**: Chat tab exists but appears as a shell with no platform-specific UI for Lark/Slack/Discord/Telegram.
5. **E15 Knowledge Compounder**: "Add Entry" button permanently disabled — no manual creation path. Stats/Relations tabs exist but likely no data.

---

## What ACC Does Right (Per Spec)

- All 14 navigation routes match the documented module list exactly
- Sidebar uses correct Lucide icons per module
- Dark/Light/System theme support with persisted preference
- Dynamic agent panel layout (not hardcoded to specific agents)
- Preset button bar with 5 pre-configured presets + custom
- Settings page with appearance, defaults, integrations, and about
- Proper project selector with profile loading
- File-path-based asset scanning (respects P2 design principle)
- Read-only mode enforced for Supabase (security-first)
- Version/build info visible in Settings
