# Lark → Local LLM Coding Tool: Universal Backward Channel Architecture

**Version:** 1.0 — 2026-05-03

---

## What This Is

An abstracted, tool-agnostic architecture for connecting **Lark (Feishu) group chat messages** to a **local AI coding tool** (Claude Code, Cursor, Continue.dev, Copilot, open-source LLM CLI, etc.) and getting replies back into Lark.

The design is extracted from a production implementation (`edge8-automation-mcp`) with all Claude Code–specific coupling isolated into a single swappable adapter. Everything else is portable.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             LARK PLATFORM                                    │
│  User → Group Chat → @Bot "deploy staging"                                  │
└──────────────────────────┬──────────────────────────────────────────────────┘
                           │ encrypted POST (AES + signature)
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLOUD WEBHOOK HOST                                    │
│                                                                              │
│  POST /webhook/lark/{app_id}                                                 │
│    │                                                                         │
│    ├─ 1. URL verification challenge → return {"challenge": ...}              │
│    ├─ 2. AES decrypt body["encrypt"]                                         │
│    ├─ 3. SHA-256 signature verification                                      │
│    ├─ 4. Route by event_type ("im.message.receive_v1")                       │
│    ├─ 5. Fetch chat history (last 20 from Lark API)                          │
│    ├─ 6. Normalize → Standard Context Payload                                │
│    └─ 7. RPUSH to message queue                                              │
│                                                                              │
│  Returns HTTP 200 within 3s (Lark timeout)                                   │
└──────────────────────────┬──────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MESSAGE QUEUE                                         │
│                                                                              │
│  Key pattern: lark:events:{app_id}                                          │
│  Entry: Standard Context Payload (JSON)                                      │
│  Consumer: BLPOP / pull / subscribe                                          │
│                                                                              │
│  Providers (any): Upstash Redis, Redis, RabbitMQ, NATS, Postgres LISTEN/     │
│                   NOTIFY, file-based, in-memory (localhost only)             │
└──────────────────────────┬──────────────────────────────────────────────────┘
                           │ BLPOP / poll
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LOCAL DAEMON                                           │
│                                                                              │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────────────┐   │
│  │ Poll Loop     │───▶ Registry Lookup   │───▶ ADAPTER: run_coding_tool │   │
│  │ (async BLPOP) │    │ app_id → project │    │ (process/pipe/HTTP)     │   │
│  └──────────────┘    │       → agent     │    └──────────┬───────────────┘   │
│                      └──────────────────┘               │                    │
│                            │                             ▼                    │
│                            ▼                    ┌──────────────────────────┐ │
│                      ┌──────────────────┐       │  STAGE 1: Router Agent   │ │
│                      │ agent_registry   │       │  (lightweight LLM call)  │ │
│                      │ .yaml            │       │  → outputs agent_id      │ │
│                      └──────────────────┘       └──────────┬───────────────┘ │
│                                                            │                 │
│                                                            ▼                 │
│                                                    ┌────────────────────────┐│
│                                                    │  STAGE 2: Target Agent ││
│                                                    │  (full LLM with tools) ││
│                                                    │  → calls reply tool    ││
│                                                    └────────┬───────────────┘│
│                                                             │                │
└─────────────────────────────────────────────────────────────┼────────────────┘
                                                              │
                    ┌─────────────────────────────────────────┘
                    │  reply_to_lark(chat_id, text, ...)
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        REPLY CHANNEL                                         │
│                                                                              │
│  Options:                                                                    │
│  ├─ MCP tool call (lark_send_message) — universal, standard                 │
│  ├─ Daemon post-processing (parse agent output, call Lark API)             │
│  └─ Inline function injection (reply function built into prompt)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Cloud Webhook Receiver

### What It Does

Receives encrypted POST events from Lark, verifies authenticity, normalizes into a standard format, and pushes to a queue. Must return HTTP 200 within 3 seconds.

### Universal Contract

**Input:** `POST /webhook/lark/{app_id}` with AES-encrypted body + signature headers

**Processing pipeline:**

