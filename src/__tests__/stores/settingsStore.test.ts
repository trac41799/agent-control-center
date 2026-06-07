import { useSettingsStore } from "@/stores/settingsStore";

beforeEach(() => {
  useSettingsStore.setState({
    theme: "dark",
    defaults: { projectPath: "", agentId: "opencode", modelId: "" },
    sidebarCollapsed: { work: false, review: true, configure: true, automate: true, system: true },
  });
  localStorage.clear();
});

describe("settingsStore", () => {
  it("starts with dark theme and opencode agent", () => {
    const state = useSettingsStore.getState();
    expect(state.theme).toBe("dark");
    expect(state.defaults.agentId).toBe("opencode");
  });

  it("saveSettings persists to localStorage", () => {
    useSettingsStore
      .getState()
      .saveSettings({
        theme: "light",
        defaults: { projectPath: "/test", agentId: "claude", modelId: "claude-3" },
      });
    const saved = JSON.parse(localStorage.getItem("acc-settings")!);
    expect(saved.theme).toBe("light");
    expect(saved.defaults.projectPath).toBe("/test");
  });

  it("loadSettings reads from localStorage", () => {
    localStorage.setItem(
      "acc-settings",
      JSON.stringify({
        theme: "light",
        defaults: { projectPath: "/loaded", agentId: "windsurf", modelId: "gpt-4" },
      })
    );
    useSettingsStore.getState().loadSettings();
    const state = useSettingsStore.getState();
    expect(state.theme).toBe("light");
    expect(state.defaults.projectPath).toBe("/loaded");
  });

  it("loadSettings uses defaults when localStorage is corrupt", () => {
    localStorage.setItem("acc-settings", "not-json");
    useSettingsStore.getState().loadSettings();
    const state = useSettingsStore.getState();
    expect(state.theme).toBe("dark");
    expect(state.defaults.agentId).toBe("opencode");
  });

  it("resetDefaults clears localStorage and resets state", () => {
    useSettingsStore.setState({
      theme: "light",
      defaults: { projectPath: "/custom", agentId: "claude", modelId: "gpt-4" },
    });
    useSettingsStore.getState().resetDefaults();
    expect(useSettingsStore.getState().theme).toBe("dark");
    expect(useSettingsStore.getState().defaults.agentId).toBe("opencode");
    expect(localStorage.getItem("acc-settings")).toBeNull();
  });

  describe("sidebar collapse", () => {
    it("defaults: WORK open, all others collapsed", () => {
      const { sidebarCollapsed } = useSettingsStore.getState();
      expect(sidebarCollapsed.work).toBe(false);
      expect(sidebarCollapsed.review).toBe(true);
      expect(sidebarCollapsed.configure).toBe(true);
      expect(sidebarCollapsed.automate).toBe(true);
      expect(sidebarCollapsed.system).toBe(true);
    });

    it("toggleSidebarGroup flips collapse state", () => {
      const { toggleSidebarGroup } = useSettingsStore.getState();
      toggleSidebarGroup("review");
      expect(useSettingsStore.getState().sidebarCollapsed.review).toBe(false);
      toggleSidebarGroup("review");
      expect(useSettingsStore.getState().sidebarCollapsed.review).toBe(true);
    });

    it("persists collapse state to localStorage on save", () => {
      const { toggleSidebarGroup, saveSettings } = useSettingsStore.getState();
      toggleSidebarGroup("configure");
      saveSettings({});
      const saved = JSON.parse(localStorage.getItem("acc-settings")!);
      expect(saved.sidebarCollapsed.configure).toBe(false);
    });

    it("loads collapse state from localStorage on init", () => {
      localStorage.setItem("acc-settings", JSON.stringify({
        sidebarCollapsed: { work: true, review: false, configure: true, automate: true, system: true },
      }));
      useSettingsStore.getState().loadSettings();
      const { sidebarCollapsed } = useSettingsStore.getState();
      expect(sidebarCollapsed.work).toBe(true);
      expect(sidebarCollapsed.review).toBe(false);
    });
  });
});
