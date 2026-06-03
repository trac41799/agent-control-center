# ACC Market Gap Analysis
**Date:** 2026-06-02 (reconstructed 2026-06-03)
**Source:** Competitive research across 13 GitHub repos + existing applications, May 2026
**Reconstructed from:** ACC-Product-Overview.md Section 2, ACC-Roadmap.md, surviving docs

---

## 1. Research Scope

13 products analyzed across GitHub repositories and live applications as of May 2026. Analysis focused on feature overlap, architectural approach, and market positioning relative to ACC's planned v1 feature set.

---

## 2. Competitive Matrix

| Project | Stars | Lang | Agent Count | Parallel | Token Budget | Knowledge | Connectors | Desktop |
|---|---|---|---|---|---|---|---|---|
| **wshobson/agents** | 34.6k | Python/C# | Claude only | No | No | Skills only | No | No |
| **ClawTeam (HKUDS)** | ~5k | Python | 5+ | Yes (tmux) | No | No | No | No |
| **Paseo** | 5.2k | TypeScript | 3 | No | No | No | No | Yes |
| **Agent-Swarm** | 390 | TypeScript | 6+ | Yes (Docker) | No | Yes (vector) | Slack/Jira/Linear/GH | Web |
| **Composio AO** | ~2k | TypeScript | 5+ | Yes (worktree) | No | No | GH/Linear | Web |
| **1code** | ~500 | TypeScript | 2 | No | No | No | GH/Linear/Slack | Yes |
| **ccswarm** | ~200 | Rust | 3+ | Partial | Yes (OTel) | RAG planned | No | TUI |
| **OpenSwarm** | ~500 | TS/Python | 1 (Claude) | Yes | Cost only | No | No | Yes |
| **Ruflo** | ~500 | TypeScript | 1 (Claude) | Partial | Cost-tracker | Yes (AgentDB+SONA) | No | Web |
| **Wolfpack** | 27 | TypeScript | 3+ | No | No | No | No | Yes |
| **CrewAI-Studio** | 1.3k | Python | Any LLM | No | No | No | No | Web |
| **TaskWeaver (MS)** | 6.2k | Python | GPT only | No | No | No | No | CLI |
| **ACC** | — | Rust/React | **9** | **Yes (wave+DAG)** | **Yes** | **Yes** | **Yes** | **Yes** |

---

## 3. Feature-by-Feature Gap Analysis

### 3.1 Agent Count & Unification

| Capability | Market State | ACC Position |
|---|---|---|
| Max agents unified | 6 (Agent-Swarm) | **9** — Claude Code, OpenCode, Aider, Goose, Cline, Cursor, Gemini CLI, Codex, Qwen Code |
| Agent-agnostic architecture | 3 products (ClawTeam, Composio, Agent-Swarm) | **Yes** — AgentConfig interface, any CLI-spawnable agent |
| Subagent observability | None | **Yes** — PTY pattern detection for subagent spawn from 7 agents |
| IDE agent support | 1 (1code desktop focus) | **Yes** — Cursor via headless CLI, Windsurf excluded (no CLI) |

**Gap:** No competitor unifies 9 agents in a single desktop application. ClawTeam comes closest architecturally (5+ agents, tmux-based) but lacks desktop UI. Agent-Swarm matches integration breadth (6+ agents, Docker-based) but is web-only.

### 3.2 Parallel Execution

| Capability | Market State | ACC Position |
|---|---|---|
| Parallel agent spawn | 4 products (ClawTeam tmux, Agent-Swarm Docker, Composio worktree, OpenSwarm) | **Yes** — Wave N simultaneous PTY spawn |
| Dependency-aware execution | None | **Yes** — DAG with intra-wave per-agent unlock |
| Handoff verification gates | None | **Yes** — fs.watch + schema validation + approve/flag |
| Stall detection + recovery | None | **Yes** — 10-min threshold, retry/complete/terminate |
| Correction loop | None | **Yes** — max 2 auto-retries, escalation on failure |

**Gap:** Zero competitors have dependency-aware wave execution with handoff verification. Existing parallel solutions are "fire and forget" — no feedback loop between parallel agents, no gate that blocks the next agent until the previous one's handoff is verified, and no built-in correction mechanism when agents fail.

### 3.3 Token Budget Management

| Capability | Market State | ACC Position |
|---|---|---|
| Per-agent budget allocation | 0 | **Yes** — complexity × historical p75 × model context |
| Threshold ladder (60/80/95/100%) | 0 | **Yes** — PTY injection at each threshold |
| WIP checkpoint capture | 0 | **Yes** — auto WIP_CHECKPOINT.md with 7 sections |
| Wave resumption from WIP | 0 | **Yes** — Intelligence Layer consolidates → ordered restart |
| Budget reallocation (pool) | 0 | **Phase 10+** — pool-wide surplus flow to hungry agents |
| Cost aggregation by provider | 0 (ccswarm has OTel token tracking) | **Phase 10+** — cost_log table, per-provider monthly views |

