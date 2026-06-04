# ACC Native Agent Harness — Feasibility & Value Assessment

**Date:** 2026-06-04
**Scope:** Evaluate whether ACC can and should build a native coding agent harness layer, analogous to OpenCode / Claude Code, working alongside currently supported external agents.
**Sources:** ACC codebase audit (Rust backend, React frontend, Python daemons), OpenCode GitHub architecture, Claude Code documentation, Anthropic engineering blog, competitive landscape research.

---

## 1. Executive Summary

ACC already possesses approximately **70% of the infrastructure** required for a native coding agent harness. The Rust backend has file I/O, PTY/bash execution, SQLite persistence, an event system, a knowledge store, token budget tracking, a model registry, ACB signaling, and a cron scheduler. It also already makes LLM API calls to OpenRouter — albeit single-turn, non-streaming, and without function-calling.

The gaps are concentrated in four areas:
1. **Agent loop** — multi-turn think→act→observe cycle
2. **Tool registry** — structured tool definitions with function-calling schemas
3. **Streaming LLM client** — currently synchronous `ureq` with no streaming or tool-use response parsing
4. **Context management** — compaction, window monitoring, subagent context isolation

**Recommendation:** Build a phased native agent harness. Start with a "light agent" that handles ACC-internal intelligence tasks (routing, knowledge compounding, handoff validation, guideline generation) — tasks that already require LLM calls but are currently single-turn. This validates the harness architecture without competing with external agents. Then progressively add coding tools to create a hybrid model where the native agent handles planning and simple tasks while delegating heavy coding to external agents via the ACB.

This approach:
- Adds immediate value (better routing, smarter compounding, adaptive guidelines)
- Validates the harness with low risk
- Creates a unique differentiator: **no other orchestrator has its own native agent**
- Avoids the trap of trying to out-build Claude Code / OpenCode on day one

---

## 2. Current State Assessment

### 2.1 What ACC Already Has (Reusable Infrastructure)

| Infrastructure | Location | Reusability |
|---|---|---|
| **File system I/O** | `assets.rs`, `control.rs`, `playbook.rs`, `commands.rs` | Direct — read/write/create_dir for tool execution |
| **PTY / bash execution** | `pty.rs` — `ProcessRegistry`, `PtyManager` with spawn/kill/write | Direct — native agent could reuse PTY for its own bash tool |
| **SQLite persistence** | `db.rs` — 20+ tables, migration system | Direct — session history, tool call logs, agent state |
| **Event system** | `events.rs` — structured event logging | Direct — emit tool-call events, token usage, errors |
| **Knowledge store** | `knowledge.rs` — 2-pass compounder, search, relations, stats | Direct — native agent reads/writes knowledge items natively |
| **Token budget** | `budget.rs` — allocation, threshold ladder, WIP checkpoint | Direct — native agent uses same budget pool |
| **Model registry** | `routing.rs` — `models` table with provider/model_path/costs | Direct — native agent selects models from registry |
| **ACB signaling** | `acb.rs` — signal parse, route, persist | Direct — native agent emits/receives structured signals |
| **Cron scheduler** | `scheduler.rs` — tokio-cron-scheduler | Direct — native agent tasks can be scheduled |
| **Outcome tracker** | `intelligence.rs` — per-agent per-task-type stats | Direct — native agent outcomes tracked automatically |
| **LLM API client** | `intelligence.rs` — `invoke_openrouter()` via ureq | Needs upgrade — single-turn only, no streaming, no tool-use |
| **Agent config system** | `agents/configs.ts` + `agent_registry.yaml` | Extend — add native agent as 10th agent config |
| **xterm.js terminal** | `PtyTerminal.tsx` | Direct — native agent output rendered in same terminal UI |
| **Zustand stores** | 15 stores for agent state, orchestration, knowledge, control | Extend — native agent state managed like external agents |

### 2.2 Current LLM Usage Patterns

