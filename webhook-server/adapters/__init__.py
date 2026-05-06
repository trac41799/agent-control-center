from abc import ABC, abstractmethod
from typing import Optional

from models import StandardContextPayload, HistoryEntry

_adapter_registry: dict[str, type] = {}


class ChatPlatformAdapter(ABC):
    """One implementation per chat platform. Isolates all platform-specific logic."""

    @abstractmethod
    def verify_webhook(self, headers: dict, body: bytes) -> bool:
        """Platform-specific signature/encryption verification."""

    @abstractmethod
    def handle_verification_challenge(self, body: bytes) -> Optional[dict]:
        """Handle URL verification challenges (Lark, Slack, Discord).
        Returns a response dict if this is a challenge, None otherwise."""

    @abstractmethod
    def parse_event(self, raw_body: bytes) -> Optional[StandardContextPayload]:
        """Extract StandardContextPayload from raw platform event.
        Returns None for events that should not be processed."""

    @abstractmethod
    async def fetch_history(self, chat_id: str, limit: int = 20) -> list[HistoryEntry]:
        """Fetch recent messages via platform API."""

    @abstractmethod
    async def send_message(self, chat_id: str, text: str, **kwargs) -> str:
        """Send a message via platform API. Returns message_id."""

    @abstractmethod
    def build_routing_key(self, config: dict) -> str:
        """Build the unique routing key for this platform instance."""

    @abstractmethod
    def normalize_mentions(self, text: str) -> str:
        """Strip platform-specific mention syntax so agents see clean text."""


def register_adapter(name: str, adapter_cls: type) -> None:
    _adapter_registry[name] = adapter_cls


def get_adapter(name: str) -> Optional[type]:
    return _adapter_registry.get(name)
