# TECHNICAL_PLAN: Universal Chat → Local LLM Backward Channel

**Date:** 2026-05-04
**Architecture:** v1.0

---

## Motivation

ACC had no bidirectional chat capability. The Lark backward channel document proved the architecture was sound but was Lark-only and unimplemented. This project generalizes that architecture to **any chat platform** via a `ChatPlatformAdapter` pattern, implements it as a complete system (webhook server, message queue, local daemon, ACC integration), and ships with 4 platform adapters (Lark, Slack, Discord, Telegram).

## Architecture Comparison

### v0 (Before)
```
No chat → agent communication
GitHub Issues → 7-stage connector loop (one-way, task-based, not real-time chat)
ConnectorConfig (Lark/Slack/Jira) → MCP-only tool use, deferred, no bidirectional channel
```

### v1 (After)
```
Chat Platform (Lark/Slack/Discord/Telegram) 
  → Webhook POST → Webhook Server (FastAPI) 
  → verify + normalize → Queue (Upstash Redis / Postgres) 
  → Local Daemon (poll → registry lookup → two-stage routing → coding tool) 
  → reply via platform API → Chat Platform
ACC Desktop App → manage daemon, config, queue health
```

## Component Specs

### 1. ChatPlatformAdapter ABC (`webhook-server/adapters/__init__.py`)

```python
class ChatPlatformAdapter(ABC):
    @abstractmethod
    def verify_webhook(self, headers: dict, body: bytes) -> bool: ...
    @abstractmethod
    def parse_event(self, raw_body: dict) -> Optional[StandardContextPayload]: ...
    @abstractmethod
    def handle_verification_challenge(self, body: bytes) -> Optional[dict]: ...
    @abstractmethod
    async def fetch_history(self, chat_id: str, limit: int = 20) -> list[HistoryEntry]: ...
    @abstractmethod
    async def send_message(self, chat_id: str, text: str, **kwargs) -> str: ...
    @abstractmethod
    def build_routing_key(self, config: dict) -> str: ...
    @abstractmethod
    def normalize_mentions(self, text: str) -> str: ...
```

### 2. QueueAdapter ABC (`webhook-server/message_queue/__init__.py`)

```python
class QueueAdapter(ABC):
    @abstractmethod
    async def push(self, key: str, payload: str) -> None: ...
    @abstractmethod
    async def pop(self, key: str, timeout: int = 0) -> Optional[str]: ...
    @abstractmethod
    async def health(self) -> bool: ...
```

### 3. StandardContextPayload (`webhook-server/models.py`)

Fields: `platform`, `routing_key`, `path`, `chat_id`, `chat_type`, `channel_name`, `message_id`, `sender_id`, `sender_name`, `sender_username`, `text`, `mentions`, `history`, `ts`, `raw_event`

### 4. CodingToolAdapter ABC (`local-daemon/adapters/__init__.py`)

```python
class CodingToolAdapter(ABC):
    @abstractmethod
    async def run(self, prompt: str, cwd: str, timeout: int = 120,
                  system_prompt_path: Optional[str] = None,
                  tool_manifest_path: Optional[str] = None) -> ToolResult: ...

@dataclass
class ToolResult:
    returncode: int
    stdout: str
    stderr: str
```

### 5. Daemon Core Loop (`local-daemon/main.py`)

```python
async def main():
    registry = load_registry(config_path)
    queue = init_queue_adapter()
    while True:
        for routing_key, project in registry.items():
            payload = await queue.pop(routing_key, timeout=1)
            if payload:
                asyncio.create_task(handle(payload, project))

async def handle(payload: StandardContextPayload, project: dict):
    agent_id = await route(payload, project)         # Stage 1: lightweight router LLM
    if not agent_id: return
    result = await run_coding_tool(                  # Stage 2: full coding tool
        prompt=build_prompt(payload),
        cwd=f"{project['root']}/{agent_id}",
        adapter=project.get("agent_adapter", "claude"),
        timeout=120,
    )
    await reply(payload, result, project["reply_mode"])
```

### 6. DB Schema (`src-tauri/migrations/004_backward_channel.sql`)

