# ACC Technical Planning

*Architecture Decision Records + Expansion Path & Commercial Strategy*
*Version: 1.0 | May 2026*
*Extracted and consolidated from ACC-Complete-Project-Documentation-v2.7.md + ACC-Gap-Assessment.md*

---

## 1. Architecture Decision Records

### ADR-001: Tauri v2 over Electron
**Status:** Accepted | **Date:** 2026-03

**Decision:** Use Tauri v2 with React 19 + Vite 6 as the desktop shell.

**Reasons:** ~10MB binary vs 150MB+ Electron. Rust backend handles PTY, file ops, and encryption natively without shipping Node.js. Frontend is identical to web dev — same React component code works in browser mode.

**Against Electron:** `electron-rebuild` for `node-pty` and `better-sqlite3` breaks regularly on ARM macOS, Windows, and across Node version bumps. 1code (Electron) documents this pain directly in their repo. Tauri avoids this entirely.

**Tradeoff accepted:** Rust knowledge needed for custom Tauri commands. Mitigated by using official Tauri plugins for all system ops — custom Rust is minimal.

---

### ADR-002: Build from Scratch, Not Fork of 1code
**Status:** Accepted | **Date:** 2026-03

**Decision:** Build ACC on Tauri from scratch. Do not fork 1code despite its Apache 2.0 license.

**Reasons:** 1code uses Electron + tRPC + Jotai + Zustand + React Query — four state layers. Extending it requires understanding all four. Their cloud features (`1code.dev` backend) are unavailable to forks. Their `electron-rebuild` maintenance tax compounds over time.

**Alternative packages instead of fork:** `simple-git` for git operations, `@octokit/rest` for GitHub API, `diff2html` for diff rendering. These give 90% of 1code's valuable features with zero inherited complexity.

**Estimated effort to match relevant 1code features:** 3 weeks agentic coding vs. 3 weeks understanding their architecture to extend it safely.

---

### ADR-003: SQLite Local-First, Supabase Optional in v2
**Status:** Accepted | **Date:** 2026-03

**Decision:** SQLite via Tauri sql plugin as sole database in v1. No remote database required.

**Reasons:** All v1 features are single-user, local-machine. SQLite is zero-setup, offline-capable, fast for all query patterns needed. Supabase migration path is clear and non-breaking for v2.

---

### ADR-004: AgentConfig and ConnectorConfig as Extension Points
**Status:** Accepted | **Date:** 2026-03

**Decision:** All agent-specific and platform-specific logic lives in config objects, not code branches. Adding a new agent or connector is adding one object to an array.

**Reasons:** Future-proofs against the rapidly expanding agent ecosystem. Eliminates agent-specific code that requires rewrites as new tools emerge.

---

### ADR-005: Human Gate at Approval Stage Only
**Status:** Accepted | **Date:** 2026-03

**Decision:** The upstream connector loop auto-executes stages 1, 2, 3, 5, 6, 7. Stage 4 (await approval) is the only mandatory human gate. All other stages have optional confirmation modes.

**Reasons:** Full automation without approval is a trust risk — stakeholders lose confidence if the system acts without consent. Full manual control defeats the purpose. A single approval gate is the minimum viable trust contract.

---

### ADR-006: `.acc` Bundle as Open Zip Format
**Status:** Accepted | **Date:** 2026-03

**Decision:** `.acc` playbook bundles are standard zip archives with a versioned JSON manifest. Any zip tool can inspect them.

**Reasons:** Transparent, auditable, version-controllable (unzip into a repo), community-extensible. Open format enables ecosystem growth without ACC being the gatekeeper.

---

### ADR-007: MAFW Protocol as Native ACC Workflow
**Status:** Accepted | **Date:** 2026-03

**Decision:** ACC's Wave Orchestrator, Agent Guideline Generator, and Handoff Monitor directly implement the Multi-Agent Feature Workflow protocol proven in Edge8 production (grading system project, 2026-03-12).

**Reasons:** MAFW is not a theoretical framework — it is a protocol that ran 12 agents over 2 hours with documented failure modes and resolutions. Building ACC around MAFW means the tool is pre-validated against real production complexity. The "dogfood" principle means ACC is built using MAFW, which continuously validates the implementation.

---

### ADR-008: Supabase MCP Safe-by-Default Architecture
**Status:** Accepted | **Date:** 2026-03

**Decision:** Supabase MCP `development` feature group (which enables `execute_sql`) is locked by default and requires explicit per-session human confirmation to unlock. The `account` group is permanently disabled for all agents.

