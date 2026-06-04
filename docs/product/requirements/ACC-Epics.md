# ACC Epics — Consolidated User Stories

**Source:** ACC-Complete-Project-Documentation-v2.7.md (Section 5) + ACC-Gap-Assessment 2026-05-02
**Market context:** `docs/2026-06-02-gap-analysis/02-market-gap-analysis.md` (2026-06-03)
**Version:** 1.0
**Total Epics:** 18 (US-101 through US-1805)

---

## Phase 1 — Foundation

### Epic 1: Agent Runner

**US-101** — As a developer, I want to launch Claude Code, OpenCode, Aider, and Goose in one window so I don't switch between terminals.
*Acceptance: All agents spawn from ACC with one click per agent. PTY output visible inline.*

**US-102** — As a developer, I want preset command buttons so I can inject common commands without typing.
*Acceptance: Clicking a preset button injects the command string into the target agent's PTY. No copy-paste required.*

**US-103** — As a developer, I want to see real-time agent status so I know what each agent is doing without reading the terminal.
*Acceptance: Status chip per agent updates in real time: idle / thinking / writing / running tests / done / failed.*

**US-104** — As a developer, I want to switch projects and have all agents restart in the new directory automatically.
*Acceptance: Project switcher changes cwd for all active agents simultaneously. MCPs auto-toggle per project profile.*

**US-105** — As a developer, I want to observe subagent activity from agents that spawn parallel sub-tasks (Claude Code subagents, Cursor parallel agents, Cline subagents).
*Acceptance: ACC detects subagent spawn from PTY output patterns, registers each subagent as a tracked sub-session in the parent panel, and surfaces status chips per subagent.*

**US-106** — As a developer, I want to support Gemini CLI, Codex, and Cursor alongside Claude Code and OpenCode.
*Acceptance: Any Tier 1 agent (CLI-spawnable) can be added via AgentConfig. Agent panels are dynamic, not hardcoded.*

---

## Phase 2 — Asset Manager

### Epic 2: Asset Manager

**US-201** — As a developer, I want to browse and edit all my agent skills in one place without navigating dotfolders.
*Acceptance: Skills Library lists all skills from all configured skill directories. Monaco editor opens inline.*

**US-202** — As a developer, I want to inject a skill into my current project's CLAUDE.md with one click.
*Acceptance: "Inject" button appends skill content to the active project's memory file. Confirms before writing.*

**US-203** — As a developer, I want to manage all MCP server configs across all agents from one panel.
*Acceptance: MCP Registry shows all MCPs with toggle per agent. Toggle writes to the correct agent config file.*

**US-204** — As a developer, I want my API keys encrypted and auto-injected into agent environments.
*Acceptance: Connector Vault stores secrets with AES-256. Secrets are env vars on PTY spawn — never plaintext.*

**US-205** — As a developer, I want to see a diff of my memory file between sessions.
*Acceptance: Memory Browser shows side-by-side diff: current CLAUDE.md vs. last session snapshot.*

**US-206** — As a developer, I want to import OpenClaw-format skill files.
*Acceptance: Skills Library accepts `SKILL.md` files in OpenClaw format. Metadata parsed correctly.*

---

## Phase 3 — Project Intelligence

### Epic 3: Project Intelligence

**US-301** — As a developer, I want ACC to auto-detect my project's tech stack on load.
*Acceptance: Project profile populated from `package.json`, `pyproject.toml`, `Cargo.toml` etc. without manual input.*

**US-302** — As a developer, I want MCP suggestions based on my detected stack.
*Acceptance: If Supabase detected in dependencies, Supabase MCP appears as "Suggested" in MCP Registry.*

**US-303** — As a developer, I want to load a project profile and have all agents, MCPs, and skills configure automatically.
*Acceptance: "Load Profile" applies MCPs, injects skills, sets agent preferred model — all in one click.*

---

## Phase 4 — Outcome Tracker

### Epic 4: Outcome Tracker

