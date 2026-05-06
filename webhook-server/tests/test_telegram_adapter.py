import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from adapters.telegram import TelegramPlatformAdapter
from settings import Settings


@pytest.fixture
def settings():
    return Settings(telegram_bot_token="test-telegram-bot-token")


@pytest.fixture
def adapter(settings):
    return TelegramPlatformAdapter(settings)


@pytest.fixture
def polling_adapter(settings):
    a = TelegramPlatformAdapter(settings)
    a.polling_mode = True
    return a


def _make_mock_client(mock_response):
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__ = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.get = AsyncMock(return_value=mock_response)
    return mock_client


def _make_mock_response(data, status_code=200):
    mock_response = MagicMock()
    mock_response.json.return_value = data
    mock_response.status_code = status_code
    mock_response.raise_for_status = MagicMock()
    return mock_response


class TestVerifyWebhook:
    def test_webhook_always_returns_true(self, adapter):
        assert adapter.verify_webhook({}, b"{}") is True

    def test_webhook_with_headers_returns_true(self, adapter):
        assert adapter.verify_webhook(
            {"x-telegram-bot-api-secret-token": "abc"}, b'{"update_id":1}'
        ) is True

    def test_polling_mode_webhook_returns_true(self, polling_adapter):
        assert polling_adapter.verify_webhook({}, b"{}") is True


class TestHandleVerificationChallenge:
    def test_always_returns_none(self, adapter):
        assert adapter.handle_verification_challenge(b"{}") is None

    def test_any_body_returns_none(self, adapter):
        assert adapter.handle_verification_challenge(b"not json") is None