| Step | Operation | Portable? |
|------|-----------|-----------|
| 1. URL verification | Respond `{"challenge": ...}` to Lark's test ping | ✅ Pure logic |
| 2. AES decryption | Decrypt `body["encrypt"]` with SHA-256–derived key | ✅ Pure crypto (pycryptodome, Node crypto, Go stdlib) |
| 3. Signature verification | SHA-256(`timestamp + nonce + encrypt_key + body`) vs header | ✅ Pure crypto |
| 4. Token verification | Match `header.token` against configured `VERIFY_TOKEN` | ✅ Pure logic |
| 5. Event routing | Map `event_type → path` (e.g. `im.message.receive_v1 → /message`) | ✅ Pure logic |
| 6. Mention filtering | Group chats: only process if bot is @mentioned; PMs: always | ✅ Pure logic |
| 7. History fetch | `GET /im/v1/messages?container_id={chat_id}` → last N messages | ✅ Lark API call (any HTTP client) |
| 8. Normalize | Build `Standard Context Payload` (see below) | ✅ Pure logic |
| 9. Enqueue | Push JSON to queue with key `lark:events:{app_id}` | ✅ Queue-specific (trivial adapter) |

### AES Decryption (portable, ~15 lines in any language)

```
key = SHA256(encrypt_key)
iv = first 16 bytes of base64-decoded payload
cipher = AES-CBC(key, iv)
plaintext = unpad(cipher.decrypt(ciphertext))
```

Implementation exists in Python (`Crypto.Cipher.AES`), Node (`crypto.createDecipheriv`), Go (`crypto/aes`), Rust (`aes` + `cbc` crates), etc.

### Standard Context Payload (the queue message contract)

```json
{
  "app_id": "cli_xxxxxxxxxxxx",
  "path": "/message",
  "chat_id": "oc_xxxxxxxxxxxxxxxxxxxxxxxxxx",
  "chat_type": "group",
  "message_id": "om_xxxxxxxxxxxxxxxxxxxxxxxxxx",
  "sender_open_id": "ou_xxxxxxxxxxxxxxxxxxxxxxxxxx",
  "sender_name": "User Name",
  "text": "@BotName deploy staging please",
  "mentions": ["BotName"],
  "history": [
    {"sender": "ou_xxx1", "text": "who can deploy?", "ts": "2026-05-03T09:00:00Z"},
    {"sender": "ou_xxx2", "text": "ask the bot", "ts": "2026-05-03T09:01:00Z"}
  ],
  "ts": "2026-05-03T09:02:00Z"
}
```

This is the **only contract** between cloud and local. It contains everything the local agent needs:
- Who sent it, where, in what context
- Conversation history (pre-fetched by cloud, not fetched by local)
- The raw event is preserved for advanced use cases

### Deployment Options

| Host | Cost | Notes |
|------|------|-------|
| Vercel (serverless) | Free tier | 10s timeout, cold starts |
| Railway | $5/mo | Always-on, faster cold start |
| Fly.io | Free tier | Always-on with 256MB RAM |
| Your own server | Existing infra | Full control |
| Local + ngrok | Free | For development only |

No AI workload runs here. Any cheap HTTP host works.

---

## Layer 2: Message Queue

### What It Does

Decouples the cloud receiver (must respond fast) from the local daemon (may take seconds to run AI). Acts as a durable buffer.

### Queue Contract

| Property | Value |
|----------|-------|
| Data format | JSON string (the Standard Context Payload) |
| Key pattern | `lark:events:{app_id}` (one queue per Lark bot) |
| Push | Append to list (RPUSH / publish / send) |
| Pop | Blocking pop (BLPOP / consume / pull) |
| TTL | None — consumed within seconds |
| Order | FIFO (first-in-first-out) |

### Provider Adapters

| Provider | Push | Pop | When to use |
|----------|------|-----|-------------|
| **Upstash Redis** | `POST {url}` with `["RPUSH", key, json]` | `["BLPOP", key, "1"]` | Simplest: REST API, no persistent connection needed |
| **Self-hosted Redis** | `RPUSH key json` | `BLPOP key 1` | You have Redis already |
| **RabbitMQ** | `channel.publish()` | `channel.consume()` | Existing infra, durability |
| **NATS** | `nc.publish()` | `nc.subscribe()` with queue group | Low latency, cloud native |
| **Postgres** | `INSERT INTO queue` | `LISTEN/NOTIFY` + poll | No new infra needed |
| **SQLite (local)** | `INSERT` | `SELECT ... ORDER BY id LIMIT 1` | Single machine, simplest |

### Why a queue (not direct WebSocket)?

| Queue | Direct WebSocket |
|-------|-----------------|
| Survives machine sleep | Lost events during downtime |
| At-least-once delivery | Best-effort delivery |
| Buffers during AI processing | Backpressure on Lark timeout |
| Works through NAT | Requires public relay |
| Multi-client safe | Per-client state management |