**US-401** — As a developer, I want to record whether an agent task succeeded, failed, or needed revision.
*Acceptance: After agent goes idle, ACC prompts: Done / Failed / Revised / Skip. Response stored in SQLite.*

**US-402** — As a developer, I want to see each agent's success rate by task type.
*Acceptance: Outcome dashboard shows per-agent, per-task-type success rates computed from SQLite history.*

**US-403** — As a developer, I want the outcome history to inform routing suggestions over time.
*Acceptance: Task Router uses outcome stats to rank agents by task type for the current project.*

---

## Phase 5 — Task Router & Wave Orchestrator

### Epic 5: Task Router & Model Router

**US-501** — As a developer, I want to describe a task and get a smart agent suggestion.
*Acceptance: Single input box → ACC suggests agent + model with confidence score and reasoning. User confirms.*

**US-502** — As a developer, I want to route tasks to specific models within agents.
*Acceptance: Model Router suggests `openrouter/minimax/minimax-m2.7` for file ops, Qwen for complex logic.*

**US-503** — As a developer, I want to send the same task to multiple agents and compare results.
*Acceptance: "Send to Both" option spawns the task in two PTY sessions simultaneously.*

### Epic 6: Wave Orchestrator

**US-601** — As a developer, I want to plan a multi-agent feature with a dependency-aware work item table.
*Acceptance: Wave Orchestrator UI lets me add agents, assign waves, set dependencies. Validates graph for cycles.*

**US-602** — As a developer, I want Wave 1 agents to spawn in parallel automatically.
*Acceptance: "Execute Wave 1" spawns all Wave 1 agents simultaneously in separate PTY sessions.*

**US-603** — As a developer, I want Wave 2 agents to only spawn after all Wave 1 handoffs are verified.
*Acceptance: ACC blocks Wave 2 spawn until each Wave 1 `HANDOFF_<ID>.md` exists and validates.*

**US-604** — As a developer, I want stalled agents flagged after 10 minutes with recovery options.
*Acceptance: If no file changes for 10 minutes: alert + options [Retry] [Complete Manually] [Terminate].*

---

## Phase 6 — Agent Guidelines & Handoff

### Epic 7: Agent Guideline Generator

**US-701** — As a developer, I want to generate structured agent briefs before wave execution.
*Acceptance: Guideline Generator form → produces `AGENT_A1_GUIDELINE.md` in docs subfolder.*

**US-702** — As a developer, I want to see the exact `opencode run` command before firing it.
*Acceptance: CLI preview shown in Guideline Generator. User can copy or execute directly from ACC.*

### Epic 8: Handoff Monitor

**US-801** — As a developer, I want ACC to detect when an agent produces a handoff document.
*Acceptance: File watcher on docs subfolder detects `HANDOFF_<ID>.md` creation and parses it automatically.*

**US-802** — As a developer, I want to approve or flag each handoff before the next wave unlocks.
*Acceptance: Handoff panel shows parsed content. "Approve" button unlocks dependent agents. "Flag" triggers correction.*

---

## Phase 7 — Correction Loop

### Epic 9: Failure Analyzer & Correction Loop

**US-901** — As a developer, I want one-click failure diagnosis from PTY output.
*Acceptance: "Analyze Failure" → ACC spawns non-interactive agent session with PTY excerpt + task context → structured diagnosis: root cause, evidence, suggested fix, confidence.*

**US-902** — As a developer, I want ACC to auto-generate a correction document and re-inject it to the agent.
*Acceptance: After diagnosis: "Generate Correction" → `CORRECTION_<ID>.md` created → "Re-inject" fires `opencode run`.*

**US-903** — As a developer, I want failed corrections to escalate to me after 2 retries.
*Acceptance: After 2 failed corrections: ACC stops, shows exact error, prompts for human decision.*

---

## Phase 6 — Session Replay & Feature Docs

### Epic 10: Session Replay & Feature Docs

