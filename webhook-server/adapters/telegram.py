import json
import re
from datetime import datetime, timezone
from typing import Optional

import httpx

from adapters import ChatPlatformAdapter, register_adapter
from models import HistoryEntry, StandardContextPayload
from settings import Settings


class TelegramPlatformAdapter(ChatPlatformAdapter):
    TGBOT_API = "https://api.telegram.org"

    def __init__(self, settings: Settings):
        self.bot_token = settings.telegram_bot_token
        self.polling_mode: bool = False
        self._last_update_id: int = 0

    def verify_webhook(self, headers: dict, body: bytes) -> bool:
        if self.polling_mode:
            return True
        return True

    def handle_verification_challenge(self, body: bytes) -> Optional[dict]:
        return None

    def parse_event(self, raw_body: bytes) -> Optional[StandardContextPayload]:
        try:
            body_json = json.loads(raw_body)
        except json.JSONDecodeError:
            return None

        if "update_id" in body_json and "message" not in body_json and "edited_message" not in body_json and "channel_post" not in body_json:
            callback = body_json.get("callback_query")
            if callback:
                msg = callback.get("message", {})
                user = callback.get("from", {})
                chat_id = str(msg.get("chat", {}).get("id", ""))
                data = callback.get("data", "")
                return StandardContextPayload(
                    platform="telegram",
                    chat_id=chat_id,
                    chat_type="group" if msg.get("chat", {}).get("type") in ("group", "supergroup") else "dm",
                    channel_name=msg.get("chat", {}).get("title", ""),
                    message_id=str(msg.get("message_id", "")),
                    sender_id=str(user.get("id", "")),
                    sender_name=user.get("first_name", ""),
                    sender_username=user.get("username", ""),
                    text=f"callback:{data}",
                    ts=datetime.now(timezone.utc).isoformat(),
                    raw_event=body_json,
                )

            inline = body_json.get("inline_query")
            if inline:
                return None

            return None

        msg = body_json.get("message") or body_json.get("edited_message") or body_json.get("channel_post")
        if not msg:
            return None

        text = msg.get("text") or msg.get("caption", "")
        if not text or not text.strip():
            return None

        from_user = msg.get("from", {})
        chat = msg.get("chat", {})
        chat_id = str(chat.get("id", ""))
        chat_type = "group" if chat.get("type") in ("group", "supergroup") else "dm"
        sender_id = str(from_user.get("id", ""))
        sender_name = from_user.get("first_name", "")
        sender_username = from_user.get("username", "")

        mentions = []
        entities = msg.get("entities", [])
        for entity in entities:
            if entity.get("type") == "mention":
                offset = entity.get("offset", 0)
                length = entity.get("length", 0)
                mention = text[offset : offset + length]
                if mention:
                    mentions.append(mention)
            elif entity.get("type") == "text_mention":
                mentioned_user = entity.get("user", {})
                name = mentioned_user.get("first_name", "")
                if name:
                    mentions.append(name)

        text = self._clean_entities(text, entities)

        ts = str(msg.get("date", "")) if msg.get("date") else datetime.now(timezone.utc).isoformat()

        return StandardContextPayload(
            platform="telegram",
            chat_id=chat_id,
            chat_type=chat_type,
            channel_name=chat.get("title", ""),
            message_id=str(msg.get("message_id", "")),
            sender_id=sender_id,
            sender_name=sender_name,
            sender_username=sender_username,
            text=text.strip(),
            mentions=mentions,
            ts=ts,
            raw_event=body_json,
        )

    def _clean_entities(self, text: str, entities: list) -> str:
        cleaned = text
        for entity in sorted(entities, key=lambda e: e.get("offset", 0), reverse=True):
            offset = entity.get("offset", 0)
            length = entity.get("length", 0)
            etype = entity.get("type", "")
            if etype in ("mention", "text_mention"):
                cleaned = cleaned[:offset] + cleaned[offset + length :]
        return cleaned

    async def send_message(self, chat_id: str, text: str, **kwargs) -> str:
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": kwargs.get("parse_mode", "HTML"),
        }
        if kwargs.get("reply_markup"):
            payload["reply_markup"] = json.dumps(kwargs["reply_markup"])

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.TGBOT_API}/bot{self.bot_token}/sendMessage",
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()

        if not data.get("ok"):
            raise RuntimeError(f"Telegram API error: {data.get('description', 'unknown error')}")

        return str(data["result"]["message_id"])

    async def fetch_history(self, chat_id: str, limit: int = 20) -> list[HistoryEntry]:
        if self.polling_mode:
            return await self._fetch_history_via_updates(limit)

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.TGBOT_API}/bot{self.bot_token}/getUpdates",
                params={"limit": limit, "timeout": 0},
            )
            resp.raise_for_status()
            data = resp.json()

        if not data.get("ok"):
            return []

        entries = []
        for update in data.get("result", []):
            msg = update.get("message") or update.get("edited_message")
            if not msg:
                continue

            msg_chat_id = str(msg.get("chat", {}).get("id", ""))
            if msg_chat_id != chat_id:
                continue

            from_user = msg.get("from", {})
            text = msg.get("text", msg.get("caption", ""))
            ts = str(msg.get("date", ""))
            entries.append(
                HistoryEntry(
                    sender_id=str(from_user.get("id", "")),
                    sender_name=from_user.get("first_name", ""),
                    text=text,
                    ts=ts,
                )
            )

        return entries

    async def _fetch_history_via_updates(self, limit: int) -> list[HistoryEntry]:
        async with httpx.AsyncClient() as client:
            offset = self._last_update_id + 1 if self._last_update_id else None
            params = {"limit": limit, "timeout": 0}
            if offset:
                params["offset"] = offset
            resp = await client.get(
                f"{self.TGBOT_API}/bot{self.bot_token}/getUpdates",
                params=params,
            )
            resp.raise_for_status()
            data = resp.json()

        if not data.get("ok"):
            return []

        entries = []
        for update in data.get("result", []):
            update_id = update.get("update_id", 0)
            if update_id > self._last_update_id:
                self._last_update_id = update_id

            msg = update.get("message") or update.get("edited_message")
            if not msg:
                continue

            from_user = msg.get("from", {})
            text = msg.get("text", msg.get("caption", ""))
            ts = str(msg.get("date", ""))
            entries.append(
                HistoryEntry(
                    sender_id=str(from_user.get("id", "")),
                    sender_name=from_user.get("first_name", ""),
                    text=text,
                    ts=ts,
                )
            )

        return entries

    async def get_updates(self, timeout: int = 30) -> list[dict]:
        params = {"timeout": timeout, "allowed_updates": ["message", "edited_message", "callback_query"]}
        if self._last_update_id:
            params["offset"] = self._last_update_id + 1

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.TGBOT_API}/bot{self.bot_token}/getUpdates",
                params=params,
            )
            resp.raise_for_status()
            data = resp.json()

        if not data.get("ok"):
            return []

        for update in data.get("result", []):
            update_id = update.get("update_id", 0)
            if update_id > self._last_update_id:
                self._last_update_id = update_id

        return data.get("result", [])

    def build_routing_key(self, config: dict) -> str:
        return f"telegram:{config['routing_key']}"

    def normalize_mentions(self, text: str) -> str:
        text = re.sub(r"@\w+", "", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()


register_adapter("telegram", TelegramPlatformAdapter)
