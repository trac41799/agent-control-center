import hashlib
import hmac
import json
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from adapters.slack import SlackPlatformAdapter
from settings import Settings


@pytest.fixture
def settings():
    return Settings(slack_signing_secret="test-secret-key", slack_bot_token="xoxb-test-token")


@pytest.fixture
def adapter(settings):
    return SlackPlatformAdapter(settings)


def _make_mock_client(mock_response):
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__ = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)
    return mock_client


def _make_mock_response(data, status_code=200):
    mock_response = MagicMock()
    mock_response.json.return_value = data
    mock_response.status_code = status_code
    return mock_response


class TestVerifyWebhook:
    def test_valid_signature_passes(self, adapter):
        signing_secret = adapter.signing_secret
        timestamp = str(int(time.time()))
        body = b'{"type":"event_callback","event":{"type":"message"}}'

        base_string = f"v0:{timestamp}:{body.decode()}"
        expected_sig = "v0=" + hmac.new(
            signing_secret.encode(), base_string.encode(), hashlib.sha256
        ).hexdigest()

        headers = {
            "x-slack-request-timestamp": timestamp,
            "x-slack-signature": expected_sig,
        }

        assert adapter.verify_webhook(headers, body) is True

    def test_invalid_signature_fails(self, adapter):
        timestamp = str(int(time.time()))
        body = b'{"type":"event_callback","event":{"type":"message"}}'

        headers = {
            "x-slack-request-timestamp": timestamp,
            "x-slack-signature": "v0=deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        }

        assert adapter.verify_webhook(headers, body) is False

    def test_missing_headers_returns_false(self, adapter):
        body = b'{"type":"event_callback"}'

        assert adapter.verify_webhook({}, body) is False


class TestReplayProtection:
    def test_old_timestamp_rejected(self, adapter):
        signing_secret = adapter.signing_secret
        old_timestamp = str(int(time.time()) - 301)
        body = b'{"type":"event_callback"}'

        base_string = f"v0:{old_timestamp}:{body.decode()}"
        expected_sig = "v0=" + hmac.new(
            signing_secret.encode(), base_string.encode(), hashlib.sha256
        ).hexdigest()

        headers = {
            "x-slack-request-timestamp": old_timestamp,
            "x-slack-signature": expected_sig,
        }

        assert adapter.verify_webhook(headers, body) is False

    def test_future_timestamp_rejected(self, adapter):
        signing_secret = adapter.signing_secret
        future_timestamp = str(int(time.time()) + 301)
        body = b'{"type":"event_callback"}'

        base_string = f"v0:{future_timestamp}:{body.decode()}"
        expected_sig = "v0=" + hmac.new(
            signing_secret.encode(), base_string.encode(), hashlib.sha256
        ).hexdigest()

        headers = {
            "x-slack-request-timestamp": future_timestamp,
            "x-slack-signature": expected_sig,
        }

        assert adapter.verify_webhook(headers, body) is False


class TestHandleVerificationChallenge:
    def test_url_verification_returns_challenge(self, adapter):
        body = b'{"type":"url_verification","challenge":"abc123def456","token":"test"}'

        result = adapter.handle_verification_challenge(body)
        assert result == {"challenge": "abc123def456"}

    def test_non_challenge_returns_none(self, adapter):
        body = b'{"type":"event_callback","event":{}}'

        result = adapter.handle_verification_challenge(body)
        assert result is None

    def test_invalid_json_returns_none(self, adapter):
        body = b"not json"

        result = adapter.handle_verification_challenge(body)
        assert result is None


class TestParseEvent:
    def test_event_callback_message_extracts_fields(self, adapter):
        body = json.dumps({
            "type": "event_callback",
            "event": {
                "type": "message",
                "channel": "C123456",
                "channel_type": "im",
                "user": "U987654",
                "text": "hello bot",
                "ts": "1714800000.000100",
                "event_ts": "2026-05-04T10:00:00Z",
            },
        }).encode()

        payload = adapter.parse_event(body)
        assert payload is not None
        assert payload.platform == "slack"
        assert payload.chat_id == "C123456"
        assert payload.chat_type == "dm"
        assert payload.message_id == "1714800000.000100"
        assert payload.sender_id == "U987654"
        assert payload.text == "hello bot"

    def test_non_event_callback_returns_none(self, adapter):
        body = b'{"type":"url_verification","challenge":"abc"}'

        payload = adapter.parse_event(body)
        assert payload is None

    def test_bot_message_subtype_returns_none(self, adapter):
        body = json.dumps({
            "type": "event_callback",
            "event": {
                "type": "message",
                "subtype": "bot_message",
                "channel": "C123456",
                "user": "U987654",
                "text": "bot reply",
                "ts": "1714800000.000100",
            },
        }).encode()

        payload = adapter.parse_event(body)
        assert payload is None

    def test_message_changed_subtype_returns_none(self, adapter):
        body = json.dumps({
            "type": "event_callback",
            "event": {
                "type": "message",
                "subtype": "message_changed",
                "channel": "C123456",
                "text": "edited",
                "ts": "1714800000.000100",
            },
        }).encode()

        payload = adapter.parse_event(body)
        assert payload is None

    def test_message_deleted_subtype_returns_none(self, adapter):
        body = json.dumps({
            "type": "event_callback",
            "event": {
                "type": "message",
                "subtype": "message_deleted",
                "channel": "C123456",
                "ts": "1714800000.000100",
            },
        }).encode()

        payload = adapter.parse_event(body)
        assert payload is None

    def test_non_message_event_returns_none(self, adapter):
        body = json.dumps({
            "type": "event_callback",
            "event": {
                "type": "reaction_added",
                "channel": "C123456",
            },
        }).encode()

        payload = adapter.parse_event(body)
        assert payload is None

    def test_channel_message_not_mentioned_returns_none(self, adapter):
        adapter.bot_user_id = "BOT123"
        body = json.dumps({
            "type": "event_callback",
            "event": {
                "type": "message",
                "channel": "C123456",
                "channel_type": "channel",
                "user": "U987654",
                "text": "just chatting, no bot mentioned",
                "ts": "1714800000.000100",
            },
        }).encode()

        payload = adapter.parse_event(body)
        assert payload is None

    def test_channel_message_with_bot_mention_extracts_fields(self, adapter):
        adapter.bot_user_id = "BOT123"
        body = json.dumps({
            "type": "event_callback",
            "event": {
                "type": "message",
                "channel": "C123456",
                "channel_type": "channel",
                "user": "U987654",
                "text": "<@BOT123> deploy staging please",
                "ts": "1714800000.000100",
                "event_ts": "2026-05-04T10:00:00Z",
            },
        }).encode()

        payload = adapter.parse_event(body)
        assert payload is not None
        assert payload.platform == "slack"
        assert payload.chat_id == "C123456"
        assert payload.chat_type == "channel"
        assert "deploy staging please" in payload.text

    def test_invalid_json_returns_none(self, adapter):
        body = b"not json"

        payload = adapter.parse_event(body)
        assert payload is None


class TestCleanSlackMarkup:
    def test_user_mentions_removed(self, adapter):
        result = adapter._clean_slack_markup("hello <@U123456> world")
        assert result == "hello  world"

    def test_channel_references_converted(self, adapter):
        result = adapter._clean_slack_markup("check <#C456789|general> channel")
        assert result == "check general channel"

    def test_url_with_label_converted(self, adapter):
        result = adapter._clean_slack_markup("see <https://example.com|docs> here")
        assert result == "see docs here"

    def test_bare_url_extracted(self, adapter):
        result = adapter._clean_slack_markup("link: <https://example.com>")
        assert result == "link: https://example.com"

    def test_html_entities_converted(self, adapter):
        result = adapter._clean_slack_markup("a &amp; b &lt; c &gt; d")
        assert result == "a & b < c > d"

    def test_combined_markup_cleaned(self, adapter):
        result = adapter._clean_slack_markup(
            "Hey <@U123>, check <#C456|general> at <https://site.com|page> &amp; more"
        )
        assert result == "Hey , check general at page & more"


class TestBuildRoutingKey:
    def test_returns_slack_prefixed_key(self, adapter):
        result = adapter.build_routing_key({"routing_key": "T123:C456"})
        assert result == "slack:T123:C456"

    def test_handles_different_routing_key_formats(self, adapter):
        result = adapter.build_routing_key({"routing_key": "workspace:channel"})
        assert result == "slack:workspace:channel"


class TestNormalizeMentions:
    def test_strips_slack_user_mentions(self, adapter):
        result = adapter.normalize_mentions("hello <@U123456> there <@U789>")
        assert result == "hello there"

    def test_plain_text_unchanged(self, adapter):
        result = adapter.normalize_mentions("hello world")
        assert result == "hello world"


class TestSendMessage:
    @pytest.mark.asyncio
    async def test_send_message_uses_correct_endpoint_and_payload(self, adapter):
        mock_response = _make_mock_response({"ok": True, "ts": "1714800000.000300"})
        mock_client = _make_mock_client(mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await adapter.send_message("C123456", "hello world")

        mock_client.post.assert_called_once_with(
            "https://slack.com/api/chat.postMessage",
            headers={"Authorization": f"Bearer {adapter.bot_token}"},
            json={"channel": "C123456", "text": "hello world", "mrkdwn": True},
        )
        assert result == "1714800000.000300"

    @pytest.mark.asyncio
    async def test_send_message_respects_mrkdwn_kwarg(self, adapter):
        mock_response = _make_mock_response({"ok": True, "ts": "1714800000.000400"})
        mock_client = _make_mock_client(mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await adapter.send_message("C123456", "plain text", mrkdwn=False)

        mock_client.post.assert_called_once_with(
            "https://slack.com/api/chat.postMessage",
            headers={"Authorization": f"Bearer {adapter.bot_token}"},
            json={"channel": "C123456", "text": "plain text", "mrkdwn": False},
        )
        assert result == "1714800000.000400"


class TestFetchHistory:
    @pytest.mark.asyncio
    async def test_fetches_history_from_correct_endpoint(self, adapter):
        mock_response = _make_mock_response({
            "ok": True,
            "messages": [
                {
                    "user": "U222",
                    "text": "second message <@U333>",
                    "ts": "1714800000.000002",
                },
                {
                    "user": "U111",
                    "text": "first message",
                    "ts": "1714800000.000001",
                },
            ],
        })
        mock_client = _make_mock_client(mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await adapter.fetch_history("C123456", limit=20)

        mock_client.post.assert_called_once_with(
            "https://slack.com/api/conversations.history",
            headers={"Authorization": f"Bearer {adapter.bot_token}"},
            json={"channel": "C123456", "limit": 20},
        )

        assert len(result) == 2
        assert result[0].sender_id == "U111"
        assert result[0].text == "first message"
        assert result[1].sender_id == "U222"
        assert "second message" in result[1].text

    @pytest.mark.asyncio
    async def test_fetch_history_returns_chronological_order(self, adapter):
        mock_response = _make_mock_response({
            "ok": True,
            "messages": [
                {"user": "U222", "text": "latest", "ts": "1714800000.000003"},
                {"user": "U111", "text": "earliest", "ts": "1714800000.000001"},
            ],
        })
        mock_client = _make_mock_client(mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await adapter.fetch_history("C123456")

        assert result[0].text == "earliest"
        assert result[1].text == "latest"

    @pytest.mark.asyncio
    async def test_fetch_history_handles_empty_messages(self, adapter):
        mock_response = _make_mock_response({"ok": True, "messages": []})
        mock_client = _make_mock_client(mock_response)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await adapter.fetch_history("C123456")

        assert result == []