**US-1001** — As a developer, I want a structured timeline of everything that happened in a session.
*Acceptance: Session Replay shows chronological events: read / edit / run / input / error with file targets and diffs.*

**US-1002** — As a developer, I want to generate client-ready documentation after a multi-agent feature.
*Acceptance: "Generate Feature Docs" → ACC spawns non-interactive agent session with session context → 4 canonical docs: EXECUTIVE_PLAN, CHANGELOG, QA_REPORT, TECHNICAL_PLAN.*

**US-1003** — As a developer, I want to export session replays as PDF or Markdown for client reporting.
*Acceptance: Export button on any session → PDF or Markdown file with timeline, outcome, and file changes.*

---

## Phase 6 — Team Playbooks

### Epic 11: Team Playbooks

**US-1101** — As a team lead, I want to export a client's full AI setup as a single portable file.
*Acceptance: "Export Playbook" → `.acc` bundle: skills, memory, MCPs (no secrets), presets, project profile.*

**US-1102** — As a team member, I want to import a playbook and be fully set up in under 30 seconds.
*Acceptance: Import `.acc` → all assets installed, MCPs configured, presets loaded. Secret key scaffolding prompts for values.*

---

## Phase 9 — Knowledge Layer

### Epic 12: Reactive Memory Capture

**US-1201** — As a developer, I want ACC to surface agent learnings as candidate memory entries.
*Acceptance: Pattern detection in PTY output → candidate prompt appears: "Add to memory? [Add] [Edit] [Skip]".*

**US-1202** — As a developer, I want approved memory entries to automatically update CLAUDE.md.
*Acceptance: On "Add" — entry appended to project CLAUDE.md with timestamp. No manual file editing.*

### Epic 13: Upstream Connector Loop (Lark / Slack / Jira)

**US-1301** — As a team lead, I want ACC to monitor Lark channels for feature requests and bug reports.
*Acceptance: Architect Agent polls configured channels on schedule. New messages classified automatically.*

**US-1302** — As a team lead, I want ACC to create a Lark Doc proposal for each detected request.
*Acceptance: Classified item → Lark Doc created with problem, root cause, solution options, execution plan.*

**US-1303** — As a stakeholder, I want to approve a proposal in Lark without leaving the app.
*Acceptance: ✅ reaction or "approved" reply → ACC detects signal → execution triggered.*

**US-1304** — As a stakeholder, I want a completion report posted back to Lark automatically.
*Acceptance: After QA pass → summary message + Changelog + QA Report posted to original thread.*

**US-1305** — As a team lead, I want Slack and Jira supported with the same loop.
*Acceptance: ConnectorConfig abstraction supports Slack (official MCP) and Jira (Atlassian Rovo MCP) with identical stages.*

**US-1306** — As a team lead, I want a Lark Base record created for every completed delivery.
*Acceptance: Delivery log table in Lark Base — one record per completed feature with all doc links.*

### Epic 14: Supabase & GitHub Integration

**US-1401** — As an app builder, I want to manage Supabase MCP feature groups per project so agents don't have destructive access by default.
*Acceptance: Supabase MCP entry in registry shows 8 feature group toggles. Read-only mode on by default. Project-scoped config.*

**US-1402** — As a developer, I want agents to read the Supabase schema before writing migrations.
*Acceptance: Agent can call Supabase MCP `database` tools to inspect tables, columns, and RLS policies mid-session.*

**US-1403** — As a developer, I want migrations flagged for human review before application.
*Acceptance: Supabase MCP `execute_sql` is disabled by default. Agent writes migration file, flags it. Human applies via dashboard or CLI.*

**US-1404** — As a developer, I want GitHub CI/CD status to serve as the QA signal for wave completion.
*Acceptance: After Wave final agent creates PR, ACC polls GitHub Actions status. Green CI = QA pass. Red CI = correction loop trigger.*

