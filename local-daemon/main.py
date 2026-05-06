import asyncio
import json
import logging
import os
import signal
import sys
from argparse import ArgumentParser
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv

_project_root = Path(__file__).resolve().parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from adapters.coding_tool import ADAPTER_MAP, GenericCLIAdapter, CodingToolAdapter
from registry import find_registry_path, load_registry, lookup_project
from router import route

load_dotenv()

logger = logging.getLogger(__name__)

LARK_BASE_URL_CN = "https://open.feishu.cn/open-apis"
LARK_BASE_URL = "https://open.larksuite.com/open-apis"

PLATFORM_REPLY_CLIENTS: dict = {}


def _lark_base_url(app_id: str) -> str:
    return LARK_BASE_URL if (app_id and app_id.startswith("cli_")) else LARK_BASE_URL_CN


class LarkReplyClient:
    def __init__(self, app_id: str, app_secret: str):
        self.app_id = app_id
        self.app_secret = app_secret
        self._base_url = _lark_base_url(app_id)
        self._access_token: Optional[str] = None
        self._token_expiry: float = 0

    async def _get_token(self) -> str:
        import time

        now = time.time()
        if self._access_token and self._token_expiry > now + 300:
            return self._access_token

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self._base_url}/auth/v3/tenant_access_token/internal",
                json={"app_id": self.app_id, "app_secret": self.app_secret},
                headers={"Content-Type": "application/json; charset=utf-8"},
            )
            resp.raise_for_status()
            data = resp.json()

        self._access_token = data.get("tenant_access_token", "")
        expire = data.get("expire", 7200)
        self._token_expiry = now + expire
        return self._access_token

    async def send_message(self, chat_id: str, text: str, **kwargs) -> str:
        token = await self._get_token()
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self._base_url}/im/v1/messages",
                params={"receive_id_type": "chat_id"},
                json={
                    "receive_id": chat_id,
                    "msg_type": "text",
                    "content": json.dumps({"text": text}),
                },
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json; charset=utf-8",
                },
            )
            resp.raise_for_status()
            data = resp.json()
        return data.get("data", {}).get("message_id", "")


class SlackReplyClient:
    def __init__(self, bot_token: str):
        self.bot_token = bot_token

    async def send_message(self, chat_id: str, text: str, **kwargs) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://slack.com/api/chat.postMessage",
                json={"channel": chat_id, "text": text},
                headers={
                    "Authorization": f"Bearer {self.bot_token}",
                    "Content-Type": "application/json; charset=utf-8",
                },
            )
            resp.raise_for_status()
            data = resp.json()
        return data.get("ts", "")


class DiscordReplyClient:
    def __init__(self, bot_token: str):
        self.bot_token = bot_token

    async def send_message(self, chat_id: str, text: str, **kwargs) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://discord.com/api/v10/channels/{chat_id}/messages",
                json={"content": text},
                headers={
                    "Authorization": f"Bot {self.bot_token}",
                    "Content-Type": "application/json; charset=utf-8",
                },
            )
            resp.raise_for_status()
            data = resp.json()
        return data.get("id", "")


class TelegramReplyClient:
    def __init__(self, bot_token: str):
        self.bot_token = bot_token

    async def send_message(self, chat_id: str, text: str, **kwargs) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{self.bot_token}/sendMessage",
                json={"chat_id": chat_id, "text": text},
            )
            resp.raise_for_status()
            data = resp.json()
        return str(data.get("result", {}).get("message_id", ""))


def _init_platform_clients():
    global PLATFORM_REPLY_CLIENTS
    lark_app_id = os.environ.get("LARK_APP_ID")
    lark_app_secret = os.environ.get("LARK_APP_SECRET")
    if lark_app_id and lark_app_secret:
        PLATFORM_REPLY_CLIENTS["lark"] = LarkReplyClient(lark_app_id, lark_app_secret)

    slack_token = os.environ.get("SLACK_BOT_TOKEN")
    if slack_token:
        PLATFORM_REPLY_CLIENTS["slack"] = SlackReplyClient(slack_token)

    discord_token = os.environ.get("DISCORD_BOT_TOKEN")
    if discord_token:
        PLATFORM_REPLY_CLIENTS["discord"] = DiscordReplyClient(discord_token)

    telegram_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if telegram_token:
        PLATFORM_REPLY_CLIENTS["telegram"] = TelegramReplyClient(telegram_token)


