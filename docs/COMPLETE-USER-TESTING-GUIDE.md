# ACC — Complete Application Testing Guide

**User POV — Validate every feature end-to-end**

---

## Quick Start Checklist

Before diving into feature tests, verify the application boots and works:

- [ ] ACC launches without crash or error dialog
- [ ] Main layout renders: sidebar + agent grid
- [ ] Sidebar shows navigation links to all pages
- [ ] No console errors on load (open DevTools: Ctrl+Shift+I)
- [ ] Version number visible in Settings → About

---

## Phase 1: Agent Runner — Foundation

### Test 1.1 — Spawn All 9 Agents

| Agent | Spawn Command | Expected |
|-------|--------------|----------|
| Claude Code | Click spawn button | PTY panel opens, Claude prompt appears |
| OpenCode | Click spawn button | PTY panel opens, OpenCode prompt appears |
| Aider | Click spawn button | Aider launches in PTY panel |
| Goose | Click spawn button | Goose session starts |
| Cline CLI | Click spawn button | Cline CLI initializes |
| Cursor | Click spawn button | Cursor agent chat starts |
| Gemini CLI | Click spawn button | Gemini CLI prompt appears |
| Qwen Code | Click spawn button | Qwen Code session starts |
| Codex CLI | Click spawn button | Codex CLI initializes |

**Failure:** Agent fails to spawn → check Tauri shell plugin permissions in capabilities config. Agent spawns but PTY shows nothing → check `spawnCmd` and `defaultArgs` in AgentConfig.

### Test 1.2 — Agent Status Chips

1. Spawn any agent
2. Watch the status chip in the panel header
3. **Expected states as you give it tasks:**
   - `idle` — waiting for input
   - `thinking` — processing
   - `writing` — writing code (file edit detected in PTY output)
   - `running tests` — test command detected
   - `done` — completion pattern detected
   - `failed` — error pattern detected
4. **Failure:** Chip stays `idle` even when agent is clearly working → status inference regex patterns may be mismatched.

### Test 1.3 — Preset Buttons

1. Open the preset toolbar in an agent panel
2. Click a preset (e.g., _"Run tests"_)
3. **Expected:** The preset command text appears in the agent's PTY input, as if you typed it
4. Create a new preset:
   - Click "New Preset"
   - Give it a name and command
   - Save
   - **Verify:** Your new preset appears in the toolbar
5. **Failure:** Preset doesn't inject → check `presetStore.ts` bindings and PTY write pipeline.

### Test 1.4 — Project Switching

1. Have agents running in Project A
2. Use the project switcher (top bar or sidebar) to switch to Project B
3. **Expected:** All agents restart in Project B's directory. The working directory changes for each PTY session.
4. Switch back to Project A
5. **Expected:** Agents are back in Project A's directory
6. **Failure:** Agents don't re-spawn or stay in old directory → check project change handler in `agentStore.ts`.

### Test 1.5 — Subagent Detection

1. Launch Claude Code (supports native subagents)
2. Give it a complex task that spawns subagents: _"implement a full CRUD API with tests in 3 files — parallel subagent approach"_
3. **Expected:** When Claude spawns subagents, new sub-session panels appear or status chips appear for each subagent
4. For Aider or Goose (no native subagents): spawn a wave via the orchestrator — each agent should get its own PTY panel
5. **Failure:** Subagents invisible → `subagentDetectionPattern` regex not matching PTY output.

---

## Phase 2: Asset Manager

### Test 2.1 — Skills Library

1. Navigate to **Assets → Skills**
2. **Expected:** Lists all skills from `~/.claude/skills/`, `~/.opencode/skills/`, `~/.gemini/skills/`, plus any custom paths
3. Click any skill → **Monaco editor opens inline** — you can read and edit the markdown
4. Click "New Skill" → enter name and content → save
5. **Verify:** The new `.md` file appears in the skills directory
6. Use tag filter and search bar to find skills
7. **Failure:** Skills directory not found → check `skillPaths` config in settings. Monaco editor broken → check `@monaco-editor/react` import.

### Test 2.2 — Inject Skill into Memory File

1. Open a skill, click **"Inject"**
2. **Expected:** Confirmation dialog: _"Inject into [project] CLAUDE.md?"_
3. Confirm
4. **Verify:** The skill's content appended to CLAUDE.md with timestamp and source badge
5. **Failure:** Injection doesn't appear in CLAUDE.md → Write Coordinator lock may be held by another process.

### Test 2.3 — MCP Registry

1. Navigate to **Assets → MCPs**
2. **Expected:** Shows all registered MCPs with:
   - MCP name and server command/URL
   - Per-agent toggle for each MCP
   - Connection health indicator (green/grey/red)
3. Toggle an MCP **on** for Claude Code, **off** for OpenCode
4. **Verify:** Claude's config file updated, OpenCode's unchanged
5. Click **"Test Connection"** on a live MCP → **Expected:** success/failure indicator
6. Click **"Add MCP"** → enter name, command, args → save → **Verify:** Appears in registry and agent configs
7. **Failure:** Toggle doesn't write to config → check MCP config file path per agent (varies: `claude_desktop_config.json` vs `opencode config.json` vs `gemini settings.json`).

### Test 2.4 — Connector Vault (Secrets)