**US-1405** — As a developer, I want GitHub Issues to trigger the upstream connector loop.
*Acceptance: GitHub Issues monitored as Tier 1 connector. New issue → classify → propose → approve → wave → PR created → issue closed with report.*

**US-1406** — As a developer, I want GitHub PRs created automatically after a completed wave.
*Acceptance: Post-QA: `@octokit/rest` creates PR with CHANGELOG content as description, links to session replay, tags reviewers.*

**US-1407** — As a developer, I want Lockdown mode enabled by default on GitHub MCP for public repos.
*Acceptance: GitHub MCP config includes `lockdown: true` for any project where repo visibility is public. Surfaced in MCP Registry.*

### Epic 15: Knowledge Compounder

**US-1501** — As a developer, I want ACC to automatically extract learning materials from completed sessions without me doing anything.
*Acceptance: Async job fires after Feature Doc generation. No user input required. Results appear in Knowledge Panel.*

**US-1502** — As a developer, I want five types of learning outputs: Decision Logs, Pattern Cards, Anti-Pattern Warnings, Stack Runbooks, and Lesson Briefs.
*Acceptance: Knowledge Compounder spawns non-interactive agent session and returns structured JSON with type field. Each type renders with distinct visual treatment.*

**US-1503** — As a developer, I want knowledge items to gain confidence when confirmed by multiple sessions.
*Acceptance: Matching items increment `confirmation_count`. Confidence score displayed as fill bar (1 conf = low, 8+ conf = high).*

**US-1504** — As a developer, I want relevant knowledge injected into agent context at session start.
*Acceptance: On project load, ACC queries knowledge base by stack + project tags. Top 3–5 items appended to CLAUDE.md session preamble.*

**US-1505** — As a developer, I want to search and filter my knowledge base.
*Acceptance: Knowledge Panel has full-text search + filter by type, stack, agent, project, confidence level.*

**US-1506** — As a developer, I want to export knowledge items into team playbooks.
*Acceptance: "Add to Playbook" on any knowledge item → included in `.acc` bundle export as `knowledge/` directory.*

**US-1507** — As a team lead, I want the knowledge base to surface contradictions between sessions.
*Acceptance: When new item contradicts existing one, `contradicts` relation created. Both items flagged with "conflicting evidence" badge.*

**US-1508** — As a developer, I want anti-patterns to surface as warnings in the Agent Guideline Generator.
*Acceptance: When generating a guideline, ACC queries anti-patterns by stack. Matching anti-patterns shown as preflight warnings.*

---

## Phase 10+ — Post-Launch Epics

### Epic 16: Parallel Orchestration

*Source: ACC-Gap-Assessment 2026-05-02, Section 3.4*

**US-1601** — As a developer, I want to right-click any PTY panel and promote it to a Control Session so it becomes a mini-orchestrator that manages its own feature wave.
*Acceptance: Right-click panel → "Promote to Control Session" → header shows 🎯 badge → embedded mini wave grid with independent DAG.*

**US-1602** — As a team lead, I want to run multiple parallel wave orchestrations concurrently so Feature A and Feature B develop simultaneously without blocking each other.
*Acceptance: `feature_plans` supports multiple plans in `executing` state per project. Each thread has its own orchestration lifecycle.*

**US-1603** — As a developer, I want per-thread docs scope isolation so parallel feature threads don't write to the same output directory.
*Acceptance: Each thread writes to `docs/THREAD_ID/YYYY-MM-DD-slug/`. Per-thread file watchers scoped to their own docs folder.*

**US-1604** — As a developer, I want cross-thread file conflict detection so two parallel threads don't silently overwrite each other's work.
*Acceptance: File ownership registry tracks per-file thread claims. If Thread B touches a file claimed by Thread A, warning surfaced immediately.*

**US-1605** — As a team lead, I want a global budget view across all active threads so I can monitor total token spend in one place.
*Acceptance: Aggregate token usage panel shows per-thread + total spend across all active Control Sessions.*

---