```sql
CREATE TABLE IF NOT EXISTS chat_platform_configs (
    id              TEXT PRIMARY KEY NOT NULL,
    project_id      TEXT NOT NULL,
    platform        TEXT NOT NULL,
    routing_key     TEXT NOT NULL,
    enabled         INTEGER NOT NULL DEFAULT 1,
    webhook_url     TEXT NOT NULL DEFAULT '',
    credentials     TEXT NOT NULL DEFAULT '{}',      -- JSON
    queue_provider  TEXT NOT NULL DEFAULT 'upstash',
    queue_config    TEXT NOT NULL DEFAULT '{}',      -- JSON
    reply_mode      TEXT NOT NULL DEFAULT 'post_process',
    status          TEXT NOT NULL DEFAULT 'disconnected',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Indexes: `project_id`, `project_id + enabled`, `platform + routing_key` (unique).

### 7. Platform Auth Methods

| Platform | Auth | Verification |
|----------|------|-------------|
| Lark | AES-CBC decrypt + SHA-256 signature | `lark_aes_decrypt()` |
| Slack | HMAC-SHA256 signing secret | `hmac.compare_digest()` |
| Discord | Ed25519 public key | `Ed25519PublicKey.verify()` |
| Telegram | Bot token in URL path | Path-only (no body sig) |

## File Inventory

### New Production Files (Rust)

| File | Lines |
|------|-------|
| `src-tauri/migrations/004_backward_channel.sql` | 24 |
| `src-tauri/src/backward_channel.rs` | 124 |

### Modified Production Files (Rust)

| File | Added | Change |
|------|-------|--------|
| `src-tauri/src/commands.rs` | +150 | 10 backward channel commands |
| `src-tauri/src/lib.rs` | +11 | mod + 10 command registrations |
| `src-tauri/src/db.rs` | +8 | Migration runner call |
| `src-tauri/Cargo.toml` | +1 | `libc` dependency |

### New Production Files (TypeScript)

| File | Lines |
|------|-------|
| `src/stores/backwardChannelStore.ts` | 165 |

### Modified Production Files (TypeScript)

| File | Added | Change |
|------|-------|--------|
| `src/lib/types.ts` | +35 | 3 new interfaces |
| `src/pages/Integrations.tsx` | +442 | Chat tab + ChatTab component |

### New Standalone Components

| Directory | Files | Languages | Lines |
|-----------|-------|-----------|-------|
| `webhook-server/` | 12 | Python | ~1200 |
| `local-daemon/` | 8 | Python | ~750 |
| `agent-workspaces/` | 10 | YAML, Markdown, JSON | ~230 |

## Feature Flag

```typescript
// In Integrations.tsx, gate the Chat tab:
{process.env.ACC_BACKWARD_CHANNEL_ENABLED === "true" && (
  <button onClick={() => setActiveTab("chat")}>Chat</button>
)}
```

```rust
// In db.rs, migration is always run (schema change, not behavior change):
backward_channel::init_backward_channel_tables(&conn)?;
```

## Performance Profile

| Operation | Estimated Time |
|-----------|---------------|
| Webhook → HTTP 200 | <50ms (crypto verify + parse) |
| Queue push (Upstash) | <10ms |
| Queue poll latency | ~1s (BLPOP interval) |
| Router LLM call | ~500ms (small model) |
| Target agent call | 5-120s (varies by task) |
| Reply send | <200ms (API call) |
| Total end-to-end | <2s (simple) to 2min (complex) |

## Rollback Instructions

1. Set `ACC_BACKWARD_CHANNEL_ENABLED=false` to hide Chat tab in ACC UI
2. Daemon: `launchctl stop com.edge8.backward-daemon && launchctl unload ~/Library/LaunchAgents/com.edge8.backward-daemon.plist`
3. Webhook server: `flyctl destroy` or stop Railway service
4. DB: migration is additive, no rollback needed
5. Frontend types: no runtime impact when feature flag is off
6. Rust backend: commands exist but unused when feature flag is off

## Compatibility Notes

- **Rust:** Requires `libc` crate (new dependency). Compatible with all platforms via `#[cfg(unix)]`/`#[cfg(not(unix))]` guards.
- **TypeScript:** No breaking changes to existing interfaces. New interfaces appended only.
- **Python:** `cryptography` library required for Discord Ed25519. `asyncpg` optional (only for Postgres queue).
- **Webhook server:** Python 3.11+ required. Compatible with all deployment targets (Fly.io, Railway, Vercel, bare metal).