ACC makes exactly **3 types of LLM calls**, all via a single synchronous `ureq` path to OpenRouter:

| # | Call Site | Purpose | Model | Type |
|---|---|---|---|---|
| 1 | `knowledge.rs:698` | Knowledge compounder pass 2 | claude-3.5-sonnet | Single-turn, JSON extraction |
| 2 | `playbook.rs:636` | Feature doc generation (×4 doc types) | deepseek-chat-v3 | Single-turn, structured output |
| 3 | `intelligence.rs:752` | Core `invoke_openrouter()` infrastructure | claude-3.5-sonnet (default) | Single-turn, no streaming |

**Key limitations of the current LLM client:**
- Synchronous HTTP (`ureq`) wrapped in async — no true async I/O
- No streaming support — response received as complete JSON
- No function-calling / tool-use support — only `"role": "user"` messages
- No system prompt support — system instructions concatenated into user message
- No conversation history — every call is single-turn
- Hardcoded to OpenRouter — no direct Anthropic/OpenAI/Google provider support

The Python backward-channel daemon routes messages through **CLI subprocesses** (Claude Code, OpenCode), not HTTP APIs — it delegates LLM interaction entirely to external tools.

### 2.3 What's Missing for a Coding Agent Harness

| Component | Status | Notes |
|---|---|---|
| **Agent loop** | ❌ Missing | No think→tool_call→observe→repeat cycle exists anywhere |
| **Tool registry** | ❌ Missing | No structured tool definitions with JSON Schema for function calling |
| **Streaming LLM client** | ❌ Missing | `ureq` is synchronous, single-response. Need streaming + tool-use parsing |
| **System prompt mgmt** | ❌ Missing | System prompts exist as dead code (`build_intelligence_prompt`) but never sent as `role: "system"` |
| **Context compaction** | ❌ Missing | No window monitoring, summarization, or conversation truncation |
| **File search (grep/glob)** | ❌ Missing | No code search capabilities — no `ripgrep`, `glob`, or `walkdir` usage |
| **Structured edit tool** | ❌ Missing | Only raw `fs::write` — no exact-string-replacement edit like Claude Code's Edit tool |
| **Permission system** | ❌ Missing | No tool-level permission gating (allow/ask/deny per tool per path) |
| **Session conversation persistence** | ❌ Missing | Agent PTY output is buffered but not persisted as structured conversation history |
| **Subagent infrastructure** | ❌ Missing | External agents have subagent detection (regex on PTY output) but ACC can't spawn its own subagents |
| **LSP integration** | ❌ Missing | No code intelligence for diagnostics, references, or completions |
| **Web fetch tool** | ❌ Missing | No built-in HTTP fetch for documentation or external resources |
| **Diff display** | ❌ Missing | No structured diff format for edit previews |
| **Checkpointing / undo** | ❌ Missing | No snapshot-before-edit or rewind capability |

---

## 3. What a Native Coding Agent Harness Means

### 3.1 Core Architecture (Reference Model)

Modern coding agents (Claude Code, OpenCode) share this fundamental architecture:

