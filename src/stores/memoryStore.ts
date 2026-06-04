import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { MemoryFact, MemoryQuery, MemorySearchResult, MemoryStats } from "@/lib/types";

interface MemoryStore {
  items: MemoryFact[];
  loading: boolean;
  error: string | null;
  filters: MemoryQuery;
  stats: MemoryStats | null;
  searchResults: MemorySearchResult[];
  activeTab: "facts" | "stats" | "search";

  loadFacts: (orgId?: string) => Promise<void>;
  loadStats: (orgId: string) => Promise<void>;
  searchFacts: (q: string, orgId?: string) => Promise<void>;
  createFact: (fact: { agent_id: string; session_id: string; user_id: string; org_id: string; fact_type: string; content: string; metadata?: string; confidence?: number }) => Promise<MemoryFact>;
  deleteFact: (id: string) => Promise<void>;
  setFilters: (filters: Partial<MemoryQuery>) => void;
  clearError: () => void;
}

export const useMemoryStore = create<MemoryStore>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  filters: {},
  stats: null,
  searchResults: [],
  activeTab: "facts",

  loadFacts: async (orgId) => {
    set({ loading: true, error: null });
    try {
      const filters = get().filters;
      const items = await invoke<MemoryFact[]>("get_memory_facts_cmd", {
        orgId: orgId ?? filters.org_id,
        agentId: filters.agent_id,
        sessionId: filters.session_id,
        factType: filters.fact_type,
        minConfidence: filters.min_confidence,
        q: filters.q,
        limit: filters.limit ?? 100,
        offset: filters.offset,
      });
      set({ items, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  loadStats: async (orgId) => {
    try {
      const stats = await invoke<MemoryStats>("memory_stats_cmd", { orgId });
      set({ stats });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  searchFacts: async (q, orgId) => {
    if (!q.trim()) {
      set({ searchResults: [] });
      return;
    }
    set({ loading: true, error: null });
    try {
      const filters = get().filters;
      const results = await invoke<MemorySearchResult[]>("memory_hybrid_search_cmd", {
        q: q.trim(),
        orgId: orgId ?? filters.org_id,
        agentId: filters.agent_id,
        sessionId: filters.session_id,
        limit: filters.limit ?? 20,
      });
      set({ searchResults: results, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createFact: async (fact) => {
    const created = await invoke<MemoryFact>("create_memory_fact_cmd", { input: fact });
    set((state) => ({ items: [created, ...state.items] }));
    return created;
  },

  deleteFact: async (id) => {
    await invoke("delete_memory_fact_cmd", { id });
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    }));
  },

  setFilters: (filters) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },

  clearError: () => set({ error: null }),
}));
