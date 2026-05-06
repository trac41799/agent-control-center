import logging
import os
from pathlib import Path
from typing import Optional

import yaml

logger = logging.getLogger(__name__)


def load_registry(path: str = "agent_registry.yaml") -> dict:
    if not os.path.isfile(path):
        logger.warning("Registry file not found: %s", path)
        return {"platforms": []}

    try:
        with open(path, "r") as f:
            data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        logger.error("Failed to parse registry YAML: %s", e)
        return {"platforms": []}

    if not isinstance(data, dict) or "platforms" not in data:
        logger.error("Registry missing 'platforms' key")
        return {"platforms": []}

    return data


def lookup_project(registry: dict, routing_key: str) -> Optional[dict]:
    platforms = registry.get("platforms", [])
    for entry in platforms:
        if not isinstance(entry, dict):
            logger.warning("Skipping non-dict platform entry: %s", entry)
            continue
        if entry.get("routing_key") == routing_key:
            return entry
    return None


def find_registry_path() -> str:
    env_path = os.environ.get("REGISTRY_PATH")
    if env_path:
        return env_path
    cwd_path = Path.cwd() / "agent_registry.yaml"
    if cwd_path.is_file():
        return str(cwd_path)
    project_root = Path(__file__).resolve().parent.parent / "agent_registry.yaml"
    if project_root.is_file():
        return str(project_root)
    return "agent_registry.yaml"
