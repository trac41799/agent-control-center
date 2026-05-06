# ACC Technical Overview

**Date:** 2026-05-02
**Source:** ACC-Complete-Project-Documentation-v2.7.md + ACC-Gap-Assessment.md
**Scope:** System architecture, agent abstraction, connector abstraction, and future architecture

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AGENT CONTROL CENTER                           │
│                                                                     │
│  ┌─────────────────────────┐  ┌──────────────────────────────────┐  │
│  │   FRONTEND (React 19)   │  │     BACKEND (Tauri v2 / Rust)    │  │
│  │                         │  │                                  │  │
│  │  Agent Runner           │  │  PTY Manager                     │  │
│  │  Asset Manager          │◄─►  File Sync Engine                │  │
│  │  Wave Orchestrator      │  │  Log File Watcher                │  │
│  │  Task + Model Router    │  │  Connector Vault (Stronghold)    │  │
│  │  Outcome Dashboard      │  │  SQLite Database                 │  │
│  │  Session Replay         │  │  Architect Agent Loop            │  │
│  │  Handoff Monitor        │  │  Project Scanner                 │  │
│  │  Message Bus Panel      │  │  File System Watcher             │  │
│  │  Playbook Manager       │  │  ACB Signal Parser + Router      │  │
│  │  Connector Monitor      │  │  Knowledge Compounder (async)    │  │
│  │  Knowledge Panel        │  │  Session Heartbeat Monitor       │  │
│  │  Scheduler Panel        │  │  Cron Scheduler + Escalation     │  │
│  │  Budgets Panel          │  │  Budget Planner + Monitor        │  │
│  │                         │  │  WIP Capture + Resumption        │  │
│  │                         │  │  HTTP Client (MCP servers only)  │  │
│  │                         │  │  SB Detector (process check,     │  │
│  │                         │  │    config reader, status poller) │  │
│  └─────────────────────────┘  └──────────────────────────────────┘  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                      FILE SYSTEM LAYER                              │
│  ~/.claude/  ~/.opencode/  ~/.gemini/  ~/.codex/  Project dirs      │
├─────────────────────────────────────────────────────────────────────┤
│                      EXTERNAL SERVICES                              │
│  OpenRouter   Supabase MCP   GitHub MCP                             │
│  Lark MCP [deferred]   Slack MCP [deferred]   Jira MCP [deferred]   │
│  SkillBridge (Tauri v2, optional, detected at runtime)              │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 PTY Session Flow

```
User: [Spawn Agent] or [Wave Orchestrator: Execute Wave 1]
  │
  ▼
Tauri Shell Plugin
  │ spawn(cmd, args, { cwd: project_path, env: secrets_from_vault })
  ▼
OS Process (claude / opencode / gemini / codex)
  │
  ├─── stdout ──► PTY Stream ──► xterm.js panel (React)
  │                          └──► SQLite event log (structured)
  │                          └──► Pattern detector (reactive memory)
  │                          └──► Idle detector (outcome prompt trigger)
  │                          └──► ACB Signal parser ──► route to target PTY stdin
  │                                                 └──► SQLite agent_messages log
  │                                                 └──► Wave Orchestrator (block/unblock)
  │                                                 └──► UI Message Bus Panel
  │
  ├─── File changes ──► Tauri fs.watch() ──► Handoff detector
  │                                      └──► Stall timer reset
  │
  └─── stdin ◄── PTY write ◄── Preset buttons / Task Router / Correction injector
                           └──► ACB Signal delivery (routed from peer agent signals)
```

### 1.3 Upstream Connector Flow

```
Background: Architect Agent Loop (Rust async task)
  │
  ├── Every N minutes: call connector MCP tools (list_messages / search_issues)
  │
  ├── New items found → ACC spawns non-interactive agent session for classification
  │     → type, priority, summary, requires_clarification
  │
  ├── If requires_clarification → reply in thread → wait
  │
  ├── If actionable → create proposal doc via MCP
  │     → notify user in ACC Detection Panel
  │     → [optional] user confirms before posting
  │
  ├── Poll for approval signal every 5 minutes
  │     → on approval: populate Wave Orchestrator → execute
  │
  ├── Monitor wave execution → wait for QA pass
  │
  └── On QA pass: generate Feature Docs → post to connector via MCP
        → create delivery log entry
```

### 1.4 Wave Orchestration Flow