1. Navigate to **Assets → Vault**
2. Click **"Add Secret"** → enter key name and value
3. Select scope: global / agent / project
4. Save
5. **Verify:** Secret appears in the vault list with masked value (never plaintext)
6. Spawn an agent → check that the secret is available as an environment variable
7. **Failure:** Secret not injected → check Stronghold initialization or OS keychain fallback. Value visible in plaintext → bug in masking.

### Test 2.5 — Memory Browser

1. Navigate to **Assets → Memory**
2. **Expected:** Shows current CLAUDE.md (or equivalent per agent) with side-by-side diff vs last session snapshot
3. Make a change in the editor, save
4. **Verify:** Diff view updates to show the change
5. Switch to **Cross-Agent Sync** tab
6. **Expected:** Shows memory files across all 9 agents, ability to sync content
7. **Failure:** Diff doesn't show changes → snapshot wasn't taken at session close. Sync applies wrong direction → check diff direction arrows.

---

## Phase 3: Project Intelligence

### Test 3.1 — Auto Stack Detection

1. Open a project with a `package.json`, `pyproject.toml`, or `Cargo.toml`
2. Navigate to **Settings → Project Profile**
3. **Expected:** Stack auto-detected: `Node.js, TypeScript, React, Vitest` (or equivalent for your stack)
4. Open a different project with a different stack
5. **Expected:** Stack re-detected correctly
6. Start a new project with no manifest files → **Expected:** "Unknown stack" with manual input option
7. **Failure:** Wrong stack detected → check detector patterns in `project/detector.ts`. Empty profile → detector may not be running on project load.

### Test 3.2 — MCP Suggestions

1. Open a Supabase project
2. Go to **Assets → MCPs**
3. **Expected:** Supabase MCP appears with **"Suggested"** badge
4. Open a GitHub project
5. **Expected:** GitHub MCP appears with **"Suggested"** badge
6. **Failure:** Suggested MCPs don't appear → check stack→MCP mapping in `project/detector.ts`.

### Test 3.3 — Profile Loader

1. After stack detection, click **"Load Profile"**
2. **Expected:** Applies suggested MCPs, injects relevant skills, sets preferred models — all in one click
3. **Verify:** MCP Registry shows newly enabled MCPs. Skills Library shows injected skill.
4. **Failure:** Profile doesn't apply correctly → check profile-to-config mapping in `profileLoader.ts`.

---

## Phase 4: Outcome Tracker

### Test 4.1 — Outcome Recording

1. Let an agent complete a task and go idle for ~60 seconds
2. **Expected:** Outcome prompt appears: _"Done / Failed / Revised / Skip"_
3. Click **"Done"**
4. **Verify:** Outcome stored in SQLite. Navigate to **Outcomes** page → see the recorded outcome with agent name, task, duration
5. **Failure:** Prompt doesn't appear → idle detector may not fire (check supplementary signal detector). SQLite write fails → check `outcome_stats` table schema.

### Test 4.2 — Agent Success Rate Dashboard

1. Record 5-10 outcomes across different task types (refactor, test, implement, debug, document)
2. Navigate to **Outcomes** page
3. **Expected:** Per-agent × per-task-type success rate grid. Bar charts showing success/failure/revised distribution
4. Sort by success rate → **Expected:** Best agent for each task type at top
5. **Failure:** Grid shows no data → outcome aggregation query may be failing. Wrong task types → keyword classifier may be mis-categorizing.

### Test 4.3 — Routing Feedback Loop

1. Go to **Route** page, type a task: _"refactor the user model"_
2. **Expected:** Ranked agent suggestions with confidence scores based on outcome history
3. The suggestion should favor agents with high success rates on `refactor` tasks
4. **Failure:** All agents ranked equally → outcome history not feeding into router. No suggestions → query returned empty.

---

## Phase 5: Task Router & Wave Orchestrator

### Test 5.1 — Task Router

1. Navigate to **Route** page
2. Type a task description: _"implement user authentication with JWT"_
3. **Expected:** Smart agent suggestion with:
   - Agent name + model
   - Confidence score (estimated)
   - Reasoning: why this agent is recommended
4. Click **"Send"** → task routed to the suggested agent
5. **Failure:** No suggestion → classifier returned empty. Wrong agent → outcome data insufficient or mis-trained.

### Test 5.2 — Model Router

1. On the Route page, note the model selector per suggestion
2. **Expected:** Different models suggested for different task types:
   - File ops → lighter model (e.g., Claude Sonnet or GPT-4o-mini)
   - Complex logic → heavier model (e.g., Claude Opus)
3. **Failure:** Same model for all tasks → model alternation logic not active or `model_registry` table empty.

### Test 5.3 — Wave Orchestrator DAG

1. Navigate to **Orchestrate** page
2. Click **"New Wave Plan"**
3. Add 3 agents with dependencies:
   - Agent 1: _"set up database schema"_ (no dependency)
   - Agent 2: _"implement auth API"_ (depends on Agent 1)
   - Agent 3: _"write tests for auth"_ (depends on Agent 2)
4. **Expected:** Visual DAG renders with three nodes in sequence. Dependencies shown as arrows.
5. The `Depends On` column shows the chain. `Wave` column auto-computes: Agent 1 = Wave 1, Agent 2 = Wave 2, Agent 3 = Wave 3.
6. Test cycle detection: add Agent 1 → Agent 2 → Agent 3 → Agent 1
7. **Expected:** Cycle warning: _"Circular dependency detected"_
8. **Failure:** DAG doesn't render → check `orchestrationStore.ts` dependency graph. No cycle detection → topological sort not implemented.