```
┌──────────────────────────────────────────────────────┐
│                  AGENT HARNESS                         │
│                                                        │
│  ┌──────────┐    ┌───────────┐    ┌────────────────┐  │
│  │ System   │    │  Agent    │    │  Tool          │  │
│  │ Prompt   │───▶│  Loop     │───▶│  Registry      │  │
│  │ Composer │    │           │    │                │  │
│  └──────────┘    │ think()   │    │ read_file()    │  │
│                  │   ↓       │    │ write_file()   │  │
│  ┌──────────┐    │ act()     │    │ edit_file()    │  │
│  │ Context  │    │   ↓       │    │ glob()         │  │
│  │ Manager  │◀───│ observe() │◀───│ grep()         │  │
│  │          │    │   ↓       │    │ bash()         │  │
│  │ compact  │    │ (repeat)  │    │ webfetch()     │  │
│  │ truncate │    └───────────┘    │ task()         │  │
│  └──────────┘                     │ question()     │  │
│                                   └────────────────┘  │
│  ┌──────────┐    ┌───────────┐    ┌────────────────┐  │
│  │ LLM      │    │Permission │    │ Session        │  │
│  │ Client   │    │System     │    │ Manager        │  │
│  │          │    │           │    │                │  │
│  │ streaming│    │ allow/ask │    │ JSONL persist  │  │
│  │ tool-use │    │ /deny     │    │ resume/fork    │  │
│  │ multi-prov│   │ per-tool  │    │ checkpoint     │  │
│  └──────────┘    └───────────┘    └────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 3.2 How Native Differs from External Agent Orchestration

| Dimension | External Agent (current ACC) | Native Agent (proposed) |
|---|---|---|
| **Launch** | PTY subprocess spawn | In-process tokio task |
| **Communication** | PTY stdin/stdout text | Structured Rust types / events |
| **Tool execution** | Agent's own implementation | ACC's tool registry |
| **Observability** | Regex parsing of PTY output | Structured event emission |
| **Token tracking** | PTY output heuristic parsing | Direct API response `usage` field |
| **Knowledge integration** | Post-hoc compounder on PTY text | Direct knowledge item read/write during execution |
| **ACB participation** | Regex-parsed text signals | Native ACB signal emit/receive |
| **Budget enforcement** | Reactive (detect limit in output) | Proactive (stop before limit, native budget check) |
| **Error handling** | Pattern match error strings | Structured error types |
| **Model selection** | Agent config template (`{model}`) | Direct model registry lookup |
| **Context management** | Agent's own compaction | ACC-controlled compaction with knowledge integration |

### 3.3 The Key Insight: ACC Already Has "Agent-Like" Intelligence

ACC's existing modules are essentially **single-purpose, single-turn "micro-agents"** — they call an LLM, get a result, and act on it:

- **Knowledge Compounder**: Prompt → LLM → parsed JSON → DB write
- **Playbook Generator**: Prompt → LLM → markdown → file write
- **Router (Python daemon)**: Prompt → LLM (via CLI subprocess) → agent ID → spawn agent

The native agent harness unifies these into a **general-purpose, multi-turn agent** that can chain multiple tool calls before responding.

---

## 4. Feasibility Analysis

### 4.1 Technical Feasibility: HIGH

**Why it's feasible:**

1. **Rust ecosystem support**: The Rust ML/AI ecosystem is mature. Options for the LLM client include:
   - `reqwest` + `tokio` for async streaming HTTP (replace `ureq`)
   - `async-openai` crate for OpenAI-compatible APIs
   - Direct Anthropic API via `reqwest` with SSE streaming
   - OpenRouter continues to work — supports streaming and tool-use in the same OpenAI-compatible format

2. **Proven architecture to borrow from**: OpenCode is MIT-licensed and well-architected. Claude Code's architecture is well-documented. Both provide reference implementations for agent loops, tool registries, and context management.

3. **Existing infrastructure is solid**: ACC's PTY manager, file I/O, DB layer, event system, and knowledge store are production-ready — the native agent plugs into them rather than rebuilding.

4. **Tool implementation is straightforward**: Most tools (read_file, write_file, glob, grep, bash) are thin wrappers around system calls ACC already makes. The complexity is in the agent loop and LLM integration, not the tools.

5. **OpenRouter supports everything needed**: Streaming responses, tool-use / function-calling, multiple models — all via the same endpoint ACC already uses.

### 4.2 Resource Requirements

| Phase | Scope | Estimated Effort | Key Deliverables |
|---|---|---|---|
| **Phase 1: Foundation** | LLM client upgrade + agent loop + 3 tools | 2–3 weeks (1 dev) | Streaming OpenRouter client, agent loop, read_file/write_file/search_knowledge |
| **Phase 2: ACC Brain** | Internal intelligence tasks migrated to agent loop | 2–3 weeks (1 dev) | Routing agent, compounding agent, handoff validator, guideline generator |
| **Phase 3: Coding Tools** | Full tool set for coding tasks | 3–4 weeks (1 dev) | grep, glob, edit_file, bash, webfetch, question, task (subagent) |
| **Phase 4: Context Mgmt** | Compaction, session persistence, permission system | 2–3 weeks (1 dev) | Token-aware compaction, JSONL session files, per-tool permission model |
| **Phase 5: Polish** | Diff display, checkpointing, LSP, provider diversity | 3–4 weeks (1 dev) | Structured diffs, undo, direct Anthropic/OpenAI providers |

**Total estimated effort: 12–17 weeks (1 full-time Rust developer)** for a complete native agent harness. Phase 1+2 alone (4–6 weeks) delivers the "ACC Brain" — a light agent for internal tasks that immediately improves routing, compounding, and orchestration.

### 4.3 Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| **Quality gap vs. specialized agents** | High | Position native agent as complement, not replacement. Start with internal tasks only. |
| **API cost increase** | Medium | Direct LLM calls may use more tokens than CLI tools. Implement the same token budget system native agents would enforce. Use cheaper models for simple tasks. |
| **Scope creep from core mission** | Medium | ACC's core is orchestration. Keep native agent harness as an orchestration enabler, not a standalone coding agent business. |
| **Maintenance burden** | Medium | External agents evolve fast. Mitigate by building on stable LLM APIs, not CLI interfaces. Keep native agent simple — 10-12 tools max vs. Claude Code's 25+. |
| **User confusion** | Low | "When should I use the native agent vs. Claude Code?" — solved by task routing: ACC routes to native for internal tasks, external for heavy coding. |
| **Rust async complexity** | Low | ACC already uses tokio. The agent loop is a natural fit for async Rust. |
| **Dependency on OpenRouter** | Low | Agent loop is provider-agnostic. Adding direct Anthropic/OpenAI support is a configuration change, not architectural. |

---

## 5. Value Proposition

### 5.1 Where Value Is Added

#### A. Immediate Value (Phase 1–2: "ACC Brain")

| Capability | Current State | With Native Agent |
|---|---|---|
| **Task routing** | Keyword matching + outcome stats lookup | LLM-driven semantic routing with confidence scoring and agent recommendation rationale |
| **Knowledge compounding** | Single-pass LLM extraction from session text | Multi-turn agent that cross-references existing knowledge, asks clarifying questions, resolves contradictions |
| **Handoff validation** | Schema check only (file exists, has sections) | Agent reads handoff doc, validates completeness against task spec, generates targeted correction instructions |
| **Guideline generation** | Template-based string formatting | Context-aware guidelines that reference relevant knowledge items, past outcomes, and project conventions |
| **Wave plan optimization** | Manual plan creation | Agent proposes wave structure, agent assignments, and dependency ordering based on task analysis |
| **Failure analysis** | Pattern matching on known error strings | Agent analyzes full failure context, proposes root cause and resolution steps |
| **Playbook candidate detection** | Static detection rules | Agent evaluates session context for playbook-worthy patterns |

#### B. Medium-Term Value (Phase 3: Coding Tools)

| Capability | Why It Matters |
|---|---|
| **Simple code changes** | Quick fixes, config updates, README edits — no need to spawn a full external agent |
| **Pre-task context gathering** | Native agent gathers relevant files, knowledge items, and project context before spawning an external agent — reduces external agent's token waste on exploration |
| **Post-task verification** | Native agent runs tests, checks lints, validates outputs after external agent completes |
| **Fallback execution** | When external agents are rate-limited or unavailable, native agent handles critical tasks |
| **Offline local operation** | With Ollama integration, native agent performs basic tasks without internet/API keys |
| **Inter-agent coordination** | Native agent acts as "team lead" in wave execution — monitors progress, resolves conflicts, re-routes stuck tasks |

#### C. Long-Term Value (Phase 4–5: Full Harness)

| Capability | Strategic Value |
|---|---|
| **Zero-install onboarding** | New users get coding agent capability without installing any CLI tools — just ACC + API key |
| **Unified permission model** | One permission system for all agents — native and external — managed through ACC |
| **Cross-agent learning** | Native agent learns from external agent sessions, applies learnings to future tasks regardless of which agent executes |
| **Ecosystem reference implementation** | Native agent demonstrates ACC's full feature set, making it easier for external agent developers to integrate |
| **Vendor independence** | ACC isn't reliant on any single external agent's continued existence or API compatibility |

### 5.2 Competitive Positioning

| Dimension | ACC Today | ACC + Native Agent | Market Impact |
|---|---|---|---|
| **Agent count** | 9 external | 9 external + 1 native | Widens lead (10 vs. max 6) |
| **Orchestration quality** | Template-based | LLM-driven, adaptive | Unique — no orchestrator uses its own agent for orchestration decisions |
| **Onboarding friction** | Must install 1+ external agents | Works out of the box with API key | Significant competitive advantage |
| **Offline capability** | None (all external agents need APIs) | Basic tasks via local models | Unique for desktop coding tools |
| **Observability depth** | PTY text parsing | Structured events + PTY | Best-in-class debugging and analytics |
| **Token efficiency** | No pre-task context optimization | Pre-gathering reduces external agent waste | Lower total cost for complex tasks |

### 5.3 Use Cases Where Native Agent Excels

1. **Rapid context switching**: User asks "what does the auth module do?" — native agent reads 3 files, summarizes, returns in seconds. No subprocess spawn overhead.

2. **Multi-agent task decomposition**: User describes a complex feature — native agent analyzes, proposes a 3-wave plan with agent assignments, dependencies, and estimated token budgets.

3. **Session handoff continuity**: External agent hits token limit mid-task. Native agent reads the WIP checkpoint, knowledge store, and session context, then prepares a precise resumption prompt for the next external agent.

4. **Knowledge base maintenance**: Native agent periodically reviews the knowledge store, identifies stale/contradictory items, proposes updates or retirement.

5. **Late-night quick fix**: User is rate-limited on Claude. Native agent uses a cheaper model (DeepSeek, Gemini Flash) to make a straightforward config change.

6. **Learning from failures**: External agent fails 3 times on the same pattern. Native agent analyzes failures, creates an antipattern knowledge item, and injects it into future agent guidelines.

---

## 6. Architectural Options

### Option A: "ACC Brain" — Light Native Agent (Recommended Starting Point)

**Scope**: Agent loop + 5 tools for ACC-internal intelligence tasks only.

```
Tools:
  read_knowledge()    — query knowledge store
  write_knowledge()   — create/update knowledge items
  read_file()         — read project files for context
  plan_wave()         — propose wave structure + agent assignments
  generate_guideline() — create context-aware agent guidelines