### Epic 17: Token Management Enhancements

*Source: ACC-Gap-Assessment 2026-05-02, Section 2.5*

**US-1701** — As a developer, I want per-provider cost aggregation so I can see monthly spend broken down by OpenRouter, Claude Pro, and other providers.
*Acceptance: Cost dashboard shows per-provider totals computed from `token_usage` table with `cost` field. Monthly and per-session views.*

**US-1702** — As a developer, I want model cost comparison in the Model Registry so the Budget Planner can optimize for cost, not just token limits.
*Acceptance: Model Registry includes `cost_per_1k_tokens` field. Task Router surfaces cheapest-capable-model suggestion alongside quality ranking.*

**US-1703** — As a developer, I want unused agent tokens reallocated to agents nearing their budget limit so wave execution doesn't halt prematurely.
*Acceptance: If Agent A1 finishes 40% under budget and Agent A2 is at 95%, unused A1 tokens transfer to A2. Budget bars update in real time.*

---

### Epic 18: SkillBridge Integration

*Source: ACC-Gap-Assessment 2026-05-02, Section 5.3*

**US-1801** — As a developer, I want ACC to auto-detect my SkillBridge installation so integration is seamless without manual configuration.
*Acceptance: ACC checks process/App path/config file on startup. Detection status stored in SQLite. Status surfaced in Settings → Integrations and Runner status bar.*

**US-1802** — As a developer, I want SkillBridge's MCP endpoint auto-registered in the MCP Registry so I can toggle it per agent without copying URLs.
*Acceptance: On detection, ACC creates managed MCP entry with `source: "skillbridge"`. Read-only connection params. Per-agent toggle. Connection health indicator (green/grey/red dot).*

**US-1803** — As a developer, I want claude-mem entries to serve as input to the Knowledge Compounder so learnings from web sessions enrich my project knowledge base.
*Acceptance: ACC reads `~/.claude-mem/` (read-only). High-usage/recent entries become candidate sources for the Compounder. Items show 📡 SkillBridge source badge.*

**US-1804** — As a developer, I want a unified memory view showing agent memory files and claude-mem entries in one browser so I don't switch between tools.
*Acceptance: Memory Browser adds [Unified] tab with side-by-side agent memory + claude-mem entries. Cross-reference via keyword overlap. Merge/split controls per matched pair.*

**US-1805** — As a new user, I want a guided onboarding flow that helps me install SkillBridge so I can connect local memory to Claude.ai web.
*Acceptance: First-launch welcome screen offers SkillBridge install path. Shows what integration provides. "Skip — I only need local agents" option remains. Re-accessible from Settings → Integrations.*

---

## Phase 9+++ — Memory Layer Foundation

*Source: `docs/2026-06-04-memory-layer/ACC-Memory-Layer-Feature-Spec.md`*

### Epic 19: Context Consistency & Persistence

**US-1901** — As a developer, I want my agent sessions to resume with prior context so I can continue work across sessions without repeating myself.
*Acceptance: Session checkpoint saved on close, loaded on reopen. Top-10 relevant memory facts injected as context preamble. Agent sees "Prior knowledge: [facts]" at session start.*

**US-1902** — As a developer, I want long-running agent sessions to automatically compress their context so they don't hit model limits.
*Acceptance: 3-zone compression fires at 50% context threshold. Head messages protected, middle summarized, tail preserved verbatim. Agent continues seamlessly after compression.*

**US-1903** — As a developer, I want critical decisions and constraints preserved during context compression so nothing important is lost.
*Acceptance: Write-before-compaction hook extracts facts before compression. Exact values, hard constraints, and decision reasoning persist in memory_facts table.*

**US-1904** — As a developer, I want to see my accumulated agent memory in a searchable panel so I can review what my agents have learned.
*Acceptance: Memory Panel in Knowledge page — fact timeline, search bar, filter by type/agent/confidence. Each fact shows type badge, entities, confidence bar, source session link.*