def get_queue_adapter():
    queue_provider = os.environ.get("QUEUE_PROVIDER", "upstash")
    if queue_provider == "postgres":
        from webhook_server.message_queue.postgres_queue import PostgresQueueAdapter
        return PostgresQueueAdapter(os.environ.get("POSTGRES_URL", ""))
    else:
        from webhook_server.message_queue.upstash_redis import UpstashRedisQueueAdapter

        return UpstashRedisQueueAdapter(
            os.environ.get("UPSTASH_REDIS_URL", ""),
            os.environ.get("UPSTASH_REDIS_TOKEN", ""),
        )


def build_prompt(payload, reply_mode: str = "post_process") -> str:
    parts = []
    parts.append(f"[Platform: {payload.platform}]")
    parts.append(f"[Sender: {payload.sender_name}]")
    parts.append(f"[Timestamp: {payload.ts}]")
    if payload.channel_name:
        parts.append(f"[Channel: {payload.channel_name}]")

    parts.append("")
    parts.append("--- Conversation History ---")
    if payload.history:
        for entry in payload.history:
            name = _get_attr(entry, "sender_name")
            text = _get_attr(entry, "text")
            parts.append(f"{name}: {text}")
    else:
        parts.append("(no prior history)")

    parts.append("")
    parts.append("--- Current Message ---")
    parts.append(f"{payload.sender_name}: {payload.text}")

    if reply_mode == "inline":
        parts.append("")
        parts.append("--- Reply Instructions ---")
        parts.append("To reply, output EXACTLY this JSON on its own line as your final output:")
        parts.append('{"action": "reply", "chat_id": "CHAT_ID", "content": "your message here"}')
        parts.append(f"The chat_id for this conversation is: {payload.chat_id}")

    return "\n".join(parts)


def parse_inline_reply(stdout: str) -> Optional[dict]:
    lines = stdout.strip().splitlines()
    for line in reversed(lines):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict) and obj.get("action") == "reply":
            return obj
    return None


def _get_attr(obj, name):
    if isinstance(obj, dict):
        return obj.get(name, "")
    return getattr(obj, name, "")


async def handle(payload, project: dict):
    stage1_agent_id = None
    try:
        router_adapter_name = project.get("router_adapter", "claude")
        router_adapter = _resolve_adapter(router_adapter_name)
        router_cwd = project.get("root", ".")
        stage1_agent_id = await route(payload, project, router_adapter, cwd=router_cwd)
    except Exception as e:
        logger.exception("Stage 1 routing failed: %s", e)
        return

    if not stage1_agent_id:
        logger.info("No agent matched for message from %s on %s", payload.sender_name, payload.platform)
        return

    logger.info("Routing to agent=%s for message from %s", stage1_agent_id, payload.sender_name)

    reply_mode = project.get("reply_mode", "post_process")
    prompt = build_prompt(payload, reply_mode=reply_mode)

    try:
        agent_adapter_name = project.get("agent_adapter", "claude")
        agent_adapter = _resolve_adapter(agent_adapter_name)
        cwd = f"{project.get('root', '.')}/{stage1_agent_id}"
        timeout = int(os.environ.get("AGENT_TIMEOUT", "120"))
        result = await agent_adapter.run(prompt=prompt, cwd=cwd, timeout=timeout)
    except Exception as e:
        logger.exception("Stage 2 agent execution failed: %s", e)
        return

    logger.info(
        "Agent %s completed with returncode=%d, stdout_len=%d, stderr_len=%d",
        stage1_agent_id, result.returncode, len(result.stdout), len(result.stderr),
    )

    if reply_mode == "mcp_tool":
        logger.info("Reply mode is mcp_tool — agent handles reply itself")
        return

    if reply_mode == "inline":
        action = parse_inline_reply(result.stdout)
        if action:
            reply_text = action.get("content", "")
            reply_chat_id = action.get("chat_id", payload.chat_id)
        else:
            logger.warning("No inline reply action found in agent output, using raw stdout")
            reply_text = result.stdout.strip()
            reply_chat_id = payload.chat_id
    else:
        reply_text = result.stdout.strip()
        reply_chat_id = payload.chat_id

    if not reply_text:
        logger.info("No reply text to send")
        return

    platform = project.get("platform", payload.platform)
    client = PLATFORM_REPLY_CLIENTS.get(platform)
    if not client:
        logger.warning("No reply client configured for platform: %s", platform)
        return

    try:
        msg_id = await client.send_message(reply_chat_id, reply_text)
        logger.info("Reply sent to %s chat %s, message_id=%s", platform, reply_chat_id, msg_id)
    except Exception as e:
        logger.exception("Failed to send reply via %s: %s", platform, e)