**Reasons:** Agents with unrestricted Supabase access can drop tables, truncate data, or apply broken migrations in production. A single misinterpreted instruction could cause irreversible data loss. The cost of one extra confirmation click is orders of magnitude less than the cost of a destructive migration on a client database.

**Tradeoff accepted:** Agents cannot apply migrations autonomously. This is intentional — migrations are the one operation where human review is non-negotiable. The workflow (write file → flag → human applies → agent verifies) adds ~2 minutes but eliminates catastrophic risk.

**Rejected alternative:** Allowing `execute_sql` with a "staging only" config — rejected because ACC cannot reliably determine if a Supabase project ref is staging vs. production without additional out-of-band verification.

---

### ADR-009: Knowledge Compounder as Async Non-Blocking Process
**Status:** Accepted | **Date:** 2026-03

**Decision:** The Knowledge Compounder runs entirely asynchronously after the workloop closes. It never blocks the developer's next task, never shows a loading state in the primary workflow, and surfaces results passively in the Knowledge Panel.

**Reasons:** Any synchronous knowledge extraction would add latency to the tail end of every workloop — exactly when the developer wants to move on or review results. Knowledge accumulation is valuable but never urgent. Async processing means zero perceived cost per session.

**Implementation:** Tauri async Rust task spawned after Feature Doc generation completes. Intelligence Layer invocation runs in background (Mode 1: OpenRouter HTTP call; Mode 2: non-interactive agent spawn). Results written to SQLite. Knowledge Panel badge increments when new items are ready. No toast, no modal, no blocking UI.

**Tradeoff accepted:** Knowledge items from the current session are not available immediately — they appear minutes later. This is acceptable because knowledge is retrospective by nature; it informs future sessions, not the current one.

---

### ADR-010: ACC Intelligence Layer — Dual Mode Design
**Status:** Accepted | **Date:** 2026-04

**Decision:** ACC's own AI-powered features (Failure Analyzer, Feature Doc Generator, Knowledge Compounder, Task Router v2, Architect Agent classification) are executed via a configurable Intelligence Layer with two modes:

- **Mode 1 (Default) — OpenRouter:** ACC calls OpenRouter directly via HTTP using a free/stable model. ACC ships a default key with a usage cap; users provide their own key when the cap is reached.
- **Mode 2 (Optional) — Agent-Mediated:** ACC spawns non-interactive Claude Code or OpenCode sessions for intelligence tasks, using the user's existing subscription.

**Reasons:**
- ACC must not require users to obtain and configure an API key just to use intelligence features on first launch. The default key covers the trial experience with zero setup.
- OpenRouter is preferred over a single-provider API (e.g., direct Anthropic) because it decouples ACC from one provider, supports free-tier models, and allows the default model to be changed without an app update.
- Agent-mediated mode gives users who want to maximise their existing subscription a path to do so, but must be opt-in with explicit warnings about plan sharing.
- The two modes are architecturally parallel — both produce identical structured output consumed by the same module logic. The mode selection affects only the transport layer.

**Tradeoff accepted:** Mode 1 introduces a dependency on OpenRouter's availability for intelligence features. If OpenRouter is down, Mode 1 intelligence features degrade. Mode 2 is not affected. Users in offline/airgapped environments should use Mode 2 with a locally-run agent (e.g., Ollama-backed OpenCode).

**Rejected alternatives:**
- Direct Anthropic API only: creates single-provider lock-in, requires users to have an Anthropic API key separate from their Claude Code subscription.
- Agent-mediated only: no path for users without a coding agent configured; intelligence fails until agent is set up. Unacceptable for first-run experience.

---

### ADR-011: Lark/Slack/Jira Connector Loop — Deferred
**Status:** Deferred | **Date:** 2026-04

**Decision:** The Lark, Slack, and Jira connector implementations (Phase 8) are deferred from the active build plan. The ConnectorConfig abstraction, the 7-stage loop architecture, and the Architect Agent design remain in the specification as the intended end-state.

**Reasons:** A custom Lark MCP and event-listening system is under development that will address the tool coverage and approval signal gaps identified in the architectural assessment. Building against the current official Lark MCP before the custom system is ready risks implementing workarounds that will need to be replaced. The deferral eliminates 10 weeks of implementation risk from the critical path.

**What remains active:**
- GitHub Issues as Tier 1 connector: implemented in Phase 7 using the existing GitHub MCP. This validates the full 7-stage loop without Lark/Slack/Jira dependency.
- ConnectorConfig abstraction: designed and implemented as part of Phase 7 so Lark/Slack/Jira can be added as config objects when the custom system is ready.
- Architect Agent background loop: designed but its Lark/Slack/Jira polling implementations are stubbed until the custom integration is available.

