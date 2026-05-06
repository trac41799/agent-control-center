import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from adapters import CodingToolAdapter, ToolResult
from adapters.coding_tool import (
    ADAPTER_MAP,
    ClaudeCodeAdapter,
    GenericCLIAdapter,
    OpenCodeAdapter,
    _run_subprocess,
)


class TestToolResult:
    def test_creation(self):
        result = ToolResult(returncode=0, stdout="Hello", stderr="")
        assert result.returncode == 0
        assert result.stdout == "Hello"
        assert result.stderr == ""

    def test_nonzero_returncode(self):
        result = ToolResult(returncode=1, stdout="", stderr="Error message")
        assert result.returncode == 1
        assert result.stderr == "Error message"


class TestCodingToolAdapter:
    def test_is_abstract(self):
        with pytest.raises(TypeError):
            CodingToolAdapter()


class TestAdapterMap:
    def test_claude_in_map(self):
        assert "claude" in ADAPTER_MAP
        assert isinstance(ADAPTER_MAP["claude"], ClaudeCodeAdapter)

    def test_opencode_in_map(self):
        assert "opencode" in ADAPTER_MAP
        assert isinstance(ADAPTER_MAP["opencode"], OpenCodeAdapter)


class TestClaudeCodeAdapter:
    @pytest.mark.asyncio
    async def test_run_returns_tool_result(self):
        mock_proc = MagicMock()
        mock_proc.returncode = 0
        mock_proc.communicate = AsyncMock(return_value=(b"output", b""))

        with patch("asyncio.create_subprocess_exec", AsyncMock(return_value=mock_proc)):
            adapter = ClaudeCodeAdapter()
            result = await adapter.run(prompt="test", cwd="/tmp", timeout=10)

        assert isinstance(result, ToolResult)
        assert result.returncode == 0
        assert result.stdout == "output"

    @pytest.mark.asyncio
    async def test_run_passes_correct_command(self):
        mock_proc = MagicMock()
        mock_proc.returncode = 0
        mock_proc.communicate = AsyncMock(return_value=(b"output", b""))
        mock_exec = AsyncMock(return_value=mock_proc)

        with patch("asyncio.create_subprocess_exec", mock_exec):
            adapter = ClaudeCodeAdapter()
            await adapter.run(prompt="hello world", cwd="/workspace", timeout=60)

        call_args = mock_exec.call_args
        assert call_args[0][0] == "claude"
        assert call_args[0][1] == "-p"
        assert call_args[0][2] == "hello world"
        assert call_args[0][3] == "--output-format"
        assert call_args[0][4] == "json"
        assert call_args[1]["cwd"] == "/workspace"

    @pytest.mark.asyncio
    async def test_run_handles_timeout(self):
        async def slow_communicate():
            await asyncio.sleep(10)
            return b"", b""

        mock_proc = MagicMock()
        mock_proc.returncode = 0
        mock_proc.communicate = slow_communicate
        mock_proc.wait = AsyncMock()
        mock_proc.kill = MagicMock()

        with patch("asyncio.create_subprocess_exec", AsyncMock(return_value=mock_proc)):
            adapter = ClaudeCodeAdapter()
            result = await adapter.run(prompt="test", cwd="/tmp", timeout=0.1)

        assert result.returncode == -1
        assert "Timeout" in result.stderr


class TestOpenCodeAdapter:
    @pytest.mark.asyncio
    async def test_run_passes_correct_command(self):
        mock_proc = MagicMock()
        mock_proc.returncode = 0
        mock_proc.communicate = AsyncMock(return_value=(b"result", b""))
        mock_exec = AsyncMock(return_value=mock_proc)

        with patch("asyncio.create_subprocess_exec", mock_exec):
            adapter = OpenCodeAdapter()
            await adapter.run(prompt="do something", cwd="/workspace", timeout=60)

        call_args = mock_exec.call_args
        assert call_args[0][0] == "opencode"
        assert call_args[0][1] == "run"
        assert call_args[0][2] == "--format"
        assert call_args[0][3] == "json"
        assert call_args[0][4] == "do something"


class TestGenericCLIAdapter:
    @pytest.mark.asyncio
    async def test_run_passes_configured_command(self):
        mock_proc = MagicMock()
        mock_proc.returncode = 0
        mock_proc.communicate = AsyncMock(return_value=(b"result", b""))
        mock_exec = AsyncMock(return_value=mock_proc)

        with patch("asyncio.create_subprocess_exec", mock_exec):
            adapter = GenericCLIAdapter(command=["my-tool", "--verbose"])
            await adapter.run(prompt="run this", cwd="/workspace", timeout=60)

        call_args = mock_exec.call_args
        assert call_args[0][0] == "my-tool"
        assert call_args[0][1] == "--verbose"
        assert call_args[0][2] == "run this"

    @pytest.mark.asyncio
    async def test_run_captures_stderr(self):
        mock_proc = MagicMock()
        mock_proc.returncode = 1
        mock_proc.communicate = AsyncMock(return_value=(b"", b"error occurred"))

        with patch("asyncio.create_subprocess_exec", AsyncMock(return_value=mock_proc)):
            adapter = GenericCLIAdapter(command=["tool"])
            result = await adapter.run(prompt="test", cwd="/tmp", timeout=10)

        assert result.returncode == 1
        assert result.stderr == "error occurred"