```
Wave Orchestrator: Plan created
  │
  ├── Wave 1 agents (no dependencies)
  │   ├── Spawn A1 PTY (background, model: Minimax)
  │   ├── Spawn A2 PTY (background, model: Qwen)
  │   └── Start 10-min stall timers
  │
  ├── Monitor: fs.watch docs/ for HANDOFF_A1.md, HANDOFF_A2.md
  │
  ├── On HANDOFF_A1.md detected:
  │   ├── Parse and validate
  │   ├── Tests passing? → Mark A1 verified
  │   └── Tests failing? → Generate CORRECTION_A1.md → re-inject (max 2x)
  │
  ├── All Wave 1 verified? → Unlock Wave 2
  │   └── Spawn B1 PTY (model: Minimax, alternating)
  │
  └── All waves complete? → QA agent (final wave) → Feature Doc Generator
```

### 1.5 SkillBridge Integration Layer

The SkillBridge Integration Layer is a read-only detection and surface layer
embedded in the Rust backend. ACC never writes to SkillBridge configuration or
state. The `SB Detector` runs at startup (and polls every 30 seconds) to
discover a running SkillBridge instance on the local machine.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SKILLBRIDGE INTEGRATION LAYER                      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  SB Detector (Rust backend — startup + 30s poll)                ││
│  │                                                                 ││
│  │  1. Process check (pgrep/ps for "SkillBridge")                  ││
│  │  2. App path check (/Applications/SkillBridge.app on macOS)     ││
│  │  3. Config file check (~/.skillbridge/config.json)              ││
│  │  4. Port/relay check (attempt GET to local worker port)         ││
│  │                                                                 ││
│  │  Result → SQLite skillbridge_status table:                      ││
│  │    • status:  not-installed | installed | running | bridge-active││
│  │    • version: semver                                            ││
│  │    • relay_url / mcp_url: from SkillBridge config               ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ACC → SkillBridge integration points:                              │
│  ✓ MCP Registry lists SkillBridge endpoint (auto-registered, ro)    │
│  ✓ Knowledge Compounder reads ~/.claude-mem/ as input source        │
│  ✓ Unified vault shares Stronghold backend (separate DB files)     │
│  ✓ Settings → Integrations panel shows bridge status inline         │
│  ✓ Runner status bar shows connection health indicator              │
│                                                                     │
│  ACC does NOT:                                                      │
│  ✗ Manage the Deno relay connection                                 │
│  ✗ Spawn claude-mem or context-mode workers                         │
│  ✗ Control SkillBridge's bridge state                               │
│  ✗ Write to ~/.claude-mem/ (single-writer principle)                │
└─────────────────────────────────────────────────────────────────────┘
```

Detection methods are tried in order. The first successful match determines the
status. If none succeed, `skillbridge_status` is set to `not-installed` and the
guided onboarding flow is available from Settings → Integrations.

---

## 2. Agent Abstraction Layer

Every supported agent is one `AgentConfig` object. No agent-specific code paths.

```typescript
// src/lib/agents/types.ts

export type AgentTier = 1 | 2