### Test 5.4 — Wave Execution

1. With a valid wave plan (no cycles), click **"Execute Wave 1"**
2. **Expected:** All Wave 1 agents spawn simultaneously in separate PTY panels
3. Let Wave 1 agents run to completion — they should produce `HANDOFF_<ID>.md` files
4. **Expected:** Wave 2 agents remain blocked until all Wave 1 handoffs are verified
5. Manually approve a handoff in the Handoff Panel
6. **Expected:** Dependent agent in Wave 2 spawns immediately
7. **Failure:** All agents spawn at once regardless of dependencies → wave gate not checking handoff status. Agents don't spawn at all → spawn queue blocked.

### Test 5.5 — Stall Detection

1. Start a wave with an agent that will stall
2. Wait ~10 minutes
3. **Expected:** Stall alert: _"[Agent] has no file changes for 10 minutes. [Retry] [Complete Manually] [Terminate]"_
4. Click **"Retry"** → agent re-prompted with original task
5. **Failure:** No alert after 10 minutes → stall timer not set. Action buttons don't work → handler unbound.

---

## Phase 6: Agent Guidelines & Handoff

### Test 6.1 — Guideline Generator

1. Navigate to **Orchestrate** page, start a new wave
2. Click **"Generate Guideline"** for an agent
3. Fill in the form: Agent ID, Task, Objective, Depends On, Files to Create, Files NOT to Touch, Test Requirements
4. Click **"Generate"**
5. **Expected:** `AGENT_<ID>_GUIDELINE.md` created in `docs/YYYY-MM-DD-slug/` folder
6. The guideline includes: task description, dependencies, constraints, Communication Protocol section, Budget section + WIP Capture instructions
7. **Failure:** Guideline not generated → check guideline template exists. Missing sections → template parsing issue.

### Test 6.2 — Handoff Detection

1. An agent writes a `HANDOFF_<ID>.md` file
2. **Expected:** Handoff Panel shows parsed content immediately (file watch with 500ms debounce)
3. The panel shows: original task, completed work, output summary, changed files, handoff instruction
4. **Expected:** Handoff is pending verification
5. **Failure:** Handoff not detected → file watcher not scoped to docs directory. Content shows raw markdown → parser failing.

### Test 6.3 — Handoff Approval/Flagging

1. In the Handoff Panel, click **"Approve"**
2. **Expected:** Dependent agents unlock and spawn
3. In another handoff, click **"Flag"**
4. **Expected:** "Flag" triggers correction workflow (Phase 7)
5. **Failure:** Approve doesn't unlock → handoff state machine not advancing. Flag doesn't trigger correction → check correction loop wiring.

---

## Phase 7: Correction Loop

### Test 7.1 — Failure Analyzer (Mode 1: OpenRouter)

1. An agent session fails with an error
2. Click **"Analyze Failure"** on the session
3. **Expected:** ACC calls Intelligence Layer (Mode 1 — OpenRouter) with PTY excerpt + task context
4. Returns: root cause, evidence lines, suggested fix, confidence
5. **Failure:** "Failed to analyze" → check OpenRouter API key configured. Rate limit error → check request queue and backoff.

### Test 7.2 — Failure Analyzer (Mode 2: Non-interactive Agent)

1. Run an analysis in a project where OpenRouter is unavailable or rate-limited
2. **Expected:** Falls back to Mode 2 — spawns a non-interactive agent session
3. Returns same structured output via agent context
4. **Failure:** Fallback doesn't fire → mode fallback chain broken. Agent session hangs → check non-interactive spawn timing.

### Test 7.3 — Correction Generation & Re-injection

1. After a successful analysis, click **"Generate Correction"**
2. **Expected:** `CORRECTION_<ID>.md` created with: bug description, root cause, fix required, test that must pass
3. Click **"Re-inject"**
4. **Expected:** The agent session re-spawns with original guidelines + correction document concatenated
5. **Failure:** Correction not generated → output template broken. Agent doesn't read correction → file not in agent's context.

### Test 7.4 — Retry Escalation

1. Let a correction fail twice (agent re-runs and fails again)
2. **Expected:** After 2 failures, ACC stops, shows exact error, waits for human decision
3. Options presented: [Retry with manual fix] [Escalate] [Skip]
4. **Failure:** Endless retry loop → retry counter not incremented. No human gate → escalation threshold not checked.

---

## Phase 8: Session Replay & Feature Docs

### Test 8.1 — Session Timeline

1. Complete an agent session
2. Navigate to **Replay** page
3. Select the session from the list
4. **Expected:** Visual timeline showing chronological events:
   - `read` — file read events
   - `edit` — file modifications with diffs
   - `run` — shell commands executed
   - `user_input` — your prompts
   - `agent_output` — agent responses
   - `error` — errors encountered
   - `handoff` — handoff documents created
   - `correction` — correction loop events
   - `acb_signal` — agent communication bus signals (if used)
   - `limit_event` — token/rate limits hit
5. Click any event → **Expected:** Detail panel shows full content with diffs
6. Filter by event type → **Expected:** Only matching events shown
7. **Failure:** Timeline empty → events table not populated. Events without timestamps → session logger misconfiguration.

### Test 8.2 — Feature Doc Generation