A WebSocket relay can supplement the queue for lower latency (see Appendix), but the queue is the reliable backbone.

---

## Layer 3: Local Daemon

### What It Does

Runs on the developer's machine. Polls the queue, reads the registry, routes messages to the right agent workspace, and dispatches to the coding tool.

### This is the only layer that couples to a specific LLM tool — and it's isolated to ONE function.

### Core Loop (pseudocode)

```python
async def main():
    registry = load_registry()  # YAML config file
    while True:
        for app_id, project in registry.items():
            payload = await pop_queue(f"lark:events:{app_id}")
            if payload and payload["path"] == "/message":
                asyncio.create_task(handle(payload, project))

async def handle(payload, project):
    # Stage 1: Route
    agent_id = await route(payload, project["agents"], project.get("router_adapter"))
    if not agent_id:
        return  # no matching agent → silently ignore
    
    # Stage 2: Execute with configured adapter
    result = await run_coding_tool(
        prompt=build_prompt(payload),
        cwd=f"{project['root']}/{agent_id}",
        adapter=project.get("agent_adapter", "default"),
        timeout=120,
    )
```

### The Swappable Adapter Interface

```python
class CodingToolAdapter(ABC):
    """The ONLY component you swap when changing LLM tools."""
    
    @abstractmethod
    async def run(
        self,
        prompt: str,
        cwd: str,
        timeout: int,
        system_prompt_path: Optional[str] = None,
        tool_manifest_path: Optional[str] = None,
    ) -> ToolResult:
        ...

@dataclass
class ToolResult:
    returncode: int
    stdout: str
    stderr: str
```

### Adapter Implementations

| Adapter | Mechanism | Latency | Tool Discovery | System Prompt | Example |
|---------|-----------|---------|----------------|---------------|---------|
| **CLI subprocess** | `subprocess.run([cmd, "-p", prompt], cwd=..., timeout=...)` | Medium (cold start per call) | CLI argument or env var | Workspace file read by tool | `claude -p`, `continue --prompt` |
| **stdin/stdout pipe** | Write prompt to process stdin, read from stdout | Low (warm) | JSON over stdin | Sent as first message | Claude Code's develop channel |
| **HTTP server** | `POST localhost:port/prompt` with `{"prompt": ..., "cwd": ...}` | Low | Server response | Sent in request body | Cursor API, Copilot API |
| **File-based** | Write prompt to `{cwd}/prompt.md`, poll for `{cwd}/response.md` | High | N/A | Pre-written in workspace | Universal fallback |
| **MCP notify** | MCP tool sends structured notification to running session | Lowest | MCP protocol | Via `instructions` field | Claude Code dev channel |

### Implementing the Adapter for Common Tools

**Claude Code (CLI):**
```python
class ClaudeCodeAdapter(CodingToolAdapter):
    async def run(self, prompt, cwd, timeout, **kwargs):
        result = subprocess.run(
            ["claude", "-p", prompt, "--output-format", "json"],
            cwd=cwd, capture_output=True, text=True, timeout=timeout,
        )
        return ToolResult(result.returncode, result.stdout, result.stderr)
```

**Continue.dev (CLI):**
```python
class ContinueAdapter(CodingToolAdapter):
    async def run(self, prompt, cwd, timeout, **kwargs):
        result = subprocess.run(
            ["continue", "--prompt", prompt, "--workspace-dir", cwd],
            cwd=cwd, capture_output=True, text=True, timeout=timeout,
        )
        return ToolResult(result.returncode, result.stdout, result.stderr)
```

**Any LLM (generic HTTP):**
```python
class GenericHTTPAdapter(CodingToolAdapter):
    def __init__(self, endpoint: str, api_key: str, model: str):
        self.endpoint = endpoint
        self.api_key = api_key
        self.model = model

    async def run(self, prompt, cwd, timeout, **kwargs):
        # Load system prompt from workspace
        system = await read_file(f"{cwd}/SYSTEM.md") if exists(f"{cwd}/SYSTEM.md") else ""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.endpoint,
                json={"model": self.model, "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ]},
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=timeout,
            )
        return ToolResult(0, resp.json()["choices"][0]["message"]["content"], "")
```

**GitHub Copilot (via API):**
```python
class CopilotAdapter(CodingToolAdapter):
    async def run(self, prompt, cwd, timeout, **kwargs):
        # Copilot's undocumented local API on port 11434
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "http://localhost:11434/v1/chat/completions",
                json={"model": "copilot", "messages": [{"role": "user", "content": prompt}]},
                timeout=timeout,
            )
        return ToolResult(0, resp.json()["choices"][0]["message"]["content"], "")
```

