import {
  AGENT_CONFIGS,
  CONNECTOR_SPECS,
  getAgentConfig,
  getWaveEligibleAgents,
  getSubagentCapableAgents,
} from "@/lib/agents/configs";

describe("AGENT_CONFIGS", () => {
  it("contains 9 agents", () => {
    expect(AGENT_CONFIGS).toHaveLength(9);
  });

  it("each agent has required fields", () => {
    for (const agent of AGENT_CONFIGS) {
      expect(agent.id).toBeTruthy();
      expect(agent.label).toBeTruthy();
      expect(agent.spawnCmd).toBeTruthy();
      expect(agent.memoryFile).toBeTruthy();
      expect(typeof agent.tier).toBe("number");
      expect(typeof agent.waveEligible).toBe("boolean");
      expect(typeof agent.supportsSubagents).toBe("boolean");
    }
  });

  it("all agents are tier 1", () => {
    for (const agent of AGENT_CONFIGS) {
      expect(agent.tier).toBe(1);
    }
  });

  it("all agents are wave eligible", () => {
    for (const agent of AGENT_CONFIGS) {
      expect(agent.waveEligible).toBe(true);
    }
  });

  it("contains expected agent ids", () => {
    const ids = AGENT_CONFIGS.map((a) => a.id);
    expect(ids).toContain("claude");
    expect(ids).toContain("opencode");
    expect(ids).toContain("aider");
    expect(ids).toContain("goose");
    expect(ids).toContain("cline");
    expect(ids).toContain("cursor");
    expect(ids).toContain("gemini");
    expect(ids).toContain("qwen-code");
    expect(ids).toContain("codex");
  });

  it("cursor requires auth", () => {
    const cursor = AGENT_CONFIGS.find((a) => a.id === "cursor");
    expect(cursor?.requiresAuth).toBe("cursor-subscription");
  });

  it("subagent-capable agents have detection pattern", () => {
    const subagentAgents = AGENT_CONFIGS.filter((a) => a.supportsSubagents);
    for (const agent of subagentAgents) {
      expect(agent.subagentDetectionPattern).toBeTruthy();
    }
  });

  it("all agents have wave command", () => {
    for (const agent of AGENT_CONFIGS) {
      expect(agent.waveCommand).toBeTruthy();
    }
  });
});

describe("CONNECTOR_SPECS", () => {
  it("contains 3 connectors", () => {
    expect(CONNECTOR_SPECS).toHaveLength(3);
  });

  it("contains lark, slack, jira", () => {
    const ids = CONNECTOR_SPECS.map((c) => c.id);
    expect(ids).toContain("lark");
    expect(ids).toContain("slack");
    expect(ids).toContain("jira");
  });

  it("each connector has approval signals", () => {
    for (const spec of CONNECTOR_SPECS) {
      expect(spec.approvalSignals.length).toBeGreaterThan(0);
    }
  });

  it("jira is structured", () => {
    const jira = CONNECTOR_SPECS.find((c) => c.id === "jira");
    expect(jira?.structured).toBe(true);
  });
});

describe("getAgentConfig", () => {
  it("returns config for valid id", () => {
    const config = getAgentConfig("claude");
    expect(config).toBeDefined();
    expect(config!.label).toBe("Claude Code");
  });

  it("returns undefined for invalid id", () => {
    expect(getAgentConfig("nonexistent")).toBeUndefined();
  });
});

describe("getWaveEligibleAgents", () => {
  it("returns all agents (all are wave eligible)", () => {
    const eligible = getWaveEligibleAgents();
    expect(eligible).toHaveLength(9);
  });
});

describe("getSubagentCapableAgents", () => {
  it("returns agents with subagent support", () => {
    const capable = getSubagentCapableAgents();
    expect(capable.length).toBeGreaterThan(0);
    for (const agent of capable) {
      expect(agent.supportsSubagents).toBe(true);
    }
  });

  it("aider is not subagent capable", () => {
    const capable = getSubagentCapableAgents();
    const ids = capable.map((a) => a.id);
    expect(ids).not.toContain("aider");
  });
});
