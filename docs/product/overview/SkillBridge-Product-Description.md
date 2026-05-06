# SkillBridge: Product Description

## Elevator Pitch

**SkillBridge is a local-first desktop gateway that bridges your private AI memory systems to cloud AI interfaces.** It enables secure, encrypted access to local `claude-mem` memory from Claude.ai web — without exposing your machine to the internet beyond a minimal Deno relay you control.

Think of it as a **secure tunnel for AI memory**: your long-term project context lives on your machine, but becomes accessible to cloud-based AI assistants through an encrypted, machine-scoped relay connection.

---

## Current State: What SkillBridge Is Today

SkillBridge is a **production-ready Tauri v2 desktop application** with a focused, single-purpose architecture:

### Core Capabilities (v1.0)

| Feature | Status | Description |
|---------|--------|-------------|
| **claude-mem Bridge** | ✅ Stable | Local MCP worker exposing claude-mem to web via relay |
| **context-mode Sandbox** | ✅ Stable | Secure file indexing and sandbox execution |
| **Deno Relay Connection** | ✅ Stable | SSE-to-WebSocket relay for cloud connectivity |
| **Universal R/W Capture** | ✅ Stable | Bidirectional sync between web interface and local memory |
| **Settings & Configuration** | ✅ Stable | Custom relay URL, sandbox toggle, connection management |
| **Encrypted Tunnel** | ✅ Stable | Machine-scoped tokens, no data inspection at relay |

### Architecture Overview

```
┌─────────────────┐     SSE/HTTPS      ┌──────────────────┐     WSS       ┌─────────────────┐
│   claude.ai     │ ◄────────────────► │   Deno Relay     │ ◄──────────► │  SkillBridge    │
│   (web client)  │                    │   (cloud/edge)   │              │  (Tauri Desktop)│
└─────────────────┘                    └──────────────────┘              └────────┬────────┘
                                                                                  │
                                                          ┌───────────────────────┼───────────────────────┐
                                                          │                       │                       │
                                                          ▼                       ▼                       ▼
                                                  ┌───────────────┐      ┌────────────────┐      ┌────────────────┐
                                                  │ claude-mem    │      │ context-mode   │      │    SQLite      │
                                                  │   worker      │      │   sandbox      │      │   (state)      │
                                                  │ (memory I/O)  │      │ (file access)  │      │                │
                                                  └───────────────┘      └────────────────┘      └────────────────┘
```

### How It Works

1. **Launch**: User opens SkillBridge, optionally enables Sandbox Mode
2. **Bridge Start**: Tauri spawns local workers (claude-mem + context-mode)
3. **Relay Handshake**: Establishes encrypted WebSocket to Deno relay using machine-scoped tokens
4. **MCP Exposure**: Workers expose MCP endpoints via the relay
5. **Web Connection**: User copies MCP URL, pastes into Claude.ai Settings → Integrations
6. **Bidirectional Flow**: 
   - Claude.ai queries memory via relay → SkillBridge → claude-mem
   - Memory writes from web sync back to local `~/.claude-mem/`
   - Sandbox mode enables file indexing for project context

---

## Where SkillBridge Fits in the Product Ecosystem

### Architectural Position

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    AI INTERFACE LAYER                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │ Claude.ai   │  │ Claude Code │  │  OpenCode   │  │   Cursor    │  │ Other Clients  │  │
│  │   (web)     │  │  (terminal) │  │  (terminal) │  │  (desktop)  │  │                │  │
│  └──────┬──────┘  └─────────────┘  └─────────────┘  └─────────────┘  └────────────────┘  │
│         │                                                                                  │
│         │ Uses SkillBridge MCP                                                            │
│         ▼                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              SKILLBRIDGE (Gateway)                                  │  │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                 │  │
│  │  │  Deno Relay     │◄──►│  Tauri Bridge   │◄──►│  Local Workers  │                 │  │
│  │  │  (cloud edge)   │    │  (desktop app)  │    │  (memory + fs)  │                 │  │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘                 │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
│                                          │                                               │
│         ┌────────────────────────────────┼────────────────────────────────┐               │
│         │                                │                                │               │
│         ▼                                ▼                                ▼               │
│  ┌─────────────┐                ┌─────────────┐                ┌─────────────────────┐  │
│  │ claude-mem  │                │ context-mode│                │  Future: Other      │  │
│  │ (persistent │                │  (sandboxed  │                │   memory systems    │  │
│  │   memory)   │                │  file I/O)  │                │                     │  │
│  └─────────────┘                └─────────────┘                └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Integration Points

| Layer | Component | SkillBridge Role |
|-------|-----------|------------------|
| **Client** | Claude.ai web | Primary consumer of SkillBridge MCP |
| **Transport** | Deno Relay | Encrypted pass-through; no data inspection |
| **Gateway** | Tauri App | Orchestrates local workers, manages state |
| **Workers** | claude-mem, context-mode | Domain-specific MCP servers |
| **Storage** | Local filesystem | `~/.claude-mem/`, project directories |

### Value Proposition Matrix

| For | Problem | SkillBridge Solution |
|-----|---------|----------------------|
| **AI Consultants** | Web AI can't access local project memory | Seamless web↔local memory bridge |
| **Privacy-First Teams** | Cloud-only AI lacks context without data exposure | Local storage + encrypted relay only |
| **Multi-Project Devs** | Memory scattered across sessions/projects | Persistent, queryable memory bank |
| **Claude Code Users** | Want web interface benefits with local memory power | Unified memory across web + CLI |

