import { useBudgetStore } from "@/stores/budgetStore";
import { mockInvoke } from "../setup";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => undefined),
}));

const sampleBudget = {
  id: "b1",
  session_id: "s1",
  plan_agent_id: null,
  agent_id: "claude",
  task_complexity: "medium",
  model: "claude-sonnet-4",
  budget_total: 500000,
  budget_used: 100000,
  state: "active",
  wip_path: null,
  usage_percent: 20,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
};

beforeEach(() => {
  useBudgetStore.setState({
    budgets: [],
    resumptionPlan: null,
    costBreakdowns: [],
    thresholdBudgets: [],
    loading: false,
    error: null,
    lastThresholdFired: null,
    thresholdHistory: [],
  });
});

describe("budgetStore", () => {
  describe("loadBudgets", () => {
    it("populates budgets from invoke", async () => {
      mockInvoke.mockResolvedValueOnce([sampleBudget]);
      await useBudgetStore.getState().loadBudgets();
      expect(useBudgetStore.getState().budgets).toEqual([sampleBudget]);
      expect(mockInvoke).toHaveBeenCalledWith("get_budgets_cmd", {
        sessionId: null,
        planAgentId: null,
        stateFilter: null,
      });
    });

    it("sets loading true then false", async () => {
      mockInvoke.mockResolvedValueOnce([]);
      const promise = useBudgetStore.getState().loadBudgets();
      expect(useBudgetStore.getState().loading).toBe(true);
      await promise;
      expect(useBudgetStore.getState().loading).toBe(false);
    });

    it("sets error on failure", async () => {
      mockInvoke.mockRejectedValueOnce("DB error");
      await useBudgetStore.getState().loadBudgets();
      expect(useBudgetStore.getState().error).toBe("DB error");
      expect(useBudgetStore.getState().loading).toBe(false);
    });
  });

  describe("createBudget", () => {
    it("prepends created budget", async () => {
      mockInvoke.mockResolvedValueOnce(sampleBudget);
      const input = { session_id: null, plan_agent_id: null, agent_id: "claude", task_complexity: "medium", model: "claude-sonnet-4", budget_total: 500000 };
      const result = await useBudgetStore.getState().createBudget(input);
      expect(result).toEqual(sampleBudget);
      expect(useBudgetStore.getState().budgets).toEqual([sampleBudget]);
    });

    it("throws on failure", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("fail"));
      await expect(
        useBudgetStore.getState().createBudget({ session_id: null, plan_agent_id: null, agent_id: "x", task_complexity: null, model: null, budget_total: 100 })
      ).rejects.toThrow("fail");
    });
  });

  describe("updateBudgetUsage", () => {
    it("replaces budget in list", async () => {
      useBudgetStore.setState({ budgets: [sampleBudget] });
      const updated = { ...sampleBudget, budget_used: 200000, usage_percent: 40 };
      mockInvoke.mockResolvedValueOnce(updated);
      await useBudgetStore.getState().updateBudgetUsage("b1", 200000);
      expect(useBudgetStore.getState().budgets[0].budget_used).toBe(200000);
    });
  });

  describe("deleteBudget", () => {
    it("removes budget from list", async () => {
      useBudgetStore.setState({ budgets: [sampleBudget] });
      await useBudgetStore.getState().deleteBudget("b1");
      expect(useBudgetStore.getState().budgets).toHaveLength(0);
    });
  });

  describe("captureWip", () => {
    it("updates budget with wip_path", async () => {
      useBudgetStore.setState({ budgets: [sampleBudget] });
      const updated = { ...sampleBudget, wip_path: "WIP.md" };
      mockInvoke.mockResolvedValueOnce(updated);
      await useBudgetStore.getState().captureWip("b1", "WIP.md");
      expect(useBudgetStore.getState().budgets[0].wip_path).toBe("WIP.md");
      expect(mockInvoke).toHaveBeenCalledWith("capture_wip_cmd", { budgetId: "b1", wipPath: "WIP.md" });
    });
  });

  describe("resumeBudget", () => {
    it("updates budget with additional tokens", async () => {
      useBudgetStore.setState({ budgets: [sampleBudget] });
      const updated = { ...sampleBudget, budget_total: 600000, state: "active" };
      mockInvoke.mockResolvedValueOnce(updated);
      await useBudgetStore.getState().resumeBudget("b1", 100000);
      expect(useBudgetStore.getState().budgets[0].budget_total).toBe(600000);
    });
  });

  describe("resumption plans", () => {
    it("createResumptionPlan sets resumptionPlan", async () => {
      const plan = { id: "rp1", wave_id: "w1", plan_path: "/plan.md", created_at: "2026-06-01" };
      mockInvoke.mockResolvedValueOnce(plan);
      const result = await useBudgetStore.getState().createResumptionPlan("w1", null, "/plan.md", ["a"], ["b"], ["c"], 50000);
      expect(result).toEqual(plan);
      expect(useBudgetStore.getState().resumptionPlan).toEqual(plan);
    });

    it("loadResumptionPlans fetches current plan", async () => {
      const plan = { id: "rp2", wave_id: "current", plan_path: "/p.md", created_at: "2026-06-01" };
      mockInvoke.mockResolvedValueOnce(plan);
      await useBudgetStore.getState().loadResumptionPlans();
      expect(useBudgetStore.getState().resumptionPlan).toEqual(plan);
    });
  });

  describe("loadWips", () => {
    it("returns wip entries from exceeded budgets", async () => {
      mockInvoke.mockResolvedValueOnce([{ ...sampleBudget, wip_path: "WIP.md" }]);
      const wips = await useBudgetStore.getState().loadWips();
      expect(wips).toHaveLength(1);
      expect(wips[0].wip_path).toBe("WIP.md");
      expect(wips[0].budget_id).toBe("b1");
    });

    it("filters out budgets without wip_path", async () => {
      mockInvoke.mockResolvedValueOnce([sampleBudget]);
      const wips = await useBudgetStore.getState().loadWips();
      expect(wips).toHaveLength(0);
    });

    it("returns empty on error", async () => {
      mockInvoke.mockRejectedValueOnce("fail");
      const wips = await useBudgetStore.getState().loadWips();
      expect(wips).toEqual([]);
    });
  });

  describe("thresholds", () => {
    it("checkThresholds populates thresholdBudgets", async () => {
      mockInvoke.mockResolvedValueOnce([sampleBudget]);
      await useBudgetStore.getState().checkThresholds();
      expect(useBudgetStore.getState().thresholdBudgets).toEqual([sampleBudget]);
    });

    it("clearThresholdHistory resets history", () => {
      useBudgetStore.setState({
        lastThresholdFired: { agent_ref: "claude", percentage: 80, message: "warn" },
        thresholdHistory: [{ agent_ref: "claude", percentage: 80, message: "warn" }],
      });
      useBudgetStore.getState().clearThresholdHistory();
      expect(useBudgetStore.getState().lastThresholdFired).toBeNull();
      expect(useBudgetStore.getState().thresholdHistory).toHaveLength(0);
    });
  });

  describe("cost breakdown", () => {
    it("getCostBreakdown populates costBreakdowns", async () => {
      const breakdowns = [{ model: "claude-sonnet-4", tokens_in: 1000, tokens_out: 500, estimated_cost_usd: 0.01 }];
      mockInvoke.mockResolvedValueOnce(breakdowns);
      await useBudgetStore.getState().getCostBreakdown("s1");
      expect(useBudgetStore.getState().costBreakdowns).toEqual(breakdowns);
    });

    it("loadCostBreakdown returns breakdowns", async () => {
      const breakdowns = [{ model: "gpt-4o", tokens_in: 2000, tokens_out: 1000, estimated_cost_usd: 0.05 }];
      mockInvoke.mockResolvedValueOnce(breakdowns);
      const result = await useBudgetStore.getState().loadCostBreakdown("s1");
      expect(result).toEqual(breakdowns);
    });

    it("loadCostBreakdown returns empty on error", async () => {
      mockInvoke.mockRejectedValueOnce("fail");
      const result = await useBudgetStore.getState().loadCostBreakdown("s1");
      expect(result).toEqual([]);
    });
  });
});
