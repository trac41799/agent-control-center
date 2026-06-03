import { useControlStore } from "@/stores/controlStore";
import { mockInvoke } from "../setup";

beforeEach(() => {
  useControlStore.setState({
    sessions: [],
    conflicts: [],
    controlModeActive: false,
    deferredNotice: null,
  });
});

describe("controlStore", () => {
  it("starts with default state", () => {
    const state = useControlStore.getState();
    expect(state.sessions).toEqual([]);
    expect(state.conflicts).toEqual([]);
    expect(state.controlModeActive).toBe(false);
    expect(state.deferredNotice).toBeNull();
  });

  it("setControlMode toggles controlModeActive", () => {
    useControlStore.getState().setControlMode(true);
    expect(useControlStore.getState().controlModeActive).toBe(true);
    useControlStore.getState().setControlMode(false);
    expect(useControlStore.getState().controlModeActive).toBe(false);
  });

  it("loadSessions sets deferred notice", async () => {
    await useControlStore.getState().loadSessions("thread-1");
    expect(useControlStore.getState().deferredNotice).toContain("W5.0");
  });

  it("promoteToControl sets deferred notice", async () => {
    await useControlStore.getState().promoteToControl("thread-1", "panel-1");
    expect(useControlStore.getState().deferredNotice).toContain("W5.0");
  });

  it("setState sets deferred notice", async () => {
    await useControlStore.getState().setState("session-1", "active");
    expect(useControlStore.getState().deferredNotice).toContain("W5.0");
  });

  it("loadConflicts calls invoke and updates conflicts", async () => {
    const owned = [
      { id: "f1", project_id: "proj-1", file_path: "src/main.rs", claimed_by_thread_id: "thread-1", claimed_at: "2026-06-01T00:00:00Z", released_at: null },
    ];
    mockInvoke.mockResolvedValueOnce(owned);
    await useControlStore.getState().loadConflicts("thread-1");
    expect(useControlStore.getState().conflicts).toEqual(["src/main.rs (claimed by thread-1)"]);
  });

  it("loadConflicts sets empty on error", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("fail"));
    await useControlStore.getState().loadConflicts("thread-1");
    expect(useControlStore.getState().conflicts).toEqual([]);
  });

  it("clearNotice clears deferredNotice", () => {
    useControlStore.setState({ deferredNotice: "some notice" });
    useControlStore.getState().clearNotice();
    expect(useControlStore.getState().deferredNotice).toBeNull();
  });
});
