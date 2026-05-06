from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from main import build_prompt, parse_inline_reply, handle


class TestBuildPrompt:
    def test_includes_platform_and_sender(self, sample_payload):
        prompt = build_prompt(sample_payload, reply_mode="post_process")
        assert "[Platform: lark]" in prompt
        assert "[Sender: Alice]" in prompt

    def test_includes_timestamp(self, sample_payload):
        prompt = build_prompt(sample_payload, reply_mode="post_process")
        assert "[Timestamp: 2026-05-05T10:30:00Z]" in prompt

    def test_includes_channel_when_present(self, sample_payload):
        prompt = build_prompt(sample_payload, reply_mode="post_process")
        assert "[Channel: Engineering]" in prompt

    def test_includes_message_text(self, sample_payload):
        prompt = build_prompt(sample_payload, reply_mode="post_process")
        assert "Can you review my latest PR?" in prompt
        assert "Alice: Can you review my latest PR?" in prompt

    def test_includes_history_when_present(self, sample_payload):
        sample_payload.history = [
            {"sender_name": "Bob", "text": "Hello", "ts": "10:00"},
            {"sender_name": "Alice", "text": "Hi Bob", "ts": "10:01"},
        ]
        prompt = build_prompt(sample_payload, reply_mode="post_process")
        assert "Bob: Hello" in prompt
        assert "Alice: Hi Bob" in prompt

    def test_no_history_shows_placeholder(self, sample_payload):
        sample_payload.history = []
        prompt = build_prompt(sample_payload, reply_mode="post_process")
        assert "(no prior history)" in prompt

    def test_reply_instructions_when_inline_mode(self, sample_payload):
        prompt = build_prompt(sample_payload, reply_mode="inline")
        assert "--- Reply Instructions ---" in prompt
        assert '"action": "reply"' in prompt
        assert sample_payload.chat_id in prompt

    def test_no_reply_instructions_when_post_process(self, sample_payload):
        prompt = build_prompt(sample_payload, reply_mode="post_process")
        assert "--- Reply Instructions ---" not in prompt

    def test_sender_name_used_correctly(self, sample_payload):
        prompt = build_prompt(sample_payload, reply_mode="post_process")
        assert "--- Current Message ---" in prompt


class TestParseInlineReply:
    def test_parses_reply_action(self):
        stdout = 'Some output\n{"action": "reply", "chat_id": "oc_123", "content": "Hello there"}\n'
        result = parse_inline_reply(stdout)
        assert result is not None
        assert result["action"] == "reply"
        assert result["chat_id"] == "oc_123"
        assert result["content"] == "Hello there"

    def test_finds_last_json_reply(self):
        stdout = (
            '{"action": "reply", "chat_id": "oc_111", "content": "First"}\n'
            '{"action": "reply", "chat_id": "oc_222", "content": "Second"}\n'
        )
        result = parse_inline_reply(stdout)
        assert result["content"] == "Second"

    def test_ignores_non_reply_json(self):
        stdout = '{"other_key": "value"}\n{"action": "reply", "content": "hi"}\n'
        result = parse_inline_reply(stdout)
        assert result is not None
        assert result["content"] == "hi"

    def test_no_reply_returns_none(self):
        stdout = "Some plain text output\n"
        result = parse_inline_reply(stdout)
        assert result is None

    def test_empty_stdout_returns_none(self):
        result = parse_inline_reply("")
        assert result is None


class TestHandle:
    @pytest.mark.asyncio
    async def test_handle_with_post_process_reply(self, sample_payload, sample_project):
        from adapters import ToolResult

        mock_tool = MagicMock()
        mock_tool.run = AsyncMock(return_value=ToolResult(returncode=0, stdout="Reply text", stderr=""))

        mock_router = MagicMock()
        mock_router.run = AsyncMock(return_value=ToolResult(returncode=0, stdout="assistant", stderr=""))

        mock_client = AsyncMock()
        mock_client.send_message = AsyncMock(return_value="msg_123")

        with patch("main._resolve_adapter", side_effect=[mock_router, mock_tool]):
            with patch("main.PLATFORM_REPLY_CLIENTS", {"lark": mock_client}):
                with patch("main.route", side_effect=lambda *a, **kw: "assistant"):
                    await handle(sample_payload, sample_project)

        mock_client.send_message.assert_called_once()
        call_args = mock_client.send_message.call_args
        assert call_args[0][0] == "oc_abc123def456"
        assert call_args[0][1] == "Reply text"

    @pytest.mark.asyncio
    async def test_handle_routing_returns_none_silently_ignores(self, sample_payload, sample_project):
        with patch("main.route", AsyncMock(return_value=None)):
            await handle(sample_payload, sample_project)

    @pytest.mark.asyncio
    async def test_handle_mcp_tool_does_not_send_reply(self, sample_payload, sample_project):
        from adapters import ToolResult

        sample_project["reply_mode"] = "mcp_tool"
        mock_tool = MagicMock()
        mock_tool.run = AsyncMock(return_value=ToolResult(returncode=0, stdout="Done", stderr=""))

        mock_router = MagicMock()
        mock_router.run = AsyncMock(return_value=ToolResult(returncode=0, stdout="assistant", stderr=""))

        mock_client = AsyncMock()

        with patch("main._resolve_adapter", side_effect=[mock_router, mock_tool]):
            with patch("main.PLATFORM_REPLY_CLIENTS", {"lark": mock_client}):
                with patch("main.route", AsyncMock(return_value="assistant")):
                    await handle(sample_payload, sample_project)

        mock_client.send_message.assert_not_called()

    @pytest.mark.asyncio
    async def test_handle_stage1_failure_silently_ignores(self, sample_payload, sample_project):
        with patch("main.route", AsyncMock(side_effect=Exception("LLM error"))):
            await handle(sample_payload, sample_project)