**US-1905** — As a developer, I want memory to work offline with no external dependencies so my data stays local.
*Acceptance: sqlite-vec runs in-process. All embeddings computed locally via ONNX. Zero network calls for storage or retrieval. acc_memory.db is a single portable file.*

### Epic 20: Memory Retrieval Engine

**US-2001** — As an agent, I want to search past decisions and patterns by meaning, not just keywords so I find relevant knowledge even with different wording.
*Acceptance: Hybrid retrieval combines vector similarity (cosine via sqlite-vec) + BM25 keyword + entity matching. Results ranked by fused score with memory decay reranking.*

**US-2002** — As a developer, I want to filter memory by scope so Agent A's memories don't leak to Agent B.
*Acceptance: Multi-scope identity model enforces user_id, agent_id, session_id, org_id partitioning. Query-time filtering prevents cross-agent information leakage.*

**US-2003** — As a developer, I want memory to never be permanently deleted so institutional knowledge isn't lost.
*Acceptance: ADD-only extraction — facts only appended, never overwritten. Memory decay soft-reranks with 0.3x floor — stale facts still retrievable when they're the best match.*

---

## Phase 10a — Codebase Exploration

*Source: `docs/2026-06-04-codebase-exploration/ACC-Codebase-Exploration-Feature-Spec.md`*

### Epic 21: Repo Map & Structured Context

**US-2101** — As an agent, I want a compact codebase overview injected at session start so I understand the project structure without reading every file.
*Acceptance: Repo map generated via tree-sitter, ranked by PageRank, fits within configurable token budget (default 2K). Contains function/class signatures and dependency structure.*

**US-2102** — As an agent, I want to request code at different detail levels so I don't waste context on files I only need signatures for.
*Acceptance: Signature ladder — L0 skeleton, L1 signatures, L2 annotated, L3 full body. Agent requests level on demand. Context cache with LRU eviction.*

**US-2103** — As an agent, I want to search the codebase by both keywords and semantic meaning so I find relevant code even when I don't know exact file names.
*Acceptance: Hybrid BM25 + vector search over AST-aware chunks. Results include file path, symbol name, line range, relevance score. Graph expansion from top seeds.*

**US-2104** — As a developer, I want to see which parts of my codebase have been explored by agents so I know where coverage gaps are.
*Acceptance: Exploration coverage stats per file: unexplored / mapped / summarized / analyzed. Percentage displayed in project header. Gap warnings for untouched directories.*

---

## Phase 10b — Knowledge Graph v2

*Source: `docs/2026-06-04-knowledge-graph/ACC-Robust-Knowledge-Graph-Feature-Spec.md`*

### Epic 22: GraphRAG-Style Knowledge Graph

**US-2201** — As a developer, I want related knowledge items automatically clustered into communities so I can understand themes and patterns at a glance.
*Acceptance: Leiden community detection runs on the knowledge graph. Communities displayed with auto-generated LLM summaries. 3 hierarchical levels: local/mid/global.*

**US-2202** — As a developer, I want to ask high-level questions about my project's knowledge and get synthesized answers.
*Acceptance: GraphRAG Global Search matches query to community summaries, generates partial answers, reduces to final response. Example: "What anti-patterns keep recurring?" → synthesized answer.*

**US-2203** — As a developer, I want to trace multi-hop relationships through the knowledge graph so I understand root causes.
*Acceptance: Recursive CTE queries support multi-hop reasoning. Path display: "Error → caused_by → antipattern → contradicts → convention". Visual path highlighting in KG Explorer.*

**US-2204** — As a developer, I want knowledge items linked to the specific code entities they apply to so I get file-level warnings.
*Acceptance: tree-sitter code entities bridged to knowledge items via code_to_knowledge table. Query: "patterns for src/auth.ts" returns linked items with relation type.*

