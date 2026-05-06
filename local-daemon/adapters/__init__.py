from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class ToolResult:
    returncode: int
    stdout: str
    stderr: str


class CodingToolAdapter(ABC):
    @abstractmethod
    async def run(
        self,
        prompt: str,
        cwd: str,
        timeout: int = 120,
        system_prompt_path: Optional[str] = None,
        tool_manifest_path: Optional[str] = None,
    ) -> ToolResult:
        ...