def _resolve_adapter(name: str) -> CodingToolAdapter:
    if name in ADAPTER_MAP:
        return ADAPTER_MAP[name]
    command_str = os.environ.get(f"ADAPTER_{name.upper()}_CMD")
    if command_str:
        import shlex
        return GenericCLIAdapter(shlex.split(command_str))
    if name in ADAPTER_MAP:
        return ADAPTER_MAP[name]
    return ADAPTER_MAP["claude"]


async def poll_once(queue_adapter, registry: dict):
    platforms = registry.get("platforms", [])
    for entry in platforms:
        routing_key = entry.get("routing_key")
        if not routing_key:
            continue
        try:
            raw = await queue_adapter.pop(routing_key, timeout=1)
        except Exception:
            logger.debug("Queue pop failed for key=%s", routing_key, exc_info=True)
            continue

        if raw:
            payload = _deserialize_payload(raw)
            if payload:
                asyncio.create_task(handle(payload, entry))


def _deserialize_payload(raw: str):
    try:
        from webhook_server.models import StandardContextPayload
        return StandardContextPayload.from_json(raw)
    except ImportError:
        data = json.loads(raw)
        return _DictPayload(data)
    except Exception as e:
        logger.warning("Failed to deserialize payload: %s", e)
        return None


class _DictPayload:
    def __init__(self, data: dict):
        self.__dict__.update(data)
        for k, v in data.items():
            setattr(self, k, v)


async def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    parser = ArgumentParser(description="Local daemon for agent control center")
    parser.add_argument(
        "--config",
        default=None,
        help="Path to agent registry YAML (default: auto-detect or ./agent_registry.yaml)",
    )
    args = parser.parse_args()

    _init_platform_clients()

    registry_path = args.config or find_registry_path()
    logger.info("Loading registry from: %s", registry_path)
    registry = load_registry(registry_path)

    if not registry.get("platforms"):
        logger.warning("Registry is empty — no platforms configured. Exiting.")
        return

    queue_adapter = get_queue_adapter()

    healthy = await queue_adapter.health()
    if not healthy:
        logger.error("Queue health check failed. Exiting.")
        return

    poll_interval = float(os.environ.get("POLL_INTERVAL", "1"))

    shutdown_event = asyncio.Event()

    def _signal_handler():
        logger.info("Received shutdown signal")
        shutdown_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, _signal_handler)
        except NotImplementedError:
            pass

    logger.info("Daemon started. Polling %d platform(s) every %ss", len(registry["platforms"]), poll_interval)

    while not shutdown_event.is_set():
        try:
            await poll_once(queue_adapter, registry)
        except Exception:
            logger.exception("Error in poll cycle")
        try:
            await asyncio.wait_for(shutdown_event.wait(), timeout=poll_interval)
        except asyncio.TimeoutError:
            pass

    logger.info("Daemon stopped.")


if __name__ == "__main__":
    asyncio.run(main())