1. After a multi-agent session (wave), click **"Generate Feature Docs"**
2. **Expected:** 4 canonical documents generated sequentially:
   - `EXECUTIVE_PLAN.md` — what was planned and what was delivered
   - `CHANGELOG.md` — what changed, file by file
   - `QA_REPORT.md` — test results, verification evidence
   - `TECHNICAL_PLAN.md` — architecture decisions, patterns used
3. **Failure:** Only partial docs generated → check partial failure recovery. Doc content empty → session context not passed to generator.

### Test 8.3 — Session Export

1. On any session, click **"Export"**
2. Select format: **PDF** or **Markdown**
3. **Expected:** Download starts with a formatted document containing full timeline, outcomes, and file changes
4. **Failure:** Export button does nothing → check PDF generator. Export shows only partial data → session data fetch incomplete.

---

## Phase 9: Knowledge Layer (Compounder)

### Test 9.1 — Automatic Knowledge Extraction

1. Complete a feature wave or a substantive agent session
2. Do nothing — this should happen automatically
3. Navigate to **Knowledge** page after a few minutes
4. **Expected:** Knowledge items appear automatically — 3-5 structured items per session
5. Each item has a **type**: Decision Log, Pattern Card, Anti-Pattern Warning, Stack Runbook, Lesson Brief
6. Each item shows: title, content, confidence bar, source session link
7. **Failure:** No items appear → Knowledge Compounder not triggering post-session. Items appear but empty → extraction LLM returned empty results.

### Test 9.2 — Confidence Increment

1. Make note of a knowledge item's confidence
2. Run another session where the same pattern or decision is confirmed
3. After the session, check the item again
4. **Expected:** Confidence bar increased. `confirmation_count` incremented.
5. Repeat 8+ times
6. **Expected:** Item reaches **High** confidence tier and appears with "auto-injected" badge
7. **Failure:** Confidence never changes → Jaccard dedup not matching. Matching too aggressively → threshold too low (default 0.7).

### Test 9.3 — Preload Injection

1. Start a new session in a project with existing knowledge items
2. **Expected:** Agent's initial context includes 3-5 relevant items from the knowledge base, matched by stack tags
3. Items appear in the session preamble: _"Prior patterns: [item summaries]"_
4. **Failure:** No items injected → preload engine not querying by project stack. Wrong items injected → tag matching too broad.

### Test 9.4 — Knowledge Search & Filter

1. Navigate to **Knowledge** page
2. Type a search query in the search bar
3. **Expected:** Full-text search returns matching items instantly
4. Use filters:
   - By type (pattern, antipattern, runbook, etc.)
   - By stack (React, Python, Rust, etc.)
   - By agent (Claude, OpenCode, etc.)
   - By confidence (Low, Medium, High)
5. Each filter narrows results immediately
6. **Failure:** Search returns nothing → SQLite full-text search index missing. Filters don't change results → query parameters not passed.

### Test 9.5 — Contradiction Detection

1. Add two knowledge items that clearly contradict each other
   (e.g., _"Use React Context for state"_ and _"Never use React Context"_)
2. Run a second session that triggers the contradiction
3. **Expected:** Both items get a _"conflicting evidence"_ badge
4. A `contradicts` relation created in `knowledge_relations`
5. **Failure:** No contradiction detected → Jaccard similarity between opposite-type items not computed. False positives → threshold too aggressive.

### Test 9.6 — Anti-Pattern Preflight Warning

1. Create/confirm an anti-pattern knowledge item for your project's stack
2. Navigate to the **Orchestrate** page
3. Start a new wave plan or generate guidelines
4. **Expected:** Preflight warning section appears: _"Anti-patterns detected for [stack]: [list of anti-patterns with descriptions]"_
5. **Failure:** No preflight warnings → knowledge type filter not querying `antipattern` type items. Warnings for wrong stack → stack tag matching incorrect.

---

## Phase 9+: Autonomous Scheduler

### Test 9+.1 — Create Cron Job

1. Navigate to **Scheduler** page
2. Click **"New Job"**
3. Enter: name, cron expression (e.g., `0 9 * * 1` for every Monday 9AM), agent, task description
4. Save
5. **Expected:** Job appears in the Cron Registry list with next-run time calculated
6. **Failure:** Job not saved → `cron_jobs` table insert failed. Wrong next-run time → cron expression parser error.

### Test 9+.2 — Cron Execution

1. Create a test job that fires in 2 minutes
2. Wait
3. **Expected:** At the scheduled time, the agent spawns and executes the task autonomously
4. After completion: cron execution marked `completed` in history
5. **Failure:** Job doesn't fire → `tokio-cron-scheduler` not started. Agent spawns but doesn't execute → task injection failed.

### Test 9+.3 — Escalation on Blocker

1. Create a cron job that will hit a BLOCKER
2. Wait for execution
3. **Expected:** BLOCKER signal triggers escalation:
   - System notification fires
   - Cron execution marked `escalated`
   - Wave pauses
   - Escalation appears in Scheduler panel with full context
4. **Failure:** No escalation → BLOCKER signal not picked up by ACB. No notification → notification dispatch disabled.

### Test 9+.4 — Execution History

1. Navigate to **Scheduler** page → Execution History tab
2. **Expected:** Table showing past runs: timestamp, job name, status (running/completed/escalated/failed), duration
3. Click a completed run → **Expected:** Link to session replay and feature docs
4. **Failure:** History empty → `cron_executions` table not populated.