**Gap:** Token budget management is a greenfield feature. ccswarm has token usage observability via OpenTelemetry but no proactive budget allocation, threshold enforcement, or WIP capture. Every other product tracks at most cost summaries. No competitor has a budget state machine with automatic agent shutdown and resume-from-checkpoint.

### 3.4 Knowledge Compounding

| Capability | Market State | ACC Position |
|---|---|---|
| Auto-extract learning from sessions | 1 (Ruflo — Claude-only, vector DB) | **Yes** — 2-pass compounder (local pre-pass + LLM call) |
| Multiple output types | 1 (Ruflo AgentDB) | **Yes** — Decision Logs, Pattern Cards, Anti-Patterns, Runbooks, Lesson Briefs |
| Confidence scoring across sessions | 0 | **Yes** — confirmation_count + Jaccard deduplication |
| Contradiction detection | 0 | **Yes** — knowledge_relations table, "conflicting evidence" badge |
| Preflight warnings in guidelines | 0 | **Yes** — anti-pattern surfaced before agent spawn |
| Knowledge export to playbooks | 0 | **Yes** — knowledge/ directory in .acc bundle |

**Gap:** Ruflo is the only product with knowledge accumulation (AgentDB vector storage + SONA indexing), but it's Claude-only and web-based. No other product extracts structured learning from completed sessions automatically. The compounding loop — more sessions → more knowledge → smarter agents → better outcomes → more sessions — exists only in ACC's design.

### 3.5 Connectors & Upstream Loop

| Capability | Market State | ACC Position |
|---|---|---|
| Multi-platform chat connectors | 3 (Agent-Swarm: Slack/Jira/Linear/GH; 1code: GH/Linear/Slack; Composio: GH/Linear) | **Yes** — Lark, Slack, Discord, Telegram (Phase 8: GitHub Issues; Lark/Slack/Jira deferred) |
| Full 7-stage loop (detect→propose→approve→execute→verify→report) | 0 | **Yes (GitHub Issues)** |
| Automated proposal generation | 0 | **Yes** — Architect Agent Lark Doc / Slack Canvas |
| Approval signal detection | 0 | **Yes** — ✅ reaction / "approved" reply |
| Completion report posted back | 0 | **Yes** — Changelog + QA Report to original thread |

**Gap:** Agent-Swarm has the most connectors (Slack, Jira, Linear, GitHub) but no automated execution pipeline — connectors are I/O only. No competitor has the full 7-stage autonomous loop from stakeholder message to deployed feature. The human relay (developer reads → interprets → types → runs → writes back) remains in every existing product.

### 3.6 Desktop vs. Web

| Distribution | Market State | ACC Position |
|---|---|---|
| Native desktop app | 5 products (Paseo, 1code, OpenSwarm, Wolfpack, ACC) | **Tauri v2 (~10MB binary)** |
| Electron-based desktop | 4 products | ACC: No — Tauri v2 vs 150MB+ Electron |
| Web-only | 6 products | ACC: v2 web version planned (Next.js + Supabase) |

**Gap:** ACC's Tauri v2 architecture (~10MB) vs Electron competitors (~150MB+) is a significant distribution advantage. The local-first, offline-capable architecture also differentiates from web-only solutions that require cloud infrastructure.

---

## 4. Competitor Deep Dives

### 4.1 ClawTeam (HKUDS) — Closest Architectural Match
- **Strengths:** Leader/worker pattern, tmux-based parallel, agent-agnostic design, active development (~5k stars)
- **Weaknesses:** No desktop UI (TUI only), no token tracking, no knowledge system, no upstream connectors, no correction loops
- **ACC differentiation:** Desktop UI, wave+DAG execution, token budget with WIP/resume, knowledge compounding, connector loop

### 4.2 Agent-Swarm — Most Complete Integration Story
- **Strengths:** Docker-based isolation, vector memory (RAG), multi-channel connectors (Slack/Jira/Linear/GitHub), web interface
- **Weaknesses:** Web-only, no token budget management, no wave-based execution with dependency resolution, no knowledge compounding across sessions
- **ACC differentiation:** Native desktop, dependency-aware wave orchestration, proactive token budget, knowledge compounder that improves over time

