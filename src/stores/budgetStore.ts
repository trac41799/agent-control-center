import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { AgentBudget, BudgetInput, WaveResumptionPlan, CostBreakdown } from "../lib/types";

interface BudgetStore {
  budgets: AgentBudget[];
  resumptionPlan: WaveResumptionPlan | null;
  costBreakdowns: CostBreakdown[];
  thresholdBudgets: AgentBudget[];

  loadBudgets: (sessionId?: string, planAgentId?: string) => Promise<void>;
  createBudget: (input: BudgetInput) => Promise<AgentBudget>;
  updateUsage: (budgetId: string, tokensUsed: number) => Promise<AgentBudget>;
  captureWip: (budgetId: string, wipPath: string) => Promise<AgentBudget>;
  resumeBudget: (budgetId: string, additionalTokens: number) => Promise<AgentBudget>;
  createResumptionPlan: (
    waveId: string,
    pendingTaskId: string | null,
    planPath: string,
    agentsCompleted: string[],
    agentsWipd: string[],
    agentsPending: string[],
    estimatedRemainingTokens: number | null,
  ) => Promise<WaveResumptionPlan>;
  getResumptionPlan: (waveId: string) => Promise<WaveResumptionPlan | null>;
  getCostBreakdown: (sessionId: string) => Promise<void>;
  checkThresholds: () => Promise<void>;
}

export const useBudgetStore = create<BudgetStore>((set) => ({
  budgets: [],
  resumptionPlan: null,
  costBreakdowns: [],
  thresholdBudgets: [],

  loadBudgets: async (sessionId, planAgentId) => {
    const budgets = await invoke<AgentBudget[]>("get_budgets_cmd", {
      sessionId: sessionId ?? null,
      planAgentId: planAgentId ?? null,
      stateFilter: null,
    });
    set({ budgets });
  },

  createBudget: async (input) => {
    const result = await invoke<AgentBudget>("create_budget_cmd", { input });
    set((state) => ({ budgets: [result, ...state.budgets] }));
    return result;
  },

  updateUsage: async (budgetId, tokensUsed) => {
    const result = await invoke<AgentBudget>("update_budget_usage_cmd", {
      budgetId,
      tokensUsed,
    });
    set((state) => ({
      budgets: state.budgets.map((b) => (b.id === budgetId ? result : b)),
    }));
    return result;
  },

  captureWip: async (budgetId, wipPath) => {
    const result = await invoke<AgentBudget>("capture_wip_cmd", {
      budgetId,
      wipPath,
    });
    set((state) => ({
      budgets: state.budgets.map((b) => (b.id === budgetId ? result : b)),
    }));
    return result;
  },

  resumeBudget: async (budgetId, additionalTokens) => {
    const result = await invoke<AgentBudget>("resume_budget_cmd", {
      budgetId,
      additionalTokens,
    });
    set((state) => ({
      budgets: state.budgets.map((b) => (b.id === budgetId ? result : b)),
    }));
    return result;
  },

  createResumptionPlan: async (
    waveId,
    pendingTaskId,
    planPath,
    agentsCompleted,
    agentsWipd,
    agentsPending,
    estimatedRemainingTokens,
  ) => {
    const result = await invoke<WaveResumptionPlan>("create_resumption_plan_cmd", {
      waveId,
      pendingTaskId,
      planPath,
      agentsCompleted,
      agentsWipd,
      agentsPending,
      estimatedRemainingTokens,
    });
    set({ resumptionPlan: result });
    return result;
  },

  getResumptionPlan: async (waveId) => {
    const result = await invoke<WaveResumptionPlan | null>("get_resumption_plan_cmd", {
      waveId,
    });
    set({ resumptionPlan: result });
    return result;
  },

  getCostBreakdown: async (sessionId) => {
    const breakdowns = await invoke<CostBreakdown[]>("get_cost_breakdown_cmd", {
      sessionId,
    });
    set({ costBreakdowns: breakdowns });
  },

  checkThresholds: async () => {
    const budgets = await invoke<AgentBudget[]>("check_budget_thresholds_cmd");
    set({ thresholdBudgets: budgets });
  },
}));