---

## Phase 9++: Token Budget System

### Test 9++.1 — Budget Planner

1. Navigate to **Settings → Budget**
2. Create a new budget plan for a wave
3. **Expected:** Budget allocated based on task complexity, historical p75 token usage
4. Reserve portion (15%) shown separately
5. **Failure:** Budget shows zero → historical usage data missing. Budget way off → complexity classifier misfiring.

### Test 9++.2 — Threshold Ladder

1. Start an agent session with budget tracking enabled
2. Watch the budget bar in the agent panel
3. **Thresholds:**
   - **60%:** Optimizing message: _"You're at 60% of your budget. Consider focusing."_
   - **80%:** Warning message: _"80% used. Plan remaining work carefully."_
   - **95%:** Critical instruction: _"Write WIP checkpoint immediately."_
   - **100%:** Session auto-pauses
4. **Failure:** Messages not injected → PTY injection timing wrong. Session doesn't pause at 100% → auto-shutdown not wired.

### Test 9++.3 — WIP Checkpoint

1. When 95% threshold fires, the agent should write a `WIP_CHECKPOINT_<ID>.md`
2. **Expected:** Checkpoint contains: current task, completed work, pending items, decisions made, files changed
3. If the agent fails to write the checkpoint, the **fallback WIP generator** should auto-reconstruct it from session data
4. **Failure:** No WIP file created → agent didn't follow instruction, fallback not triggered. Empty WIP → reconstruction insufficient.

### Test 9++.4 — Wave Resumption

1. A wave hits its budget limit mid-execution — multiple agents write WIPs
2. Click **"Resume"**
3. **Expected:** ACC consolidates all WIPs into a Resumption Plan
4. Agents restart in order, picking up from checkpoints
5. Each agent sees: _"Resuming from WIP: [previous state summary]"_
6. **Failure:** Agents restart from scratch → Resumption Plan not generated. Wrong resume point → WIP timestamps out of order.

### Test 9++.5 — Pending Tasks

1. A session ends with pending work (budget limit or manual stop)
2. **Expected:** A `pending_task` knowledge item created
3. Start a new session in the same project
4. **Expected:** Pending task auto-injected into agent preamble: _"Pending task: [description] — remembered from previous session"_
5. Mark task as resolved → **Expected:** Status changes to resolved
6. **Failure:** Pending tasks not injected → `pending_task` items not queried on session start. Task doesn't resolve → status update missing.

---

## Phase 9+++: Memory Layer Foundation

### Test 9+++.1 — Session Checkpoint/Resume

1. Launch an agent, give it a multi-step task
2. Let it run for 30-60 seconds, then close the session
3. Reopen the same agent
4. **Expected:** Agent's preamble includes: _"Prior knowledge from [timestamp]: [summarized context]"_
5. The agent should continue from roughly where it left off
6. **Failure:** Blank preamble → checkpoint not saved. Wrong context → checkpoint from different session loaded.

### Test 9+++.2 — Context Compression (3-Zone)

1. Launch a long-running agent session
2. Watch the compression status dot in the agent panel header:
   - 🟢 Green: context <30% — fine
   - 🟡 Yellow: 30-50% — getting warm
   - 🟠 Orange: ~50% — compression imminent
   - 🔴 Red: compression active or anti-thrashing locked
3. When compression fires at 50%:
   - Agent should continue seamlessly
   - First 3 messages preserved verbatim (protected head)
   - Middle messages compressed into LLM-generated summary
   - Last messages preserved (tail)
4. **Expected:** After compression, the agent still remembers decisions and constraints from early in the conversation
5. **Failure:** Agent forgets constraints → write-before-compaction not firing or extraction missing them. Repeated compression loops → anti-thrashing lock not activating.

### Test 9+++.3 — Memory Extraction Hook

1. Run an agent session that makes decisions or states constraints
   - _"I'll use Express port 3000"_
   - _"Never modify the .env file"_
   - _"The retry limit should be 3"_
2. Navigate to **Knowledge → Memory** tab
3. **Expected:** These facts appear in the timeline as extracted items with:
   - Type badge (`decision`, `constraint`, `preference`, `pattern`, `error`, `entity`)
   - Confidence score
   - Source session link
   - Entity tags
4. **Failure:** No facts appear → extraction middleware not firing on PTY output. Wrong facts → extraction LLM hallucinating or heuristic too aggressive.

### Test 9+++.4 — Memory Retrieval (Hybrid Search)

1. After accumulating 10+ memory facts, type a search query:
   - Exact keyword: _"port 3000"_
   - Semantic: _"where did we decide the server settings?"_
2. **Expected:** Both queries return the relevant fact(s):
   - _"port 3000"_ → BM25 exact match at top
   - _"server settings"_ → vector semantic match includes the same fact
3. Use filter chips to narrow: by agent, type, confidence
4. **Expected:** Results filter immediately
5. **Failure:** Keyword search fails for exact strings → BM25 index not built. Semantic search returns nothing → embeddings not computed or not indexed.

### Test 9+++.5 — Memory Decay

1. Access a fact → update its `last_accessed` timestamp (query it in a search)
2. Leave other facts untouched for several hours (or simulate time passage)
3. Search again
4. **Expected:** Recently accessed facts rank higher than untouched ones, but untouched facts still appear if they're the best match (0.3x decay floor)
5. **Failure:** Old facts never surface → decay floor set too low. All facts rank equally → decay reranking not applied.

