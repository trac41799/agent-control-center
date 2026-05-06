import base64
import hashlib
import json
import os
import sys
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, _project_root)

from webhook_server.crypto.lark_aes import lark_aes_decrypt
from webhook_server.adapters.lark import LARK_BASE_URL, LarkPlatformAdapter
from webhook_server.models import HistoryEntry, StandardContextPayload
from webhook_server.settings import Settings


@pytest.fixture
def settings():
    return Settings(
        lark_app_id="cli_test123",
        lark_app_secret="test_encrypt_key_123456",
        lark_verify_token="test_verify_token",
    )


@pytest.fixture
def adapter(settings):
    return LarkPlatformAdapter(settings)


class TestLarkAesDecrypt:
    def test_decrypt_known_vector(self):
        encrypt_key = "test_encrypt_key_123456"
        plaintext = "Hello, Lark!"
        key = hashlib.sha256(encrypt_key.encode()).digest()

        from Crypto.Cipher import AES
        from Crypto.Util.Padding import pad
        from Crypto.Random import get_random_bytes

        iv = get_random_bytes(16)
        cipher = AES.new(key, AES.MODE_CBC, iv=iv)
        ciphertext = cipher.encrypt(pad(plaintext.encode(), AES.block_size))
        encrypted_bytes = iv + ciphertext
        encrypted_b64 = base64.b64encode(encrypted_bytes).decode()

        result = lark_aes_decrypt(encrypted_b64, encrypt_key)
        assert result == plaintext

    def test_decrypt_empty_string(self):
        encrypt_key = "test_encrypt_key_123456"
        plaintext = ""
        key = hashlib.sha256(encrypt_key.encode()).digest()

        from Crypto.Cipher import AES
        from Crypto.Util.Padding import pad
        from Crypto.Random import get_random_bytes

        iv = get_random_bytes(16)
        cipher = AES.new(key, AES.MODE_CBC, iv=iv)
        ciphertext = cipher.encrypt(pad(plaintext.encode(), AES.block_size))
        encrypted_bytes = iv + ciphertext
        encrypted_b64 = base64.b64encode(encrypted_bytes).decode()

        result = lark_aes_decrypt(encrypted_b64, encrypt_key)
        assert result == ""

    def test_decrypt_chinese_text(self):
        encrypt_key = "test_encrypt_key_123456"
        plaintext = "你好，飞书!"
        key = hashlib.sha256(encrypt_key.encode()).digest()

        from Crypto.Cipher import AES
        from Crypto.Util.Padding import pad
        from Crypto.Random import get_random_bytes

        iv = get_random_bytes(16)
        cipher = AES.new(key, AES.MODE_CBC, iv=iv)
        ciphertext = cipher.encrypt(pad(plaintext.encode(), AES.block_size))
        encrypted_bytes = iv + ciphertext
        encrypted_b64 = base64.b64encode(encrypted_bytes).decode()

        result = lark_aes_decrypt(encrypted_b64, encrypt_key)
        assert result == plaintext


class TestBuildRoutingKey:
    def test_build_routing_key(self, adapter):
        assert adapter.build_routing_key({"routing_key": "cli_test123"}) == "lark:cli_test123"

    def test_build_routing_key_with_custom_id(self, adapter):
        assert adapter.build_routing_key({"routing_key": "custom_bot"}) == "lark:custom_bot"


class TestNormalizeMentions:
    def test_normalize_mentions_is_identity(self, adapter):
        text = "hello @bot world"
        assert adapter.normalize_mentions(text) == text

    def test_normalize_mentions_preserves_special_chars(self, adapter):
        text = "@user check this! #important http://example.com"
        assert adapter.normalize_mentions(text) == text


class TestHandleVerificationChallenge:
    def test_url_verification_returns_challenge(self, adapter):
        body = json.dumps({"type": "url_verification", "challenge": "abc123"}).encode()
        result = adapter.handle_verification_challenge(body)
        assert result == {"challenge": "abc123"}

    def test_message_event_returns_none(self, adapter):
        body = json.dumps({"type": "message", "data": "hello"}).encode()
        result = adapter.handle_verification_challenge(body)
        assert result is None

    def test_invalid_json_returns_none(self, adapter):
        result = adapter.handle_verification_challenge(b"not json")
        assert result is None