```

**What it does**: Replaces current single-turn LLM calls in routing, compounding, handoff validation, and guideline generation with a multi-turn agent that can gather context, reason, and produce higher-quality outputs.

**Effort**: 4–6 weeks (1 dev)
**Risk**: Low — builds on existing LLM patterns, doesn't compete with external agents
**Value**: Immediate improvement to ACC's core orchestration intelligence

### Option B: Full Native Coding Agent

**Scope**: Complete coding agent with 12+ tools, permission system, context compaction, session persistence, and subagent support. Feature-equivalent to running OpenCode or Claude Code natively within ACC.

**Effort**: 12–17 weeks (1 dev)
**Risk**: High — significant engineering effort, quality gap risk, scope creep
**Value**: High but long-term — competes with established products

### Option C: Hybrid Delegate (Recommended After Phase 2)

**Scope**: Native agent handles planning, context gathering, and task decomposition. Execution of heavy coding tasks is delegated to external agents via ACB signals. Native agent monitors progress and handles coordination.

```
Native Agent Responsibilities:
  1. Receive user task
  2. Gather context (read files, query knowledge store)
  3. Decompose into sub-tasks
  4. For each sub-task:
     a. If simple (config change, README update, single-file fix) → execute natively
     b. If complex → delegate to external agent via ACB signal
  5. Monitor external agent progress
  6. Verify outputs
  7. Compound learnings
