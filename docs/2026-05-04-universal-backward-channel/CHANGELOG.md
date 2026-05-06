# CHANGELOG: Universal Chat → Local LLM Backward Channel

**Version:** v1.0.0 — 2026-05-04

---

## [v1.0.0] — Initial Implementation

### Added

| File | Lines | Description |
|------|-------|-------------|
| `webhook-server/main.py` | 66 | FastAPI app with `POST /webhook/{platform}/{routing_key}` route |
| `webhook-server/models.py` | 41 | `StandardContextPayload` (14 fields), `HistoryEntry` (4 fields) |
| `webhook-server/settings.py` | 26 | Pydantic settings with all platform credentials |
| `webhook-server/adapters/__init__.py` | 65 | `ChatPlatformAdapter` ABC (7 methods), adapter registry |
| `webhook-server/adapters/lark.py` | 216 | Lark adapter — AES-CBC decrypt, SHA-256 verify, OAuth, API |
| `webhook-server/adapters/slack.py` | 173 | Slack adapter — HMAC-SHA256, events API, conversations API |
| `webhook-server/adapters/discord.py` | ~60 | Discord adapter — Ed25519 verify, HTTP interactions |
| `webhook-server/adapters/telegram.py` | ~60 | Telegram adapter — bot token auth, polling support |
| `webhook-server/crypto/lark_aes.py` | 15 | AES-CBC decryption with SHA-256 key derivation |
| `webhook-server/message_queue/__init__.py` | 31 | `QueueAdapter` ABC (3 methods), provider dispatch |
| `webhook-server/message_queue/upstash_redis.py` | 48 | Upstash Redis adapter — REST API RPUSH/BLPOP/PING |
| `webhook-server/message_queue/postgres_queue.py` | 50 | Postgres adapter — INSERT+NOTIFY, SKIP LOCKED polling |
| `webhook-server/requirements.txt` | 6 | Dependencies |
| `webhook-server/Dockerfile` | 6 | Container for Fly.io/Railway deployment |
| `webhook-server/tests/*` | 4 files | 146 tests (11 server + 28 lark + 32 slack + 27 discord + 38 telegram + 21 queue) |
| `local-daemon/main.py` | 406 | Async poll loop, two-stage handler, build_prompt, reply dispatch |
| `local-daemon/registry.py` | 51 | YAML registry loader, routing_key → project lookup |
| `local-daemon/router.py` | 97 | Two-stage routing: build prompt, parse response, route() |
| `local-daemon/adapters/__init__.py` | 23 | `CodingToolAdapter` ABC + `ToolResult` dataclass |
| `local-daemon/adapters/coding_tool.py` | 73 | Claude, OpenCode, Generic CLI adapters + ADAPTER_MAP |
| `local-daemon/requirements.txt` | 5 | Dependencies |
| `local-daemon/com.edge8.backward-daemon.plist` | 30 | macOS launchd service definition |
| `local-daemon/.env.example` | 34 | Environment template |
| `local-daemon/tests/*` | 4 files | 48 tests (registry, router, adapters, main) |
| `agent-workspaces/agent_registry.yaml` | ~40 | Multi-platform registry (Lark, Slack, Discord) |
| `agent-workspaces/_router/SYSTEM.md` | ~20 | Router classification prompt |
| `agent-workspaces/assistant/SYSTEM.md` | ~40 | Platform-aware assistant persona |
| `agent-workspaces/assistant/tools.json` | ~15 | send_message + search tool manifest |
| `agent-workspaces/code-reviewer/SYSTEM.md` | ~40 | Code review specialist persona |
| `agent-workspaces/code-reviewer/tools.json` | ~20 | PR review + code search tool manifest |
| `agent-workspaces/context/*` | 4 files | Context templates (team.md, style-guide.md) |
| `src/lib/types.ts` | +35 | `ChatPlatformConfig`, `DaemonStatus`, `QueueInfo` interfaces |
| `src/stores/backwardChannelStore.ts` | 165 | Zustand store — 10 actions for platform configs + daemon |
| `src/pages/Integrations.tsx` | +442 | Chat tab with daemon status, queue health, platform config UI |
| `src-tauri/migrations/004_backward_channel.sql` | 24 | `chat_platform_configs` table + 3 indexes |
| `src-tauri/src/backward_channel.rs` | 124 | Rust structs, DB init, 4 CRUD functions |
| `src-tauri/src/commands.rs` | +150 | 10 Tauri commands for backward channel management |
| `src-tauri/src/db.rs` | +8 | Migration runner call for 004_backward_channel |
| `smoke-test.sh` | 61 | 7-step end-to-end validation script |
| `DEEP_DEPLOYMENT.md` | 138 | Full deployment guide |

### Modified

| File | Change |
|------|--------|
| `src/lib/types.ts` | Appended 3 interfaces (+35 lines) |
| `src-tauri/src/commands.rs` | Added 10 commands (+150 lines) |
| `src-tauri/src/lib.rs` | Added `mod backward_channel` + 10 command registrations (+11 lines) |
| `src-tauri/src/db.rs` | Added `init_backward_channel_tables` call (+8 lines) |
| `src/pages/Integrations.tsx` | Added Chat tab + ChatTab component (+442 lines) |
| `src-tauri/Cargo.toml` | Added `libc` dependency |

### Fixed
- `test_queue_adapters.py` import path collision — changed from `webhook_server.message_queue` to `message_queue` imports to resolve module identity mismatch (5 tests)