### OS Daemon Lifecycle

| OS | Mechanism | Install | Start/Stop | Logs |
|----|-----------|---------|------------|------|
| **macOS** | `launchd` | `cp plist ~/Library/LaunchAgents/` + `launchctl load` | `launchctl start/stop <label>` | `StandardOutPath` in plist |
| **Linux** | `systemd` | Unit file in `/etc/systemd/system/` | `systemctl start/stop <unit>` | `journalctl -u <unit>` |
| **Windows** | `nssm` / Task Scheduler | `nssm install <name>` | `nssm start/stop <name>` | File logs |
| **Docker** | Container with restart policy | `docker run --restart always` | `docker start/stop` | `docker logs` |
| **None** | `tmux` / `screen` | `tmux new -s lark-daemon` | Ctrl+C / `tmux kill-session` | Visible in pane |

---

## Layer 4: Registry

### What It Does

Maps Lark App IDs → project workspaces → available agents. A YAML/JSON file. Human-editable. Git-tracked per project.

```yaml
projects:
  - app_id: cli_xxxxxxxxxxxx
    name: "My Project"
    root: /home/user/my-project/lark-agents
    router_adapter: "claude"        # which CodingToolAdapter to use for routing
    agent_adapter: "claude"         # which CodingToolAdapter for agent execution
    reply_mode: "mcp_tool"          # how agent replies: mcp_tool | post_process | inline
    agents:
      - id: assistant
        display_name: "Assistant"
        description: "General-purpose assistant"
      - id: code-reviewer
        display_name: "Code Reviewer"
        description: "Reviews pull requests and suggests fixes"
```

**Reload:** Daemon re-reads registry on each poll loop iteration, or on SIGHUP. Hot-reloadable.

---

## Layer 5: Agent Workspaces

### What It Does

Each agent has a self-contained directory. The workspace is the `cwd` when the coding tool runs. It contains:
- The system prompt (persona, rules, context)
- Tool configuration (which MCP servers or APIs to use)
- Optional context files (knowledge base, style guides, project data)

### Universal Workspace Structure

```
lark-agents/
├── _router/                    ← Stage 1: routing (one per project)
│   └── SYSTEM.md               ← "Output only the agent id that matches..."
│
└── assistant/                  ← Stage 2: target agent
    ├── SYSTEM.md                ← System prompt / persona
    ├── tools.json                ← Tool manifest (which tools are available)
    ├── .env                      ← Agent-specific env vars
    └── context/                  ← Static knowledge files
        ├── team.md
        └── style-guide.md
```

### Router Agent SYSTEM.md

```markdown
# Router

Available agents:
{{injected by daemon from registry}}

Message from {{sender_name}}:
{{text}}

Output ONLY the agent id that should handle this message.
Output nothing else. If no agent matches, output: none.
```

The router is intentionally minimal — a single LLM call with no tools. Just classification.

### Target Agent SYSTEM.md

```markdown
# Assistant

You are a helpful assistant in a Lark group chat.

## Reply Rules
- You have access to a `reply_to_lark(chat_id, content)` tool.
- ALWAYS use this tool to reply. Never output plain text as your response.
- Keep replies concise. Lark renders as plain text — no markdown formatting.

## Context
Context files are in ./context/. Read them as needed.
```

### Tool Manifest (tools.json)

```json
{
  "reply_tool": {
    "type": "http",
    "endpoint": "http://localhost:8080/api/lark/reply",
    "parameters": {"chat_id": "string", "content": "string"}
  },
  "search_tool": {
    "type": "mcp",
    "server": "edge8-mcp",
    "tool": "lark_search_docs"
  }
}
```

When the coding tool supports MCP, the tool manifest maps to an MCP server. When it doesn't, the daemon can inject reply functions directly into the prompt preamble, or post-process the raw output and call the Lark API itself.

---

## Layer 6: The Reply Channel

### Three Strategies (pick one)

| Strategy | How It Works | Coding Tool Requirement | Complexity |
|----------|-------------|------------------------|------------|
| **MCP tool** | Agent calls `lark_send_message(chat_id, content)` via MCP server | Must support MCP (Claude Code, Cline, Continue.dev with MCP) | Low — standard protocol |
| **Post-process** | Daemon detects agent's raw output text and calls Lark API itself | None — works with any CLI | Lowest — no tool config needed |
| **Injected function** | Daemon prepends reply instructions and placeholder tool call to prompt | None — LLM outputs structured JSON, daemon parses it | Low — single function in prompt |

