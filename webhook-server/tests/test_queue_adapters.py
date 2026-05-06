import json
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, _project_root)

from message_queue import QueueAdapter, get_queue_adapter
from message_queue.upstash_redis import UpstashRedisQueueAdapter
from message_queue.postgres_queue import PostgresQueueAdapter


@pytest.fixture
def upstash_adapter():
    return UpstashRedisQueueAdapter(
        url="https://example.upstash.io",
        token="test_token",
    )


@pytest.fixture
def pg_adapter():
    return PostgresQueueAdapter(dsn="postgresql://user:pass@localhost/test")


class TestUpstashRedisPush:
    @pytest.mark.asyncio
    async def test_push_sends_correct_json(self, upstash_adapter):
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        async def mock_post(*args, **kwargs):
            return mock_response

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=mock_post
            )
            await upstash_adapter.push("test:key", '{"msg":"hello"}')

            mock_client.return_value.__aenter__.return_value.post.assert_called_once()
            call = mock_client.return_value.__aenter__.return_value.post.call_args
            assert call[0] == (upstash_adapter.url,)
            assert call[1]["json"] == ["RPUSH", "test:key", '{"msg":"hello"}']
            assert call[1]["headers"] == {"Authorization": "Bearer test_token"}
            assert call[1]["timeout"] == 10

    @pytest.mark.asyncio
    async def test_push_with_different_key_and_payload(self, upstash_adapter):
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()

        async def mock_post(*args, **kwargs):
            return mock_response

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=mock_post
            )
            await upstash_adapter.push("queue:app_id", "plain text payload")

            call = mock_client.return_value.__aenter__.return_value.post.call_args
            assert call[1]["json"] == ["RPUSH", "queue:app_id", "plain text payload"]


class TestUpstashRedisPop:
    @pytest.mark.asyncio
    async def test_pop_sends_blpop_with_timeout(self, upstash_adapter):
        mock_response = MagicMock()
        mock_response.json.return_value = {"result": None}
        mock_response.raise_for_status = MagicMock()

        async def mock_post(*args, **kwargs):
            return mock_response

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=mock_post
            )
            await upstash_adapter.pop("test:key", timeout=5)

            call = mock_client.return_value.__aenter__.return_value.post.call_args
            assert call[1]["json"] == ["BLPOP", "test:key", "5"]
            assert call[1]["timeout"] == 15

    @pytest.mark.asyncio
    async def test_pop_default_timeout_zero(self, upstash_adapter):
        mock_response = MagicMock()
        mock_response.json.return_value = {"result": None}
        mock_response.raise_for_status = MagicMock()

        async def mock_post(*args, **kwargs):
            return mock_response

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=mock_post
            )
            await upstash_adapter.pop("test:key")

            call = mock_client.return_value.__aenter__.return_value.post.call_args
            assert call[1]["json"] == ["BLPOP", "test:key", "0"]

    @pytest.mark.asyncio
    async def test_pop_returns_payload_when_present(self, upstash_adapter):
        mock_response = MagicMock()
        mock_response.json.return_value = {"result": ["test:key", '{"msg":"hello"}']}
        mock_response.raise_for_status = MagicMock()

        async def mock_post(*args, **kwargs):
            return mock_response

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=mock_post
            )
            result = await upstash_adapter.pop("test:key")
            assert result == '{"msg":"hello"}'

    @pytest.mark.asyncio
    async def test_pop_returns_none_when_result_none(self, upstash_adapter):
        mock_response = MagicMock()
        mock_response.json.return_value = {"result": None}
        mock_response.raise_for_status = MagicMock()

        async def mock_post(*args, **kwargs):
            return mock_response

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=mock_post
            )
            result = await upstash_adapter.pop("test:key")
            assert result is None

    @pytest.mark.asyncio
    async def test_pop_returns_none_when_empty_result(self, upstash_adapter):
        mock_response = MagicMock()
        mock_response.json.return_value = {"result": []}
        mock_response.raise_for_status = MagicMock()

        async def mock_post(*args, **kwargs):
            return mock_response

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=mock_post
            )
            result = await upstash_adapter.pop("test:key")
            assert result is None


class TestUpstashRedisHealth:
    @pytest.mark.asyncio
    async def test_health_returns_true_on_pong(self, upstash_adapter):
        mock_response = MagicMock()
        mock_response.json.return_value = {"result": "PONG"}
        mock_response.raise_for_status = MagicMock()

        async def mock_post(*args, **kwargs):
            return mock_response

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=mock_post
            )
            result = await upstash_adapter.health()
            assert result is True

            call = mock_client.return_value.__aenter__.return_value.post.call_args
            assert call[1]["json"] == ["PING"]
            assert call[1]["timeout"] == 5

    @pytest.mark.asyncio
    async def test_health_returns_false_on_exception(self, upstash_adapter):
        async def mock_post(*args, **kwargs):
            raise Exception("Connection refused")

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=mock_post
            )
            result = await upstash_adapter.health()
            assert result is False

    @pytest.mark.asyncio
    async def test_health_returns_false_on_http_error(self, upstash_adapter):
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock(side_effect=Exception("401"))

        async def mock_post(*args, **kwargs):
            return mock_response

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=mock_post
            )
            result = await upstash_adapter.health()
            assert result is False


