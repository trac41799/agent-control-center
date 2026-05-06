import hashlib
import hmac
import json
import re
import time
from datetime import datetime, timezone
from typing import Optional

import httpx

from adapters import ChatPlatformAdapter, register_adapter
from models import HistoryEntry, StandardContextPayload
from settings import Settings


class SlackPlatformAdapter(ChatPlatformAdapter):
    SLACK_API = "https://slack.com/api"

    def __init__(self, settings: Settings):
        self.signing_secret = settings.slack_signing_secret
        self.bot_token = settings.slack_bot_token
        self.bot_user_id: Optional[str] = None

    def verify_webhook(self, headers: dict, body: bytes) -> bool:
        timestamp = headers.get("x-slack-request-timestamp", "")
        signature = headers.get("x-slack-signature", "")

        if not timestamp or not signature:
            return False

        if abs(time.time() - int(timestamp)) > 300:
            return False

        base_string = f"v0:{timestamp}:{body.decode()}"
        expected = "v0=" + hmac.new(
            self.signing_secret.encode(),
            base_string.encode(),
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(signature, expected)

    def handle_verification_challenge(self, body: bytes) -> Optional[dict]:
        try:
            body_json = json.loads(body)
        except json.JSONDecodeError:
            return None

        if body_json.get("type") == "url_verification":
            return {"challenge": body_json["challenge"]}
        return None

    def parse_event(self, raw_body: bytes) -> Optional[StandardContextPayload]:
        try:
            body_json = json.loads(raw_body)
        except json.JSONDecodeError:
            return None

        if body_json.get("type") != "event_callback":
            return None

        inner = body_json.get("event", {})
        if inner.get("type") != "message":
            return None

        subtype = inner.get("subtype")
        if subtype in ("bot_message", "message_changed", "message_deleted"):
            return None

        is_dm = inner.get("channel_type") == "im"

        if not is_dm:
            text = inner.get("text", "")
            mentioned = self._is_bot_mentioned(text)
            if not mentioned:
                return None

        chat_id = inner["channel"]
        chat_type = "dm" if is_dm else "channel"
        message_id = inner.get("ts", "")
        sender_id = inner.get("user", "")
        text = self._clean_slack_markup(inner.get("text", ""))
        mentions = self._extract_mentions(inner.get("text", ""))

        ts = inner.get("event_ts", datetime.now(timezone.utc).isoformat())

        return StandardContextPayload(
            platform="slack",
            chat_id=chat_id,
            chat_type=chat_type,
            message_id=message_id,
            sender_id=sender_id,
            text=text,
            mentions=mentions,
            ts=ts,
            raw_event=body_json,
        )

    def _is_bot_mentioned(self, text: str) -> bool:
        if not self.bot_user_id:
            return bool(re.search(r"<@[A-Z0-9]+>", text))
        return f"<@{self.bot_user_id}>" in text

    def _extract_mentions(self, text: str) -> list:
        return re.findall(r"<@([A-Z0-9]+)>", text)

    def _clean_slack_markup(self, text: str) -> str:
        text = re.sub(r"<@[A-Z0-9]+>", "", text)
        text = re.sub(r"<#[A-Z0-9]+\|([^>]+)>", r"\1", text)
        text = re.sub(r"<https?://[^|>]+\|([^>]+)>", r"\1", text)
        text = re.sub(r"<(https?://[^>]+)>", r"\1", text)
        text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
        return text.strip()

    async def _get_bot_user_id(self) -> str:
        if self.bot_user_id:
            return self.bot_user_id

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.SLACK_API}/auth.test",
                headers={"Authorization": f"Bearer {self.bot_token}"},
            )
            data = resp.json()
            self.bot_user_id = data.get("user_id", "")
            return self.bot_user_id

    async def fetch_history(self, chat_id: str, limit: int = 20) -> list[HistoryEntry]:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.SLACK_API}/conversations.history",
                headers={"Authorization": f"Bearer {self.bot_token}"},
                json={"channel": chat_id, "limit": limit},
            )
            data = resp.json()
            messages = data.get("messages", [])

            entries = []
            for msg in messages:
                user = msg.get("user", "")
                text = self._clean_slack_markup(msg.get("text", ""))
                ts = msg.get("ts", "")
                entries.append(
                    HistoryEntry(sender_id=user, sender_name="", text=text, ts=ts)
                )

            entries.reverse()
            return entries

    async def send_message(self, chat_id: str, text: str, **kwargs) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.SLACK_API}/chat.postMessage",
                headers={"Authorization": f"Bearer {self.bot_token}"},
                json={
                    "channel": chat_id,
                    "text": text,
                    "mrkdwn": kwargs.get("mrkdwn", True),
                },
            )
            data = resp.json()
            return data["ts"]

    def build_routing_key(self, config: dict) -> str:
        return f"slack:{config['routing_key']}"

    def normalize_mentions(self, text: str) -> str:
        text = re.sub(r"<@[A-Z0-9]+>", "", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()


register_adapter("slack", SlackPlatformAdapter)