**US-2205** — As a developer, I want git history patterns mined into the knowledge graph so I'm warned about files that frequently change together.
*Acceptance: Git co-change mining via Jaccard similarity. Files with >0.3 co-change score stored in git_cochange_relations. Warning surfaced when modifying one file: "src/auth.ts co-changes with src/models/user.py (0.42)."*

### Epic 23: Knowledge Graph Visualization

**US-2301** — As a developer, I want an interactive visual graph of my knowledge base so I can explore relationships intuitively.
*Acceptance: Cytoscape.js force-directed layout. Nodes color-coded by type, sized by confidence. Edges show relation type. Click-to-expand neighbors, drag-to-pan, scroll-to-zoom.*

**US-2302** — As a developer, I want to curate my knowledge graph directly in the visualization by creating, editing, and merging nodes.
*Acceptance: Double-click to edit node. Drag between nodes to create relation. "Merge?" prompt on similar nodes. Contradiction resolution panel. All changes persisted to SQLite.*

**US-2303** — As a developer, I want to see how my knowledge graph evolved over time so I can track learning progression.
*Acceptance: Temporal scrubber slider — drag to view KG state at different points in time. Node animation shows additions/removals/confidence changes. Session markers on timeline.*

---

## Phase 10c — Multi-Agent Memory Synthesis

*Source: `docs/research/consolidation-and-recommendations.md` (Phase 4)*

### Epic 24: Collective Agent Memory

**US-2401** — As a developer, I want Agent B to automatically learn from Agent A's discoveries so my agents coordinate without manual handoffs.
*Acceptance: Cross-agent fact surfacing via shared org_id scope. "Recent discoveries" filter surfaces facts from other agents in same time window. Attribution metadata on every fact.*

**US-2402** — As a developer, I want a CLI to inspect agent memory so I can audit what my agents have learned.
*Acceptance: `acc memory list <agent_id>` — list facts by agent. `acc memory search <query>` — hybrid search. `acc memory stats` — per-agent breakdown, confidence trends, cost.*

**US-2403** — As a developer, I want conflicting facts from different agents surfaced so I can resolve inconsistencies.
*Acceptance: Cross-agent conflict detector flags contradictory patterns from different agents. Resolution panel: "Agent A says X, Agent B says Y. Resolve: A correct / B correct / both valid in context."*

**US-2404** — As a developer, I want memory quality to improve over time as facts are corroborated across multiple agents and sessions.
*Acceptance: Multi-factor confidence model (source + corroboration + recency + agent tier). Facts confirmed by 3+ agents auto-promote from low to medium confidence tier. Memory quality dashboard shows trends.*

---

## Summary

