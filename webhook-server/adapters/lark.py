import json
import hashlib
import hmac
import time
from datetime import datetime, timezone
from typing import Optional

import httpx

from webhook_server.adapters import ChatPlatformAdapter
from webhook_server.crypto.lark_aes import lark_aes_decrypt
from webhook_server.models import HistoryEntry, StandardContextPayload
from webhook_server.settings import Settings

LARK_BASE_URL = "https://open.larksuite.com/open-apis"
LARK_BASE_URL_CN = "https://open.feishu.cn/open-apis"


class LarkPlatformAdapter(ChatPlatformAdapter):
    def __init__(self, settings: Settings):
        self.app_id = settings.lark_app_id
        self.app_secret = settings.lark_app_secret
        self.verify_token = settings.lark_verify_token
        self._access_token: Optional[str] = None
        self._token_expiry: float = 0
        self._decrypted_body: Optional[str] = None

        if self.app_id and self.app_id.startswith("cli_"):
            self._base_url = LARK_BASE_URL
        else:
            self._base_url = LARK_BASE_URL_CN

    def verify_webhook(self, headers: dict, body: bytes) -> bool:
        try:
            body_json = json.loads(body)
        except (json.JSONDecodeError, TypeError, UnicodeDecodeError):
            return False

        encrypt = body_json.get("encrypt")
        if not encrypt:
            return False

        try:
            plaintext = lark_aes_decrypt(encrypt, self.app_secret)
        except Exception:
            return False

        self._decrypted_body = plaintext

        timestamp = headers.get("x-lark-request-timestamp", "") or headers.get("X-Lark-Request-Timestamp", "")
        nonce = headers.get("x-lark-request-nonce", "") or headers.get("X-Lark-Request-Nonce", "")
        signature = headers.get("x-lark-signature", "") or headers.get("X-Lark-Signature", "")

        expected = hashlib.sha256(
            f"{timestamp}{nonce}{self.app_secret}{plaintext}".encode()
        ).hexdigest()

        return hmac.compare_digest(signature, expected)

    def parse_event(self, raw_body: bytes) -> Optional[StandardContextPayload]:
        if self._decrypted_body:
            event_data = json.loads(self._decrypted_body)
        elif isinstance(raw_body, (bytes, str)):
            event_data = json.loads(raw_body) if isinstance(raw_body, (bytes, str)) else raw_body
        else:
            event_data = raw_body

        raw_event = event_data.get("event", {})
        if not raw_event:
            return None

        event_type = raw_event.get("event_type", "")
        if event_type != "im.message.receive_v1":
            return None

        sender = raw_event.get("sender", {})
        if sender.get("sender_type") == "bot":
            return None

        msg = raw_event.get("message", {})
        if not msg:
            return None

        chat_id = msg.get("chat_id", "")
        chat_type = msg.get("chat_type", "group")
        message_id = msg.get("message_id", "")
        sender_id = sender.get("sender_id", {}).get("open_id", "")

        text = msg.get("text_without_at_bot") or msg.get("text", "")
        if not text:
            content_str = msg.get("content", "{}")
            try:
                content = json.loads(content_str)
                text = content.get("text", "")
            except (json.JSONDecodeError, TypeError):
                text = ""

        mentions = []
        for mention in msg.get("mentions", []):
            name = mention.get("name") or mention.get("key", "")
            if name:
                mentions.append(name)

        return StandardContextPayload(
            platform="lark",
            chat_id=chat_id,
            chat_type=chat_type,
            message_id=message_id,
            sender_id=sender_id,
            text=text,
            mentions=mentions,
            ts=datetime.now(timezone.utc).isoformat(),
            raw_event=raw_event,
        )

    def handle_verification_challenge(self, body: bytes) -> Optional[dict]:
        try:
            body_json = json.loads(body)
        except (json.JSONDecodeError, TypeError):
            return None

        if body_json.get("type") == "url_verification":
            return {"challenge": body_json.get("challenge", "")}
        return None

    async def _get_access_token(self) -> str:
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

    async def fetch_history(self, chat_id: str, limit: int = 20) -> list[HistoryEntry]:
        token = await self._get_access_token()
        params = {
            "container_id_type": "chat",
            "container_id": chat_id,
            "page_size": min(limit, 50),
            "sort_type": "ByCreateTimeDesc",
        }
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self._base_url}/im/v1/messages",
                params=params,
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            data = resp.json()

        items = data.get("data", {}).get("items", [])
        entries = []
        for item in items:
            sender = item.get("sender", {})
            body_data = item.get("body", {})
            content = body_data.get("content", "{}")
            try:
                content_parsed = json.loads(content)
                text = content_parsed.get("text", "")
            except json.JSONDecodeError:
                text = content

            entries.append(
                HistoryEntry(
                    sender_id=sender.get("id", ""),
                    sender_name=sender.get("name", ""),
                    text=text,
                    ts=item.get("create_time", ""),
                )
            )

        entries.reverse()
        return entries

    async def send_message(self, chat_id: str, text: str, **kwargs) -> str:
        token = await self._get_access_token()
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

    def build_routing_key(self, config: dict) -> str:
        return f"lark:{config['routing_key']}"

    def normalize_mentions(self, text: str) -> str:
        return text


from webhook_server.adapters import register_adapter

register_adapter("lark", LarkPlatformAdapter)
