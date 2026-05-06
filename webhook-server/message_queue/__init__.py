from abc import ABC, abstractmethod
from typing import Optional


class QueueAdapter(ABC):
    @abstractmethod
    async def push(self, key: str, payload: str) -> None:
        ...

    @abstractmethod
    async def pop(self, key: str, timeout: int = 0) -> Optional[str]:
        ...

    @abstractmethod
    async def health(self) -> bool:
        ...


def get_queue_adapter() -> QueueAdapter:
    from settings import settings

    if settings.queue_provider == "postgres":
        from message_queue.postgres_queue import PostgresQueueAdapter

        return PostgresQueueAdapter(settings.postgres_url)
    else:
        from message_queue.upstash_redis import UpstashRedisQueueAdapter

        return UpstashRedisQueueAdapter(
            settings.upstash_redis_url, settings.upstash_redis_token
        )
