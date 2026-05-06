import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from adapters.discord import DiscordPlatformAdapter
from settings import Settings


@pytest.fixture
def settings():
    return Settings(
        discord_public_key="d78b3c08cb3d9dfbecc0b78ff4cc65a51845c606e7fcdc6a095e466d2afdc626",
        discord_bot_token="test-discord-bot-token",
    )


@pytest.fixture
def adapter(settings):
    return DiscordPlatformAdapter(settings)


@pytest.fixture
def keypair():
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    return private_key, public_key


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
    def test_valid_signature_passes(self, keypair):
        private_key, public_key = keypair
        public_hex = public_key.public_bytes_raw().hex()

        s = Settings(discord_public_key=public_hex, discord_bot_token="test")
        adapter = DiscordPlatformAdapter(s)

        timestamp = "1234567890"
        body = b'{"type":1}'
        message = f"{timestamp}{body.decode()}".encode()
        signature = private_key.sign(message)
        signature_hex = signature.hex()

        headers = {
            "x-signature-ed25519": signature_hex,
            "x-signature-timestamp": timestamp,
        }

        assert adapter.verify_webhook(headers, body) is True

    def test_invalid_signature_fails(self, keypair):
        private_key, public_key = keypair
        public_hex = public_key.public_bytes_raw().hex()

        s = Settings(discord_public_key=public_hex, discord_bot_token="test")
        adapter = DiscordPlatformAdapter(s)

        timestamp = "1234567890"
        body = b'{"type":1}'
        wrong_message = f"wrong_timestamp{body.decode()}".encode()
        signature = private_key.sign(wrong_message)
        signature_hex = signature.hex()

        headers = {
            "x-signature-ed25519": signature_hex,
            "x-signature-timestamp": timestamp,
        }

        assert adapter.verify_webhook(headers, body) is False

    def test_missing_headers_returns_false(self, adapter):
        body = b'{"type":1}'
        assert adapter.verify_webhook({}, body) is False

    def test_missing_public_key_returns_false(self):
        s = Settings(discord_public_key="", discord_bot_token="test")
        adapter = DiscordPlatformAdapter(s)
        body = b'{"type":1}'
        headers = {"x-signature-ed25519": "deadbeef", "x-signature-timestamp": "123"}
        assert adapter.verify_webhook(headers, body) is False


class TestHandleVerificationChallenge:
    def test_type_1_ping_returns_pong(self, adapter):
        body = b'{"type":1}'
        result = adapter.handle_verification_challenge(body)
        assert result == {"type": 1}

    def test_type_2_command_returns_none(self, adapter):
        body = b'{"type":2,"data":{"name":"ping"}}'
        result = adapter.handle_verification_challenge(body)
        assert result is None

    def test_invalid_json_returns_none(self, adapter):
        result = adapter.handle_verification_challenge(b"not json")
        assert result is None


class TestParseEvent:
    def test_type_1_ping_returns_none(self, adapter):
        body = b'{"type":1}'
        result = adapter.parse_event(body)
        assert result is None

    def test_type_2_slash_command_extracts_fields(self, adapter):
        body = json.dumps({
            "type": 2,
            "id": "interaction_001",
            "channel_id": "123456789",
            "guild_id": "987654321",
            "data": {
                "name": "deploy",
                "options": [
                    {"name": "env", "value": "staging"},
                    {"name": "service", "value": "api"},
                ],
            },
            "member": {
                "user": {
                    "id": "user_001",
                    "username": "alice",
                },
            },
        }).encode()

        result = adapter.parse_event(body)
        assert result is not None
        assert result.platform == "discord"
        assert result.chat_id == "123456789"
        assert result.chat_type == "guild"
        assert result.sender_id == "user_001"
        assert result.sender_name == "alice"
        assert result.message_id == "interaction_001"
        assert "/deploy staging api" in result.text

    def test_type_2_dm_slash_command(self, adapter):
        body = json.dumps({
            "type": 2,
            "id": "interaction_002",
            "channel_id": "dm_channel_001",
            "data": {
                "name": "help",
                "options": [],
            },
            "user": {
                "id": "user_002",
                "username": "bob",
            },
        }).encode()

        result = adapter.parse_event(body)
        assert result is not None
        assert result.platform == "discord"
        assert result.chat_type == "dm"
        assert result.sender_name == "bob"
        assert result.text == "/help"

    def test_type_3_component_interaction(self, adapter):
        body = json.dumps({
            "type": 3,
            "id": "interaction_003",
            "channel_id": "123456789",
            "guild_id": "987654321",
            "data": {
                "custom_id": "approve_deploy",
                "component_type": 2,
                "values": ["yes"],
            },
            "member": {
                "user": {
                    "id": "user_003",
                    "username": "charlie",
                },
            },
        }).encode()

        result = adapter.parse_event(body)
        assert result is not None
        assert result.platform == "discord"
        assert result.chat_type == "guild"
        assert result.sender_name == "charlie"
        assert "component:approve_deploy" in result.text
        assert "yes" in result.text

    def test_type_5_modal_submit(self, adapter):
        body = json.dumps({
            "type": 5,
            "id": "interaction_004",
            "channel_id": "123456789",
            "guild_id": "987654321",
            "data": {
                "custom_id": "deploy_form",
                "components": [
                    {
                        "components": [
                            {"custom_id": "env", "value": "production"},
                            {"custom_id": "reason", "value": "hotfix"},
                        ],
                    },
                ],
            },
            "member": {
                "user": {
                    "id": "user_004",
                    "username": "dave",
                },
            },
        }).encode()

        result = adapter.parse_event(body)
        assert result is not None
        assert result.platform == "discord"
        assert result.sender_name == "dave"
        assert "modal:deploy_form" in result.text
        assert "production" in result.text
        assert "hotfix" in result.text

    def test_unknown_interaction_type_returns_none(self, adapter):
        body = b'{"type":99,"data":{}}'
        result = adapter.parse_event(body)
        assert result is None

    def test_invalid_json_returns_none(self, adapter):
        result = adapter.parse_event(b"not json")
        assert result is None


