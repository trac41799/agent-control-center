import {
  getAgentInstallHint,
  getAgentPlatformHints,
  getPlatformHint,
  AgentNotInstalledError,
} from "@/lib/types";

describe("getAgentInstallHint", () => {
  it("returns npm hint for claude", () => {
    expect(getAgentInstallHint("claude")).toBe("npm install -g @anthropic-ai/claude-code");
  });

  it("returns npm hint for claude-code (case-insensitive)", () => {
    expect(getAgentInstallHint("Claude-Code")).toBe("npm install -g @anthropic-ai/claude-code");
  });

  it("returns npm hint for opencode", () => {
    expect(getAgentInstallHint("opencode")).toBe("npm install -g @anomalyco/opencode");
  });

  it("returns pip hint for aider", () => {
    expect(getAgentInstallHint("aider")).toBe("pip install aider-chat");
  });

  it("returns npm hint for goose", () => {
    expect(getAgentInstallHint("goose")).toBe("npm install -g @goose-ai/cli");
  });

  it("returns npm hint for codex", () => {
    expect(getAgentInstallHint("codex")).toBe("npm install -g @openai/codex");
  });

  it("returns null for unknown agent", () => {
    expect(getAgentInstallHint("unknown-agent")).toBeNull();
  });

  it("matches partial agent id containing known key", () => {
    expect(getAgentInstallHint("my-claude-wrapper")).toBe("npm install -g @anthropic-ai/claude-code");
  });
});

describe("getAgentPlatformHints", () => {
  it("returns platform hints for claude", () => {
    const hints = getAgentPlatformHints("claude");
    expect(hints).not.toBeNull();
    expect(hints!.windows).toContain("npm install");
    expect(hints!.macos).toContain("brew install");
    expect(hints!.linux).toContain("npm install");
  });

  it("returns platform hints for aider", () => {
    const hints = getAgentPlatformHints("aider");
    expect(hints).not.toBeNull();
    expect(hints!.windows).toContain("pip install");
    expect(hints!.macos).toContain("brew install");
  });

  it("returns null for unknown agent", () => {
    expect(getAgentPlatformHints("unknown")).toBeNull();
  });
});

describe("getPlatformHint", () => {
  const hints = {
    windows: "win-cmd",
    macos: "mac-cmd",
    linux: "linux-cmd",
  };

  it("returns windows hint for windows UA", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      configurable: true,
    });
    expect(getPlatformHint(hints)).toBe("win-cmd");
  });

  it("returns macos hint for mac UA", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      configurable: true,
    });
    expect(getPlatformHint(hints)).toBe("mac-cmd");
  });

  it("returns linux hint for linux UA", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (X11; Linux x86_64)",
      configurable: true,
    });
    expect(getPlatformHint(hints)).toBe("linux-cmd");
  });
});

describe("AgentNotInstalledError", () => {
  it("creates error with install hint for known agent", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0)",
      configurable: true,
    });
    const err = new AgentNotInstalledError("claude", "claude");
    expect(err.name).toBe("AgentNotInstalledError");
    expect(err.command).toBe("claude");
    expect(err.installHint).toBe("npm install -g @anthropic-ai/claude-code");
    expect(err.message).toContain("not installed");
    expect(err.message).toContain("npm install");
  });

  it("creates error without platform hint for unknown agent", () => {
    const err = new AgentNotInstalledError("foobar", "foobar");
    expect(err.command).toBe("foobar");
    expect(err.installHint).toBeNull();
    expect(err.platformHint).toBeNull();
    expect(err.message).toContain("foobar");
  });
});