### MCP Tool Approach (Recommended)

```python
# lark_reply_tool.py — runs as part of the MCP server
@mcp.tool()
async def lark_send_message(
    receive_id: str,
    content: str,
    receive_id_type: str = "chat_id",
) -> dict:
    """Send a message to a Lark chat."""
    token = get_lark_access_token()
    resp = requests.post(
        f"{LARK_BASE_URL}/im/v1/messages",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "receive_id": receive_id,
            "msg_type": "text",
            "content": json.dumps({"text": content}),
        },
        params={"receive_id_type": receive_id_type},
    )
    return resp.json()
```

### Post-Processing Approach (Simplest)

```python
# In the daemon, after coding tool finishes:
def reply_via_post_process(agent_output: str, payload: dict):
    """Send the agent's raw text output back to Lark."""
    if not agent_output.strip():
        return
    lark_api.send_message(
        chat_id=payload["chat_id"],
        text=agent_output.strip(),
    )
```

No special agent configuration needed. Every coding tool works. Trade-off: less structured replies, no way for agent to call other Lark tools (create docs, search wiki, etc.).

### Injected Function Approach

The daemon prepends to the agent prompt:

```
You have access to this function:

def reply_to_lark(chat_id: str, content: str):
    """Send a reply back to the Lark chat."""
    # Returns JSON: {"status": "sent", "message_id": "..."}

When you want to reply, output EXACTLY this JSON on its own line:
{"action": "reply", "chat_id": "<chat_id>", "content": "<your message>"}
```

The daemon parses the last JSON line from the agent's output and calls the Lark API. Zero tool configuration needed.

---

## Two-Stage Routing (The Secret Sauce)

Instead of one monolithic agent, the system uses two calls:

### Why Two Stages?

| Aspect | Single monolithic agent | Two-stage routing |
|--------|----------------------|-------------------|
| **System prompt size** | Must describe ALL agents → large, expensive | Router prompt is ~200 tokens |
| **Tool load** | Must load ALL tools → slow | Router needs no tools, agents load only theirs |
| **Routing quality** | Diluted by irrelevant context | Focused router → better accuracy |
| **Cost per message** | Always pays for the full agent | Router is ~1/10 the cost |
| **Adding agents** | Updates system prompt (could degrade routing) | Just add to registry + create workspace |

### Stage 1: Router

```
Input:  [agent list] + [message text]
Output: agent_id (single word, no explanation)
Model:  any small/cheap LLM (classify-only task)
Cost:   ~50-100 tokens
```

### Stage 2: Target Agent

```
Input:  [full system prompt] + [conversation history] + [current message] + [reply instructions]
Output: Tool calls (reply, search, etc.)
Model:  full coding tool with all capabilities
Cost:   whatever the task requires (search, code gen, read files, etc.)
```

---

## Security Model

| Concern | Solution | Portable? |
|---------|----------|-----------|
| **Lark webhook authenticity** | AES decryption + SHA-256 signature verification | ✅ Pure crypto, any language |
| **Event authenticity** | Verification token check | ✅ Pure string comparison |
| **Bot credentials** | Stored in environment variables (`.env`) | ✅ Universal |
| **Queue access** | Bearer token / password | ✅ Standard |
| **API keys at rest** | AES-256-CBC encrypted file at `~/.config/mcp-credentials/credentials.json` | ✅ File-based, portable |
| **OAuth token refresh** | Abstract `OAuthManager` base class — auto-refresh before expiry | ✅ Pure logic, subclass per service |
| **Conversation data** | Never stored — exists only in-flight (queue → process → reply) | ✅ Design pattern |

---

## Portability Summary

| Component | Depends On | Swap Cost |
|-----------|-----------|-----------|
| `AESCipher` (crypto) | `pycryptodome` | Zero — drop-in module |
| `LarkWebhookHandler` (decrypt, verify, route) | Pure Python + `requests` | Zero — include the module |
| Cloud HTTP host | Any HTTP runtime | Minimal — mount the route |
| Message queue | Any queue with push/pop | Trivial — adapt 2 calls |
| Agent workspace format | None | Zero — convention only |
| **Coding Tool Adapter** | **The specific LLM tool** | **Low — implement 1 file** |
| Reply mechanism | MCP / HTTP / post-process | Low — choose strategy |
| OS daemon lifecycle | launchd / systemd / nssm | Medium — native per OS |
| Agent SYSTEM.md content | LLM's prompt format | Low — rewrite prompt text |