**Re-activation trigger:** Custom Lark integration system available and validated. At that point Phase 8 resumes with the custom system as the implementation foundation.

---

### ADR-012: SkillBridge Integration — Read-Only Detection
**Status:** Accepted | **Date:** 2026-05

**Decision:** ACC detects SkillBridge at runtime via process check, app path lookup, and config file read. ACC reads SkillBridge state (bridge status, relay URL, MCP endpoint, claude-mem entries) but never writes to SkillBridge config or persists state on SkillBridge's behalf. SkillBridge remains a standalone, independently installable, independently updatable product.

**Reasons:**
- Zero risk to SkillBridge codebase — integration is entirely additive to ACC. SkillBridge's code, relay infrastructure, and worker processes are untouched.
- No shared state, no IPC, no API dependency between the two processes. Detection is passive — ACC observes filesystem and process table without requiring SkillBridge to expose endpoints.
- Single-writer principle: SkillBridge owns `~/.claude-mem/`. ACC reads claude-mem entries as a knowledge source for the Compounder but never modifies them. Each product has one writer for every data domain.
- Stack compatibility is near-identical (Tauri v2, React/TypeScript, Zustand, Stronghold) but this is coincidental — the products serve complementary, non-overlapping roles (ACC = local agent control; SkillBridge = cloud memory bridge) and must not merge.

**Integration surface:** ACC auto-registers SkillBridge's MCP endpoint in its MCP Registry as read-only, surfaces bridge connection health in Settings and status bar, reads claude-mem for Knowledge Compounder input, and offers a guided onboarding flow if SkillBridge is not detected on first launch.

**Anti-patterns explicitly rejected:** Merging SkillBridge code into ACC; having ACC control SkillBridge's relay bridge state; ACC writing to `~/.claude-mem/`; creating a hard dependency on SkillBridge (ACC is fully functional without it); replicating SkillBridge's relay.

---

### ADR-013: Gap-Aware Phase Planning

**Status:** Accepted | **Date:** 2026-05 | **Updated:** 2026-06-03 (market validation)

**Decision:** ACC's build plan acknowledges 10 known gaps documented in the May 2026 gap assessment. Address 7 architectural gaps (Control Sessions, parallel waves, cost aggregation, budget reallocation, model cost comparison, cross-thread detection, swarm threads) in Phase 10+. Address 3 critical gaps (Lark/Slack/Jira connectors, semantic routing v1, CLI flag fragility) incrementally as infrastructure becomes available.

**Reasons:**
- Transparent gap acknowledgment prevents scope creep. Listing gaps explicitly — rather than pretending completeness — ensures the team and stakeholders understand what is deferred and why.
- Phase 10+ designation for architectural gaps prevents premature complexity before foundational modules are stable. Control Sessions, parallel waves, and swarm threads depend on Wave Orchestrator (Phase 5), ACB (Phase 5+), Token Budget System (Phase 9++), and Knowledge Compounder (Phase 9) all being complete first.
- The 7 architectural gaps are non-blocking for v1 launch — they enhance orchestration power but are not prerequisites for the core single-wave workflow.
- The 3 critical gaps have known resolution paths: Lark/Slack/Jira re-activate when the custom integration system is ready (ADR-011), semantic routing upgrades in v1.5 when Ollama embeddings are integrated, and CLI flag fragility is ongoing maintenance mitigated by version-pinned agent configs.

**Market validation (2026-06-03):** A competitive analysis of 13 products confirms that Phase 10+ gaps are not market-blocking. The uncontested features (wave+DAG execution, token budget, WIP/resume, 2-pass knowledge compounding, correction loop, SkillBridge) are all in Phases 5–9. No competitor has any of these. Delaying Phase 10+ to ship v1 with the greenfield features is the correct competitive strategy. The market window is now — the architectural gaps can close while the product accrues users and knowledge.

**Gap categories:**
- **Architectural (Phase 10+):** Parallel wave orchestrations, Control Session abstraction, swarm-based parallel product threads, cross-thread conflict detection, per-provider cost aggregation, model cost comparison in registry, token budget reallocation between wave agents.
- **Critical (incremental resolution):** Lark/Slack/Jira deferred connectors, keyword-only semantic routing, agent CLI flag fragility.

---

### ADR-014: Documentation Suite Structure
**Status:** Accepted | **Date:** 2026-05

**Decision:** Split the monolithic 4153-line `ACC-Complete-Project-Documentation-v2.7.md` into 7 focused documents:

