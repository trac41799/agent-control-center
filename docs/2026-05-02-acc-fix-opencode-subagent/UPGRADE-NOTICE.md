# UPGRADE NOTICE — Native Subagent Config Fixes (All Agents)

**Date:** 2026-05-02
**Severity:** Medium (config bug, not a code defect)
**Scope:** ACC project-level configuration and documentation

---

## What Was Wrong

The ACC agent config (`src/lib/agents/configs.ts`) incorrectly marked 4 agents as
`supportsSubagents: false` when they natively support subagents:

| Agent | Was | Is | Mechanism |
|---|---|---|---|
| OpenCode | `false` | `true` | Task tool (`task()`) |
| Gemini CLI | `false` | `true` | `@agent_name` delegation + `/agents` commands |
| Codex CLI | `false` | `true` | `spawn_agent` tool + path-based addressing |
| Qwen Code | `false` | `true` | Task tool (`task()`) — same architecture as OpenCode |

The multi-agent feature skill already uses OpenCode's native `task()` mechanism —
it was the ACC config and docs that were out of sync.

---

## Native Subagent Landscape — Full Assessment

### 7 Subagent-Capable Agents (3 Architectural Families)

| Family | Agents | Mechanism | Detection Pattern |
|---|---|---|---|
| **Task-tool** | Claude Code, OpenCode, Qwen Code | `task(subagent_type=...)` | `Dispatching subagent\|subagent_type` |
| **Gemini** | Gemini CLI | `@agent_name` + `/agents` | `Delegating\|subagent.*started\|/agents\s` |
| **Codex** | Codex CLI | `spawn_agent` + path addressing | `spawn_agent\|Spawned agent` |
| **Proprietary** | Cline CLI | Native v3.58+ | `Spawning subagent\|Sub-task started` |
| **Proprietary** | Cursor | Parallel/background agents | `Background agent\|Parallel agent` |

### 2 Non-Subagent Agents

| Agent | Reason |
|---|---|
| Aider | No task delegation/subagent mechanism |
| Goose | Parallel sub-agents roadmapped, not yet shipped |

---

## What Changed

### Agent Config (`src/lib/agents/configs.ts`)

| Agent | Line | Change |
|---|---|---|
| OpenCode | 30–31 | `supportsSubagents: true` + `subagentDetectionPattern: 'Dispatching subagent\|subagent_type'` |
| Gemini CLI | ~98 | `supportsSubagents: true` + `subagentDetectionPattern: 'Delegating\|subagent.*started\|/agents\\s'` |
| Qwen Code | ~115 | `supportsSubagents: true` + `subagentDetectionPattern: 'Dispatching subagent\|subagent_type'` |
| Codex CLI | ~130 | `supportsSubagents: true` + `subagentDetectionPattern: 'spawn_agent\|Spawned agent'` |

### Product Docs

| File | Change |
|---|---|
| `src/lib/agents/configs.ts` | All 4 agents corrected |
| `docs/product/ACC-Complete-Project-Documentation-v2.7.md` | Agent lineup table + member configs updated |
| `docs/product/technical/ACC-Technical-Overview.md` §2.3 | Full 7-agent breakdown with 3 architectural families + external orchestration mechanism documented |
| `docs/product/technical/ACC-Technical-System-Design.md` Module 1 | Orchestrator Mode now references 7 subagent-capable agents + native path and external fallback (CLI spawn via `waveCommand`) fully documented |

### Orchestration Mode Priority

```
Native (default):  task() family (OpenCode, Claude, Qwen) / Gemini @agent / Codex spawn_agent / Cline / Cursor
Fallback (external): Spawn fresh CLI sessions via waveCommand (Aider, Goose) — e.g.,
                     aider --message "{prompt}" --yes --no-pretty
                     goose run --instructions "{prompt}"
                     Same mechanism for cross-tool orchestration
```

---

## Downstream Dependencies — Verification Checklist

### Phase 1–2 (Current — Foundation + Asset Manager)
- [x] No impact. Config is read-only during these phases.
- [x] `getSubagentCapableAgents()` now returns 7 agents instead of 3.

### Phase 3 — Intelligence Layer (Weeks 7–9)
- [ ] **Module 4 (Outcome Tracker):** Subagent detection pattern matcher must handle all 7 agents' patterns. Verify against each agent's PTY output.
- [ ] **Module 18 (Session Resilience):** Token Guard pattern matching must account for native subagent tokens within parent sessions. All 7 agents' native subagents count against their parent session's budget.

### Phase 5 — Wave Orchestrator (Weeks 12–16)
- [ ] **Module 11 (Wave Orchestrator):** Orchestrator Mode decision logic — native (same-tool, supportsSubagents=true) vs. external (cross-tool or supportsSubagents=false). Now 7 agents qualify for native path.
- [ ] **Module 13 (Handoff Monitor):** Two detection paths — PTY pattern matching for native subagents, `fs.watch` on `HANDOFF_*.md` for external orchestration. Both paths must coexist.

### Phase 9++ — Token Budget System (Weeks 27–28)
- [ ] **Module 21 (Budget Planner):** Native subagents (7 agents) share parent session token budget. External orchestration subagents (Aider, Goose) get separate budgets.

### Phase 10 — Control Sessions (Month 8+)
- [ ] **Module 22 (Multi-Thread Orchestration):** Cross-thread conflict detection must distinguish between native subagents (shared tool memory) and external subagents (separate tools, separate memory, explicit file ownership registry needed).

---

## No Breaking Changes

- All 4 config fixes are additive (`false` → `true` + pattern)
- The multi-agent feature skill already uses native `task()` where available
- `getSubagentCapableAgents()` returns 7 instead of 3 — additive
- No database schema changes required (column already exists)
- No existing code paths altered