class TestParseEvent:
    def test_message_event_extracts_fields(self, adapter):
        body = json.dumps({
            "update_id": 12345,
            "message": {
                "message_id": 678,
                "from": {
                    "id": 111222,
                    "is_bot": False,
                    "first_name": "Alice",
                    "username": "alice123",
                },
                "chat": {
                    "id": -1001234567890,
                    "title": "Test Group",
                    "type": "group",
                },
                "date": 1714800000,
                "text": "Hello from Telegram!",
            },
        }).encode()

        result = adapter.parse_event(body)
        assert result is not None
        assert result.platform == "telegram"
        assert result.chat_id == "-1001234567890"
        assert result.chat_type == "group"
        assert result.channel_name == "Test Group"
        assert result.message_id == "678"
        assert result.sender_id == "111222"
        assert result.sender_name == "Alice"
        assert result.sender_username == "alice123"
        assert result.text == "Hello from Telegram!"

    def test_private_message_parses_dm_chat_type(self, adapter):
        body = json.dumps({
            "update_id": 12346,
            "message": {
                "message_id": 679,
                "from": {
                    "id": 333444,
                    "is_bot": False,
                    "first_name": "Bob",
                },
                "chat": {
                    "id": 333444,
                    "type": "private",
                },
                "date": 1714800001,
                "text": "Direct message",
            },
        }).encode()

        result = adapter.parse_event(body)
        assert result is not None
        assert result.chat_type == "dm"
        assert result.sender_name == "Bob"
        assert result.text == "Direct message"

    def test_supergroup_parses_as_group(self, adapter):
        body = json.dumps({
            "update_id": 12347,
            "message": {
                "message_id": 680,
                "from": {
                    "id": 555666,
                    "is_bot": False,
                    "first_name": "Charlie",
                },
                "chat": {
                    "id": -1009998887776,
                    "type": "supergroup",
                },
                "date": 1714800002,
                "text": "Supergroup message",
            },
        }).encode()

        result = adapter.parse_event(body)
        assert result is not None
        assert result.chat_type == "group"

    def test_edited_message_extracts_fields(self, adapter):
        body = json.dumps({
            "update_id": 12348,
            "edited_message": {
                "message_id": 681,
                "from": {
                    "id": 777888,
                    "is_bot": False,
                    "first_name": "Dana",
                },
                "chat": {
                    "id": 777888,
                    "type": "private",
                },
                "date": 1714800003,
                "text": "Edited text",
            },
        }).encode()

        result = adapter.parse_event(body)
        assert result is not None
        assert result.text == "Edited text"
        assert result.sender_name == "Dana"

    def test_channel_post_parses(self, adapter):
        body = json.dumps({
            "update_id": 12349,
            "channel_post": {
                "message_id": 682,
                "chat": {
                    "id": -1001112223334,
                    "type": "channel",
                    "title": "Announcements",
                },
                "date": 1714800004,
                "text": "Channel broadcast",
            },
        }).encode()

        result = adapter.parse_event(body)
        assert result is not None
        assert result.text == "Channel broadcast"
        assert result.channel_name == "Announcements"

    def test_callback_query_parses(self, adapter):
        body = json.dumps({
            "update_id": 12350,
            "callback_query": {
                "id": "cb_query_001",
                "from": {
                    "id": 999000,
                    "is_bot": False,
                    "first_name": "Eve",
                    "username": "eve99",
                },
                "message": {
                    "message_id": 683,
                    "chat": {
                        "id": -1009876543210,
                        "type": "group",
                    },
                    "date": 1714800005,
                },
                "data": "approve_deploy",
            },
        }).encode()

        result = adapter.parse_event(body)
        assert result is not None
        assert result.platform == "telegram"
        assert result.chat_id == "-1009876543210"
        assert result.sender_name == "Eve"
        assert result.text == "callback:approve_deploy"

    def test_empty_text_message_returns_none(self, adapter):
        body = json.dumps({
            "update_id": 12351,
            "message": {
                "message_id": 684,
                "from": {
                    "id": 111333,
                    "first_name": "Frank",
                },
                "chat": {
                    "id": 111333,
                    "type": "private",
                },
                "date": 1714800006,
            },
        }).encode()

        result = adapter.parse_event(body)
        assert result is None

    def test_inline_query_returns_none(self, adapter):
        body = json.dumps({
            "update_id": 12352,
            "inline_query": {
                "id": "iq_001",
                "from": {
                    "id": 444555,
                    "first_name": "Grace",
                },
                "query": "search term",
                "offset": "",
            },
        }).encode()

        result = adapter.parse_event(body)
        assert result is None

    def test_update_without_message_returns_none(self, adapter):
        body = json.dumps({
            "update_id": 12353,
            "edited_channel_post": {
                "message_id": 685,
                "chat": {
                    "id": -100111222,
                    "type": "channel",
                },
                "date": 1714800007,
            },
        }).encode()

        result = adapter.parse_event(body)
        assert result is None

    def test_caption_only_message_parses(self, adapter):
        body = json.dumps({
            "update_id": 12354,
            "message": {
                "message_id": 686,
                "from": {
                    "id": 666777,
                    "first_name": "Hank",
                },
                "chat": {
                    "id": 666777,
                    "type": "private",
                },
                "date": 1714800008,
                "caption": "Check this photo",
            },
        }).encode()

        result = adapter.parse_event(body)
        assert result is not None
        assert result.text == "Check this photo"

    def test_message_with_mentions_extracts_them(self, adapter):
        body = json.dumps({
            "update_id": 12355,
            "message": {
                "message_id": 687,
                "from": {
                    "id": 888999,
                    "first_name": "Ivy",
                },
                "chat": {
                    "id": -1005556667778,
                    "type": "group",
                },
                "date": 1714800009,
                "text": "@bot_deploy please help",
                "entities": [
                    {"offset": 0, "length": 12, "type": "mention"},
                ],
            },
        }).encode()

        result = adapter.parse_event(body)
        assert result is not None
        assert "@bot_deploy" in result.mentions[0]
        assert "@bot_deploy" not in result.text

    def test_invalid_json_returns_none(self, adapter):
        result = adapter.parse_event(b"not json")
        assert result is None