1. **ACC-Product-Overview.md** — Executive summary, vision, differentiators, competitive landscape
2. **ACC-Epics.md** — User stories (73), epics, acceptance criteria
3. **ACC-Roadmap.md** — Phases 1–12, milestones, phase dependencies, deferral notes
4. **ACC-Technical-Overview.md** — Architecture diagram, module map, data flow, key abstractions
5. **ACC-Technical-Stack.md** — Rust/React/Tauri versions, plugins, database schema, MCP integrations, agent lineup
6. **ACC-System-Design.md** — Detailed module specs (21 modules), state machines, PTY architecture, ACB protocol
7. **ACC-Technical-Planning.md** — All ADRs (this document) + Expansion Path & Commercial Strategy

Each document is self-contained but cross-referenced via document name. No information is lost — the split is structural, not subtractive.

**Reasons:**
- 4153 lines is unmanageable for LLM context windows (~200k tokens). A single document exceeds practical context limits for AI-assisted reading and editing.
- Human navigation degrades at this scale — finding a specific module spec or ADR requires scrolling through unrelated sections.
- Separate documents allow targeted reading per role: product managers read Overview + Epics; engineers read System Design + Stack; leadership reads Technical Planning (ADRs + Strategy).
- Independent documents can be versioned, reviewed, and updated without touching unrelated content. An ADR change doesn't require re-reading the full 4153-line document.

---

## 2. Expansion Path & Commercial Strategy

### Edge8 Internal Value (Immediate)

ACC is built for Edge8's own work first. Internal value before any commercial consideration:
- Every client project gets a `.acc` playbook — onboarding new team members takes minutes, not days
- Lark connector loop eliminates the human relay on repetitive feature requests
- Session replay + feature doc generator produces client deliverables automatically
- Outcome tracker builds a real evidence base for which AI approaches work per domain
- Supabase safe-by-default prevents accidental data loss on client databases
- Knowledge Compounder builds Edge8's institutional knowledge automatically — no manual documentation

### Commercial Angles

**Angle 1 — Developer Tool (OSS + Pro)**
Open-source the runner and asset manager. Pro tier: connector loop, wave orchestrator, team playbooks, knowledge base. $15–29/month per developer.

**Angle 2 — Enterprise White-Label**
Edge8 clients get a branded version of ACC configured for their stack. Managed setup, pre-built playbooks per engagement, Supabase and GitHub pre-configured. Priced per engagement or per seat.

**Angle 3 — Playbook Marketplace**
Developers publish `.acc` bundles for specific stacks, frameworks, or domains — including knowledge items and stack runbooks. Revenue share model. Network effects grow the skill/MCP/knowledge ecosystem.

**Angle 4 — AI Consulting Evidence Layer**
Edge8 uses ACC's outcome data, session replays, and knowledge base as evidence of AI delivery quality. Knowledge items exported per engagement demonstrate institutional learning. Differentiates Edge8 in a market where "AI consulting" is often unproven.

**Angle 5 — Knowledge as a Product**
After sufficient project volume, Edge8's knowledge base contains verified patterns, runbooks, and anti-patterns for specific stacks (Next.js + Supabase, Python + FastAPI, etc.). These can be packaged as premium `.acc` knowledge bundles — a new product category unique to ACC.

### OpenClaw Integration (Distribution)

Register ACC as an OpenClaw skill:
- OpenClaw users (247k+) can invoke `@acc` from WhatsApp or iMessage
- OpenClaw routes the conversation; ACC executes the coding agent workflow
- Distribution without competing — complementary positioning

### The Flywheel

```
More projects run in ACC
    → More outcome data
        → Better task routing
            → Higher agent success rate
                → More sessions generate knowledge items
                    → Knowledge base compounds
                        → Agents start smarter every session
                            → Fewer failures, faster delivery
                                → More trust from users + clients
                                    → More Edge8 engagements use ACC
                                        → More playbooks + knowledge exported
                                            → Faster onboarding for new projects
                                                → More projects run in ACC
```

The knowledge compounding loop is the second flywheel inside the first. Outcome data makes routing smarter. Knowledge data makes agents smarter. Both reinforce each other. Over time, ACC becomes harder to replace — not because of lock-in, but because of accumulated institutional intelligence that doesn't exist anywhere else.

---

*Document: ACC Technical Planning*
*Version: 1.0 | May 2026*
*Owner: Trac / Edge8 (edge8.ai)*
*Source: ACC-Complete-Project-Documentation-v2.7.md (sections 14, 16) + ACC-Gap-Assessment.md (2026-05-02)*
*ADRs: 14 (11 existing + 3 new) | Commercial angles: 5 | Distribution: OpenClaw*