| Epic | Phase | Stories | Description | Market Position |
|---|---|---|---|---|
| 1 | Phase 1 — Foundation | 6 | Agent Runner (multi-agent PTY launcher) | Table stakes — 5+ products have multi-agent launchers |
| 2 | Phase 2 — Asset Manager | 6 | Asset Manager (skills, MCPs, vault, memory) | Differentiated — encrypted vault + MCP registry unique to ACC |
| 3 | Phase 3 — Project Intelligence | 3 | Project Intelligence (stack detection, profile loading) | Competitive — auto-detection exists in 2 products |
| 4 | Phase 4 — Outcome Tracker | 3 | Outcome Tracker (success rates, routing feedback) | Differentiated — no competitor tracks per-agent success rates |
| 5 | Phase 5 — Task Router | 3 | Task Router & Model Router | Competitive — 2 products have routing; ACC has model alternation |
| 6 | Phase 5 — Wave Orchestrator | 4 | Wave Orchestrator (DAG, parallel waves, handoff gates) | **UNCONTESTED** — zero competitors have dependency-aware wave execution |
| 7 | Phase 6 — Agent Guidelines | 2 | Agent Guideline Generator | **UNCONTESTED** — zero competitors auto-generate agent briefs |
| 8 | Phase 6 — Handoff | 2 | Handoff Monitor (detect, approve, flag) | **UNCONTESTED** — zero competitors have handoff verification gates |
| 9 | Phase 7 — Correction Loop | 3 | Failure Analyzer & Correction Loop | **UNCONTESTED** — zero competitors have auto-retry correction |
| 10 | Phase 8 — Session Replay | 3 | Session Replay & Feature Docs | Competitive — 1 product has replay; none have auto doc generation |
| 11 | Phase 8 — Team Playbooks | 2 | Team Playbooks (export/import .acc bundles) | Differentiated — unique .acc bundle format |
| 12 | Phase 9 — Knowledge Layer | 2 | Reactive Memory Capture | Differentiated — 1 product (Ruflo) has reactive memory |
| 13 | Phase 9 — Knowledge Layer | 6 | Upstream Connector Loop (Lark, Slack, Jira) | **UNCONTESTED** — connectors exist in 3 products but zero have the 7-stage loop |
| 14 | Phase 9 — Knowledge Layer | 7 | Supabase & GitHub Integration | Differentiated — GitHub integration exists in 3 products but safety defaults are unique |
| 15 | Phase 9 — Knowledge Layer | 8 | Knowledge Compounder | **UNCONTESTED** — Ruflo is closest (1-pass, Claude-only); ACC: 2-pass, 9-agent |
| 16 | Phase 10+ | 5 | Parallel Orchestration (Control Sessions, multi-thread, conflict detection) | Phase 10+ — not v1 blocking per market analysis |
| 17 | Phase 10+ | 3 | Token Management Enhancements (cost aggregation, model costs, reallocation) | Phase 10+ — budget ladder is uncontested; cost aggregation is competitive gap closure |
| 18 | Phase 10+ | 5 | SkillBridge Integration (detection, MCP, memory, onboarding) | **UNCONTESTED** — unique ecosystem integration |
| 19 | Phase 9+++ — Memory Layer | 5 | Context Consistency & Persistence (checkpoints, compression, extraction, memory panel) | **UNCONTESTED** — no competitor has context compression with write-before-extraction |
| 20 | Phase 9+++ — Memory Layer | 3 | Memory Retrieval Engine (hybrid search, scoping, ADD-only storage) | **UNCONTESTED** — zero competitors have multi-signal retrieval for coding agents |
| 21 | Phase 10a — Codebase Exploration | 4 | Repo Map & Structured Context (repo map, signature ladder, hybrid search, coverage) | **UNCONTESTED** — aider has repo map but no multi-agent context management |
| 22 | Phase 10b — Knowledge Graph v2 | 5 | GraphRAG-Style Knowledge Graph (communities, global search, multi-hop, code bridge, git mining) | **UNCONTESTED** — GraphRAG exists but no product integrates it with coding agent KG |
| 23 | Phase 10b — Knowledge Graph v2 | 3 | Knowledge Graph Visualization (Cytoscape.js, curation, temporal scrubber) | **UNCONTESTED** — zero competitors have interactive agent KG visualization |
| 24 | Phase 10c — Multi-Agent Memory | 4 | Collective Agent Memory (cross-agent surfacing, CLI, conflict resolution, quality) | **UNCONTESTED** — greenfield; no agent orchestrator has cross-agent memory synthesis |

**Total: 102 user stories across 24 epics.**

### Market Positioning Summary

- **13 uncontested epics** (6, 7, 8, 9, 13, 15, 18, 19, 20, 21, 22, 23, 24) — zero competitors have equivalent functionality
- **5 differentiated epics** (2, 4, 11, 12, 14) — some overlap but ACC's implementation is stronger
- **3 competitive epics** (3, 5, 10) — match or slightly exceed market
- **2 Phase 11 only epics** (16, 17) — architectural gaps, not v1 blocking per market analysis
- **1 table-stakes epic** (1) — necessary foundation, not a differentiator

Note: Epic 18 (SkillBridge) is both UNCONTESTED and deploys in Phase 10+ — counted once as UNCONTESTED above; 24 epics total.