class TestBuildRoutingKey:
    def test_returns_discord_prefixed_key(self, adapter):
        result = adapter.build_routing_key({"routing_key": "guild_123:channel_456"})
        assert result == "discord:guild_123:channel_456"

    def test_handles_different_formats(self, adapter):
        result = adapter.build_routing_key({"routing_key": "server:bot"})
        assert result == "discord:server:bot"


class TestNormalizeMentions:
    def test_strips_user_mentions(self, adapter):
        result = adapter.normalize_mentions("hello <@123456789> world")
        assert "hello" in result
        assert "world" in result
        assert "<@" not in result

    def test_strips_nickname_mentions(self, adapter):
        result = adapter.normalize_mentions("hey <@!987654321> there")
        assert "hey" in result
        assert "there" in result
        assert "<@!" not in result

    def test_strips_channel_mentions(self, adapter):
        result = adapter.normalize_mentions("check <#123456789> channel")
        assert "check" in result
        assert "channel" in result
        assert "<#" not in result

    def test_strips_role_mentions(self, adapter):
        result = adapter.normalize_mentions("<@&123456789> deploy")
        assert "<@&" not in result
        assert "deploy" in result

    def test_plain_text_unchanged(self, adapter):
        result = adapter.normalize_mentions("hello world")
        assert result == "hello world"


class TestSendMessage:
    @pytest.mark.asyncio
    async def test_send_message_uses_correct_endpoint(self, adapter):
        mock_response = _make_mock_response(
            {"id": "msg_sent_001", "content": "hello world"}
        )
        mock_client = _make_mock_client(mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await adapter.send_message("123456789", "hello world")

        mock_client.post.assert_called_once_with(
            "https://discord.com/api/v10/channels/123456789/messages",
            headers={
                "Authorization": f"Bot {adapter.bot_token}",
                "Content-Type": "application/json",
            },
            json={"content": "hello world"},
        )
        assert result == "msg_sent_001"

    @pytest.mark.asyncio
    async def test_send_message_with_embeds_kwarg(self, adapter):
        mock_response = _make_mock_response(
            {"id": "msg_sent_002", "content": "embed message"}
        )
        mock_client = _make_mock_client(mock_response)

        embeds = [{"title": "Test", "description": "Embed description"}]
        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await adapter.send_message("123456789", "embed message", embeds=embeds)

        call_json = mock_client.post.call_args[1]["json"]
        assert call_json["embeds"] == embeds
        assert result == "msg_sent_002"


class TestFetchHistory:
    @pytest.mark.asyncio
    async def test_fetches_history_from_correct_endpoint(self, adapter):
        mock_response = _make_mock_response([
            {
                "id": "msg_2",
                "content": "second message",
                "timestamp": "2026-05-04T10:00:02.000000+00:00",
                "author": {"id": "user_222", "username": "user2"},
            },
            {
                "id": "msg_1",
                "content": "first message",
                "timestamp": "2026-05-04T10:00:01.000000+00:00",
                "author": {"id": "user_111", "username": "user1"},
            },
        ])
        mock_client = _make_mock_client(mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await adapter.fetch_history("123456789", limit=20)

        mock_client.get.assert_called_once_with(
            "https://discord.com/api/v10/channels/123456789/messages",
            headers={"Authorization": f"Bot {adapter.bot_token}"},
            params={"limit": 20},
        )

        assert len(result) == 2
        assert result[0].sender_id == "user_111"
        assert result[0].text == "first message"
        assert result[1].sender_id == "user_222"
        assert result[1].text == "second message"

    @pytest.mark.asyncio
    async def test_fetch_history_returns_chronological_order(self, adapter):
        mock_response = _make_mock_response([
            {
                "id": "msg_3",
                "content": "latest",
                "timestamp": "2026-05-04T10:00:03.000000+00:00",
                "author": {"id": "user_333", "username": "user3"},
            },
            {
                "id": "msg_1",
                "content": "earliest",
                "timestamp": "2026-05-04T10:00:01.000000+00:00",
                "author": {"id": "user_111", "username": "user1"},
            },
        ])
        mock_client = _make_mock_client(mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await adapter.fetch_history("123456789")

        assert result[0].text == "earliest"
        assert result[1].text == "latest"

    @pytest.mark.asyncio
    async def test_fetch_history_handles_empty(self, adapter):
        mock_response = _make_mock_response([])
        mock_client = _make_mock_client(mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await adapter.fetch_history("123456789")

        assert result == []


class TestAdapterRegistration:
    def test_adapter_is_registered(self):
        from adapters import _adapter_registry
        assert "discord" in _adapter_registry
        assert _adapter_registry["discord"] is DiscordPlatformAdapter
