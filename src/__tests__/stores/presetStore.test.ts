import { usePresetStore } from "@/stores/presetStore";

beforeEach(() => {
  usePresetStore.setState({
    presets: [],
    globalPresets: [],
    projectPresets: [],
  });
});

describe("presetStore", () => {
  it("addPreset adds to presets and globalPresets", () => {
    usePresetStore.getState().addPreset({
      label: "Test Preset",
      agent_id: "claude",
      command: "test_cmd",
      tags: ["test"],
      sort_order: 0,
    });
    const state = usePresetStore.getState();
    expect(state.presets).toHaveLength(1);
    expect(state.presets[0].label).toBe("Test Preset");
    expect(state.presets[0].id).toBeTruthy();
    expect(state.globalPresets).toHaveLength(1);
  });

  it("removePreset removes from all arrays", () => {
    usePresetStore.setState({
      presets: [{ id: "p1", label: "A", agent_id: "", command: "a", tags: [], sort_order: 0 }],
      globalPresets: [{ id: "p1", label: "A", agent_id: "", command: "a", tags: [], sort_order: 0 }],
      projectPresets: [{ id: "p1", label: "A", agent_id: "", command: "a", tags: [], sort_order: 0 }],
    });
    usePresetStore.getState().removePreset("p1");
    const state = usePresetStore.getState();
    expect(state.presets).toHaveLength(0);
    expect(state.globalPresets).toHaveLength(0);
    expect(state.projectPresets).toHaveLength(0);
  });

  it("reorderPresets reorders by id array", () => {
    usePresetStore.setState({
      presets: [
        { id: "p1", label: "A", agent_id: "", command: "a", tags: [], sort_order: 0 },
        { id: "p2", label: "B", agent_id: "", command: "b", tags: [], sort_order: 1 },
        { id: "p3", label: "C", agent_id: "", command: "c", tags: [], sort_order: 2 },
      ],
      globalPresets: [],
      projectPresets: [],
    });
    usePresetStore.getState().reorderPresets(["p3", "p1", "p2"]);
    const state = usePresetStore.getState();
    expect(state.presets.map((p) => p.id)).toEqual(["p3", "p1", "p2"]);
  });

  it("reorderPresets drops unknown ids", () => {
    usePresetStore.setState({
      presets: [
        { id: "p1", label: "A", agent_id: "", command: "a", tags: [], sort_order: 0 },
      ],
      globalPresets: [],
      projectPresets: [],
    });
    usePresetStore.getState().reorderPresets(["p1", "unknown"]);
    expect(usePresetStore.getState().presets).toHaveLength(1);
  });

  it("executePreset logs execution for valid preset", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    usePresetStore.setState({
      presets: [{ id: "p1", label: "Fix Tests", agent_id: "", command: "fix_tests", tags: [], sort_order: 0 }],
      globalPresets: [],
      projectPresets: [],
    });
    usePresetStore.getState().executePreset("p1", "claude");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("Fix Tests"));
    spy.mockRestore();
  });

  it("executePreset does nothing for invalid preset id", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    usePresetStore.getState().executePreset("nonexistent", "claude");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