export interface AgentConfig {
  id: string
  label: string
  spawnCmd: string           // 'claude' | 'opencode' | 'aider' | 'goose' | 'cline' | etc.
  defaultArgs: string[]
  memoryFile: string         // 'CLAUDE.md' | 'GEMINI.md' | 'AGENTS.md' | 'CONVENTIONS.md' | etc.
  globalConfigPath: string
  mcpConfigFile: string
  mcpConfigKey: string
  tier: AgentTier            // 1 = full PTY, 2 = full PTY with subscription auth
  requiresAuth?: string      // 'cursor-subscription' | 'goose-block-account'
  supportsSubagents: boolean // true if agent natively spawns parallel subagents
  subagentDetectionPattern?: RegExp  // PTY pattern signaling subagent spawn (Module 1 observability)
  waveCommand?: string       // Command pattern for Wave Orchestrator
                             // Absence of waveCommand = agent is NOT eligible for wave assignment
  waveEligible: boolean
  knownFlagVersions?: {      // Version-aware flag mapping — CLI flags change between releases
    [semverRange: string]: Partial<AgentConfig>
  }
}
```

### 2.1 CLI Flag Stability

> **Known maintenance point — see Gap #3 in gap assessment.**

Agent `waveCommand` templates are version-aware via `knownFlagVersions` mapping.
When an agent updates to an unknown CLI version, ACC disables wave commands for
that agent and surfaces a warning in Settings. This prevents silent breakage
from upstream flag changes.

ACC tracks the installed version of each Tier 1 agent at startup (via
`claude --version`, `opencode --version`, etc.) and matches against
`knownFlagVersions` to select the correct flag syntax. When an agent updates to
an unknown version, ACC surfaces a warning in Settings and disables wave
commands for that agent until the config is verified.

```typescript
// Version check at startup (Rust backend)
// Stored in SQLite agent_versions table
// UI shows warning badge on affected agent panel
```

### 2.2 IDE-Only Agents (Excluded)

Agents that exist only as IDE applications without a controllable headless CLI
are not supported in ACC. This includes Windsurf Cascade and Antigravity. Their
only "CLI" presence is a project launcher (`windsurf .`) that opens the IDE —
there is no way for ACC to inject prompts, capture structured output, or
participate in wave execution. Community wrappers exist (e.g. `wsc` for Windsurf
using AppleScript-driven UI automation, macOS-only) but are too fragile for
production integration. If these vendors ship a real headless CLI in future,
they will be added as Tier 1 agents.

### 2.3 Native Subagent Observability

Seven of the nine Tier 1 agents natively spawn parallel subagents. They fall
into three architectural families:

| Family | Agents | Mechanism |
|---|---|---|
| **Task-tool** | OpenCode, Claude Code, Qwen Code | `task(subagent_type=...)` — shared architecture |
| **Gemini** | Gemini CLI | `@agent_name` delegation + `/agents` commands |
| **Codex** | Codex CLI | `spawn_agent` tool + path-based addressing |
| **Proprietary** | Cline CLI, Cursor | Tool-specific native mechanisms |

ACC observes these by detecting subagent-spawn patterns in the parent agent's
PTY output (via `subagentDetectionPattern`) and registers each subagent as a
tracked sub-session inside the parent panel — no separate panel, but each
subagent gets its own status chip and event log.

Two agents lack native subagent support: Aider and Goose (roadmapped).

This is distinct from ACC's own Wave Orchestrator: native subagents are the
agent's internal parallelism, while waves are ACC's external orchestration.
Both can run simultaneously — a wave agent can itself spawn native subagents.

**Orchestration mode priority:** When running the multi-agent feature skill,
native subagent execution is always the default for tools that support it.
External orchestration (ACC Wave Orchestrator) is the fallback — used only when
the current tool lacks native subagent support or the user explicitly requests
cross-tool subagents.

**External orchestration mechanism:** For the two agents without native subagent
support (Aider, Goose), ACC spawns fresh CLI sessions using the `waveCommand`
defined per agent. Each subagent runs in its own PTY panel, launched by the
orchestrator agent issuing the tool's CLI command (e.g., `aider --message
"{prompt}" --yes --no-pretty`). ACC monitors completion via file-watch on
`HANDOFF_<ID>.md` documents. This is the same spawn mechanism used for cross-tool
orchestration — the `waveCommand` field is the universal spawn contract for all
external subagent invocations.

### 2.4 Agent Configs (All 9 Tier 1 Agents)

```typescript
// Built-in configs
export const AGENT_CONFIGS: AgentConfig[] = [
  {
    id: 'claude',
    label: 'Claude Code',
    spawnCmd: 'claude',
    defaultArgs: ['--dangerously-skip-permissions'],
    memoryFile: 'CLAUDE.md',
    globalConfigPath: '~/.claude/',
    mcpConfigFile: 'claude_desktop_config.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    supportsSubagents: true,
    subagentDetectionPattern: /Dispatching subagent|Agent\d+ started/i,
    waveCommand: 'claude --dangerously-skip-permissions "{prompt}"'
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    spawnCmd: 'opencode',
    defaultArgs: ['run'],
    memoryFile: '.opencode/memory/default.md',
    globalConfigPath: '~/.opencode/',
    mcpConfigFile: 'config.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    supportsSubagents: false,
    waveCommand: 'opencode run --model {model} --dir {dir} --format json "{prompt}"'
  },
  {
    id: 'aider',
    label: 'Aider',
    spawnCmd: 'aider',
    defaultArgs: [],
    memoryFile: 'CONVENTIONS.md',
    globalConfigPath: '~/.aider/',
    mcpConfigFile: '.aider.conf.yml',
    mcpConfigKey: 'mcp',
    tier: 1,
    waveEligible: true,
    supportsSubagents: false,
    waveCommand: 'aider --message "{prompt}" --yes --no-pretty'
  },
  {
    id: 'goose',
    label: 'Goose',
    spawnCmd: 'goose',
    defaultArgs: ['run'],
    memoryFile: '.goose/instructions.md',
    globalConfigPath: '~/.config/goose/',
    mcpConfigFile: 'config.yaml',
    mcpConfigKey: 'extensions',
    tier: 1,
    waveEligible: true,
    supportsSubagents: false,
    waveCommand: 'goose run --instructions "{prompt}"'
  },
  {
    id: 'cline',
    label: 'Cline CLI',
    spawnCmd: 'cline',
    defaultArgs: [],
    memoryFile: '.clinerules',
    globalConfigPath: '~/.cline/',
    mcpConfigFile: 'cline_mcp_settings.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    supportsSubagents: true,
    subagentDetectionPattern: /Spawning subagent|Sub-task started/i,
    waveCommand: 'cline --task "{prompt}" --auto-approve'
  },
  {
    id: 'cursor',
    label: 'Cursor',
    spawnCmd: 'agent',
    defaultArgs: ['chat'],
    memoryFile: '.cursor/rules',
    globalConfigPath: '~/.cursor/',
    mcpConfigFile: 'mcp.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    requiresAuth: 'cursor-subscription',
    supportsSubagents: true,
    subagentDetectionPattern: /Background agent|Parallel agent/i,
    waveCommand: 'agent chat "{prompt}"'
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    spawnCmd: 'gemini',
    defaultArgs: ['--output-format', 'json'],
    memoryFile: 'GEMINI.md',
    globalConfigPath: '~/.gemini/',
    mcpConfigFile: 'settings.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    supportsSubagents: false,
    waveCommand: 'gemini --output-format json "{prompt}"'
  },
  {
    id: 'qwen-code',
    label: 'Qwen Code',
    spawnCmd: 'qwen-code',
    defaultArgs: ['run'],
    memoryFile: 'qwen.md',
    globalConfigPath: '~/.qwen/',
    mcpConfigFile: 'settings.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    supportsSubagents: false,
    waveCommand: 'qwen-code run --model {model} "{prompt}"'
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    spawnCmd: 'codex',
    defaultArgs: ['run'],
    memoryFile: 'AGENTS.md',
    globalConfigPath: '~/.codex/',
    mcpConfigFile: 'config.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    supportsSubagents: false,
    waveCommand: 'codex run --model {model} "{prompt}"'
  }
]
```

**Agent coverage summary:**

| # | Agent | Tier | Wave Eligible | Native Subagents | Auth Required |
|---|-------|------|:---:|:---:|---|
| 1 | Claude Code | 1 | ✓ | ✓ | — |
| 2 | OpenCode | 1 | ✓ | — | — |
| 3 | Aider | 1 | ✓ | — | — |
| 4 | Goose | 1 | ✓ | — | — |
| 5 | Cline CLI | 1 | ✓ | ✓ | — |
| 6 | Cursor | 1 | ✓ | ✓ | cursor-subscription |
| 7 | Gemini CLI | 1 | ✓ | — | — |
| 8 | Qwen Code | 1 | ✓ | — | — |
| 9 | Codex CLI | 1 | ✓ | — | — |

---

## 3. Connector Abstraction Layer

Every supported upstream platform is one `ConnectorConfig` object.

```typescript
// src/lib/connectors/types.ts