```

**Effort**: 6–8 weeks (1 dev, building on Phase 2)
**Risk**: Medium — requires ACB integration and handoff protocol design
**Value**: Unique — no other system has a native agent that delegates to external agents

### Comparison Matrix

| | Option A (Brain) | Option B (Full) | Option C (Hybrid) |
|---|---|---|---|
| **Effort** | 4–6 weeks | 12–17 weeks | 6–8 weeks |
| **Risk** | Low | High | Medium |
| **Competes with external agents?** | No | Yes | No — complements |
| **Improves orchestration?** | Significantly | Moderately | Significantly |
| **Handles coding tasks?** | No | Yes | Simple tasks only |
| **Unique in market?** | Yes | No (OpenCode, Claude Code exist) | Yes |
| **Maintenance burden** | Low | High | Medium |

---

## 7. Recommendation

**Phased approach: Option A → Option C → evaluate Option B.**

### Phase 1: Foundation (Weeks 1–3)
Upgrade the LLM client and build the core agent loop:
- Replace `ureq` with `reqwest` for async streaming HTTP to OpenRouter
- Add function-calling / tool-use response parsing (OpenRouter supports OpenAI-compatible tool-use)
- Implement the agent loop: system prompt → model call → parse response → if tool_call, execute and feed back → repeat until text response
- Implement 3 initial tools: `read_file`, `write_file`, `search_knowledge`

### Phase 2: ACC Brain (Weeks 4–6)
Migrate internal intelligence tasks to the agent loop:
- **Routing Agent**: Replaces keyword-based routing with LLM-driven task analysis and agent recommendation
- **Compounding Agent**: Upgrades knowledge compounding from single-pass to multi-turn (cross-reference, contradiction detection, confidence merging)
- **Handoff Validator**: Reads handoff docs, validates against task spec, generates targeted corrections
- **Guideline Generator**: Context-aware guidelines referencing knowledge items and past outcomes
- **Wave Planner**: Proposes wave structure, agent assignments, and dependency ordering

### Phase 3: Coding Tools & Hybrid Mode (Weeks 7–12)
Add coding tools and ACB-based delegation:
- New tools: `grep`, `glob`, `edit_file`, `bash`, `webfetch`, `question`, `task` (subagent spawn)
- ACB integration: native agent emits `handoff` signals to external agents, monitors progress, receives results
- Simple coding task execution: config changes, documentation, single-file fixes
- Pre-task context gathering: automated before spawning external agents

### Phase 4: Polish & Hardening (Weeks 13–17)
Context management and advanced features:
- Token-aware context compaction
- Session persistence (JSONL)
- Permission system (per-tool per-path allow/ask/deny)
- Structured diff display in terminal
- Direct provider support (Anthropic, OpenAI)
- Local model support (Ollama)

### Decision Gate After Phase 2

After Phase 2 delivers measurable improvements to ACC's orchestration intelligence, evaluate:
1. **User demand**: Are users asking for native coding capabilities?
2. **Quality benchmark**: How does the native agent's output compare to external agents on internal tasks?
3. **Cost analysis**: Is the token cost of native agent operations justified by the quality improvement?
4. **Market signal**: Are competitors moving toward native agent capabilities?

If all signals are positive, proceed to Phase 3. If not, the Phase 2 "ACC Brain" alone justifies the investment through improved orchestration intelligence.

---

## 8. Technical Design Notes

### 8.1 Agent Loop (Rust — `src-tauri/src/agent/`)

```rust
// Proposed module structure
src-tauri/src/agent/
├── mod.rs           // AgentLoop struct, run() entry point
├── llm.rs           // Streaming LLM client (reqwest, OpenRouter, tool-use parsing)
├── tools.rs         // ToolRegistry, Tool trait, built-in tool implementations
├── context.rs       // System prompt composer, context window manager, compaction
├── session.rs       // Session persistence (JSONL), resume, fork
└── permission.rs    // Permission model, per-tool per-path allow/ask/deny
```

**Agent loop pseudocode:**
```rust
impl AgentLoop {
    async fn run(&mut self, user_prompt: String) -> Result<AgentResponse> {
        self.context.add_message(Message::user(user_prompt));

        loop {
            let response = self.llm_client
                .chat(&self.context.messages, &self.tool_registry.schemas())
                .await?;

            match response {
                LlmResponse::Text(text) => {
                    self.context.add_message(Message::assistant(text.clone()));
                    return Ok(AgentResponse::Complete(text));
                }
                LlmResponse::ToolCalls(calls) => {
                    for call in calls {
                        let tool_result = self.tool_registry
                            .execute(&call.name, &call.arguments)
                            .await?;
                        self.context.add_message(Message::tool_result(
                            call.id, tool_result
                        ));
                    }
                    // Loop continues — model sees tool results
                }
            }
        }
    }
}
```

### 8.2 Tool Trait

```rust
#[async_trait]
pub trait Tool: Send + Sync {
    fn name(&self) -> &'static str;
    fn description(&self) -> &'static str;
    fn schema(&self) -> serde_json::Value;  // JSON Schema for function calling
    fn requires_permission(&self) -> bool;
    async fn execute(&self, args: serde_json::Value) -> Result<ToolOutput>;
}