class TestSendMessage:
    @pytest.mark.asyncio
    async def test_send_message_uses_correct_endpoint(self, adapter):
        mock_response = _make_mock_response({
            "ok": True,
            "result": {
                "message_id": 101,
                "from": {"id": 999, "is_bot": True, "first_name": "TestBot"},
                "chat": {"id": -100123, "title": "Test", "type": "group"},
                "date": 1714800100,
                "text": "Hello!",
            },
        })
        mock_client = _make_mock_client(mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await adapter.send_message("-1001234567890", "Hello from test!")

        mock_client.post.assert_called_once_with(
            "https://api.telegram.org/bottest-telegram-bot-token/sendMessage",
            json={
                "chat_id": "-1001234567890",
                "text": "Hello from test!",
                "parse_mode": "HTML",
            },
            headers={"Content-Type": "application/json"},
        )
        assert result == "101"

    @pytest.mark.asyncio
    async def test_send_message_with_custom_parse_mode(self, adapter):
        mock_response = _make_mock_response({
            "ok": True,
            "result": {"message_id": 102},
        })
        mock_client = _make_mock_client(mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await adapter.send_message(
                "12345", "**bold**", parse_mode="MarkdownV2"
            )

        call_json = mock_client.post.call_args[1]["json"]
        assert call_json["parse_mode"] == "MarkdownV2"
        assert result == "102"

    @pytest.mark.asyncio
    async def test_send_message_with_reply_markup(self, adapter):
        mock_response = _make_mock_response({
            "ok": True,
            "result": {"message_id": 103},
        })
        mock_client = _make_mock_client(mock_response)

        markup = {
            "inline_keyboard": [
                [{"text": "Approve", "callback_data": "approve"}],
            ],
        }
        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await adapter.send_message(
                "12345", "Confirm?", reply_markup=markup
            )

        call_json = mock_client.post.call_args[1]["json"]
        assert "reply_markup" in call_json
        assert result == "103"

    @pytest.mark.asyncio
    async def test_send_message_raises_on_api_error(self, adapter):
        mock_response = _make_mock_response({
            "ok": False,
            "description": "Bad Request: chat not found",
        })
        mock_client = _make_mock_client(mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(RuntimeError, match="Telegram API error"):
                await adapter.send_message("bad_chat_id", "test")


class TestFetchHistory:
    @pytest.mark.asyncio
    async def test_fetches_history_via_get_updates(self, adapter):
        mock_response = _make_mock_response({
            "ok": True,
            "result": [
                {
                    "update_id": 1001,
                    "message": {
                        "message_id": 1,
                        "from": {"id": 111, "first_name": "User A"},
                        "chat": {"id": -100123, "type": "group"},
                        "date": 1714800001,
                        "text": "Message A",
                    },
                },
                {
                    "update_id": 1002,
                    "message": {
                        "message_id": 2,
                        "from": {"id": 222, "first_name": "User B"},
                        "chat": {"id": -100123, "type": "group"},
                        "date": 1714800002,
                        "text": "Message B",
                    },
                },
                {
                    "update_id": 1003,
                    "message": {
                        "message_id": 3,
                        "from": {"id": 333, "first_name": "User C"},
                        "chat": {"id": -100456, "type": "group"},
                        "date": 1714800003,
                        "text": "Other chat",
                    },
                },
            ],
        })
        mock_client = _make_mock_client(mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await adapter.fetch_history("-100123", limit=20)

        mock_client.get.assert_called_once_with(
            "https://api.telegram.org/bottest-telegram-bot-token/getUpdates",
            params={"limit": 20, "timeout": 0},
        )

        assert len(result) == 2
        assert result[0].sender_id == "111"
        assert result[0].text == "Message A"
        assert result[1].sender_id == "222"
        assert result[1].text == "Message B"

    @pytest.mark.asyncio
    async def test_fetch_history_handles_api_error(self, adapter):
        mock_response = _make_mock_response({"ok": False, "description": "error"})
        mock_client = _make_mock_client(mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await adapter.fetch_history("-100123")

        assert result == []

    @pytest.mark.asyncio
    async def test_fetch_history_polling_mode(self, polling_adapter):
        mock_response = _make_mock_response({
            "ok": True,
            "result": [
                {
                    "update_id": 2001,
                    "message": {
                        "message_id": 10,
                        "from": {"id": 444, "first_name": "User D"},
                        "chat": {"id": -100789, "type": "group"},
                        "date": 1714800010,
                        "text": "Polling message",
                    },
                },
            ],
        })
        mock_client = _make_mock_client(mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await polling_adapter.fetch_history("-100789")

        assert len(result) == 1
        assert result[0].text == "Polling message"
        assert polling_adapter._last_update_id == 2001


class TestGetUpdates:
    @pytest.mark.asyncio
    async def test_get_updates_polls_correct_endpoint(self, adapter):
        mock_response = _make_mock_response({
            "ok": True,
            "result": [
                {
                    "update_id": 3001,
                    "message": {
                        "message_id": 20,
                        "from": {"id": 555, "first_name": "User E"},
                        "chat": {"id": -100999, "type": "group"},
                        "date": 1714800020,
                        "text": "Update message",
                    },
                },
            ],
        })
        mock_client = _make_mock_client(mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await adapter.get_updates(timeout=30)

        mock_client.get.assert_called_once_with(
            "https://api.telegram.org/bottest-telegram-bot-token/getUpdates",
            params={
                "timeout": 30,
                "allowed_updates": ["message", "edited_message", "callback_query"],
            },
        )

        assert len(result) == 1
        assert result[0]["update_id"] == 3001
        assert adapter._last_update_id == 3001

    @pytest.mark.asyncio
    async def test_get_updates_with_offset_when_last_update_id_set(self, adapter):
        adapter._last_update_id = 99
        mock_response = _make_mock_response({"ok": True, "result": []})
        mock_client = _make_mock_client(mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await adapter.get_updates()

        call_params = mock_client.get.call_args[1]["params"]
        assert call_params["offset"] == 100
        assert result == []

    @pytest.mark.asyncio
    async def test_get_updates_handles_api_error(self, adapter):
        mock_response = _make_mock_response({"ok": False, "description": "Unauthorized"})
        mock_client = _make_mock_client(mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await adapter.get_updates()

        assert result == []


class TestBuildRoutingKey:
    def test_returns_telegram_prefixed_key(self, adapter):
        result = adapter.build_routing_key({"routing_key": "group_-100123"})
        assert result == "telegram:group_-100123"

    def test_handles_different_formats(self, adapter):
        result = adapter.build_routing_key({"routing_key": "bot:chat"})
        assert result == "telegram:bot:chat"


class TestNormalizeMentions:
    def test_strips_at_mentions(self, adapter):
        result = adapter.normalize_mentions("hello @bot_deploy world")
        assert result == "hello world"

    def test_strips_multiple_mentions(self, adapter):
        result = adapter.normalize_mentions("@bot1 @bot2 do the thing")
        assert result == "do the thing"

    def test_plain_text_unchanged(self, adapter):
        result = adapter.normalize_mentions("hello world")
        assert result == "hello world"

    def test_collapses_whitespace(self, adapter):
        result = adapter.normalize_mentions("hey   @bot   there")
        assert result == "hey there"


class TestCleanEntities:
    def test_removes_mention_entity_text(self, adapter):
        text = "@bot_deploy check the logs"
        entities = [{"offset": 0, "length": 11, "type": "mention"}]
        result = adapter._clean_entities(text, entities)
        assert result == " check the logs"

    def test_removes_text_mention_entity(self, adapter):
        text = "hello John world"
        entities = [{"offset": 6, "length": 4, "type": "text_mention", "user": {"first_name": "John"}}]
        result = adapter._clean_entities(text, entities)
        assert result == "hello  world"

    def test_non_mention_entities_unchanged(self, adapter):
        text = "**bold text** and italic"
        entities = [
            {"offset": 0, "length": 13, "type": "bold"},
            {"offset": 18, "length": 6, "type": "italic"},
        ]
        result = adapter._clean_entities(text, entities)
        assert result == text

    def test_multiple_entities_stripped(self, adapter):
        text = "@bot1 @bot2 run deploy"
        entities = [
            {"offset": 0, "length": 5, "type": "mention"},
            {"offset": 6, "length": 5, "type": "mention"},
        ]
        result = adapter._clean_entities(text, entities)
        assert result == "  run deploy"


class TestAdapterRegistration:
    def test_adapter_is_registered(self):
        from adapters import _adapter_registry
        assert "telegram" in _adapter_registry
        assert _adapter_registry["telegram"] is TelegramPlatformAdapter
