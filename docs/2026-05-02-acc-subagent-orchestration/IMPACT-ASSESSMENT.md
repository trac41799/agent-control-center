# IMPACT ASSESSMENT — Native Subagent Orchestration Upgrade

**Date:** 2026-05-02
**Trigger:** UPGRADE-NOTICE.md — 4 agents corrected from `supportsSubagents: false` → `true`
**Scope:** Cross-phase gap analysis of Phase 3–7 implementation against updated architecture
**Severity:** High — 4 critical gaps, 2 medium gaps in currently implemented code

---

## Source of Change

On 2026-05-02, 4 agent configurations were corrected:
- OpenCode: ~~`false`~~ → `true` (task() family)
- Gemini CLI: ~~`false`~~ → `true` (@agent delegation family)
- Codex CLI: ~~`false`~~ → `true` (spawn_agent family)
- Qwen Code: ~~`false`~~ → `true` (task() family)

**Result:** 7 of 9 agents now have native subagent support (was 3). 2 agents remain external-only (Aider, Goose).

## Architectural Impact

The ACC orchstration model now has **two distinct paths** that must coexist:

| Path | Trigger | Agents | Mechanism | Detection |
|------|---------|--------|-----------|-----------|
| **Native** | `supportsSubagents: true` | 7 agents | Orchestrator delegates via `task(subagent_type=...)` / `@agent` / `spawn_agent` in-same-PTY | PTY pattern match on `subagentDetectionPattern` |
| **External** | `supportsSubagents: false` or cross-tool | 2 agents (Aider, Goose) + cross-tool | ACC spawns new CLI via `waveCommand`, agent writes `HANDOFF_*.md` | `fs.watch` on docs folder |

**Core insight:** Both paths run simultaneously in the same wave. A Claude Code orchestrator (native) can spawn an Aider subagent (external). ACC must handle both detection mechanisms concurrently.

---

## Gap Analysis — Per Phase

### Gap 1: Orchestrator Mode — No Native vs External Decision Logic (Phase 5, Critical)

**File affected:** `src-tauri/src/orchestrator.rs`

**What should happen:** When adding a plan agent, the orchestrator checks `agent.supportsSubagents`:
- If `true` + orchestrator agent is in the same task-tool family → inject `task(subagent_type=..., prompt=...)` command into orchestrator PTY
- If `false` → spawn external CLI session via `waveCommand`

**What currently happens:** `add_plan_agent` stores the agent in SQLite but has no orchestration execution logic. It never inspects `supportsSubagents` or `waveCommand`. The planning data model exists but the execution path doesn't branch on subagent capability.

**Code gap:** `orchestrator.rs` lines 47-59 (`add_plan_agent`) — stores metadata only, no execution branching.

### Gap 2: Handoff Monitor — Missing PTY-Based Path (Phase 5, Critical)

**File affected:** `src-tauri/src/orchestrator.rs` (handoff validator)

**What should happen:** Two detection paths:
1. **Native subagents:** PTY pattern match on `subagentDetectionPattern` (e.g., `Dispatching subagent|subagent_type` for OpenCode) → register as sub-session, track via PTY output patterns
2. **External subagents:** `fs.watch` on `docs/YYYY-MM-DD-slug/` for `HANDOFF_*.md` files → parse 6-section schema → validate

**What currently happens:** Only `validate_handoff_schema(content: &str)` exists — it validates a HANDOFF file's text content. No PTY pattern matcher for native subagents. No file watcher for HANDOFF.md creation. No sub-session tracking.

**Code gap:** `orchestrator.rs` lines 120-131 (`validate_handoff_schema`) — file-content validation only, no PTY path, no fs.watch.

### Gap 3: Intelligence Layer — No Subagent Pattern Detection (Phase 3, High)

**Files affected:** `src-tauri/src/intelligence.rs`

**What should happen:** The PTY output pipeline detects subagent spawns using each agent's `subagentDetectionPattern`. When a parent agent dispatches a subagent:
- Outcome tracker registers sub-session
- Status chip per subagent in Runner UI
- Subagent events logged to `events` table

**What currently happens:** 
- `suggest_outcome()` checks for "tests passed"/"error:"/idle — not subagent patterns
- `detect_limit_event()` checks 15 rate/token limit patterns — not subagent patterns  
- No function checks `subagentDetectionPattern` against PTY output
- No sub-session registration

**Code gap:** `intelligence.rs` lines 249-266 (`suggest_outcome`) — outcome detection only, no subagent detection.

### Gap 4: Token Guard — Missing Native Subagent Token Accounting (Phase 3, Medium)

**Files affected:** `src-tauri/src/intelligence.rs`

**What should happen:** Native subagents (7 agents) share their parent session's token budget. When a subagent consumes tokens within the parent PTY, those tokens count against the parent's `token_usage` entry. External subagents get separate budgets.

**What currently happens:** `record_token_usage()` records tokens by `session_id` only — it doesn't distinguish between parent and subagent consumption. For external orchestration, this is fine (separate sessions). For native subagents sharing a PTY, all tokens are attributed to the parent agent correctly by default (same session_id) — but subagent-specific accounting is missing.

**Code gap:** `intelligence.rs` lines 228-250 (`record_token_usage`) — no subagent attribution field.

### Gap 5: Guideline Generator — Missing Subagent Instructions (Phase 5, Medium)

**Files affected:** `src-tauri/src/orchestrator.rs`

**What should happen:** When the orchestrator agent supports native subagents, the generated guideline must include:
1. How to delegate tasks to subagents (e.g., `task(subagent_type='explore', description='...')` for task-tool family)
2. Subagent naming convention (A1, A2, etc.)
3. What outputs to expect from subagents
4. How to consolidate subagent results

**What currently happens:** `generate_agent_guideline()` produces a generic 7-section template with Communication Protocol and Budget sections. No subagent-specific instructions for the orchestrator. No differentiation between orchestrator archetypes (task-tool vs Gemini vs Codex).

**Code gap:** `orchestrator.rs` lines 108-127 (`generate_agent_guideline`) — generic template only.

### Gap 6: Runner UI — Missing Orchestrator Mode Toggle (Phase 1 Module 1, Medium)

**Files affected:** `src/pages/Runner.tsx`

**What should happen:** Orchestrator Mode toggle switches layout to orchestrator-at-top + sub-agent grid. Only `waveEligible: true` agents in wave dropdowns.

**What currently happens:** No orchestrator mode toggle exists in Runner.tsx. The AgentGrid renders all agents in a flat grid.

**Code gap:** `src/pages/Runner.tsx` — no orchestrator layout toggle.

---

## What's NOT Affected (Safe Code)

| Area | Reason |
|------|--------|
| Agent config (`configs.ts`) | Already updated — all 7 agents correctly marked ✅ |
| SQLite schema | No new tables needed — `agents.supports_subagents` column exists ✅ |
| PTY manager (`pty.rs`) | Spawn/kill/write works identically for both paths ✅ |
| Asset Manager (Phase 2) | No dependency on subagent architecture ✅ |
| Supabase/GitHub (Phase 7) | No dependency ✅ |
| ACB signal parser (`acb.rs`) | Signal format unchanged ✅ |
| Playbook/Feature Docs (Phase 6) | No dependency ✅ |