pub struct ToolOutput {
    pub content: String,
    pub metadata: Option<ToolMetadata>,
}
```

### 8.3 Native Agent as AgentConfig Entry

The native agent appears as the 10th entry in `src/lib/agents/configs.ts`:

```typescript
{
  id: "acc-native",
  label: "ACC Native",
  spawnCmd: null,       // Not spawned via CLI — runs in-process
  waveEligible: true,
  supportsSubagents: true,
  isNative: true,        // New flag — frontend handles differently
  // No memoryFile, globalConfigPath, mcpConfigFile — native agent uses ACC's own systems
}
```

The frontend detects `isNative: true` and calls a different spawn path — `invoke("spawn_native_agent", { ... })` instead of PTY spawn.

### 8.4 Provider Architecture

```
                    ┌─────────────────────────┐
                    │    LLM Client (llm.rs)    │
                    │                          │
                    │  trait LlmProvider {     │
                    │    async fn chat(...)    │
                    │    async fn stream(...)  │
                    │  }                       │
                    └──────────┬───────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
  ┌───────▼──────┐  ┌─────────▼────────┐  ┌───────▼──────┐
  │ OpenRouter   │  │ Anthropic        │  │ Ollama       │
  │ Provider     │  │ Direct Provider  │  │ Provider     │
  │              │  │                  │  │              │
  │ OpenAI-      │  │ Native Messages  │  │ OpenAI-      │
  │ compatible   │  │ API + SSE stream │  │ compatible   │
  │ endpoint     │  │                  │  │ localhost    │
  └──────────────┘  └──────────────────┘  └──────────────┘
