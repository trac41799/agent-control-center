from router import build_router_prompt, parse_router_response


class TestBuildRouterPrompt:
    def test_includes_agent_list_and_message(self):
        agents = [
            {"id": "assistant", "display_name": "Assistant", "description": "General help"},
            {"id": "code-reviewer", "display_name": "Code Reviewer", "description": "Reviews PRs"},
        ]
        prompt = build_router_prompt(
            platform="lark",
            sender_name="Alice",
            text="Review my PR please",
            agents=agents,
        )
        assert "assistant" in prompt
        assert "code-reviewer" in prompt
        assert "General help" in prompt
        assert "Reviews PRs" in prompt
        assert "Alice" in prompt
        assert "lark" in prompt
        assert "Review my PR please" in prompt

    def test_empty_agents_produces_none_marker(self):
        prompt = build_router_prompt(
            platform="slack",
            sender_name="Bob",
            text="Hello",
            agents=[],
        )
        assert "(none)" in prompt
        assert "Bob" in prompt
        assert "slack" in prompt

    def test_includes_platform_field(self):
        prompt = build_router_prompt(
            platform="discord",
            sender_name="Carol",
            text="ping",
            agents=[{"id": "bot", "display_name": "Bot", "description": "Bot"}],
        )
        assert "discord" in prompt


class TestParseRouterResponse:
    def test_parses_single_agent_id(self):
        result = parse_router_response("assistant")
        assert result == "assistant"

    def test_parses_agent_id_with_extra_whitespace(self):
        result = parse_router_response("  code-reviewer  \n")
        assert result == "code-reviewer"

    def test_parses_agent_id_from_response_with_newline(self):
        result = parse_router_response("assistant\n")
        assert result == "assistant"

    def test_strips_explanation_and_returns_first_word(self):
        result = parse_router_response("assistant explanation text here")
        assert result == "assistant"

    def test_none_returns_none(self):
        result = parse_router_response("none")
        assert result is None

    def test_none_with_whitespace_returns_none(self):
        result = parse_router_response("  none  ")
        assert result is None

    def test_empty_string_returns_none(self):
        result = parse_router_response("")
        assert result is None

    def test_only_punctuation_returns_none(self):
        result = parse_router_response(".")
        assert result is None