### Test 9+++.6 — ADD-Only Storage (No Deletion)

1. Extract a fact in Session 1
2. Contradict or correct it in Session 2
3. **Expected:** The original fact is NOT deleted or overwritten — a new fact is ADD-ed
4. Both facts visible in the timeline with their respective timestamps
5. If contradiction is detected: both items linked via `contradicts` relation
6. **Failure:** Old fact disappeared → mutation instead of append-only. No contradiction link → contradiction detection missed.

---

## Phase 10a: Codebase Exploration

### Test 10a.1 — Repo Map on Agent Spawn

1. Open a project with 500+ files
2. Launch any agent
3. **Expected:** Agent's initial context preamble includes a repo map:
   ```
   src/models/user.py:
   │class User(BaseModel):
   │    def authenticate(password: str) -> bool
   ```
4. The map fits within ~2,000 tokens — compact, ranked by PageRank
5. **Failure:** Agent starts with no code structure → repo map not injected. Map >5K tokens → token budget not respected.

### Test 10a.2 — Hybrid Code Search

1. Navigate to **Knowledge → Codebase** tab
2. Search: _"where do we handle authentication?"_
3. **Expected:** Ranked results from files like `auth.ts`, `login.tsx`, `user-service.js` with:
   - File path, symbol name, line range
   - Relevance score
   - Code snippet
4. Search: exact function name `getAuthenticate`
5. **Expected:** Exact match ranks #1 (BM25 catches identifiers; vector catches meaning)
6. **Failure:** Semantic searches return wrong files → embedding model poor on code. Exact name search fails → BM25 index missing identifiers.

### Test 10a.3 — Signature Ladder

1. Browse a file in the Codebase tab
2. **Expected:** You see **L1 (signatures)** — function names and parameter types only
3. Click a function → expands to **L2 (annotated)** — adds docstring and one-line body summary
4. Click again → **L3 (full body)** — full implementation
5. **Expected:** No full function bodies loaded until explicitly requested — saves enormous context
6. **Failure:** All files load at L3 by default → signature ladder not intercepting. Click doesn't expand → component state not updating.

### Test 10a.4 — Exploration Coverage

1. In the **Codebase** tab, look for coverage stats
2. **Expected:** _"327 files mapped, 143 summarized, 38 analyzed, 92 unexplored"_
3. Files color-coded: unexplored=muted, mapped=blue, summarized=green, analyzed=bright
4. Click an unexplored file → agent should request exploration
5. **Failure:** All files show same status → coverage tracking not connected to agent file access. Stats never change → coverage not updated.

### Test 10a.5 — Context Cache with LRU

1. Give an agent a task that touches many files
2. Watch the agent panel — it should retrieve file contents on demand, not load everything upfront
3. Have the agent switch to a different module
4. **Expected:** Old files evicted from context cache (LRU), new files loaded
5. **Failure:** Agent loads all files upfront → cache not limiting by token budget. Cache evicts files still needed → eviction policy wrong (LRU should keep recently accessed).

---

## Phase 10b: Knowledge Graph v2

### Test 10b.1 — Enhanced Knowledge Items

1. Complete a session, check Knowledge page
2. **Expected:** Items now have:
   - **Confidence bars** with multi-factor fill (source + corroboration + recency + agent tier)
   - **Provenance** section: which session/event created this, source type badge
   - **Relation list**: "extends X, contradicts Y, confirmed_by Session Z"
   - **Canonical name**: normalized entity reference
   - **Temporal fields**: valid_from, valid_until, applicable_versions
3. **Failure:** Items still show old single-factor 0.5 confidence → migration didn't alter `knowledge_items`. No provenance → `knowledge_provenance` table empty.

### Test 10b.2 — GraphRAG Local Search

1. Type a specific question: _"why does the auth module keep failing?"_
2. **Expected:** Returns a **subgraph** — seed items + 1-2 hop neighbors
3. Results show: items, their relationships, graph distance from seed, confidence
4. Example: _"JWT token expires" ← caused_by ← "missing refresh logic"_
5. **Failure:** Returns single items with no relationships → BFS subgraph expansion not firing. Empty results → no items matched query.

### Test 10b.3 — GraphRAG Global Search

1. Type a high-level question: _"what's the health of this project?"_
2. **Expected:** A **synthesized 2-3 paragraph answer** generated from community summaries
3. Below the answer: which communities were matched (title + summary)
4. Click a community → drill into member items
5. **Failure:** Returns individual items instead of synthesis → global search falling back to local search. Empty → no community summaries generated.

### Test 10b.4 — KG Explorer (Cytoscape.js)

1. Navigate to **Knowledge → KG Explorer** tab
2. **Expected:** Interactive force-directed graph:
   - Nodes color-coded: decision=blue, pattern=green, antipattern=red, error=orange
   - Node size = confidence (larger = more reliable)
   - Edges labeled with relation type
   - Same-community nodes share hue
3. **Interactions:**
   - Click node → expand neighbors (lazy load)
   - Drag node → physics adjusts
   - Scroll → zoom, drag background → pan
   - Hover → tooltip: title, type, confidence
4. **Failure:** Blank canvas → Cytoscape.js not initialized or graph data endpoint returns empty. Nodes but no edges → relations table empty.

