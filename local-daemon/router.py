import json
import logging
import re
from typing import Optional

from adapters import ToolResult
from adapters.coding_tool import CodingToolAdapter

logger = logging.getLogger(__name__)

ROUTER_SYSTEM_PROMPT = """\
You are a message router. Given a list of available agents and a user message,
output ONLY the id of the agent that should handle the message.
Output a single word: either an agent id, or "none" if no agent matches.
Do not output any other text, explanation, or punctuation."""

ROUTER_PROMPT_TEMPLATE = """\
Available agents:
{agent_list}

Message from {sender_name} on {platform}:
{text}

Which agent should handle this message? Output only the agent id or "none":"""


def build_router_prompt(
    platform: str,
    sender_name: str,
    text: str,
    agents: list[dict],
) -> str:
    agent_lines = []
    for agent in agents:
        agent_id = agent.get("id", "")
        display_name = agent.get("display_name", agent_id)
        description = agent.get("description", "")
        agent_lines.append(f"  - {agent_id}: {display_name} — {description}")

    agent_list = "\n".join(agent_lines) if agent_lines else "  (none)"

    return ROUTER_PROMPT_TEMPLATE.format(
        agent_list=agent_list,
        sender_name=sender_name,
        platform=platform,
        text=text,
    )


def parse_router_response(response: str) -> Optional[str]:
    for line in response.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        for word in line.split():
            cleaned = re.sub(r"[^a-z0-9_\-]", "", word.lower())
            if cleaned:
                if cleaned == "none":
                    return None
                return cleaned
    return None


async def route(
    payload,  # StandardContextPayload
    project: dict,
    adapter: CodingToolAdapter,
    cwd: str = ".",
) -> Optional[str]:
    agents = project.get("agents", [])
    if not agents:
        return None

    prompt = build_router_prompt(
        platform=payload.platform,
        sender_name=payload.sender_name,
        text=payload.text,
        agents=agents,
    )

    try:
        result: ToolResult = await adapter.run(
            prompt=ROUTER_SYSTEM_PROMPT + "\n\n" + prompt,
            cwd=cwd,
            timeout=30,
        )
    except Exception as e:
        logger.error("Router adapter failed: %s", e)
        return None

    if result.returncode != 0:
        logger.error("Router returned non-zero: %d, stderr: %s", result.returncode, result.stderr)
        return None

    agent_id = parse_router_response(result.stdout)
    logger.info("Router classified message → agent_id=%s", agent_id)
    return agent_id
