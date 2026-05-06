from typing import Optional

import httpx

from message_queue import QueueAdapter


class UpstashRedisQueueAdapter(QueueAdapter):
    def __init__(self, url: str, token: str):
        self.url = url
        self.token = token

    async def push(self, key: str, payload: str) -> None:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.url,
                json=["RPUSH", key, payload],
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10,
            )
            resp.raise_for_status()

    async def pop(self, key: str, timeout: int = 0) -> Optional[str]:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.url,
                json=["BLPOP", key, str(timeout)],
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=timeout + 10,
            )
            result = resp.json().get("result")
            if result and len(result) > 1:
                return result[1]
            return None

    async def health(self) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    self.url,
                    json=["PING"],
                    headers={"Authorization": f"Bearer {self.token}"},
                    timeout=5,
                )
                resp.raise_for_status()
                return resp.json().get("result") == "PONG"
        except Exception:
            return False
