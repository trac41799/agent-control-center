# ACC Technical Stack

**Source:** ACC-Complete-Project-Documentation-v2.7.md §9 + ACC-Gap-Assessment (2026-05-02)
**Status:** Pre-build specification — all selections are intentional and validated

---

## Core Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| **App Shell** | Tauri | v2 | Native binary ~10MB, Rust backend, no Node.js shipped |
| **UI Framework** | React | 19 | Component ecosystem, familiar, identical to web dev |
| **Build Tool** | Vite | 6 | Instant HMR, minimal config, fastest dev loop |
| **Styling** | Tailwind CSS | v4 | Utility-first, zero CSS maintenance |
| **Components** | shadcn/ui | latest | Copy-paste, no dependency lock-in, fully customizable |
| **State (UI)** | Zustand | 5 | Minimal boilerplate, async-friendly |
| **Terminal** | xterm.js + fit addon | 5.x | Industry standard PTY renderer |
| **Code Editor** | Monaco Editor (React) | latest | VS Code editor embedded for skills/memory editing |
| **Database** | SQLite via Tauri sql plugin | — | Local, zero setup, fast, offline-first |
| **Routing** | React Router | v7 | Client-side nav for sidebar sections |

---

## Tauri Plugins

| Plugin | Purpose |
|---|---|
| `@tauri-apps/plugin-shell` | Spawn and write to PTY processes |
| `@tauri-apps/plugin-sql` | SQLite access from Rust commands |
| `@tauri-apps/plugin-fs` | File read/write/watch for config files |
| `@tauri-apps/plugin-stronghold` | AES-256 encrypted secrets vault |
| `@tauri-apps/plugin-store` | App settings persistence |
| `@tauri-apps/plugin-dialog` | File/folder picker |
| `@tauri-apps/plugin-notification` | System notifications (stall alerts, approvals) |
| `@tauri-apps/plugin-http` | HTTP client for MCP server connections (SSE/HTTP transport MCPs) |

---

## Key npm Packages

| Package | Purpose |
|---|---|
| `simple-git` | Git operations: worktrees, branch check, status, commit, push |
| `@octokit/rest` | GitHub API: PR creation, CI status polling |
| `diff2html` | Unified diff → HTML visual diff rendering |
| `@monaco-editor/react` | Monaco editor React wrapper |
| `date-fns` | Date formatting in session replay |
| `zustand` | UI state management |
| `react-router-dom` | Sidebar navigation |

---

## ACC Intelligence Layer

ACC requires AI inference for its own operations: Failure Analyzer, Feature Doc Generator, Knowledge Compounder, Task Router v2, and Architect Agent classification. These are ACC's own intelligence features — distinct from the agent coding sessions ACC manages.

ACC supports three modes, user-selectable in Settings.

### Mode 1 — OpenRouter (Default)

ACC calls OpenRouter directly using its own HTTP client (`@tauri-apps/plugin-http`). This is the default and recommended mode.

| Aspect | Detail |
|---|---|
| **Default model** | Free, stable OpenRouter model (configured at build time), user-overridable via Model Registry |
| **Key management** | Ships with default OpenRouter key (capped monthly token limit). User's own key stored in Stronghold vault (`acc-intelligence` scope). User key has no cap |
| **Why OpenRouter** | Multi-model access under single API key, avoids single-provider lock-in, free tier available |
| **Characteristics** | No plan sharing with coding sessions. Dedicated HTTP call (no PTY overhead). Works offline from agent ecosystem |

### Mode 2 — Agent-Mediated (User's Subscription)

ACC spawns short-lived, non-interactive agent sessions for intelligence tasks. Uses the user's existing Claude Code or OpenCode subscription credentials.

```
Claude Code:  claude --print "<intelligence prompt>"
OpenCode:     opencode run --model {model} "{intelligence prompt}"
```

| Aspect | Detail |
|---|---|
| **Session logging** | Type `intelligence` in sessions table, excluded from Outcome Tracker stats |
| **Model selection** | Same Model Registry; user can assign a specific model for intelligence tasks |
| **Characteristics** | Uses existing credentials — no additional API key. Shares plan limits with coding sessions. Higher latency than Mode 1 (PTY spawn). Ephemeral per-task sessions |
| **Warning** | *"Agent-mediated intelligence uses your subscription for ACC's own analysis tasks. These calls count against your plan usage. Consider Mode 1 (OpenRouter) to keep intelligence usage separate."* |

### Mode 3 — Interactive Session (Visible, Persistent)

A designated Claude Code or OpenCode panel in the Runner acts as a persistent intelligence interface. ACC sends queries via PTY stdin injection with structured sentinel markers.

```
[ACC:INTELLIGENCE id=i001 type=FAILURE_ANALYSIS]
<full analysis prompt>
Please end your response with: [ACC:DONE ref=i001]
[END ACC:INTELLIGENCE]
```