class TestPostgresQueuePush:
    @pytest.mark.asyncio
    async def test_push_executes_insert_then_notify(self, pg_adapter):
        mock_conn = AsyncMock()
        mock_conn.execute = AsyncMock()

        pool = MagicMock()
        pool.acquire = MagicMock()
        pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        pool.acquire.return_value.__aexit__ = AsyncMock()

        with patch.object(pg_adapter, "_ensure_pool", AsyncMock(return_value=pool)):
            await pg_adapter.push("test:key", '{"msg":"hello"}')

            assert mock_conn.execute.call_count == 2
            insert_call = mock_conn.execute.call_args_list[0]
            assert insert_call[0][0].startswith("INSERT INTO chat_events")
            assert insert_call[0][1] == "test:key"
            assert insert_call[0][2] == '{"msg":"hello"}'

            notify_call = mock_conn.execute.call_args_list[1]
            assert "NOTIFY chat_event" in notify_call[0][0]
            assert notify_call[0][1] == "test:key"


class TestPostgresQueuePop:
    @pytest.mark.asyncio
    async def test_pop_uses_skip_locked(self, pg_adapter):
        mock_conn = AsyncMock()
        mock_conn.fetchrow = AsyncMock(
            return_value={"payload": '{"msg":"hello"}'}
        )

        pool = MagicMock()
        pool.acquire = MagicMock()
        pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        pool.acquire.return_value.__aexit__ = AsyncMock()

        with patch.object(pg_adapter, "_ensure_pool", AsyncMock(return_value=pool)):
            result = await pg_adapter.pop("test:key")

            assert result == '{"msg":"hello"}'
            mock_conn.fetchrow.assert_called_once()

            sql = mock_conn.fetchrow.call_args[0][0]
            assert "FOR UPDATE SKIP LOCKED" in sql
            assert "DELETE FROM chat_events" in sql
            assert "RETURNING payload" in sql

    @pytest.mark.asyncio
    async def test_pop_returns_none_when_no_rows(self, pg_adapter):
        mock_conn = AsyncMock()
        mock_conn.fetchrow = AsyncMock(return_value=None)

        pool = MagicMock()
        pool.acquire = MagicMock()
        pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        pool.acquire.return_value.__aexit__ = AsyncMock()

        with patch.object(pg_adapter, "_ensure_pool", AsyncMock(return_value=pool)):
            result = await pg_adapter.pop("test:key")
            assert result is None


class TestPostgresQueueHealth:
    @pytest.mark.asyncio
    async def test_health_returns_true_on_success(self, pg_adapter):
        mock_conn = AsyncMock()
        mock_conn.execute = AsyncMock()

        pool = MagicMock()
        pool.acquire = MagicMock()
        pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        pool.acquire.return_value.__aexit__ = AsyncMock()

        with patch.object(pg_adapter, "_ensure_pool", AsyncMock(return_value=pool)):
            result = await pg_adapter.health()
            assert result is True
            mock_conn.execute.assert_called_once_with("SELECT 1")

    @pytest.mark.asyncio
    async def test_health_returns_false_on_error(self, pg_adapter):
        with patch.object(pg_adapter, "_ensure_pool", AsyncMock(side_effect=Exception("Connection refused"))):
            result = await pg_adapter.health()
            assert result is False


class TestQueueAdapterABC:
    def test_upstash_is_subclass(self):
        assert issubclass(UpstashRedisQueueAdapter, QueueAdapter)

    def test_postgres_is_subclass(self):
        assert issubclass(PostgresQueueAdapter, QueueAdapter)

    def test_cannot_instantiate_abc(self):
        with pytest.raises(TypeError):
            QueueAdapter()  # type: ignore


class TestGetQueueAdapter:
    def test_returns_upstash_by_default(self):
        with patch("settings.settings") as mock_settings:
            mock_settings.queue_provider = "upstash"
            mock_settings.upstash_redis_url = "https://example.upstash.io"
            mock_settings.upstash_redis_token = "tok"
            mock_settings.postgres_url = ""

            adapter = get_queue_adapter()
            assert isinstance(adapter, UpstashRedisQueueAdapter)
            assert adapter.url == "https://example.upstash.io"
            assert adapter.token == "tok"

    def test_returns_postgres_when_configured(self):
        with patch("settings.settings") as mock_settings:
            mock_settings.queue_provider = "postgres"
            mock_settings.upstash_redis_url = ""
            mock_settings.upstash_redis_token = ""
            mock_settings.postgres_url = "postgresql://localhost/test"

            adapter = get_queue_adapter()
            assert isinstance(adapter, PostgresQueueAdapter)
            assert adapter.dsn == "postgresql://localhost/test"

    def test_falls_back_to_upstash_for_unknown_provider(self):
        with patch("settings.settings") as mock_settings:
            mock_settings.queue_provider = "unknown"
            mock_settings.upstash_redis_url = "https://example.upstash.io"
            mock_settings.upstash_redis_token = "tok"
            mock_settings.postgres_url = ""

            adapter = get_queue_adapter()
            assert isinstance(adapter, UpstashRedisQueueAdapter)
