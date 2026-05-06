import tempfile
from pathlib import Path

import pytest

from registry import load_registry, lookup_project


class TestLoadRegistry:
    def test_valid_yaml(self, sample_registry_yaml):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            f.write(sample_registry_yaml)
            path = f.name

        try:
            registry = load_registry(path)
            assert "platforms" in registry
            assert len(registry["platforms"]) == 2
        finally:
            Path(path).unlink()

    def test_missing_file_returns_empty(self):
        registry = load_registry("/nonexistent/path/registry.yaml")
        assert registry == {"platforms": []}

    def test_invalid_yaml_returns_empty(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            f.write("this: [: is: not: valid yaml")
            path = f.name

        try:
            registry = load_registry(path)
            assert registry == {"platforms": []}
        finally:
            Path(path).unlink()

    def test_missing_platforms_key_returns_empty(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            f.write("other_key: value\n")
            path = f.name

        try:
            registry = load_registry(path)
            assert registry == {"platforms": []}
        finally:
            Path(path).unlink()


class TestLookupProject:
    def test_finds_by_routing_key(self, sample_registry_yaml):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            f.write(sample_registry_yaml)
            path = f.name

        try:
            registry = load_registry(path)
            project = lookup_project(registry, "lark:cli_abc123")
            assert project is not None
            assert project["platform"] == "lark"
            assert project["root"] == "/home/user/my-project/lark-agents"
            assert len(project["agents"]) == 2
        finally:
            Path(path).unlink()

    def test_returns_none_for_unknown_key(self, sample_registry_yaml):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            f.write(sample_registry_yaml)
            path = f.name

        try:
            registry = load_registry(path)
            project = lookup_project(registry, "unknown:key")
            assert project is None
        finally:
            Path(path).unlink()

    def test_empty_registry_returns_none(self):
        registry = {"platforms": []}
        project = lookup_project(registry, "any:key")
        assert project is None

    def test_skips_malformed_entries(self):
        registry = {
            "platforms": [
                "not_a_dict",
                {"routing_key": "valid:key", "platform": "lark"},
                None,
            ]
        }
        project = lookup_project(registry, "valid:key")
        assert project is not None
        assert project["platform"] == "lark"