class TestVerifyWebhook:
    def test_no_encrypt_field_returns_false(self, adapter):
        body = json.dumps({"type": "message", "data": "test"}).encode()
        headers = {}
        assert adapter.verify_webhook(headers, body) is False

    def test_valid_signature(self, adapter, settings):
        plaintext = json.dumps({"event": {"event_type": "im.message.receive_v1",
            "sender": {"sender_id": {"open_id": "ou_test"}, "sender_type": "user"},
            "message": {"chat_id": "oc_test", "chat_type": "group",
                "message_id": "om_test", "text": "hello", "mentions": []}}})
        key = hashlib.sha256(settings.lark_app_secret.encode()).digest()

        from Crypto.Cipher import AES
        from Crypto.Util.Padding import pad
        from Crypto.Random import get_random_bytes

        iv = get_random_bytes(16)
        cipher = AES.new(key, AES.MODE_CBC, iv=iv)
        ciphertext = cipher.encrypt(pad(plaintext.encode(), AES.block_size))
        encrypted_bytes = iv + ciphertext
        encrypted_b64 = base64.b64encode(encrypted_bytes).decode()

        timestamp = "1234567890"
        nonce = "test_nonce"
        signature = hashlib.sha256(
            f"{timestamp}{nonce}{settings.lark_app_secret}{plaintext}".encode()
        ).hexdigest()

        body = json.dumps({"encrypt": encrypted_b64}).encode()
        headers = {
            "x-lark-request-timestamp": timestamp,
            "x-lark-request-nonce": nonce,
            "x-lark-signature": signature,
        }

        assert adapter.verify_webhook(headers, body) is True

    def test_invalid_signature(self, adapter, settings):
        plaintext = json.dumps({"type": "test"})
        key = hashlib.sha256(settings.lark_app_secret.encode()).digest()

        from Crypto.Cipher import AES
        from Crypto.Util.Padding import pad
        from Crypto.Random import get_random_bytes

        iv = get_random_bytes(16)
        cipher = AES.new(key, AES.MODE_CBC, iv=iv)
        ciphertext = cipher.encrypt(pad(plaintext.encode(), AES.block_size))
        encrypted_bytes = iv + ciphertext
        encrypted_b64 = base64.b64encode(encrypted_bytes).decode()

        body = json.dumps({"encrypt": encrypted_b64}).encode()
        headers = {
            "x-lark-request-timestamp": "1234567890",
            "x-lark-request-nonce": "test_nonce",
            "x-lark-signature": "wrong_signature_here",
        }

        assert adapter.verify_webhook(headers, body) is False

    def test_invalid_json_body_returns_false(self, adapter):
        assert adapter.verify_webhook({}, b"not json") is False


class TestParseEvent:
    def test_parse_valid_message_event(self, adapter):
        event_data = json.dumps({
            "event": {
                "event_type": "im.message.receive_v1",
                "sender": {"sender_id": {"open_id": "ou_abc"}, "sender_type": "user"},
                "message": {
                    "chat_id": "oc_chat123",
                    "chat_type": "group",
                    "message_id": "om_msg456",
                    "text_without_at_bot": "deploy staging",
                    "mentions": [{"name": "BotName"}],
                },
            }
        }).encode()
        result = adapter.parse_event(event_data)
        assert result is not None
        assert result.platform == "lark"
        assert result.chat_id == "oc_chat123"
        assert result.chat_type == "group"
        assert result.message_id == "om_msg456"
        assert result.sender_id == "ou_abc"
        assert result.text == "deploy staging"
        assert result.mentions == ["BotName"]

    def test_parse_event_extracts_text_from_content_json(self, adapter):
        content = json.dumps({"text": "hello from content"})
        event_data = json.dumps({
            "event": {
                "event_type": "im.message.receive_v1",
                "sender": {"sender_id": {"open_id": "ou_abc"}, "sender_type": "user"},
                "message": {
                    "chat_id": "oc_chat123",
                    "chat_type": "p2p",
                    "message_id": "om_msg456",
                    "content": content,
                    "mentions": [],
                },
            }
        }).encode()
        result = adapter.parse_event(event_data)
        assert result is not None
        assert result.text == "hello from content"
        assert result.chat_type == "p2p"

    def test_parse_event_non_message_type_returns_none(self, adapter):
        event_data = json.dumps({
            "event": {
                "event_type": "im.chat.updated_v1",
                "sender": {"sender_type": "user"},
            }
        }).encode()
        result = adapter.parse_event(event_data)
        assert result is None

    def test_parse_event_bot_message_returns_none(self, adapter):
        event_data = json.dumps({
            "event": {
                "event_type": "im.message.receive_v1",
                "sender": {"sender_id": {"open_id": "ou_bot"}, "sender_type": "bot"},
                "message": {
                    "chat_id": "oc_chat123",
                    "chat_type": "group",
                    "message_id": "om_msg456",
                    "text": "auto reply",
                    "mentions": [],
                },
            }
        }).encode()
        result = adapter.parse_event(event_data)
        assert result is None

    def test_parse_event_uses_decrypted_body(self, adapter):
        decrypted = json.dumps({
            "event": {
                "event_type": "im.message.receive_v1",
                "sender": {"sender_id": {"open_id": "ou_dec"}, "sender_type": "user"},
                "message": {
                    "chat_id": "oc_dec",
                    "chat_type": "group",
                    "message_id": "om_dec",
                    "text_without_at_bot": "from decrypted",
                    "mentions": [],
                },
            }
        })
        adapter._decrypted_body = decrypted
        result = adapter.parse_event(b"{}")
        assert result is not None
        assert result.text == "from decrypted"
        assert result.chat_id == "oc_dec"