### Test 10b.5 — Human-in-the-Loop Curation

1. In KG Explorer:
   - **Double-click a node** → inline editor opens
   - **Drag from one node to another** → relation creation dialog appears
   - **Right-click** → context menu: View, Merge, Delete, Flag
2. Navigate to **Contradictions** tab
3. **Expected:** List of unresolved contradictions with side-by-side display
4. Click **"Resolve"** → choose resolution
5. **Expected:** Contradiction moves to "Resolved" status
6. **Failure:** Edits don't persist → PATCH command not saving to database. Drag-to-connect doesn't create relation → edge creation handler missing.

### Test 10b.6 — Code ↔ Knowledge Bridge

1. Navigate to **Knowledge → Code Bridge** tab
2. Enter a file path: `src/auth.ts`
3. **Expected:**
   ```
   "JWT token refresh" (pattern, 0.87)
     → applies_to: src/auth.ts::refresh_token (line 120-145)
   "Direct password comparison" (antipattern, 0.72)
     → applies_to: src/auth.ts::login (line 45-67)
   ```
4. Click any knowledge item link → navigates to item detail
5. **Failure:** "No items found" → `code_to_knowledge` bridge table empty. Wrong file matched → entity resolution mapping incorrect.

### Test 10b.7 — Git Co-Change Mining

1. Modify a file with known co-change history
2. **Expected:** Toast or in-panel warning:
   _"src/auth.ts co-changes with src/models/user.ts (Jaccard: 0.42). Update both?"_
3. Co-change only appears when Jaccard > 0.3
4. **Failure:** No warning → git history not mined. Warning for unrelated files → threshold too low.

### Test 10b.8 — Leiden Community Detection

1. Navigate to **Knowledge → Communities** panel
2. **Expected:** List of detected communities with:
   - LLM-generated title and summary
   - Item count
   - Hierarchical level (local/mid/global)
3. Click a community → member items listed
4. **Expected:** Members are topically related (not random grouping)
5. **Failure:** All items in one community → Leiden clustering failed (re-run with adjusted parameters). Communities nonsensical → LLM summary generation producing hallucinations.

---

## Phase 10c: Multi-Agent Memory Synthesis

### Test 10c.1 — Cross-Agent Fact Surfacing

1. Launch Agent A (e.g., OpenCode) — give it: _"find the database connection pattern"_
2. After Agent A discovers a fact, launch Agent B (e.g., Claude Code) in same project
3. **Expected:** Within ~5 seconds, Agent B receives a _"Recent discovery"_ notice mentioning Agent A's finding
4. The surfacing respects scoping: same `org_id` = shared, different `org_id` = isolated
5. **Failure:** No cross-agent discovery → org_id scoping not shared between sessions. Wrong fact surfaced → attribution metadata incorrect.

### Test 10c.2 — Memory Decay Reranking (Cross-Agent)

1. Access a set of facts through one agent — marks them recent
2. Switch to another agent and search the same query
3. **Expected:** Recently accessed facts rank higher regardless of which agent accessed them (shared decay under same org_id scope)
4. **Failure:** Decay is per-agent isolated → scoping too narrow. No reranking difference → decay not applied.

### Test 10c.3 — Memory CLI

1. Open terminal, run: `acc memory list opencode`
2. **Expected:** Lists all memory facts for OpenCode agent: ID, type, title, confidence, timestamp
3. Run: `acc memory search "express port"`
4. **Expected:** Hybrid search results in terminal (compact format)
5. Run: `acc memory stats`
6. **Expected:** Per-agent breakdown: fact count, avg confidence, extraction success rate, token cost
7. **Failure:** "Command not found" → CLI binary not in PATH. Empty output → database not connected or query format wrong.

---

## Phase 11: Expansion Features

### Test 11.1 — Supabase Integration

1. Navigate to **Integrations → Supabase**
2. Configure Supabase MCP connection
3. **Expected:** 8 feature group toggles available. `Read-only` mode on by default.
4. Toggle specific feature groups per project
5. **Verify:** Agent can call Supabase MCP tools consistent with enabled feature groups
6. **Lockdown test:** Attempt `execute_sql` via agent → **Expected:** Blocked unless explicitly unlocked
7. Migration test: Agent writes migration file → **Expected:** Flagged for human review, not auto-applied
8. **Failure:** MCP tools not available → registration failed. `execute_sql` callable without unlock → lockdown not enforced.

### Test 11.2 — GitHub Integration

1. Navigate to **Integrations → GitHub**
2. Configure GitHub MCP connection
3. **Expected:** Toolset toggles visible, lockdown mode auto-enabled for public repos
4. **Lockdown test:** Pull request auto-creation — agent creates PR after a completed wave
5. **Expected:** PR created with CHANGELOG content as description
6. **CI/CD gate test:** After wave creates PR, ACC polls GitHub Actions
7. **Expected:** Green CI = QA pass, Red CI = correction loop trigger
8. **Failure:** PR not created → `@octokit/rest` auth token missing. CI status not polled → Actions API not responding.

### Test 11.3 — GitHub Issues Connector Loop (Tier 1)

1. Create a GitHub Issue in the connected repo
2. **Expected:** ACC detects new issue, classifies it
3. ACC proposes a solution plan (creates proposal doc)
4. Human approves → ACC executes wave → creates PR → marks issue as closed
5. **Failure:** Issue not detected → polling interval too long. Not classified → classifier prompt failing. Wave not triggered → connector loop state machine stuck.

