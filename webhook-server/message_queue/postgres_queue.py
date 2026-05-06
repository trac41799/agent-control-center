from typing import Optional

from message_queue import QueueAdapter


class PostgresQueueAdapter(QueueAdapter):
    def __init__(self, dsn: str):
        self.dsn = dsn
        self.pool = None

    async def _ensure_pool(self):
        if self.pool is None:
            import asyncpg

            self.pool = await asyncpg.create_pool(self.dsn)
        return self.pool

    async def push(self, key: str, payload: str) -> None:
        pool = await self._ensure_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO chat_events (queue_key, payload, created_at) VALUES ($1, $2, NOW())",
                key,
                payload,
            )
            await conn.execute("NOTIFY chat_event, $1", key)

    async def pop(self, key: str, timeout: int = 0) -> Optional[str]:
        pool = await self._ensure_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
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

    async def health(self) -> bool:
        try:
            pool = await self._ensure_pool()
            async with pool.acquire() as conn:
                await conn.execute("SELECT 1")
            return True
        except Exception:
            return False
