import asyncio
import shlex
from typing import Optional

from . import CodingToolAdapter, ToolResult


class ClaudeCodeAdapter(CodingToolAdapter):
    async def run(
        self,
        prompt: str,
        cwd: str,
        timeout: int = 120,
        system_prompt_path: Optional[str] = None,
        tool_manifest_path: Optional[str] = None,
    ) -> ToolResult:
        cmd = ["claude", "-p", prompt, "--output-format", "json"]
        return await _run_subprocess(cmd, cwd, timeout)


class OpenCodeAdapter(CodingToolAdapter):
    async def run(
        self,
        prompt: str,
        cwd: str,
        timeout: int = 120,
        system_prompt_path: Optional[str] = None,
        tool_manifest_path: Optional[str] = None,
    ) -> ToolResult:
        cmd = ["opencode", "run", "--format", "json", prompt]
        return await _run_subprocess(cmd, cwd, timeout)


class GenericCLIAdapter(CodingToolAdapter):
    def __init__(self, command: list[str]):
        self.command = command

    async def run(
        self,
        prompt: str,
        cwd: str,
        timeout: int = 120,
        system_prompt_path: Optional[str] = None,
        tool_manifest_path: Optional[str] = None,
    ) -> ToolResult:
        cmd = list(self.command) + [prompt]
        return await _run_subprocess(cmd, cwd, timeout)


async def _run_subprocess(cmd: list[str], cwd: str, timeout: int) -> ToolResult:
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=cwd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        return ToolResult(returncode=-1, stdout="", stderr=f"Timeout after {timeout}s")
    return ToolResult(
        returncode=proc.returncode or 0,
        stdout=stdout.decode("utf-8", errors="replace"),
        stderr=stderr.decode("utf-8", errors="replace"),
    )


ADAPTER_MAP: dict[str, CodingToolAdapter] = {
    "claude": ClaudeCodeAdapter(),
    "opencode": OpenCodeAdapter(),
}