| Aspect | Detail |
|---|---|
| **Designation** | Auto-spawn "Intelligence" panel (🧠 indicator) or right-click existing panel → "Use as Intelligence Session" |
| **Visibility** | User sees every query and response in real time. Can interact directly when ACC is not using it |
| **Context accumulation** | Persistent conversational context across queries. Monitored by Token Guard (Module 18) |
| **Fallback** | If designated panel closes/crashes, ACC falls back to Mode 1 (OpenRouter) with status badge |
| **Warning** | *"Interactive intelligence uses a persistent session visible in the Runner. ACC queries share plan and context limits with manual queries sent to the same panel."* |

### Intelligence Request Queue

Multiple ACC modules trigger Intelligence Layer calls concurrently. A shared Rust async queue serialises all calls with priority ordering:

| Priority | Source | Rationale |
|---|---|---|
| **CRITICAL** | Failure Analyzer | User waiting for diagnosis |
| **HIGH** | Feature Doc Generator | User expecting docs post-wave |
| **NORMAL** | Task Router v2 | User waiting for routing suggestion |
| **LOW** | Architect Agent classification | Background, not time-critical |
| **BACKGROUND** | Knowledge Compounder | Fully async, can wait |

**Rate limit handling (Mode 1):** Exponential backoff from 5s, doubling each retry, max 5 retries. After exhaustion: CRITICAL/HIGH notify user; LOW/BACKGROUND silently requeued.

**Concurrency (Modes 2/3):** Max 1 concurrent non-interactive session (Mode 2). Mode 3 handles 1 query at a time by design.

### Token Cost Visibility

Token usage is tracked per-session/model but cost aggregation across providers is a Phase 10 feature. The `token_usage` table has `tokens_in`/`tokens_out` but no cost field. The Model Registry currently has `model_path` and `strengths` but no cost-per-1k-tokens field.

**Planned:** The Model Registry will gain a `cost_per_1k_tokens` field to enable cost-aware budgeting. Per-provider cost aggregation (e.g., "this month: $12.40 OpenRouter + $20 Claude Pro") arrives in Phase 10+.

> **Source:** ACC-Gap-Assessment §2.5 — gaps #8, #9

---

## External APIs

| Service | Used For | Mode |
|---|---|---|
| OpenRouter | ACC intelligence operations (Failure Analyzer, Feature Docs, Knowledge Compounder, Task Router v2, Architect Agent) | Mode 1 default |
| Agent subscription (Claude Code / OpenCode) | ACC intelligence — ephemeral non-interactive sessions | Mode 2 optional |
| Agent subscription (Claude Code / OpenCode) | ACC intelligence — persistent visible interactive panel | Mode 3 optional |
| OpenRouter | Wave agent model routing (Minimax, Qwen, etc.) | All modes — wave execution only |
| Lark MCP (`@larksuiteoapi/lark-mcp`) | Upstream connector — **DEFERRED** pending custom integration | Future phase |
| Slack MCP (`mcp.slack.com`) | Upstream connector — **DEFERRED** pending custom integration | Future phase |
| Jira MCP (`mcp.atlassian.com`) | Upstream connector — **DEFERRED** pending custom integration | Future phase |

---

## Intentionally Excluded

| Technology | Why Excluded |
|---|---|
| Electron | 150MB+ binary, ships full Node.js + Chromium, complex rebuild for native modules |
| Next.js | SSR/API routes have no function in a Tauri webview; reserved for v2 web layer |
| Redux / MobX | Zustand sufficient; less boilerplate |
| GraphQL | REST sufficient for all v1 API patterns |
| Docker | Local-first principle; no container dependency |
| Express / Fastify | Tauri Rust backend handles all system ops natively |

---

## Shared Stack: SkillBridge Compatibility

SkillBridge (standalone app, v1.0 production-ready) uses the identical core stack, enabling zero-overhead integration via read-only detection — no code sharing required.

| Dimension | SkillBridge | ACC | Compatibility |
|---|---|---|---|
| **App Shell** | Tauri v2 | Tauri v2 | Identical — shared binary architecture |
| **Frontend** | React 18 + TypeScript + Tailwind | React 19 + TypeScript + Tailwind | Minor version gap, same stack |
| **State** | Zustand | Zustand | Identical |
| **Security** | Stronghold (AES-256) | Stronghold (AES-256) + OS keychain fallback | Identical vault system |
| **Database** | SQLite | SQLite (WAL mode) | Compatible — different DB files, no collision |
| **Workers** | Node.js sidecar (claude-mem, context-mode) | PTY shell spawn (claude, opencode, etc.) | Non-overlapping — different spawn mechanisms |
| **Protocol** | MCP over SSE + WebSocket via Deno relay | MCP configured in agent config files (local) | Complementary |
| **Relay** | Deno Deploy edge relay | None (local-first) | No conflict |

**Integration principle:** ACC reads SkillBridge state (process detection, config, MCP endpoint). ACC never writes SkillBridge config. Integration is entirely additive — zero changes to SkillBridge codebase.

**Total integration effort:** ~3.5 weeks spread across existing phases. See ACC-Gap-Assessment §5 for full integration specification.

> **Source:** ACC-Gap-Assessment §5.1 — Compatibility Matrix