class TestSendMessage:
    @pytest.mark.asyncio
    async def test_send_message_mock(self, adapter, settings):
        mock_response = MagicMock()
        mock_response.json.return_value = {"data": {"message_id": "om_sent_001"}}
        mock_response.raise_for_status.return_value = None

        async def mock_post(*args, **kwargs):
            return mock_response

        with patch.object(adapter, "_get_access_token", return_value="test_token"):
            with patch("httpx.AsyncClient") as mock_client:
                mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                    side_effect=mock_post
                )
                result = await adapter.send_message("oc_test", "Hello!")
                assert result == "om_sent_001"

    @pytest.mark.asyncio
    async def test_send_message_uses_correct_url(self, adapter):
        async def mock_post(*args, **kwargs):
            resp = MagicMock()
            resp.json.return_value = {"data": {"message_id": "om_001"}}
            resp.raise_for_status.return_value = None
            return resp

        with patch.object(adapter, "_get_access_token", return_value="tok"):
            with patch("httpx.AsyncClient") as mock_client:
                mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                    side_effect=mock_post
                )
                await adapter.send_message("oc_test", "Hello!")
                mock_client.return_value.__aenter__.return_value.post.assert_called_once()
                call_kwargs = mock_client.return_value.__aenter__.return_value.post.call_args[1]
                assert call_kwargs["params"] == {"receive_id_type": "chat_id"}
                assert call_kwargs["json"]["receive_id"] == "oc_test"
                assert call_kwargs["json"]["msg_type"] == "text"
                assert json.loads(call_kwargs["json"]["content"]) == {"text": "Hello!"}
                assert call_kwargs["headers"]["Authorization"] == "Bearer tok"


class TestFetchHistory:
    @pytest.mark.asyncio
    async def test_fetch_history_mock(self, adapter):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "data": {
                "items": [
                    {
                        "sender": {"id": "ou_2", "name": "User Two"},
                        "body": {"content": '{"text":"msg 2"}'},
                        "create_time": "2000",
                    },
                    {
                        "sender": {"id": "ou_1", "name": "User One"},
                        "body": {"content": '{"text":"msg 1"}'},
                        "create_time": "1000",
                    },
                ]
            }
        }
        mock_response.raise_for_status.return_value = None

        async def mock_get(*args, **kwargs):
            return mock_response

        with patch.object(adapter, "_get_access_token", return_value="test_token"):
            with patch("httpx.AsyncClient") as mock_client:
                mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                    side_effect=mock_get
                )
                result = await adapter.fetch_history("oc_hist", limit=10)
                assert len(result) == 2
                assert result[0].sender_id == "ou_1"
                assert result[0].text == "msg 1"
                assert result[1].sender_id == "ou_2"
                assert result[1].text == "msg 2"

    @pytest.mark.asyncio
    async def test_fetch_history_reverses_order(self, adapter):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "data": {
                "items": [
                    {
                        "sender": {"id": "ou_newest"},
                        "body": {"content": '{"text":"newest"}'},
                        "create_time": "3000",
                    },
                    {
                        "sender": {"id": "ou_oldest"},
                        "body": {"content": '{"text":"oldest"}'},
                        "create_time": "1000",
                    },
                ]
            }
        }
        mock_response.raise_for_status.return_value = None

        async def mock_get(*args, **kwargs):
            return mock_response

        with patch.object(adapter, "_get_access_token", return_value="test_token"):
            with patch("httpx.AsyncClient") as mock_client:
                mock_client.return_value.__aenter__.return_value.get = AsyncMock(
                    side_effect=mock_get
                )
                result = await adapter.fetch_history("oc_test")
                assert result[0].text == "oldest"
                assert result[1].text == "newest"


class TestGetAccessToken:
    @pytest.mark.asyncio
    async def test_returns_cached_token(self, adapter):
        adapter._access_token = "cached_token"
        adapter._token_expiry = time.time() + 3600
        result = await adapter._get_access_token()
        assert result == "cached_token"

    @pytest.mark.asyncio
    async def test_refreshes_expired_token(self, adapter):
        adapter._access_token = "expired"
        adapter._token_expiry = time.time() - 10

        mock_resp = MagicMock()
        mock_resp.json.return_value = {"tenant_access_token": "new_token", "expire": 7200}
        mock_resp.raise_for_status.return_value = None

        with patch("httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_resp
            )
            result = await adapter._get_access_token()
            assert result == "new_token"
            assert adapter._access_token == "new_token"


class TestAdapterRegistration:
    def test_adapter_is_registered(self):
        from webhook_server.adapters import _adapter_registry
        assert "lark" in _adapter_registry
        assert _adapter_registry["lark"] is LarkPlatformAdapter


class TestBaseUrlSelection:
    def test_cli_prefix_uses_international(self):
        s = Settings(lark_app_id="cli_a123", lark_app_secret="s", lark_verify_token="v")
        a = LarkPlatformAdapter(s)
        assert a._base_url == LARK_BASE_URL

    def test_non_cli_prefix_uses_cn(self):
        s = Settings(lark_app_id="other_123", lark_app_secret="s", lark_verify_token="v")
        a = LarkPlatformAdapter(s)
        assert a._base_url == "https://open.feishu.cn/open-apis"