export interface ConnectorPlatformSpec {
  id: string
  label: string
  mcpServer: string
  structured: boolean           // Pre-classified (Jira/Linear) vs free-text (Slack/Lark)
  approvalSignals: string[]     // Default signals for this platform
  proposalMedium: string        // 'doc' | 'issue' | 'canvas' | 'message'
  reportMedium: string[]        // ['message', 'doc', 'record']
}

export const CONNECTOR_SPECS: ConnectorPlatformSpec[] = [
  {
    id: 'lark',
    label: 'Lark / Feishu',
    mcpServer: 'npx -y @larksuiteoapi/lark-mcp mcp',
    structured: false,
    approvalSignals: ['✅', 'approved', 'approve', 'go ahead', 'lgtm'],
    proposalMedium: 'doc',
    reportMedium: ['message', 'doc', 'base_record']
  },
  {
    id: 'slack',
    label: 'Slack',
    mcpServer: 'https://mcp.slack.com/mcp',
    structured: false,
    approvalSignals: ['✅', 'approved', 'lgtm', 'looks good'],
    proposalMedium: 'canvas',
    reportMedium: ['message']
  },
  {
    id: 'jira',
    label: 'Jira',
    mcpServer: 'https://mcp.atlassian.com/v1/sse',
    structured: true,
    approvalSignals: ['status:Approved', 'status:In Progress'],
    proposalMedium: 'issue',
    reportMedium: ['issue_update', 'attachment']
  }
]
```

**Platform comparison:**

| Connector | Structured | Proposal Format | Report Formats | MCP Transport |
|-----------|:---:|---|---|---|
| Lark / Feishu | ✗ | Doc | Message, Doc, Base Record | npx (local) |
| Slack | ✗ | Canvas | Message | HTTPS (cloud) |
| Jira | ✓ | Issue | Issue Update, Attachment | SSE (cloud) |

Connectors marked `structured: true` (Jira) bypass the classification agent stage
in the Architect Loop — issue type, priority, and status are read directly from
the platform. Connectors marked `structured: false` (Lark, Slack) require the
full classification pipeline: parse free-text → classify → propose → poll for
approval signals.

---

## 4. Future Architecture: Control Sessions (Phase 10+)

### 4.1 Current Limitation

ACC today supports a single wave orchestration per project. The Orchestrator
Mode manages one `feature_plan` at a time:

```
ACC TODAY (serial orchestration with parallel agents):
  Feature A: Wave 1 (A1∥A2) → Wave 2 (B1∥B2) → Wave 3 (C1) → done
  Feature B:                                                   → Wave 1 → done
  (sequential — Feature B waits for Feature A to complete)