```

### 8.5 Context Window Management Strategy

Following Anthropic's three-pronged approach for long-horizon tasks:

1. **Compaction**: When token usage exceeds 80% of model context window, summarize conversation history (preserving key decisions, code snippets, and knowledge items discovered). Reinitialize with summary + system prompt.

2. **Structured Note-Taking**: Native agent writes intermediate findings to ACC's knowledge store (not just in-context). After compaction, agent reads back relevant knowledge items.

3. **Subagent Isolation**: For deep-dive research or complex sub-tasks, spawn a subagent with fresh context. Only the summary (1–2K tokens) returns to the main conversation.

### 8.6 Session Persistence Format

Following Claude Code's JSONL model:

```jsonl
{"type":"system","content":"You are ACC Native Agent...","timestamp":"..."}
{"type":"user","content":"Add dark mode toggle to settings","timestamp":"..."}
{"type":"assistant","content":"I'll start by reading the current settings...","timestamp":"..."}
{"type":"tool_call","tool":"read_file","args":{"path":"src/pages/Settings.tsx"},"id":"call_1","timestamp":"..."}
{"type":"tool_result","tool_call_id":"call_1","content":"import React...","timestamp":"..."}
```

Stored at `~/.acc/sessions/{session_id}.jsonl`. Supports resuming, forking, and replay.

---

## 9. Appendix: Competitive Comparison

### 9.1 Native Agent vs. External Agents (Feature Parity Target)

| Feature | Claude Code | OpenCode | ACC Native Agent (Target) |
|---|---|---|---|
| **Agent loop** | Gather→Act→Verify | Think→Act→Observe | Think→Act→Observe |
| **Tools** | 25+ | 10+ | 12 target (Phase 3) |
| **Streaming** | Yes | Yes | Yes (Phase 1) |
| **Multi-provider** | Anthropic only | Yes (multi) | Yes (Phase 1 — OpenRouter; Phase 4 — direct) |
| **Subagents** | Yes | Yes | Yes (Phase 3) |
| **Permission system** | 5 modes + pattern matching | allow/ask/deny + glob patterns | allow/ask/deny + glob patterns (Phase 4) |
| **Compaction** | Auto + manual + focus | Auto + manual | Auto (Phase 4) |
| **Session persistence** | JSONL | Internal | JSONL (Phase 4) |
| **LSP** | Yes | Yes | Deferred (post-Phase 5) |
| **MCP** | Yes | Yes | Deferred (post-Phase 5) |
| **Skills** | Yes | Yes | Deferred (post-Phase 5) |
| **Local models** | No | Via Ollama provider | Via Ollama provider (Phase 4) |
| **Desktop app** | No (CLI) | Optional | **Native Tauri desktop** |
| **Orchestration** | No (external) | No (external) | **Built-in wave+DAG orchestration** |
| **Knowledge compounding** | No | No | **Built-in cross-session knowledge store** |
| **Token budget** | No | No | **Built-in proactive budget system** |

### 9.2 Strategic Positioning

```
                    Orchestration Capability
                         ▲
                         │
                    ACC +│  ★ ACC + Native Agent (Phase 4+)
              Native     │  (unified orchestration + native execution)
                         │
                         │
              ACC Today  │
              (9 external│  ★
               agents)   │
                         │
                         │        Claude Code
                         │        OpenCode
                         │  (single-agent coding)
                         │
                         └──────────────────────────▶
                              Coding Agent Capability
```

ACC + Native Agent occupies a unique position: **both an orchestrator and a coding agent**, combining multi-agent coordination with native execution capability. No existing product occupies this quadrant.

---

## 10. Conclusion

Building a native coding agent harness for ACC is **feasible, valuable, and strategically aligned** with ACC's mission as "the cockpit that makes your AI agents smarter the more you use them." A native agent makes the cockpit itself smarter.

The recommended phased approach — starting with a light "ACC Brain" for internal intelligence tasks, then expanding to hybrid delegation, and only then evaluating full coding capabilities — minimizes risk while delivering immediate value. Each phase has independent ROI:

- **Phase 1–2**: Better routing, smarter compounding, adaptive guidelines → immediately improves every external agent session
- **Phase 3**: Pre-task context gathering, simple task execution, fallback capability → reduces external agent token waste, improves reliability
- **Phase 4–5**: Full coding capability, permission system, local models → reduces dependency on external agents, enables offline use

The key architectural decision is to build the native agent **as a peer to external agents**, not a replacement. It participates in the same wave orchestration, uses the same token budgets, contributes to the same knowledge store, and communicates via the same ACB. This preserves ACC's core value proposition (multi-agent orchestration) while adding a powerful new capability.