---

## Technical Specifications

### Stack

| Component | Technology |
|-----------|------------|
| Desktop Framework | Tauri v2 (Rust + WebView) |
| Frontend | React 18 + TypeScript + Tailwind CSS |
| State Management | Zustand |
| Local Workers | Node.js (sidecar binaries) |
| Relay | Deno Deploy (edge) |
| Protocol | MCP (Model Context Protocol) over SSE + WebSocket |
| Security | AES-256 (Stronghold), machine-scoped tokens |

### Data Flow

```
User Request (Claude.ai)
    │
    ▼
POST /mcp/<machine_id>/message (SSE)
    │
    ▼
Deno Relay (verifies machine_id + secret_token)
    │
    ▼
WebSocket → SkillBridge (Tauri)
    │
    ▼
Routing Layer → claude-mem worker OR context-mode worker
    │
    ▼
Local Execution → File/memory I/O
    │
    ▼
Response Chain (reverse)
```

### Security Model

- **Zero Data at Relay**: Deno relay acts as signaling only; cannot decrypt payloads
- **Machine-Scoped Tokens**: Each installation generates unique `machine_id` + `secret_token`
- **Local-First**: All memory content stays on-device in `~/.claude-mem/`
- **No Accounts**: No SkillBridge account required; no telemetry

---

## Roadmap: From SkillBridge to ACC

SkillBridge is the **foundation layer** of a larger vision (documented as ACC - Agent Control Center). The current app validates:

1. ✅ **Tauri + MCP Worker Architecture** — spawning and managing local Node workers from Rust
2. ✅ **Deno Relay Pattern** — secure cloud-to-local connectivity without tunnel configuration
3. ✅ **Memory Persistence** — structured storage and retrieval across sessions
4. ✅ **Desktop-First Experience** — local-first, offline-capable, no cloud dependency

### Evolution Path

```
PHASE 1: SkillBridge (COMPLETE)
├── claude-mem bridge to web
├── context-mode sandbox
└── Deno relay connectivity

PHASE 2: Multi-Agent Gateway (PLANNED)
├── Claude Code, OpenCode, Aider, Goose integration
├── Unified asset management (skills, MCPs, memory)
└── Agent runner with parallel PTY sessions

PHASE 3: Orchestration (PLANNED)
├── Wave-based multi-agent execution
├── Outcome tracking and failure analysis
└── Team playbook sharing

PHASE 4: Intelligence Layer (PLANNED)
├── Task routing based on historical outcomes
├── Knowledge compounder (pattern extraction)
└── Upstream connectors (Lark/Slack/Jira)
```

### Strategic Positioning

For architects evaluating the product ecosystem:

| Question | Answer |
|----------|--------|
| **What is it?** | A local MCP gateway that exposes private memory systems to cloud AI clients |
| **Who uses it?** | AI-forward developers and consultants who use Claude.ai but need local project context |
| **Why not cloud-only?** | Privacy, persistence, and access to local files without upload |
| **Why not CLI-only?** | Web interface offers different strengths (collaboration, accessibility) |
| **What's next?** | Expansion into a multi-agent orchestration platform (ACC) |

---

## Usage Patterns

### Primary Workflow

```bash
# 1. Install prerequisites
npm install -g @thedotmack/claude-mem

# 2. Launch SkillBridge
open SkillBridge.app  # or equivalent on platform

# 3. Enable Sandbox Mode (optional, for file access)
[Toggle in UI] → "Sandbox Mode: ON"

# 4. Start Bridge
[Click] → "Start Bridge"

# 5. Copy MCP URL
https://skillbridge.automation-edge8.deno.net/mcp/<machine_id>/sse

# 6. Paste into Claude.ai
Settings → Integrations → Add MCP Server → Paste URL

# 7. Use
"Search my memory for the authentication pattern we used in Project X"
"Index the current folder and tell me about the codebase structure"
```

### Team Deployment

```
Team Lead:
├── Exports `.acc` playbook with custom relay URL
├── Distributes to team members
└── Team members import → same relay, shared conventions

Individual Developer:
├── Imports playbook
├── Secrets scaffolded (prompted for API keys)
└── Immediately productive with team memory standards
```

---

## Competitive Landscape

| Solution | Approach | SkillBridge Differentiation |
|----------|----------|----------------------------|
| Cloudflare Tunnel | Network-level tunnel | SkillBridge is application-level; no network config |
| ngrok | Public URL for localhost | SkillBridge is purpose-built for MCP; encrypted by default |
| LocalAI | Self-hosted LLM | SkillBridge bridges TO cloud LLMs, not replacing them |
| Continue.dev | IDE extension | SkillBridge is desktop app; works with Claude.ai web |

---

## Conclusion

**SkillBridge occupies a unique position**: it is the only solution that gives Claude.ai web access to local, private, persistent memory without requiring network tunnel configuration or cloud accounts. It proves the architecture for a larger agent orchestration platform while solving an immediate, practical need for AI consultants who want the best of both worlds: cloud AI power with local data ownership.

The current implementation validates core technical risks (Tauri-MCP integration, Deno relay security, local worker orchestration) while delivering tangible value. It serves as both a standalone product and the foundation for the ACC vision of unified agent control.

---

*Document Version: 1.1*  
*Last Updated: May 2026*  
*Product: SkillBridge v1.0*  
*Vision: ACC (Agent Control Center) v2.0*