```

### 4.2 Control Session Abstraction

A **Control Session** is any agent panel promoted from raw PTY to
mini-orchestrator, enabling multiple parallel orchestration threads per project:

```
ACC FUTURE (multi-threaded control sessions):
  Thread 1: [Chat Session → controls Wave A-1 → Wave A-2 → done]
  Thread 2: [Chat Session → controls Wave B-1 → Wave B-2 → done]
  (parallel — both features develop simultaneously)
```

Each Control Session has independent:
- Dependency graph and wave plan
- Handoff queue and correction loop
- Docs scope (`docs/THREAD_ID/YYYY-MM-DD-slug/`)
- Token budget allocation
- Per-thread file watchers scoped to its docs folder

### 4.3 Required Architectural Changes

1. **`feature_plans` concurrency support** — allow multiple plans in `executing`
   state per project, each tagged with a thread ID.

2. **Per-thread docs scope** — `docs/THREAD_ID/YYYY-MM-DD-slug/` isolation so
   parallel threads do not overwrite each other's handoff and correction
   documents.

3. **Cross-thread file ownership registry** — if Thread A claims `src/auth.ts`,
   Thread B is warned on promotion or at file-touch time. Prevents merge
   conflicts before they happen.

4. **Control Session promotion UI** — right-click any agent panel → "Promote to
   Control Session" → panel header shows a 🎯 badge → embedded mini wave grid
   renders inside the promoted panel.

```
┌── Control Session: auth-refactor ── [🎯] ─────────────────────────┐
│                                                                     │
│  ┌─ Wave Grid ───────────────────────────────────────────────────┐ │
│  │  Wave 1    A1 ● (llama-4-mv)    A2 ● (qwen3-coder)           │ │
│  │  Wave 2    B1 ◌ (waiting: A1)                                 │ │
│  │  Wave 3    C1 ◌ (waiting: B1)                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌─ PTY Terminal ────────────────────────────────────────────────┐ │
│  │  [agent output stream...]                                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

5. **Global budget view across threads** — aggregate token usage across all
   active Control Sessions in the project, with per-thread breakdowns and
   cross-thread reallocation when a thread finishes under budget.

6. **Per-thread file watchers** — each Control Session's Handoff Monitor and
   Stall Timer are scoped to `docs/<THREAD_ID>/` and the files claimed in the
   ownership registry.

### 4.4 Build Placement

This is a **Phase 10+** candidate. Every Control Session reuses the existing
Wave Orchestrator, Handoff Monitor, Correction Loop, and Token Budget System —
just scoped to a thread rather than global. Dependencies that must be complete
first:

| Dependency | Phase | Why |
|---|---|---|
| Wave Orchestrator | 5 | Core execution engine reused per thread |
| ACB Signal Parser + Router | 5+ | Cross-thread message routing |
| Knowledge Compounder | 9 | Per-thread knowledge scoping |
| Token Budget System | 9++ | Per-thread budget allocation + global view |
| File System Watcher | 1 (Foundation) | Per-thread watch scoping |

Estimated effort: **6+ weeks** for full multi-thread orchestration with conflict
detection.

---

## 5. References

- ACC-Complete-Project-Documentation-v2.7.md — Sections 7, 12, 13
- ACC-Gap-Assessment.md — Sections 3.4 (Control Sessions), 5 (SkillBridge)
- SkillBridge-Product-Description.md — v1.0 integration specification
