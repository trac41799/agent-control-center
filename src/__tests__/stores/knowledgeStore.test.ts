import { useKnowledgeStore } from "@/stores/knowledgeStore";
import { mockInvoke } from "../setup";
import type { KnowledgeItem } from "@/lib/types";

beforeEach(() => {
  useKnowledgeStore.setState({
    items: [],
    loading: false,
    error: null,
    filters: {},
    relations: {},
    stats: null,
    preflight: [],
    preflightStack: null,
    compounderRunning: false,
    lastCompounderResult: null,
    lastCompounderAt: null,
  });
});

describe("knowledgeStore", () => {
  describe("CRUD", () => {
    it("loadItems populates items from invoke", async () => {
      const items = [
        { id: "k1", type: "PatternCard", title: "Use React.memo", content: "...", confidence: 0.85, confirmation_count: 4, is_global: false, status: "active", stack_tags: "react", agent_tags: "claude", project_id: "p1", session_ids: "s1", plan_ids: null, first_seen: "2026-06-01", last_confirmed: "2026-06-01", created_at: "2026-06-01" }
      ];
      mockInvoke.mockResolvedValueOnce(items);
      await useKnowledgeStore.getState().loadItems("p1");
      expect(useKnowledgeStore.getState().items).toEqual(items);
    });

    it("createItem prepends created item and returns it", async () => {
      const created = { id: "k2", type: "DecisionLog", title: "Chose SQLite", content: "...", confidence: 0.9, confirmation_count: 1, is_global: false, status: "active", first_seen: "2026-06-03", last_confirmed: "2026-06-03" };
      mockInvoke.mockResolvedValueOnce(created);
      const result = await useKnowledgeStore.getState().createItem({ type: "DecisionLog", title: "Chose SQLite", content: "..." });
      expect(result).toEqual(created);
      expect(useKnowledgeStore.getState().items).toEqual([created]);
    });

    it("updateItem calls invoke and replaces item in list", async () => {
      useKnowledgeStore.setState({ items: [{ id: "k1", type: "PatternCard", title: "Old", content: "old", confidence: 0.5, confirmation_count: 1, is_global: false, status: "active", first_seen: "2026-06-01", last_confirmed: "2026-06-01" } as KnowledgeItem] });
      const updated = { id: "k1", type: "PatternCard", title: "New", content: "new", confidence: 0.8, confirmation_count: 2, is_global: false, status: "active", first_seen: "2026-06-01", last_confirmed: "2026-06-01" } as KnowledgeItem;
      mockInvoke.mockResolvedValueOnce(updated);
      await useKnowledgeStore.getState().updateItem("k1", { title: "New" });
      expect(useKnowledgeStore.getState().items[0].title).toBe("New");
    });

    it("deleteItem removes item from list", async () => {
      useKnowledgeStore.setState({ items: [{ id: "k1", type: "PatternCard", title: "T", content: "c", confidence: 0.5, confirmation_count: 1, is_global: false, status: "active", first_seen: "2026-06-01", last_confirmed: "2026-06-01" } as KnowledgeItem] });
      mockInvoke.mockResolvedValueOnce(undefined);
      await useKnowledgeStore.getState().deleteItem("k1");
      expect(useKnowledgeStore.getState().items).toEqual([]);
    });
  });

  describe("compounder", () => {
    it("runCompounder sets compounderRunning true while running", async () => {
      mockInvoke.mockResolvedValueOnce([{ id: "k3", type: "PatternCard", title: "New Pattern", content: "...", confidence: 0.7, confirmation_count: 1, is_global: false, status: "active", first_seen: "2026-06-03", last_confirmed: "2026-06-03" }]);
      const promise = useKnowledgeStore.getState().runCompounder("s1", "p1");
      expect(useKnowledgeStore.getState().compounderRunning).toBe(true);
      await promise;
    });

    it("runCompounder sets lastCompounderAt and lastCompounderResult on success", async () => {
      const items = [{ id: "k4", type: "Runbook", title: "Setup Steps", content: "...", confidence: 0.6, confirmation_count: 1, is_global: false, status: "active", first_seen: "2026-06-03", last_confirmed: "2026-06-03" }];
      mockInvoke.mockResolvedValueOnce(items);
      await useKnowledgeStore.getState().runCompounder("s1", "p1");
      const state = useKnowledgeStore.getState();
      expect(state.compounderRunning).toBe(false);
      expect(state.lastCompounderAt).toBeTruthy();
      expect(state.lastCompounderResult).toEqual(items);
    });

    it("runCompounder returns null and sets error on failure", async () => {
      mockInvoke.mockRejectedValueOnce("API Error");
      const result = await useKnowledgeStore.getState().runCompounder("s1", "p1");
      expect(result).toBeNull();
      expect(useKnowledgeStore.getState().compounderRunning).toBe(false);
      expect(useKnowledgeStore.getState().error).toBe("API Error");
    });

    it("compoundKnowledge calls compound_knowledge_cmd", async () => {
      const items = [{ id: "k5", type: "LessonBrief", title: "DRY principle", content: "...", confidence: 0.8, confirmation_count: 3, is_global: true, status: "active", first_seen: "2026-06-01", last_confirmed: "2026-06-03" }];
      mockInvoke.mockResolvedValueOnce(items);
      await useKnowledgeStore.getState().compoundKnowledge("p1");
      expect(mockInvoke).toHaveBeenCalledWith("compound_knowledge_cmd", { projectId: "p1" });
      expect(useKnowledgeStore.getState().items).toEqual(items);
    });
  });

  describe("preflight", () => {
    it("loadPreflight populates preflight warnings for given stack", async () => {
      const warnings = [
        { id: "pw1", title: "Avoid nested useEffect", content: "May cause re-render loops", confidence: 0.92, confirmation_count: 7, stack_tags: "react" }
      ];
      mockInvoke.mockResolvedValueOnce(warnings);
      await useKnowledgeStore.getState().loadPreflight("react");
      expect(useKnowledgeStore.getState().preflight).toEqual(warnings);
      expect(useKnowledgeStore.getState().preflightStack).toBe("react");
    });

    it("loadPreflight clears preflight on error", async () => {
      useKnowledgeStore.setState({ preflight: [{ id: "old", title: "Old", content: "old", confidence: 0.5, confirmation_count: 1 }] });
      mockInvoke.mockRejectedValueOnce("Not found");
      await useKnowledgeStore.getState().loadPreflight("rust");
      expect(useKnowledgeStore.getState().preflight).toEqual([]);
    });

    it("loadPreflight calls get_preflight_warnings_cmd with stack", async () => {
      mockInvoke.mockResolvedValueOnce([]);
      await useKnowledgeStore.getState().loadPreflight("python");
      expect(mockInvoke).toHaveBeenCalledWith("get_preflight_warnings_cmd", { stack: "python" });
    });
  });

  describe("relations", () => {
    it("loadRelations populates relations map", async () => {
      const rels = [{ from_id: "k1", to_id: "k2", relation_type: "supports", created_at: "2026-06-03" }];
      mockInvoke.mockResolvedValueOnce(rels);
      await useKnowledgeStore.getState().loadRelations("k1");
      expect(useKnowledgeStore.getState().relations["k1"]).toEqual(rels);
    });

    it("addRelation calls invoke and prepends to relations", async () => {
      const rel = { from_id: "k1", to_id: "k3", relation_type: "contradicts", created_at: "2026-06-03" };
      mockInvoke.mockResolvedValueOnce(rel);
      await useKnowledgeStore.getState().addRelation("k1", "k3", "contradicts");
      expect(useKnowledgeStore.getState().relations["k1"]).toEqual([rel]);
    });
  });

  describe("stats", () => {
    it("loadStats populates stats from invoke", async () => {
      const stats = { total: 10, avg_confidence: 0.75, by_type: [{ type: "PatternCard", count: 5 }], by_status: [{ status: "active", count: 8 }], by_stack: [{ stack: "react", count: 6 }] };
      mockInvoke.mockResolvedValueOnce(stats);
      await useKnowledgeStore.getState().loadStats("p1");
      expect(useKnowledgeStore.getState().stats).toEqual(stats);
    });
  });
});
