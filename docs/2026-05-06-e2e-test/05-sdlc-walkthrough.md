# 05 — SDLC Walkthrough (PromptVault Concept)

This documents the attempt to run PromptVault through ACC's full agentic development lifecycle using ACC's own modules.

---

## Stage 1: Idea → Product Overview

**ACC Module:** Orchestrate (`/orchestrate`)

**What we did:**
1. Entered slug: `promptvault-mvp`
2. Project ID auto-filled: `acc-main`
3. "Create Plan" button enabled on slug input
4. Clicked "Create Plan"

**Result:** Button click triggered `invoke("create_plan_cmd")` which failed — Tauri backend unavailable in browser mode. No error feedback shown. The wave plan creation UI did not advance.

**What should happen (with Tauri):**
- Wave plan created with empty agent table
- DAG visualization renders
- Agent assignment dropdowns populate
- Ready to add Wave 1 agents

---

## Stage 2: Epics → User Stories

**ACC Module:** Route (`/route`)

**What we did:**
1. Entered task: "Build a REST API endpoint for user registration with email verification"
2. Selected task type: "Implement"
3. "Route Task" button enabled on text input
4. Clicked "Route Task"

**Result:** Button click triggered `invoke("route_task_cmd")` which failed. No suggestion displayed. The instruction panel remained visible (BUG #3).

**What should happen (with Tauri):**
- ACC analyzes task description
- Returns agent suggestion with confidence score
- Shows model recommendation
- "Send to Agent" button appears

**User stories would include:**
- US-001: User can create prompt templates with title, description, and content
- US-002: User can version a prompt and see diff between versions
- US-003: User can A/B test two prompts against the same coding task
- US-004: Team member can import a shared prompt collection
- US-005: User can one-click export a prompt to CLAUDE.md format

---

## Stage 3: PRD

**ACC Module:** Handoffs (`/handoffs`)

**What we did:**
1. Filled handoff envelope form:
   - Original Task: "Implement JWT auth"
   - Completed By: "opencode"
   - Model Used: "minimax-m2.7"
   - Next Agent: "claude"
   - Next Model: "sonnet-4"
   - Output Summary: "Implemented JWT authentication middleware"
   - Handoff Instructions: "Review for security best practices"
2. Clicked "Generate Handoff"

**Result:** All form inputs accepted text. Button click failed (Tauri dep). This form represents the PRD handoff — agent A1 completes PRD, hands off to agent B1 for technical design.

---

## Stage 4: Technical Plan

**ACC Module:** Playbooks → Feature Docs (`/playbooks`)

**What we did:**
1. Located Feature Docs section with 4 doc type buttons:
   - EXECUTIVE PLAN
   - CHANGELOG
   - QA REPORT
   - TECHNICAL PLAN

**Result:** Buttons are present and labeled per spec. When functional, clicking TECHNICAL PLAN would spawn a non-interactive agent session that generates `TECHNICAL_PLAN.md` with component specs, method signatures, feature flags, and rollback strategy.

---

## Stage 5: Development (Agent Execution)

**ACC Module:** Runner (`/runner`)

**What we evaluated:**
1. Agent spawn UI — "+ Add Agent" button visible
2. Preset buttons — Fix Tests, Review Code, Lint, Commit, Deploy Staging, +New
3. Project selector — dropdown with "Select project..."
4. Session info — 0 agents, 0 files changed
5. Orchestrator/Normal mode toggle

**Result:** UI shell complete. Agent spawn requires Tauri backend (`invoke("spawn_agent")`). When functional, clicking +Add Agent opens agent selector, spawns PTY session with xterm.js, and status chips update in real-time.

**For PromptVault, a 2-agent wave would look like:**
- Wave 1: Agent A1 (Claude Code) — builds backend API, Agent A2 (OpenCode) — builds frontend
- Wave 2 (after A1+A2 handoffs): Agent B1 (Aider) — writes tests, Agent B2 (Goose) — writes docs

---

## Stage 6: QA

**ACC Module:** Outcomes (`/outcomes`)

**What we evaluated:**
1. Stats dashboard: Total Sessions (0), Successful (0), Failed (0), Success Rate (0.0%)
2. Filter buttons: All, High Success, Problematic, Revised
3. Table headers: Agent, Task Type, Total, Done, Failed, Revised, Rate (sortable)
4. Refresh button

**Result:** Dashboard renders correctly. Data would populate from SQLite after agent sessions complete. In a real run, the QA stage would involve:
- Checking test results from agent sessions
- Reviewing outcome stats for each agent
- Verifying handoff document validations
- Triggering correction loop on failures

---

## Stage 7: Documentation

**ACC Module:** Replay (`/replay`)

**What we evaluated:**
1. Page heading: "Session Replay & Diagnostics"
2. Search box: "Search by session, diagnosis, or error..."
3. Failure analysis panel (empty state)
4. Refresh button

**Result:** UI renders correctly. When functional, this page shows:
- Chronological timeline of all session events
- Filterable by agent, event type, file, time range
- One-click "Generate Feature Docs" that spawns agent to produce 4 canonical documents
- Export to PDF/Markdown

---

## Gap Analysis: Ideal SDLC vs ACC Reality

| SDLC Stage | ACC Module | UI Ready | Functionally Complete | Gap |
|------------|-----------|----------|----------------------|-----|
| Idea/Plan | Orchestrate | Yes | No (needs Tauri) | Create Plan command |
| User Stories | Route | Yes | No (needs Tauri) | Route logic + LLM |
| PRD | Handoffs | Yes | Partial | Generate Handoff |
| Technical | Playbooks/Feature Docs | Yes | No (needs Tauri+LLM) | All 4 doc generators |
| Development | Runner | Yes | No (needs Tauri) | Agent PTY spawn |
| QA | Outcomes | Yes | No (needs Tauri) | Data from sessions |
| Documentation | Replay | Yes | No (needs Tauri+LLM) | Timeline + doc gen |

**Conclusion:** The SDLC pipeline is architecturally present — every stage maps to an ACC module. The UI scaffolding is 85-90% complete. The missing piece is backend wiring: agent PTY control, event logging, outcome recording, and the Intelligence Layer (LLM calls for routing, diagnosis, documentation).