---

## Cross-Cutting: Agent Communication Bus (ACB)

### Test ACB.1 — Signal Emission

1. Run a wave with ACB-enabled agents
2. Agent should emit: `[ACC:SIGNAL:from:agent_a:to:agent_b:type:BLOCKER:priority:high:id:sig_001]Requesting schema approval before proceeding`
3. **Expected:** Signal parsed and displayed in **Message Bus Panel**
4. Signal visible in real-time, listed with from/to/type/priority/id fields
5. **Failure:** Signal not detected → ACB prefix check failing. Signal visible but not parsed → regex not matching format.

### Test ACB.2 — BLOCKER/RESOLVE Cycle

1. Agent emits BLOCKER signal
2. **Expected:** Wave pauses. Handoff verification blocked. Signal shows "open" status.
3. Another agent emits RESOLVE signal with matching blocker_id
4. **Expected:** Wave unblocks. Handoff verification proceeds. Signal shows "resolved" status.
5. **Failure:** BLOCKER doesn't pause wave → wave orchestrator not subscribed to ACB state. RESOLVE doesn't unblock → signal matching not working.

### Test ACB.3 — Force Resolve

1. A BLOCKER is stuck (upstream agent crashed/stalled)
2. In Message Bus Panel, click **"Force Resolve"**
3. **Expected:** Wave unblocks despite no RESOLVE signal
4. **Failure:** Force Resolve does nothing → force-resolve handler not connected. Unblocks but upstream still stalled → signal mismatch.

---

## Cross-Cutting: SkillBridge Integration

### Test SB.1 — Auto-Detection

1. Start ACC with SkillBridge installed and running
2. **Expected:** Settings → Integrations shows SkillBridge status: `● Connected`
3. Runner header shows SkillBridge status indicator
4. Start ACC without SkillBridge → **Expected:** Status: `Not Detected`, guided install prompt
5. **Failure:** Always shows "Not Detected" → detection logic not checking process list or config path.

### Test SB.2 — MCP Auto-Registration

1. When SkillBridge detected, check **Assets → MCPs**
2. **Expected:** SkillBridge endpoint appears as a managed MCP entry:
   - Source: "skillbridge"
   - Managed externally: true
   - Read-only toggle (can enable/disable but not edit config)
   - Connection health indicator (green dot = running)
3. **Failure:** SkillBridge MCP not registered → auto-registration logic didn't fire. Not read-only → user can edit managed config.

### Test SB.3 — Unified Memory View

1. Navigate to **Assets → Memory**
2. Click **[Unified]** tab (new tab alongside [Agent Memory])
3. **Expected:** Shows both CLAUDE.md entries and claude-mem entries in one browser
4. Cross-reference section shows keyword-matched pairs with merge/split controls
5. **Failure:** Unified tab missing → SkillBridge memory read import failed. No cross-references → keyword overlap calculation empty.

### Test SB.4 — Knowledge Compounder with SkillBridge

1. With SkillBridge active, complete a session
2. Check Knowledge page
3. **Expected:** Some knowledge items show `📡 SkillBridge` source badge
4. **Failure:** All items show 🔄 Session badge → SkillBridge source not feeding into Compounder. Items with wrong source badge → attribution mapping error.

---

## Navigation: Sidebar Verification

| Menu Item | Leads To | Key Content |
|-----------|----------|-------------|
| Runner | Main agent grid | Spawn/kill agents, presets, status |
| Orchestrate | Wave planning | DAG editor, wave execution, guidelines, handoffs |
| Route | Task routing | Smart agent/model suggestions |
| Handoffs | Handoff monitor | Handoff panel, verification gates |
| Messages | Message Bus | ACB signals, active/blocked/resolved |
| Knowledge + Memory | Knowledge panel | Knowledge items, KG Explorer, Memory timeline, Codebase tab, Code Bridge, Communities |
| Assets | Asset Manager | Skills, Memory, MCPs, Vault |
| Outcomes | Outcome dashboard | Success rates, failure analysis |
| Replay | Session timeline | Event list, replay, export |
| Playbooks | Playbook manager | .acc import/export |
| Integrations | Integration config | GitHub, Supabase, SkillBridge |
| Scheduler | Cron jobs | Job list, execution history, escalation |
| Cost Aggregation | Cost dashboard | Per-provider spending, token usage |
| Settings | Configuration | Project profiler, agent settings, theme, budget |

---

## Quick Validation Walkthrough (15 min)

If you want to quickly validate the app works end-to-end without running every test:

1. **Launch:** Open ACC → sidebar renders, no errors
2. **Spawn:** Spawn any agent → PTY panel opens, agent responds
3. **Preset:** Click a preset → command injects into PTY
4. **Status:** Watch status chip cycle (idle → thinking → writing)
5. **Assets:** Open Assets → MCPs → toggle an MCP, verify in config
6. **Route:** Type a task → get a suggestion
7. **Knowledge:** Run a substantial session → check Knowledge page for items
8. **Outcomes:** Check Outcomes → recorded session result
9. **Memory:** Switch to Memory tab → see extracted facts
10. **Codebase:** Switch to Codebase tab → see repo map
11. **KG Explorer:** Switch to KG Explorer → see graph visualization
12. **Session Replay:** Open Replay → see timeline of your session
