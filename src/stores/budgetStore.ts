import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  AgentBudget,
  BudgetInput,
  WaveResumptionPlan,
  CostBreakdown,
} from "../lib/types";

export interface ThresholdFiredEvent {
  agent_ref: string;
  percentage: number;
  message: string;
}

export interface WipEntry {
  budget_id: string;
  agent_id: string;
  session_id?: string;
  wip_path: string;
  updated_at: string;
}

interface BudgetStore {
  budgets: AgentBudget[];
  resumptionPlan: WaveResumptionPlan | null;
  costBreakdowns: CostBreakdown[];
  thresholdBudgets: AgentBudget[];

  loading: boolean;
  error: string | null;
  lastThresholdFired: ThresholdFiredEvent | null;
  thresholdHistory: ThresholdFiredEvent[];

  loadBudgets: (sessionId?: string, planAgentId?: string) => Promise<void>;
  createBudget: (input: BudgetInput) => Promise<AgentBudget>;
  updateBudgetUsage: (budgetId: string, tokensUsed: number) => Promise<AgentBudget>;
  deleteBudget: (budgetId: string) => Promise<void>;
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
  loadResumptionPlans: () => Promise<void>;

  getCostBreakdown: (sessionId: string) => Promise<void>;
  loadCostBreakdown: (sessionId: string) => Promise<CostBreakdown[]>;

  checkThresholds: () => Promise<void>;
  loadWips: () => Promise<WipEntry[]>;
  subscribeThresholdEvents: () => Promise<() => void>;
  clearThresholdHistory: () => void;
}

const EMPTY_COST_BREAKDOWN: CostBreakdown[] = [];

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  budgets: [],
  resumptionPlan: null,
  costBreakdowns: [],
  thresholdBudgets: [],

  loading: false,
  error: null,
  lastThresholdFired: null,
  thresholdHistory: [],

  loadBudgets: async (sessionId, planAgentId) => {
    set({ loading: true, error: null });
    try {
      const budgets = await invoke<AgentBudget[]>("get_budgets_cmd", {
        sessionId: sessionId ?? null,
        planAgentId: planAgentId ?? null,
        stateFilter: null,
      });
      set({ budgets, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createBudget: async (input) => {
    set({ loading: true, error: null });
    try {
      const result = await invoke<AgentBudget>("create_budget_cmd", { input });
      set((state) => ({ budgets: [result, ...state.budgets], loading: false }));
      return result;
    } catch (e) {
      set({ error: String(e), loading: false });
      throw e;
    }
  },

  updateBudgetUsage: async (budgetId, tokensUsed) => {
    try {
      const result = await invoke<AgentBudget>("update_budget_usage_cmd", {
        budgetId,
        tokensUsed,
      });
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === budgetId ? result : b)),
      }));
      return result;
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  deleteBudget: async (budgetId) => {
    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== budgetId),
    }));
  },

  captureWip: async (budgetId, wipPath) => {
    try {
      const result = await invoke<AgentBudget>("capture_wip_cmd", {
        budgetId,
        wipPath,
      });
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === budgetId ? result : b)),
      }));
      return result;
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  resumeBudget: async (budgetId, additionalTokens) => {
    try {
      const result = await invoke<AgentBudget>("resume_budget_cmd", {
        budgetId,
        additionalTokens,
      });
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === budgetId ? result : b)),
      }));
      return result;
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
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
    set({ loading: true, error: null });
    try {
      const result = await invoke<WaveResumptionPlan>("create_resumption_plan_cmd", {
        waveId,
        pendingTaskId,
        planPath,
        agentsCompleted,
        agentsWipd,
        agentsPending,
        estimatedRemainingTokens,
      });
      set({ resumptionPlan: result, loading: false });
      return result;
    } catch (e) {
      set({ error: String(e), loading: false });
      throw e;
    }
  },

  getResumptionPlan: async (waveId) => {
    set({ loading: true, error: null });
    try {
      const result = await invoke<WaveResumptionPlan | null>("get_resumption_plan_cmd", {
        waveId,
      });
      set({ resumptionPlan: result, loading: false });
      return result;
    } catch (e) {
      set({ error: String(e), loading: false });
      throw e;
    }
  },

  loadResumptionPlans: async () => {
    set({ loading: true, error: null });
    try {
      const result = await invoke<WaveResumptionPlan | null>("get_resumption_plan_cmd", {
        waveId: "current",
      });
      set({ resumptionPlan: result, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  getCostBreakdown: async (sessionId) => {
    set({ loading: true, error: null });
    try {
      const breakdowns = await invoke<CostBreakdown[]>("get_cost_breakdown_cmd", {
        sessionId,
      });
      set({ costBreakdowns: breakdowns, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  loadCostBreakdown: async (sessionId) => {
    try {
      const breakdowns = await invoke<CostBreakdown[]>("get_cost_breakdown_cmd", {
        sessionId,
      });
      set({ costBreakdowns: breakdowns });
      return breakdowns.length > 0 ? breakdowns : EMPTY_COST_BREAKDOWN;
    } catch (e) {
      set({ error: String(e) });
      return EMPTY_COST_BREAKDOWN;
    }
  },

  checkThresholds: async () => {
    set({ loading: true, error: null });
    try {
      const budgets = await invoke<AgentBudget[]>("check_budget_thresholds_cmd");
      set({ thresholdBudgets: budgets, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  loadWips: async () => {
    try {
      const budgets = await invoke<AgentBudget[]>("get_budgets_cmd", {
        sessionId: null,
        planAgentId: null,
        stateFilter: "exceeded",
      });
      const wips: WipEntry[] = budgets
        .filter((b) => b.wip_path)
        .map((b) => ({
          budget_id: b.id,
          agent_id: b.agent_id,
          session_id: b.session_id,
          wip_path: b.wip_path as string,
          updated_at: b.updated_at,
        }));
      return wips;
    } catch (e) {
      set({ error: String(e) });
      return [];
    }
  },

  subscribeThresholdEvents: async () => {
    try {
      const unlisten = await listen<ThresholdFiredEvent>(
        "budget-threshold-fired",
        (event) => {
          const payload = event.payload;
          set((state) => ({
            lastThresholdFired: payload,
            thresholdHistory: [payload, ...state.thresholdHistory].slice(0, 50),
          }));
          const current = get();
          if (current.thresholdBudgets.length === 0) {
            current.checkThresholds().catch(() => undefined);
          }
        },
      );
      return unlisten;
    } catch (e) {
      set({ error: String(e) });
      return () => undefined;
    }
  },

  clearThresholdHistory: () => set({ thresholdHistory: [], lastThresholdFired: null }),
}));
