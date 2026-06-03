import { useProjectStore } from "@/stores/projectStore";
import { mockInvoke } from "../setup";

beforeEach(() => {
  useProjectStore.setState({
    currentProject: null,
    recentProjects: [],
    recentPaths: [],
  });
});

describe("projectStore", () => {
  it("starts with null currentProject", () => {
    expect(useProjectStore.getState().currentProject).toBeNull();
  });

  it("detectStack returns profile from invoke", async () => {
    const profile = {
      id: "proj-1",
      path: "/test/proj",
      name: "proj",
      stack: ["react", "typescript"],
      active_agents: [],
      active_skills: [],
      active_mcps: [],
      preferred_models: [],
    };
    mockInvoke.mockResolvedValueOnce(profile);
    const result = await useProjectStore.getState().detectStack("/test/proj");
    expect(result).toEqual(profile);
    expect(mockInvoke).toHaveBeenCalledWith("detect_stack", { path: "/test/proj" });
  });

  it("detectStack returns fallback on invoke failure", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("not found"));
    const result = await useProjectStore.getState().detectStack("/unknown");
    expect(result.path).toBe("/unknown");
    expect(result.stack).toEqual([]);
    expect(result.name).toBe("unknown");
  });

  it("switchProject sets currentProject and adds to recent", async () => {
    const profile = {
      id: "proj-2",
      path: "/test/proj2",
      name: "proj2",
      stack: ["rust"],
      active_agents: [],
      active_skills: [],
      active_mcps: [],
      preferred_models: [],
    };
    mockInvoke.mockResolvedValueOnce(profile);
    await useProjectStore.getState().switchProject("/test/proj2");
    const state = useProjectStore.getState();
    expect(state.currentProject).toEqual(profile);
    expect(state.recentProjects).toContain("/test/proj2");
  });

  it("switchProject caps recentProjects at 10", async () => {
    const paths = Array.from({ length: 10 }, (_, i) => `/path/${i}`);
    useProjectStore.setState({
      recentProjects: paths,
      recentPaths: paths,
    });
    const profile = {
      id: "proj-3",
      path: "/path/new",
      name: "new",
      stack: [],
      active_agents: [],
      active_skills: [],
      active_mcps: [],
      preferred_models: [],
    };
    mockInvoke.mockResolvedValueOnce(profile);
    await useProjectStore.getState().switchProject("/path/new");
    expect(useProjectStore.getState().recentProjects.length).toBe(10);
    expect(useProjectStore.getState().recentProjects[0]).toBe("/path/new");
  });

  it("switchProject does not duplicate recent entries", async () => {
    useProjectStore.setState({
      recentProjects: ["/test/proj2"],
      recentPaths: ["/test/proj2"],
    });
    const profile = {
      id: "proj-2",
      path: "/test/proj2",
      name: "proj2",
      stack: ["rust"],
      active_agents: [],
      active_skills: [],
      active_mcps: [],
      preferred_models: [],
    };
    mockInvoke.mockResolvedValueOnce(profile);
    await useProjectStore.getState().switchProject("/test/proj2");
    expect(useProjectStore.getState().recentProjects.length).toBe(1);
  });
});