**To port this to another product, you need to:**
1. Copy `lark_webhook_handler.py` + `encryption.py` — zero changes
2. Deploy the webhook route on any HTTP host — 10 lines
3. Set up a queue — 5 minutes
4. Write one adapter class for your LLM tool — ~30 lines
5. Create agent workspaces — just SYSTEM.md files
6. Choose a reply strategy — one line in registry config

---

## Appendix A: WebSocket Relay (Low-Latency Alternative)

For scenarios where the Redis queue latency (~1s polling interval) is too high, add a Deno Deploy relay:

```
Cloud FastAPI ──POST /event/{machine_id}/{path}──▶ Deno Relay ──WebSocket──▶ Local Daemon
```

The relay is a 50-line Deno server:

```typescript
// relay/server.ts
const clients = new Map<string, WebSocket>();

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";

  // WebSocket registration
  if (url.pathname.startsWith("/client/")) {
    const id = url.pathname.split("/")[2];
    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.onopen = () => clients.set(id, socket);
    socket.onclose = () => clients.delete(id);
    socket.onmessage = (e) => console.log("ack", e.data);
    return response;
  }

  // Event forwarding
  if (url.pathname.startsWith("/event/")) {
    const id = url.pathname.split("/")[2];
    const path = "/" + url.pathname.split("/").slice(3).join("/");
    const client = clients.get(id);
    if (!client) return new Response("offline", { status: 503 });
    if (client.token !== token) return new Response("unauthorized", { status: 401 });
    client.send(JSON.stringify({ type: "lark_event", path, payload: await req.text() }));
    return new Response("ok", { status: 202 });
  }
});
```

**Trade-off:** WebSocket relay loses events when the local machine is off. The queue-based approach does not. Best practice: use both (dual delivery).

---

## Appendix B: Alternative Queue Push/Pop Implementations

### Upstash Redis (used in production)

```python
# Push (cloud side)
requests.post(REDIS_URL,
    json=["RPUSH", f"lark:events:{app_id}", json.dumps(context)],
    headers={"Authorization": f"Bearer {REDIS_TOKEN}"})

# Pop (local side)
resp = requests.post(REDIS_URL,
    json=["BLPOP", f"lark:events:{app_id}", "1"],
    headers={"Authorization": f"Bearer {REDIS_TOKEN}"})
result = resp.json()["result"]
if result:
    payload = json.loads(result[1])
```

### RabbitMQ

```python
# Push
channel.basic_publish(
    exchange="", routing_key=f"lark:{app_id}",
    body=json.dumps(context))

# Pop
def callback(ch, method, properties, body):
    payload = json.loads(body)
    asyncio.create_task(handle(payload))
channel.basic_consume(queue=f"lark:{app_id}", on_message_callback=callback)
```

### Postgres (LISTEN/NOTIFY + polling)

```python
# Push
conn.execute("INSERT INTO lark_queue (app_id, payload) VALUES (%s, %s)",
    (app_id, json.dumps(context)))
conn.execute("NOTIFY lark_queue_channel, %s", (app_id,))

# Pop
conn.execute("SELECT payload FROM lark_queue WHERE app_id = %s ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED", (app_id,))
row = conn.fetchone()
if row:
    payload = json.loads(row[0])
    conn.execute("DELETE FROM lark_queue WHERE id = %s", (row.id,))
```

### File-based (simplest, single machine)

```bash
# Push — cloud writes to mounted filesystem or local HTTP puts file
echo '{"chat_id": "...", "text": "hello"}' > /tmp/lark-events/$(uuidgen).json

# Pop — daemon watches directory
inotifywait -m /tmp/lark-events/ -e create | while read path action file; do
    payload=$(cat "$path/$file")
    rm "$path/$file"
    handle "$payload"
done
```

---

## Appendix C: Migration Guide

### From Claude Code to Another Tool

1. **Implement `CodingToolAdapter`** — one class, ~30 lines
2. **Update `agent_registry.yaml`** — set `agent_adapter` to your new adapter name
3. **Choose reply strategy** — either post-process (easiest) or write a lightweight MCP/HTTP reply server
4. **Convert `CLAUDE.md` → `SYSTEM.md`** — same content, rename file

### Adding a New Reply Tool

1. Run an HTTP server on localhost that the coding tool can call
2. Inject the tool definition into the prompt (or use MCP if supported)
3. The server receives `{chat_id, content}`, calls Lark API, returns success