### 4.3 Ruflo — Knowledge Leader
- **Strengths:** AgentDB (structured knowledge persistence), SONA indexing, cost tracking, Claude integration
- **Weaknesses:** Claude-only, web-only, partial parallel execution, no upstream connectors, no token budget
- **ACC differentiation:** 9 agents vs 1, desktop vs web, wave orchestration, full connector loop, token budget system

### 4.4 ccswarm — Most Ambitious Vision
- **Strengths:** Rust-native (performance), OTel token tracking, planned RAG, planned voting mechanism
- **Weaknesses:** Largely incomplete (~200 stars), TUI only, no desktop UI, no knowledge system, no connectors
- **ACC differentiation:** Actual working product vs vision document, 9 agents vs 3+, desktop vs TUI, full feature set operational

### 4.5 wshobson/agents — Largest Community
- **Strengths:** 34.6k stars, strong community, Claude Code integration
- **Weaknesses:** Claude-only, no parallel execution, no orchestration, no connectors, no knowledge system
- **ACC differentiation:** Multi-agent, wave orchestration, connectors, knowledge system, token budget

---

## 5. Market Opportunity Summary

### White Space: No product combines all of these

1. **Multi-agent unification** (9+ agents) with **dependency-aware parallel execution**
2. **Proactive token budget** with **WIP capture and resume**
3. **Automated knowledge compounding** across **all sessions**
4. **Full 7-stage upstream connector loop** (from stakeholder message to deployed feature)
5. **Native desktop app** (~10MB) with **local-first**, offline-capable architecture

### Uncontested Features (0 competitors)

| Feature | Closest Competitor | Gap |
|---|---|---|
| Dependency-aware wave execution with intra-wave unlock | None | Greenfield |
| Handoff schema validation + approval gates | None | Greenfield |
| Proactive token budget with threshold ladder | None | Greenfield |
| WIP checkpoint capture + wave resumption | None | Greenfield |
| Two-pass knowledge compounding (local + LLM) | Ruflo (1-pass, Claude-only) | 2-pass + multi-agent |
| Full 7-stage upstream loop with proposal + approval + execution + report | Agent-Swarm (I/O only) | Full execution pipeline |
| Correction loop with auto-retry + escalation | None | Greenfield |
| SkillBridge ecosystem integration (local ↔ cloud memory) | None | Unique |

### Market Positioning

ACC occupies a unique position at the intersection of:
- **Agent orchestration** (ClawTeam, Composio, Agent-Swarm territory)
- **Knowledge management** (Ruflo territory)
- **Desktop productivity** (Paseo, 1code, Wolfpack territory)
- **Team collaboration** (Agent-Swarm, 1code territory)

No single competitor crosses all four categories.

---

## 6. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Competitor builds wave orchestration | Medium | First-mover advantage; 5-week Phase 5 allocation indicates complexity barrier |
| Agent-Swarm adds desktop app | Low | Docker-based architecture is hard to port to desktop |
| Claude adds native subagent orchestration | Medium | ACC's agent-agnostic design insulates; Claude-only orchestration doesn't compete with 9-agent unification |
| Open-source clone emerges from spec | Medium | Spec is public (4153-line doc); execution speed + Edge8 domain expertise are moat |
| Large player enters (GitHub, Vercel, Replit) | High | Tauri v2 local-first architecture is hard for cloud-native companies to replicate quickly; Edge8's consulting practice provides distribution + feedback loop |

---

## 7. Recommendations

1. **Ship v1 with GitHub Issues connector only** — full Lark/Slack/Jira connectors are deferred per ADR-011. The reference implementation validates the 7-stage loop architecture without the integration complexity of multiple platforms.

2. **Prioritize knowledge compounding UX** — it's the only feature with zero competitors providing equivalent functionality. The compounding flywheel (more sessions → smarter agents → more sessions) is ACC's strongest defensible moat.

3. **Tauri v2 as competitive advantage** — highlight ~10MB install size vs Electron competitors in marketing. The performance delta is measurable and meaningful.

4. **Phase 10+ architectural gaps are not v1 blockers** — parallel waves, control sessions, cost aggregation, and budget reallocation enhance power but aren't prerequisites for single-wave workflows. Ship v1 first, expand in Phase 10+.

5. **Dogfood publicly** — ACC building ACC features using ACC's own wave orchestrator is the strongest possible demo. Phase 6 internal dogfood becomes Phase 10+ external marketing material.

---

*Reconstructed from: ACC-Product-Overview.md Section 2 (competitive comparison table), ACC-Roadmap.md (phase planning + gap references), ACC-Technical-Planning.md ADR-013 (10 gap categories), ACC-Technical-Overview.md (Gap #3 reference), ACC-Technical-System-Design.md (Module 22: Control Sessions, Module 23: SkillBridge).*
