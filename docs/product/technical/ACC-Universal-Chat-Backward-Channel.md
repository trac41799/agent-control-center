# ACC — Universal Chat → Local LLM Backward Channel

**Version:** 1.0 — 2026-05-04
**Source:** lark-to-local-llm-backward-channel.md (2026-05-03) + ACC Technical System Design v2.7
**Owner:** Trac / Edge8 (edge8.ai)

---

## What This Is

A platform-agnostic architecture for connecting **any chat platform** (Lark, Slack, Discord, Teams, Telegram, Matrix, WhatsApp, Linear, GitHub, etc.) to a **local AI coding tool** (Claude Code, OpenCode, Cursor, Copilot, Aider, Goose, Gemini CLI, etc.) and getting replies back into the chat.

The design generalizes the Lark-specific backward channel into a universal `ChatPlatformAdapter` interface. Lark remains first-class — its AES-CBC decryption, signature verification, and API client are one implementation of this interface. Every other platform follows the same pattern with ~50–80 lines of platform-specific code.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          ANY CHAT PLATFORM                                          │
│                                                                                    │
│  Lark     Slack    Discord    Teams    Telegram    WhatsApp    Matrix    Linear     │
│    │        │         │         │          │           │         │         │       │
│    │        │    Each platform sends a webhook POST to the same lightweight         │
│    │        │    server — auth differs, payload shape differs, flow is identical    │
│    └────────┴─────────┴─────────┴──────────┴───────────┴─────────┴─────────┘       │
│                                          │                                          │
└──────────────────────────────────────────┼──────────────────────────────────────────┘
                                           │ POST /webhook/{platform}/{routing_key}
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                     LIGHTWEIGHT WEBHOOK SERVER (standalone, stateless)              │
│                                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                         Platform Dispatcher                                   │  │
│  │                                                                              │  │
│  │  POST /webhook/lark/{app_id}    → LarkPlatformAdapter.verify()               │  │
│  │  POST /webhook/slack/{team_id}  → SlackPlatformAdapter.verify()              │  │
│  │  POST /webhook/discord/{guild}  → DiscordPlatformAdapter.verify()            │  │
│  │  POST /webhook/telegram/{bot}   → TelegramPlatformAdapter.verify()           │  │
│  │  ...                                                                          │  │
│  │                                                                              │  │
│  │  Each adapter's pipeline:                                                     │  │
│  │    1. Verify webhook authenticity (platform-specific crypto)                  │  │
│  │    2. Parse event → extract chat_id, sender, text, mentions                   │  │
│  │    3. Fetch conversation history (platform-specific API)                      │  │
│  │    4. Normalize → Standard Context Payload                                    │  │
│  │    5. Push to queue                                                           │  │
│  │    6. Return HTTP 200 (within platform's timeout window)                      │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                    │
│  Deployment: Vercel, Railway, Fly.io, DigitalOcean App, your own server             │
└──────────────────────────────┬─────────────────────────────────────────────────────┘
                               │ push
                               ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           MESSAGE QUEUE (pluggable)                                 │
│                                                                                    │
│  Queue key pattern: {platform}:events:{routing_key}                                │
│  Payload: Standard Context Payload (JSON)                                          │
│                                                                                    │
│  Providers:                                                                         │
│  ├─ Upstash Redis (default — REST API, zero persistent connection)                 │
│  ├─ Self-hosted Redis                                                                 │
│  ├─ RabbitMQ / NATS                                                                   │
│  ├─ Postgres (LISTEN/NOTIFY + SKIP LOCKED polling, or PGMQ extension)                │
│  └─ File-based / SQLite (single-machine, no cloud needed)                             │
└──────────────────────────────┬─────────────────────────────────────────────────────┘
                               │ BLPOP / poll / subscribe
                               ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        LOCAL DAEMON (on developer's machine)                        │
│                                                                                    │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────────────────────┐ │
│  │ Poll Loop     │───▶ Registry Lookup   │───▶ ADAPTER: run_coding_tool          │ │
│  │ (async pop)   │    │ routing_key →    │    │ (process/pipe/HTTP)              │ │
│  └──────────────┘    │   workspace path  │    └──────────────┬───────────────────┘ │
│                      │   → agent list    │                   │                     │
│                      └──────────────────┘                   ▼                     │
│                            │                    ┌──────────────────────────┐      │
│                            ▼                    │  STAGE 1: Router Agent   │      │
│                      ┌──────────────────┐       │  (lightweight LLM call)  │      │
│                      │ agent_registry   │       │  → outputs agent_id      │      │
│                      │ .yaml            │       └──────────┬───────────────┘      │
│                      └──────────────────┘                  │                      │
│                                                            ▼                      │
│                                                    ┌──────────────────────────┐   │
│                                                    │  STAGE 2: Target Agent   │   │
│                                                    │  (full LLM with tools)   │   │
│                                                    │  → calls reply tool      │   │
│                                                    └──────────┬───────────────┘   │
│                                                               │                   │
└───────────────────────────────────────────────────────────────┼───────────────────┘
                                                                │
                          ┌─────────────────────────────────────┘
                          │  reply(chat_id, text, platform)
                          ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           REPLY CHANNEL                                             │
│                                                                                    │
│  Platform-agnostic reply interface — the agent calls `send_message(chat_id, text)`  │
│  regardless of platform. The daemon routes to the correct platform adapter.         │
│                                                                                    │
│  Strategies:                                                                        │
│  ├─ MCP tool call — universal, standard (Claude Code, Cline, Continue.dev)         │
│  ├─ Daemon post-processing — simplest, works with any CLI                          │
│  └─ Inline function injection — no tool config needed, LLM outputs JSON             │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## The Universal Contract: Two Adapter Interfaces

The entire system rests on two swappable interfaces. Everything else is portable infrastructure.

### 1. ChatPlatformAdapter (per-platform, ~50–80 lines)

```python
class ChatPlatformAdapter(ABC):
    """One implementation per chat platform. Isolates all platform-specific logic."""

    # ── Webhook Verification (Layer 1: Webhook Server) ──

    @abstractmethod
    def verify_webhook(self, headers: dict, body: bytes) -> bool:
        """Platform-specific signature/encryption verification.
        
        Lark:   AES-CBC decrypt + SHA-256 signature
        Slack:  HMAC-SHA256 signing secret
        Discord: Ed25519 public key verify
        Teams:  HMAC on request body
        Telegram: bot token match in URL path
        WhatsApp: x-hub-signature-256 (HMAC-SHA256)
        """
        ...

    @abstractmethod
    def parse_event(self, raw_body: dict) -> Optional[StandardContextPayload]:
        """Extract StandardContextPayload from raw platform event.
        
        Handles platform-specific event types, URL verification challenges,
        bot mention detection, and DM vs channel routing.
        
        Returns None for events that should not be processed (e.g., bot's own messages,
        non-message events, duplicate retries).
        """
        ...

    # ── Chat Operations (Layer 3: Daemon, Layer 6: Reply) ──

    @abstractmethod
    async def fetch_history(self, chat_id: str, limit: int = 20) -> list[HistoryEntry]:
        """Fetch recent messages via platform API. Called by webhook server."""
        ...

    @abstractmethod
    async def send_message(self, chat_id: str, text: str, **kwargs) -> str:
        """Send a message via platform API. Returns message_id. Called by reply layer."""
        ...

    # ── Identity Resolution (Layer 3: Daemon) ──

    @abstractmethod
    def build_routing_key(self, config: dict) -> str:
        """Build the unique routing key for this platform instance.
        
        Lark:   f"lark:{app_id}"
        Slack:  f"slack:{team_id}:{channel_id}"
        Discord: f"discord:{guild_id}:{channel_id}"
        Telegram: f"telegram:{bot_token_hash}:{chat_id}"
        """
        ...

    @abstractmethod
    def normalize_mentions(self, text: str) -> str:
        """Strip platform-specific mention syntax so agents see clean text.
        
        <@U0123ABC> → @username (Slack)
        @BotName    → BotName    (Lark — already clean)
        """
        ...
```

### 2. CodingToolAdapter (per-LLM-tool, ~30 lines)

Unchanged from the Lark document. See Layer 3 for the full interface.

---

## Layer 0: The Standard Context Payload

This is the **only data contract** between the webhook server (cloud) and the local daemon. Every platform normalizes its events into this format.

```json
{
  "platform": "lark",
  "routing_key": "lark:cli_xxxxxxxxxxxx",
  "path": "/message",
  "chat_id": "oc_xxxxxxxxxxxxxxxxxxxxxxxxxx",
  "chat_type": "group",
  "channel_name": "engineering",
  "message_id": "om_xxxxxxxxxxxxxxxxxxxxxxxxxx",
  "sender_id": "ou_xxxxxxxxxxxxxxxxxxxxxxxxxx",
  "sender_name": "Trac Nguyen",
  "sender_username": "@trac",
  "text": "@bot deploy staging please",
  "mentions": ["bot"],
  "history": [
    {"sender_id": "ou_xxx1", "sender_name": "Alice",  "text": "who can deploy?",          "ts": "2026-05-04T09:00:00Z"},
    {"sender_id": "ou_xxx2", "sender_name": "Bob",    "text": "ask the bot",              "ts": "2026-05-04T09:01:00Z"}
  ],
  "ts": "2026-05-04T09:02:00Z",
  "raw_event": { "..." : "preserved for advanced use cases" }
}
```

| Field | Source | Notes |
|-------|--------|-------|
| `platform` | Webhook route | Which `ChatPlatformAdapter` to use for reply |
| `routing_key` | Adapter-built | Maps to registry entry (daemon uses this) |
| `chat_id` | Platform event | Opaque platform ID for the conversation |
| `chat_type` | Platform event | `group`, `dm`, or `channel` |
| `channel_name` | Platform API | Human-readable, for agent context |
| `sender_name` | Platform API | Resolved from sender_id |
| `sender_username` | Platform API | @handle, for reply addressing |
| `text` | Platform event | Clean text with mentions stripped |
| `mentions` | Parsed from text/event | Bot names that were @mentioned |
| `history` | Platform API | Pre-fetched by webhook server |
| `ts` | Webhook receive time | ISO 8601 |

---

## Layer 1: Lightweight Webhook Server

### Design Principles

1. **Stateless** — no session, no database, no in-memory state between requests
2. **Single binary** — one deployable artifact, one process, one port
3. **Pluggable platform modules** — add a platform by adding one file, no server changes
4. **Must respond fast** — all platforms enforce timeouts (Lark: 3s, Slack: 3s, Discord: 3s, Telegram: no timeout but expects fast ack)
5. **No AI workload** — the server only verifies, normalizes, and enqueues. Zero LLM calls.

### Implementation: Python (FastAPI) — Recommended

FastAPI chosen for: async native, auto OpenAPI docs, background tasks for history fetch + enqueue, battle-tested in production.

```
webhook-server/
├── main.py                    # FastAPI app, route registration
├── adapters/
│   ├── __init__.py             # ChatPlatformAdapter ABC
│   ├── lark.py                 # LarkPlatformAdapter  (~120 lines, crypto-heavy)
│   ├── slack.py                # SlackPlatformAdapter  (~60 lines)
│   ├── discord.py              # DiscordPlatformAdapter (~50 lines)
│   ├── telegram.py             # TelegramPlatformAdapter (~40 lines)
│   ├── teams.py                # TeamsPlatformAdapter   (~80 lines, OAuth)
│   ├── whatsapp.py             # WhatsAppPlatformAdapter (~60 lines)
│   ├── matrix.py               # MatrixPlatformAdapter   (~70 lines)
│   └── linear.py               # LinearPlatformAdapter   (~60 lines, GraphQL)
├── queue/
│   ├── __init__.py             # QueueAdapter ABC
│   ├── upstash_redis.py        # Default: REST-based push
│   ├── redis_local.py          # Local Redis (optional)
│   ├── rabbitmq.py             # RabbitMQ (optional)
│   ├── nats_client.py          # NATS (optional)
│   └── postgres_queue.py       # Postgres LISTEN/NOTIFY (optional)
├── crypto/
│   ├── __init__.py             # Shared crypto utilities
│   ├── lark_aes.py             # Lark AES-CBC decryption
│   └── signature.py            # Generic HMAC/Ed25519 helpers
├── models.py                   # StandardContextPayload, HistoryEntry dataclasses
├── settings.py                 # Pydantic Settings (env vars per platform)
├── requirements.txt            # fastapi, uvicorn, httpx, pycryptodome, pydantic-settings
└── Dockerfile                  # Optional container deployment
```

### Server Route Design

```python
# main.py — the entire server in concept
from fastapi import FastAPI, Request, BackgroundTasks, HTTPException
from adapters import get_adapter

app = FastAPI()

# All platforms share one catch-all route pattern
@app.post("/webhook/{platform}/{routing_key:path}")
async def webhook_handler(
    platform: str,
    routing_key: str,
    request: Request,
    background: BackgroundTasks,
):
    adapter = get_adapter(platform)
    if not adapter:
        raise HTTPException(404, f"Unknown platform: {platform}")
    
    body = await request.body()
    
    # Step 1: Verify authenticity (platform-specific)
    if not adapter.verify_webhook(dict(request.headers), body):
        raise HTTPException(401, "Verification failed")
    
    # Step 2: Handle URL verification challenges (Lark, Slack, Discord)
    challenge = adapter.handle_verification_challenge(body)
    if challenge:
        return challenge
    
    # Step 3: Parse event → StandardContextPayload
    payload = adapter.parse_event(body)
    if payload is None:
        return {"status": "ignored"}  # non-message event or bot's own message
    
    # Step 4: Fetch history + enqueue (background, after response)
    background.add_task(process_event, adapter, payload, routing_key)
    
    # Step 5: Return immediately
    return {"status": "accepted"}


async def process_event(adapter, payload, routing_key):
    """Runs after HTTP response is sent. Fetches history, enriches payload, pushes to queue."""
    try:
        payload.history = await adapter.fetch_history(payload.chat_id, limit=20)
        payload.routing_key = adapter.build_routing_key({"routing_key": routing_key})
        await queue.push(payload.routing_key, payload.to_json())
    except Exception as e:
        logger.error(f"Event processing failed: {e}")
        # Silent failure — the sender will retry if the platform supports it
```

### Platform-Specific Adapter Examples

#### Lark (reference implementation — most complex)

```python
# adapters/lark.py
class LarkPlatformAdapter(ChatPlatformAdapter):
    def verify_webhook(self, headers: dict, body: bytes) -> bool:
        body_json = json.loads(body)
        if "encrypt" not in body_json:
            return False
        # AES-CBC decrypt
        plaintext = lark_aes_decrypt(body_json["encrypt"], self.encrypt_key)
        # SHA-256 signature verification
        timestamp = headers.get("x-lark-request-timestamp", "")
        nonce = headers.get("x-lark-request-nonce", "")
        signature = headers.get("x-lark-signature", "")
        expected = sha256(f"{timestamp}{nonce}{self.encrypt_key}{plaintext}")
        return signature == expected

    def parse_event(self, raw_body: dict) -> Optional[StandardContextPayload]:
        event = json.loads(raw_body)
        # URL verification
        if event.get("type") == "url_verification":
            return {"challenge": event["challenge"]}  # handled upstream
        # Only process message events
        if event.get("event", {}).get("event_type") != "im.message.receive_v1":
            return None
        msg = event["event"]["message"]
        # Skip bot's own messages, skip non-mentioned in groups
        if msg.get("chat_type") == "group" and not self._is_mentioned(msg):
            return None
        return StandardContextPayload(
            platform="lark",
            chat_id=msg["chat_id"],
            chat_type=msg.get("chat_type", "group"),
            message_id=msg["message_id"],
            sender_id=event["event"]["sender"]["sender_id"]["open_id"],
            text=msg.get("text_without_at_bot", msg.get("content", "")),
            mentions=self._extract_mentions(msg),
            ts=datetime.utcnow().isoformat(),
        )

    async def fetch_history(self, chat_id: str, limit: int = 20) -> list[HistoryEntry]:
        token = await self._get_access_token()
        resp = await httpx.get(
            f"{LARK_BASE}/im/v1/messages",
            params={"container_id_type": "chat", "container_id": chat_id, "page_size": limit},
            headers={"Authorization": f"Bearer {token}"},
        )
        return [HistoryEntry(
            sender_id=item["sender"]["id"],
            sender_name=item["sender"].get("name", ""),
            text=item["body"]["content"],
            ts=item["create_time"],
        ) for item in resp.json()["data"]["items"]]

    async def send_message(self, chat_id: str, text: str, **kwargs) -> str:
        token = await self._get_access_token()
        resp = await httpx.post(
            f"{LARK_BASE}/im/v1/messages",
            params={"receive_id_type": "chat_id"},
            headers={"Authorization": f"Bearer {token}"},
            json={"receive_id": chat_id, "msg_type": "text", "content": json.dumps({"text": text})},
        )
        return resp.json()["data"]["message_id"]

    def build_routing_key(self, config: dict) -> str:
        return f"lark:{config['routing_key']}"

    def normalize_mentions(self, text: str) -> str:
        return text  # Lark @mentions are already clean in text_without_at_bot
```

#### Slack (~60 lines)

```python
# adapters/slack.py
class SlackPlatformAdapter(ChatPlatformAdapter):
    def verify_webhook(self, headers: dict, body: bytes) -> bool:
        # Slack signs with HMAC-SHA256: "v0=" + hex(HMAC(signing_secret, version:timestamp:body))
        timestamp = headers.get("x-slack-request-timestamp", "")
        signature = headers.get("x-slack-signature", "")
        if abs(time() - int(timestamp)) > 300:
            return False  # replay protection
        base = f"v0:{timestamp}:{body.decode()}"
        expected = "v0=" + hmac.new(self.signing_secret.encode(), base.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature, expected)

    def parse_event(self, raw_body: dict) -> Optional[StandardContextPayload]:
        event = json.loads(raw_body)
        # URL verification challenge
        if event.get("type") == "url_verification":
            return {"challenge": event["challenge"]}
        # Only process message events from our bot
        inner = event.get("event", {})
        if inner.get("type") != "message" or inner.get("subtype") == "bot_message":
            return None
        # Only DM or @mention in channels
        if inner.get("channel_type") != "im" and not self._bot_mentioned(inner.get("text", "")):
            return None
        return StandardContextPayload(
            platform="slack",
            chat_id=inner["channel"],
            chat_type="dm" if inner.get("channel_type") == "im" else "channel",
            message_id=inner.get("ts", ""),
            sender_id=inner.get("user", ""),
            text=self._clean_mentions(inner.get("text", "")),
            mentions=self._extract_mentions(inner.get("text", "")),
            ts=inner.get("event_ts", datetime.utcnow().isoformat()),
        )
    # ... fetch_history, send_message similar pattern
```

#### Discord (~50 lines)

```python
# adapters/discord.py
class DiscordPlatformAdapter(ChatPlatformAdapter):
    def verify_webhook(self, headers: dict, body: bytes) -> bool:
        # Discord signs with Ed25519 public key
        signature = headers.get("x-signature-ed25519", "")
        timestamp = headers.get("x-signature-timestamp", "")
        return ed25519_verify(self.public_key, f"{timestamp}{body.decode()}", signature)

    def parse_event(self, raw_body: dict) -> Optional[StandardContextPayload]:
        event = json.loads(raw_body)
        # Discord ping challenge
        if event.get("type") == 1:
            return {"type": 1}  # PONG
        if event.get("type") != 0:
            return None
        # INTERACTION_CREATE: slash command or message component
        # MESSAGE_CREATE: needs Gateway Intents (use HTTP interactions when possible)
        # ...
```

#### Telegram (~40 lines — simplest)

```python
# adapters/telegram.py
class TelegramPlatformAdapter(ChatPlatformAdapter):
    # Telegram doesn't use webhooks by default; poll getUpdates or set webhook
    # When using webhook mode: verify via bot token in URL path
    def verify_webhook(self, headers: dict, body: bytes) -> bool:
        return True  # Authenticated by bot token in URL (secret path)

    def parse_event(self, raw_body: dict) -> Optional[StandardContextPayload]:
        event = json.loads(raw_body)
        msg = event.get("message", {})
        if not msg or "text" not in msg:
            return None
        return StandardContextPayload(
            platform="telegram",
            chat_id=str(msg["chat"]["id"]),
            chat_type="group" if msg["chat"]["type"] == "group" else "dm",
            message_id=str(msg["message_id"]),
            sender_id=str(msg["from"]["id"]),
            sender_name=msg["from"].get("first_name", ""),
            sender_username=msg["from"].get("username", ""),
            text=msg["text"],
            mentions=self._extract_mentions(msg),
            ts=datetime.fromtimestamp(msg["date"]).isoformat(),
        )

    async def send_message(self, chat_id: str, text: str, **kwargs) -> str:
        resp = await httpx.post(
            f"https://api.telegram.org/bot{self.bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
        )
        return str(resp.json()["result"]["message_id"])
```

### Server Deployment

| Host | Cost | Cold Start | Timeout | Best For |
|------|------|-----------|---------|----------|
| **Fly.io** | Free tier (3 shared VMs) | None (always-on) | 60s | Production default |
| **Railway** | $5/mo | None | Unlimited | Hassle-free production |
| **Vercel** | Free tier | ~500ms | 10s | Serverless, low traffic |
| **DigitalOcean App** | $5/mo | None | Unlimited | Full control |
| **Hetzner VPS** | ~$4/mo | None | Unlimited | Budget production |
| **Local + Cloudflare Tunnel** | Free | None | N/A | Development only |

**Recommendation:** Fly.io for the free tier + always-on, Railway for set-and-forget. Both support Docker deployment of a single FastAPI container. Cold start doesn't matter for the webhook path since all platforms retry on 5xx.

### Alternative: Deno / Node.js Implementation

For teams preferring TypeScript, the same design ports to a single-file Deno server:

```typescript
// deno-server/main.ts
import { LarkAdapter } from "./adapters/lark.ts";
import { SlackAdapter } from "./adapters/slack.ts";

const ADAPTERS: Record<string, ChatPlatformAdapter> = {
  lark: new LarkAdapter(Deno.env.get("LARK_APP_SECRET")!),
  slack: new SlackAdapter(Deno.env.get("SLACK_SIGNING_SECRET")!),
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const match = url.pathname.match(/^\/webhook\/(\w+)\/(.+)$/);
  if (!match) return new Response("Not found", { status: 404 });
  
  const [, platform, routingKey] = match;
  const adapter = ADAPTERS[platform];
  if (!adapter) return new Response("Unknown platform", { status: 404 });

  const body = await req.text();
  if (!adapter.verifyWebhook(req.headers, body)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const challenge = adapter.handleChallenge(body);
  if (challenge) return Response.json(challenge);

  const payload = adapter.parseEvent(body);
  if (!payload) return Response.json({ status: "ignored" });

  // Fire-and-forget: fetch history + enqueue
  EdgeRuntime.waitUntil(processEvent(adapter, payload, routingKey));

  return Response.json({ status: "accepted" });
});
```

**Deno deploy note:** Works on Deno Deploy (free tier, global edge) but cold starts may approach platform timeout limits. Fly.io or Railway recommended for production reliability.

---

## Layer 2: Message Queue

### Queue Contract (unchanged from Lark document, generalized keys)

| Property | Value |
|----------|-------|
| Data format | JSON string (Standard Context Payload) |
| Key pattern | `{platform}:events:{routing_key}` |
| Push | Append (RPUSH / publish / INSERT) |
| Pop | Blocking pop (BLPOP / consume / SELECT ... FOR UPDATE SKIP LOCKED) |
| TTL | None — consumed within seconds |
| Order | FIFO |

### Queue Adapter Interface

```python
class QueueAdapter(ABC):
    @abstractmethod
    async def push(self, key: str, payload: str) -> None: ...
    
    @abstractmethod
    async def pop(self, key: str, timeout: int = 0) -> Optional[str]: ...
    
    @abstractmethod
    async def health(self) -> bool: ...
```

### Provider Comparison

| Provider | Protocol | Durability | Multi-Client | Exactly-Once | Latency | Ops Burden | Free Tier |
|----------|----------|------------|--------------|-------------|---------|-----------|-----------|
| **Upstash Redis** ★ | REST API | Backed up | Yes (BLPOP) | No | ~5ms | Zero | 10K commands/day |
| Self-hosted Redis | TCP | In-memory | Yes (BLPOP) | No | <1ms | Low | Self-hosted |
| **Redis Streams** | TCP | Persisted | Yes (consumer groups) | Yes (XACK) | <1ms | Low | Self-hosted |
| RabbitMQ | AMQP | Disk + memory | Yes | Yes (ack) | <5ms | Medium | Self-hosted |
| NATS | NATS protocol | Memory or JetStream | Yes (queue groups) | Yes (JetStream) | <1ms | Low | Self-hosted |
| Postgres + PGMQ | SQL | Disk (WAL) | Yes (visibility timeout) | Yes | <10ms | Low | Free (extension) |
| Postgres SKIP LOCKED | SQL | Disk | Yes (FOR UPDATE SKIP LOCKED) | No* | <15ms | None (existing DB) | Free |
| File-based | Filesystem | Disk | No | No | <100ms | None | Free |

★ **Default.** Recommended for simplicity: REST API means no persistent TCP connection from either the serverless webhook host or the local daemon. Works through any NAT/firewall. 10K free commands/day ≈ 5K messages/day (push + pop per message).

### Why Upstash Redis as Default

1. **REST API** — no persistent connections. Works from serverless hosts (cannot hold TCP) and from developer laptops behind NAT (outbound HTTP only)
2. **No ops** — managed service, no server to run
3. **Free tier sufficient** — 10K commands/day handles development + small teams
4. **Upgrade path** — paid tiers scale linearly; or swap adapter to any other provider with zero code changes

### Alternative: Postgres Queue (Zero New Infrastructure)

If the team already has a Supabase or Postgres instance, use the same database as the queue:

```python
# queue/postgres_queue.py
class PostgresQueueAdapter(QueueAdapter):
    async def push(self, key: str, payload: str) -> None:
        await self.db.execute(
            "INSERT INTO chat_events (queue_key, payload, created_at) VALUES ($1, $2, NOW())",
            key, payload,
        )
        await self.db.execute("NOTIFY chat_event, $1", key)

    async def pop(self, key: str, timeout: int = 0) -> Optional[str]:
        # Poll with LISTEN/NOTIFY wake-up
        row = await self.db.fetchrow(
            """DELETE FROM chat_events WHERE id = (
                SELECT id FROM chat_events 
                WHERE queue_key = $1 
                ORDER BY created_at 
                FOR UPDATE SKIP LOCKED 
                LIMIT 1
            ) RETURNING payload""",
            key,
        )
        return row["payload"] if row else None
```

For production-grade Postgres queues with exactly-once semantics, use the **PGMQ extension** (`pgmq.create()`, `pgmq.send()`, `pgmq.read()`, `pgmq.archive()`, `pgmq.delete()`). Free on any Postgres instance.

### Quick Decision Matrix

| Your Situation | Use |
|---------------|-----|
| Starting fresh, want simplest | **Upstash Redis** (default) |
| Already have Supabase/Postgres | **Postgres queue** (zero new infra) |
| Already have Redis | **Redis Streams** (native, free) |
| Enterprise, need exactly-once | **RabbitMQ** or **PGMQ** |
| High-throughput, low latency | **NATS JetStream** |
| Single machine, local only | **SQLite** or **file-based** |
| Air-gapped / no cloud | **File-based** with inotify/kqueue |

---

## Layer 3: Local Daemon

### Generalized Loop (platform-agnostic)

```python
async def main():
    registry = load_registry()  # YAML: {platform}:{routing_key} → workspace config
    queue = get_queue_adapter()  # Upstash, Redis, Postgres, etc.
    
    while True:
        # Listen on ALL configured platforms
        for routing_key, project in registry.items():
            raw = await queue.pop(routing_key, timeout=1)
            if raw:
                payload = StandardContextPayload.from_json(raw)
                if payload.path == "/message":
                    asyncio.create_task(handle(payload, project))

async def handle(payload: StandardContextPayload, project: dict):
    # Stage 1: Route
    agent_id = await route(payload, project["agents"], project.get("router_adapter"))
    if not agent_id:
        return
    
    # Stage 2: Build prompt with platform-aware context
    prompt = build_prompt(
        platform=payload.platform,
        sender_name=payload.sender_name,
        text=payload.text,
        history=payload.history,
        chat_id=payload.chat_id,
    )
    
    # Stage 3: Execute with platform-aware reply tool
    result = await run_coding_tool(
        prompt=prompt,
        cwd=f"{project['root']}/{agent_id}",
        adapter=project.get("agent_adapter", "claude"),
        platform=payload.platform,      # injected as env var: ACC_PLATFORM
        chat_id=payload.chat_id,        # injected as env var: ACC_CHAT_ID
        timeout=120,
    )
    
    # Stage 4: Reply (if post-process strategy)
    if project.get("reply_mode") == "post_process":
        adapter = get_platform_adapter(payload.platform)
        await adapter.send_message(payload.chat_id, result.stdout.strip())
```

### Updated Registry Format (multi-platform)

```yaml
# agent_registry.yaml
platforms:
  # ── Lark entries ──
  - routing_key: "lark:cli_xxxxxxxxxxxx"
    platform: "lark"
    name: "Edge8 Engineering Chat"
    root: /home/user/projects/edge8/lark-agents
    router_adapter: "claude"
    agent_adapter: "claude"
    reply_mode: "mcp_tool"
    agents:
      - id: assistant
        display_name: "General Assistant"
        description: "General-purpose coding assistant"
      - id: code-reviewer
        display_name: "Code Reviewer"
        description: "Reviews pull requests and suggests fixes"
      - id: deployer
        display_name: "Deployer"
        description: "Handles CI/CD and deployment operations"

  # ── Slack entries ──
  - routing_key: "slack:T0123ABC:C0456DEF"
    platform: "slack"
    name: "Design Team Slack"
    root: /home/user/projects/design/slack-agents
    router_adapter: "claude"
    agent_adapter: "opencode"
    reply_mode: "post_process"
    agents:
      - id: designer
        display_name: "Design Assistant"
        description: "Figma, design system, and UI review"

  # ── Discord entries ──
  - routing_key: "discord:987654321:123456789"
    platform: "discord"
    name: "Community Support"
    root: /home/user/projects/community/discord-agents
    router_adapter: "claude"
    agent_adapter: "claude"
    reply_mode: "mcp_tool"
    agents:
      - id: support
        display_name: "Support Bot"
        description: "Answers community questions about the project"

  # ── Telegram entries ──
  - routing_key: "telegram:abc123def456:-1001234567890"
    platform: "telegram"
    name: "Personal Bot"
    root: /home/user/projects/personal/telegram-agents
    router_adapter: "claude"
    agent_adapter: "claude"
    reply_mode: "inline"
    agents:
      - id: personal-assistant
        display_name: "Personal Assistant"
        description: "General tasks and reminders"
```

### Router Agent Prompt (platform-aware)

```markdown
# Router

Platform: {{platform}}
Sender: {{sender_name}} ({{sender_username}})

Available agents:
{{#each agents}}
- {{id}}: {{description}}
{{/each}}

Message: {{text}}

Output ONLY the agent id that should handle this message.
Output nothing else. If no agent matches, output: none.
```

### Target Agent SYSTEM.md (platform-aware template)

```markdown
# {{agent_display_name}}

You are a helpful assistant connected to {{platform}} chat.

## Context
- Platform: {{platform}}
- Chat: {{channel_name}}
- Sender: {{sender_name}}
- Conversation history is available in the prompt

## Reply Rules
- You have access to a `send_message(chat_id, content)` tool.
- ALWAYS use this tool to reply. Never output plain text as your response.
- Keep replies concise — chat platforms render as plain text.
{{#if platform_is_lark}}
- Lark renders as plain text — no markdown formatting.
{{/if}}
{{#if platform_is_slack}}
- Slack supports basic mrkdwn. Use *bold* and `code` sparingly.
{{/if}}
{{#if platform_is_telegram}}
- Telegram supports HTML parse mode. Use <b>bold</b> and <code>code</code>.
{{/if}}

## Tools
You have access to:
- send_message(chat_id: str, content: str) — reply to the chat
- Search tools, file system tools, code execution tools (as configured)

## Project Context
{{project_context_if_any}}
```

---

## Layer 4: Reply Channel (Platform-Agnostic)

### Unified Reply Tool

The agent calls one tool regardless of platform. The daemon or MCP server routes to the correct adapter.

```python
# Runs as MCP tool or HTTP endpoint on localhost
@mcp.tool()
async def send_message(
    chat_id: str,
    content: str,
    platform: str = "",       # auto-resolved from env if empty
) -> dict:
    """Send a message back to any connected chat platform."""
    platform = platform or os.environ["ACC_PLATFORM"]
    adapter = get_platform_adapter(platform)
    message_id = await adapter.send_message(chat_id, content)
    return {"status": "sent", "message_id": message_id}
```

### Three Reply Strategies (unchanged from Lark doc)

| Strategy | How It Works | Tool Requirement | Best For |
|----------|-------------|-----------------|----------|
| **MCP tool** | Agent calls `send_message()` via MCP protocol | Must support MCP (Claude Code, Cline, Continue.dev) | Full capabilities, structured replies |
| **Post-process** | Daemon sends agent's raw stdout as reply | None — works with any CLI | Simplest integration, any tool |
| **Injected function** | Daemon adds reply instructions to prompt preamble | None — LLM outputs JSON, daemon parses | No MCP, no post-processing needed |

### Post-Process Strategy (Simplest, Universal)

```python
# In daemon, after coding tool exits
def reply_via_post_process(result: ToolResult, payload: StandardContextPayload):
    text = result.stdout.strip()
    if not text:
        return
    adapter = get_platform_adapter(payload.platform)
    # Split long messages if needed
    MAX_MSG = 3000  # conservative, works for all platforms
    for chunk in split_text(text, MAX_MSG):
        asyncio.create_task(adapter.send_message(payload.chat_id, chunk))
```

---

## Complete Platform Mapping

### Webhook Auth per Platform

| Platform | Auth Method | Stdlib Support | Code Lines |
|----------|------------|----------------|------------|
| **Lark** | AES-CBC decrypt + SHA-256 signature | `pycryptodome`, `hashlib` | ~30 lines |
| **Slack** | HMAC-SHA256 signing secret verification | `hmac`, `hashlib` | ~10 lines |
| **Discord** | Ed25519 public key signature verify | `nacl` or `cryptography` | ~8 lines |
| **Microsoft Teams** | HMAC on request body (SHA256) | `hmac`, `hashlib` | ~10 lines |
| **Telegram** | Bot token in URL path (secret path) | None needed | ~2 lines |
| **WhatsApp Cloud API** | `x-hub-signature-256` HMAC-SHA256 | `hmac`, `hashlib` | ~10 lines |
| **Matrix** | Homeserver signing key via federation API | `hashlib` | ~15 lines |
| **Linear** | Webhook signing secret (HMAC-SHA256) | `hmac`, `hashlib` | ~10 lines |
| **GitHub Issues** | Webhook secret (HMAC-SHA256) | `hmac`, `hashlib` | ~10 lines |

### Reply API per Platform

| Platform | API Endpoint | Auth Method | Message Format | Code Lines |
|----------|-------------|-------------|---------------|------------|
| **Lark** | `POST /im/v1/messages` | Bearer token (OAuth) | JSON `{"text": "..."}` | ~12 lines |
| **Slack** | `POST chat.postMessage` | Bot token (xoxb-...) | `{"text": "...", "mrkdwn": true}` | ~10 lines |
| **Discord** | `POST /channels/{id}/messages` | Bot token | `{"content": "..."}` | ~8 lines |
| **Teams** | `POST /teams/{id}/channels/{id}/messages` | Bearer token (OAuth) | `{"body": {"content": "..."}}` | ~15 lines |
| **Telegram** | `POST /bot{token}/sendMessage` | Bot token in URL | `{"chat_id": ..., "text": "..."}` | ~8 lines |
| **WhatsApp** | `POST /{phone_id}/messages` | Bearer token (system user) | `{"to": ..., "type": "text", ...}` | ~12 lines |
| **Matrix** | `PUT /_matrix/client/v3/rooms/{id}/send/...` | Access token | `{"msgtype": "m.text", "body": "..."}` | ~12 lines |
| **Linear** | GraphQL `issueCreate` / `commentCreate` | API key | GraphQL mutation | ~15 lines |
| **GitHub** | `POST /repos/{owner}/{repo}/issues/{n}/comments` | Token | `{"body": "..."}` | ~8 lines |

---

## Integration with ACC (Agent Control Center)

### Where This Fits in ACC

```
ACC Desktop App (Tauri v2)
│
├── Agent Runner (Module 1)         ← Agents execute here, PTY sessions
├── Wave Orchestrator (Module 11)   ← Parallel execution engine
├── Architect Agent (Module 14)     ← 7-stage connector loop (classification → proposal → approval → execution → verification → report)
├── Intelligence Layer (Module 4-6) ← Outcome tracking, failure analysis
├── Asset Manager (Module 2)        ← Skills, MCPs, credentials
├── Knowledge Compounder (Module 20)← Cross-session learning
│
├── [EXISTING] ConnectorConfig       ← Current: Lark/Slack/Jira specs (MCP-only)
│   └── 7-stage loop (GitHub Issues implemented, rest deferred)
│
└── [NEW] Backward Channel           ← This document
    ├── Webhook server (cloud)       ← Deployed separately, not in Tauri
    ├── Message queue (cloud)        ← Upstash/Postgres/Redis, shared infra
    ├── Local daemon (machine)       ← Runs alongside ACC, Rust or Python
    ├── Agent workspaces (local)     ← SYSTEM.md files, git-tracked
    └── Reply channel (local)        ← MCP tool or HTTP endpoint on localhost
```

### Relationship: Connector Loop vs. Backward Channel

These are **complementary subsystems**, not overlapping:

| | 7-Stage Connector Loop | Backward Channel |
|---|---|---|
| **Trigger** | Structured work item (issue, ticket, PR) | Chat message (@bot "do X") |
| **Entry** | Polling (GitHub Issues, Jira) or webhook | Webhook POST from chat platform |
| **Flow** | classify → propose → approve → execute → verify → report → close | verify → normalize → queue → route → execute → reply |
| **Human gate** | Yes (Stage 4: await approval) | Optional (configurable per agent) |
| **Execution** | Wave Orchestrator (parallel, DAG) | Single agent (one message → one response) |
| **Persistence** | Full audit trail (issue/PR history) | In-flight only (queue → process → reply) |
| **Destinations** | Issue comment, PR description, status update | Chat message reply |
| **Implemented** | GitHub Issues (Phase 7), rest deferred | None yet (design phase) |

Both converge on the same execution engine (Agent Runner + MCP tools) and the same credential store (Connector Vault in Module 2).

### ACC Frontend: What Changes

Add to `CONNECTOR_SPECS` in `src/lib/agents/configs.ts`:

```typescript
export const CONNECTOR_SPECS: ConnectorPlatformSpec[] = [
  {
    id: 'lark',
    label: 'Lark / Feishu',
    // ... existing MCP fields ...
    backwardChannel: true,            // NEW: supports real-time chat → agent
    webhookAuth: 'aes_cbc_sha256',    // NEW: webhook verification method
    webhookTimeout: 3,                 // NEW: platform timeout in seconds
  },
  {
    id: 'slack',
    label: 'Slack',
    backwardChannel: true,
    webhookAuth: 'hmac_sha256',
    webhookTimeout: 3,
  },
  {
    id: 'discord',
    label: 'Discord',
    backwardChannel: true,
    webhookAuth: 'ed25519',
    webhookTimeout: 3,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    backwardChannel: true,
    webhookAuth: 'url_token',
    webhookTimeout: 10,
  },
  // ... Linear, Teams, WhatsApp, Matrix follow same pattern
]
```

Add to `connector_configs` DB table: `backward_channel_enabled`, `webhook_url`, `queue_provider`, `queue_config`.

### ACC Backend (Rust): What Gets Added

The daemon itself is a separate binary/service — not embedded in the Tauri app. This is by design:
- The daemon runs even when ACC's GUI is closed
- It starts/stops with the OS (launchd/systemd)
- ACC's GUI provides a management panel to configure, start, stop, and view logs

New Tauri commands for daemon management (in `commands.rs`):

| Command | Purpose |
|---------|---------|
| `start_backward_channel_daemon` | Spawn daemon process |
| `stop_backward_channel_daemon` | Send SIGTERM |
| `get_backward_channel_status` | Check if running, uptime, queue depth |
| `get_backward_channel_logs` | Tail daemon logs |
| `configure_webhook_server` | Deploy/update webhook URL |
| `test_platform_connection` | Send test message to verify platform config |

---

## Security Model

Generalized from the Lark document. Every concern applies to all platforms.

| Concern | Solution | Scope |
|---------|----------|-------|
| **Webhook authenticity** | Platform-specific crypto (AES, HMAC, Ed25519) | Per adapter |
| **Bot credentials** | Environment variables (`.env`) + Tauri Stronghold at rest | Universal |
| **Queue access** | Bearer token / password per queue provider | Queue adapter |
| **API keys at rest** | AES-256-CBC encrypted credential file | Module 2: Connector Vault |
| **OAuth token refresh** | Abstract `TokenManager` with auto-refresh before expiry | Per platform adapter |
| **Conversation data** | Never stored — in-flight only (queue → process → reply) | Design pattern |
| **Mention spoofing** | Verified by platform's webhook signature, not by message text | Platform responsibility |
| **Rate limiting** | Per-platform rate limits enforced in webhook server | Middleware |
| **Webhook replay** | Timestamp check + nonce tracking per platform adapter | Per adapter |

---

## Deployment Models

### Model A: Fully Managed (Team/Company Setup)

```
┌────────────┐     ┌──────────────────┐     ┌─────────────┐     ┌──────────────┐
│ Chat       │────▶│ Webhook Server   │────▶│ Upstash      │────▶│ Developer    │
│ Platforms  │     │ (company-hosted, │     │ Redis        │     │ Laptops      │
│ (Lark,     │     │  one instance    │     │ (managed)    │     │ (daemon per  │
│  Slack...) │     │  for all users)  │     │              │     │  machine)    │
└────────────┘     └──────────────────┘     └─────────────┘     └──────────────┘
```

- One webhook server serves the whole team
- Upstash Redis team account (5K req/day free, $0.2/100K thereafter)
- Each developer runs their own daemon
- Registry managed per-developer or shared via git

### Model B: Solo Developer (Simplest)

```
┌────────────┐     ┌──────────────────┐     ┌─────────────┐     ┌──────────────┐
│ Chat       │────▶│ Webhook Server   │────▶│ SQLite       │────▶│ Developer    │
│ Platforms  │     │ (Fly.io free)    │     │ (on server   │     │ Laptop       │
│            │     │                  │     │  or local)   │     │ (daemon)     │
└────────────┘     └──────────────────┘     └─────────────┘     └──────────────┘
```

- Free Fly.io for webhook server
- SQLite queue on the same Fly volume, or Postgres on Supabase free tier
- One developer, one daemon

### Model C: Local-Only (Air-Gapped / No Cloud)

```
┌────────────┐     ┌──────────────────────────────────────────────┐
│ Telegram   │────▶│ Developer Laptop                              │
│ (polling   │     │                                              │
│  getUpdates│     │  Daemon polls Telegram directly              │
│  mode)     │     │  No webhook server needed                    │
└────────────┘     │                                              │
                   │  Queue: SQLite or file-based (inotify)       │
                   └──────────────────────────────────────────────┘
```

- Telegram supports polling mode — no webhook, no cloud server
- Queue is a local SQLite file or directory of JSON files
- Works fully offline from any chat platform that supports polling (Telegram, Matrix)
- For webhook-only platforms (Lark, Slack, Discord): use Cloudflare Tunnel (`cloudflared tunnel`) to expose localhost without deploying a server

---

## Appendix A: WebSocket Relay (Dual Delivery)

Unchanged from the Lark document. A WebSocket relay supplements the queue for sub-second latency. Best practice: dual delivery — both queue (durable) and WebSocket (fast). If the WebSocket message arrives, process it and acknowledge the queue copy. If the WebSocket misses (machine offline, NAT issue), the queue delivers it.

```
Webhook Server ──┬──▶ Queue (RPUSH) ──▶ Daemon poll (durable, ~1s latency)
                 │
                 └──▶ WS Relay ──▶ Daemon WebSocket (fast, best-effort)
```

The relay can be implemented as:
- **Supabase Realtime Broadcast** — built into existing Supabase project
- **Deno Deploy relay** — 50-line server as described in Appendix A of the Lark doc
- **NATS WebSocket** — if NATS is already the queue provider
- **In-process WebSocket** — FastAPI server itself holds WebSocket connections (only for always-on hosts like Fly.io/Railway, not serverless)

---

## Appendix B: Migration Guide (Adding a New Platform)

1. **Create adapter file:** `adapters/{platform}.py` — implement `ChatPlatformAdapter`, ~50–80 lines
2. **Register adapter:** Add to `adapters/__init__.py` dispatch table
3. **Configure credentials:** Add env vars to `.env` (e.g., `SLACK_SIGNING_SECRET`, `SLACK_BOT_TOKEN`)
4. **Deploy webhook server:** Push update to cloud host (automatic for Fly.io/Railway)
5. **Set webhook URL in platform:** Configure platform's developer portal to POST to `https://your-server/webhook/slack/T0123ABC`
6. **Add registry entry:** Add platform entry to `agent_registry.yaml`
7. **Create agent workspace:** `mkdir -p slack-agents/assistant && echo "# Assistant..." > slack-agents/assistant/SYSTEM.md`
8. **Restart daemon:** `launchctl stop com.edge8.backward-daemon && launchctl start com.edge8.backward-daemon`

**Time to add a new platform:** ~30 minutes (15 min adapter code, 10 min deploy, 5 min config).

---

## Appendix C: Platform Implementation Status

| Platform | Adapter | Webhook Server | Queue | Daemon | Reply | ACC UI | Priority |
|----------|---------|---------------|-------|--------|-------|--------|----------|
| **Lark** | Design complete | Design complete | Design complete | Design complete | Design complete | Design complete | P0 (Phase 8) |
| **Slack** | Spec above (~60 lines) | Same server | Same queue | Same daemon | Same reply | Same UI | P1 |
| **Discord** | Spec above (~50 lines) | Same server | Same queue | Same daemon | Same reply | Same UI | P2 |
| **Telegram** | Spec above (~40 lines) | Same server (or polling, no server) | Same queue | Same daemon | Same reply | Same UI | P3 |
| **GitHub Issues** | 7-stage connector loop | Already built (Phase 7) | Same queue (optional) | Connector loop (existing) | Issue comments | Built | Implemented |
| **Linear** | Spec above (~60 lines) | Same server | Same queue | Same daemon | Same reply | Same UI | P4 |
| **Teams** | Spec above (~80 lines, OAuth) | Same server | Same queue | Same daemon | Same reply | Same UI | P5 |
| **WhatsApp** | Spec above (~60 lines) | Same server | Same queue | Same daemon | Same reply | Same UI | P5 |
| **Matrix** | Spec above (~70 lines) | Same server | Same queue | Same daemon | Same reply | Same UI | P5 |

---

## Appendix D: Keep the Lark Design Intact

The original Lark-specific architecture in `lark-to-local-llm-backward-channel.md` remains the reference for Lark integration. This document adds a layer of abstraction above it, not a replacement. Key Lark specifics preserved:

| Lark Feature | Preserved In |
|-------------|-------------|
| AES-CBC decryption with SHA-256 key derivation | `adapters/lark.py` (unchanged logic) |
| SHA-256 signature verification (timestamp + nonce + key + body) | `adapters/lark.py` |
| URL verification challenge (`{"challenge": ...}`) | `adapters/lark.py` |
| Event type routing (`im.message.receive_v1`) | `adapters/lark.py` |
| History fetch via `GET /im/v1/messages` | `adapters/lark.py` |
| Message send via `POST /im/v1/messages` | `adapters/lark.py` |
| Chat type detection (group vs p2p) | `adapters/lark.py` |
| OAuth token management with refresh | `adapters/lark.py` + shared `TokenManager` |
| All Lark API base URLs and endpoints | `adapters/lark.py` constants |

The Lark adapter is the most complex due to encryption requirements, which is why it's the reference implementation. Every other platform has simpler authentication (just HMAC or Ed25519 verify), making their adapters significantly shorter.

---

## Appendix E: Cost Summary (Solo Developer, All Platforms)

| Component | Free Tier | 100 Messages/Day | 1000 Messages/Day |
|-----------|----------|-------------------|--------------------|
| **Webhook server** (Fly.io) | Free | Free | Free |
| **Queue** (Upstash Redis) | Free (10K cmd/day) | Free (200 cmd/day) | ~$0.02/mo (2K cmd/day) |
| **Queue** (Postgres, existing DB) | Free | Free | Free |
| **Local daemon** | Free (your machine) | Free | Free |
| **LLM costs** (routing) | ~$0.001/msg (GPT-4o-mini) | ~$0.10/mo | ~$1.00/mo |
| **LLM costs** (agent execution) | Variable per task | Variable | Variable |
| **Total infra cost** | **$0/month** | **$0.00–0.10/month** | **$0.00–1.00/month** |

LLM costs dominate. Infrastructure costs are essentially free at any reasonable message volume.
