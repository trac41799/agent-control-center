import json
import re
from datetime import datetime, timezone
from typing import Optional

import httpx
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.exceptions import InvalidSignature

from adapters import ChatPlatformAdapter, register_adapter
from models import HistoryEntry, StandardContextPayload
from settings import Settings


class DiscordPlatformAdapter(ChatPlatformAdapter):
    DISCORD_API = "https://discord.com/api/v10"

    def __init__(self, settings: Settings):
        self.public_key = settings.discord_public_key
        self.bot_token = settings.discord_bot_token
        self.application_id: str = ""
        self.public_key_bytes = bytes.fromhex(self.public_key) if self.public_key else b""

    def verify_webhook(self, headers: dict, body: bytes) -> bool:
        signature_hex = headers.get("x-signature-ed25519", "")
        timestamp = headers.get("x-signature-timestamp", "")

        if not signature_hex or not timestamp:
            return False

        if not self.public_key_bytes:
            return False

        try:
            signature_bytes = bytes.fromhex(signature_hex)
        except ValueError:
            return False

        message = f"{timestamp}{body.decode()}".encode()

        try:
            public_key = Ed25519PublicKey.from_public_bytes(self.public_key_bytes)
            public_key.verify(signature_bytes, message)
            return True
        except (InvalidSignature, Exception):
            return False

    def handle_verification_challenge(self, body: bytes) -> Optional[dict]:
        try:
            body_json = json.loads(body)
        except json.JSONDecodeError:
            return None

        if body_json.get("type") == 1:
            return {"type": 1}
        return None

    def parse_event(self, raw_body: bytes) -> Optional[StandardContextPayload]:
        try:
            body_json = json.loads(raw_body)
        except json.JSONDecodeError:
            return None

        interaction_type = body_json.get("type")
        if interaction_type == 1:
            return None

        ts = datetime.now(timezone.utc).isoformat()
        data = body_json.get("data", {})
        channel_id = body_json.get("channel_id", "")
        guild_id = body_json.get("guild_id", "")
        user = body_json.get("user", {}) or body_json.get("member", {}).get("user", {})
        sender_id = user.get("id", "")
        sender_name = user.get("username", "")

        if interaction_type == 2:
            command_name = data.get("name", "")
            options = data.get("options", [])
            text_parts = [f"/{command_name}"]
            for opt in options:
                opt_name = opt.get("name", "")
                opt_value = opt.get("value", "")
                if isinstance(opt_value, str):
                    text_parts.append(opt_value)
                elif isinstance(opt_value, dict):
                    text_parts.append(json.dumps(opt_value))
                else:
                    text_parts.append(str(opt_value))
            text = " ".join(text_parts)

            return StandardContextPayload(
                platform="discord",
                chat_id=channel_id,
                chat_type="guild" if guild_id else "dm",
                channel_name="",
                message_id=body_json.get("id", ""),
                sender_id=sender_id,
                sender_name=sender_name,
                text=text,
                ts=ts,
                raw_event=body_json,
            )

        if interaction_type == 3:
            custom_id = data.get("custom_id", "")
            component_type = data.get("component_type", 0)
            values = data.get("values", [])
            text = f"component:{custom_id}"
            if values:
                text += " " + " ".join(values)

            return StandardContextPayload(
                platform="discord",
                chat_id=channel_id,
                chat_type="guild" if guild_id else "dm",
                channel_name="",
                message_id=body_json.get("id", ""),
                sender_id=sender_id,
                sender_name=sender_name,
                text=text,
                ts=ts,
                raw_event=body_json,
            )

        if interaction_type == 5:
            custom_id = data.get("custom_id", "")
            components = data.get("components", [])
            values_parts = []
            for comp in components:
                for c in comp.get("components", []):
                    val = c.get("value", "")
                    if val:
                        values_parts.append(val)
            text = "modal:" + custom_id
            if values_parts:
                text += " " + " ".join(values_parts)

            return StandardContextPayload(
                platform="discord",
                chat_id=channel_id,
                chat_type="guild" if guild_id else "dm",
                channel_name="",
                message_id=body_json.get("id", ""),
                sender_id=sender_id,
                sender_name=sender_name,
                text=text,
                ts=ts,
                raw_event=body_json,
            )

        return None

    async def _get_app_id(self) -> str:
        if self.application_id:
            return self.application_id

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.DISCORD_API}/oauth2/applications/@me",
                headers={"Authorization": f"Bot {self.bot_token}"},
            )
            resp.raise_for_status()
            data = resp.json()
            self.application_id = data.get("id", "")
            return self.application_id

    async def fetch_history(self, chat_id: str, limit: int = 20) -> list[HistoryEntry]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.DISCORD_API}/channels/{chat_id}/messages",
                headers={"Authorization": f"Bot {self.bot_token}"},
                params={"limit": limit},
            )
            resp.raise_for_status()
            messages = resp.json()

        entries = []
        for msg in messages:
            author = msg.get("author", {})
            entries.append(
                HistoryEntry(
                    sender_id=author.get("id", ""),
                    sender_name=author.get("username", ""),
                    text=msg.get("content", ""),
                    ts=msg.get("timestamp", ""),
                )
            )

        entries.reverse()
        return entries

    async def send_message(self, chat_id: str, text: str, **kwargs) -> str:
        payload = {"content": text}
        if kwargs.get("tts"):
            payload["tts"] = True
        if kwargs.get("embeds"):
            payload["embeds"] = kwargs["embeds"]

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.DISCORD_API}/channels/{chat_id}/messages",
                headers={
                    "Authorization": f"Bot {self.bot_token}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("id", "")

    def build_routing_key(self, config: dict) -> str:
        return f"discord:{config['routing_key']}"

    def normalize_mentions(self, text: str) -> str:
        text = re.sub(r"<@!?\d+>", "", text)
        text = re.sub(r"<#\d+>", "", text)
        text = re.sub(r"<@&\d+>", "", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()


register_adapter("discord", DiscordPlatformAdapter)
