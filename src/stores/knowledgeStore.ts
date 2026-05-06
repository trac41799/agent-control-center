import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { KnowledgeItem, KnowledgeQuery } from "@/lib/types";

interface KnowledgeStore {
  items: KnowledgeItem[];
  loading: boolean;
  error: string | null;
  filters: KnowledgeQuery;

  loadItems: (projectId?: string) => Promise<void>;
  createItem: (item: Partial<KnowledgeItem> & { type: string; title: string; content: string }) => Promise<KnowledgeItem>;
  updateItem: (id: string, updates: Partial<KnowledgeItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  compoundKnowledge: (projectId?: string) => Promise<void>;
  searchKnowledge: (q: string) => Promise<void>;
  setFilters: (filters: Partial<KnowledgeQuery>) => void;
}

export const useKnowledgeStore = create<KnowledgeStore>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  filters: {},

  loadItems: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const filters = get().filters;
      const items = await invoke<KnowledgeItem[]>("get_knowledge_items_cmd", {
        q: filters.q,
        stack: filters.stack,
        agent: filters.agent,
        projectId: projectId ?? filters.project_id,
        type: filters.type,
        status: filters.status,
        minConfidence: filters.min_confidence,
        isGlobal: filters.is_global,
        limit: filters.limit,
        offset: filters.offset,
      });
      set({ items, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createItem: async (item) => {
    const input = {
      type: item.type!,
      title: item.title!,
      content: item.content!,
      tags: item.tags,
      stack_tags: item.stack_tags,
      agent_tags: item.agent_tags,
      project_id: item.project_id,
      session_ids: item.session_ids,
      plan_ids: item.plan_ids,
      is_global: item.is_global ?? false,
    };
    const created = await invoke<KnowledgeItem>("create_knowledge_item_cmd", { item: input });
    set((state) => ({ items: [created, ...state.items] }));
    return created;
  },

  updateItem: async (id, updates) => {
    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.content !== undefined) payload.content = updates.content;
    if (updates.tags !== undefined) payload.tags = updates.tags;
    if (updates.stack_tags !== undefined) payload.stack_tags = updates.stack_tags;
    if (updates.agent_tags !== undefined) payload.agent_tags = updates.agent_tags;
    if (updates.confidence !== undefined) payload.confidence = updates.confidence;
    if (updates.status !== undefined) payload.status = updates.status;

    const updated = await invoke<KnowledgeItem>("update_knowledge_item_cmd", {
      id,
      updates: payload,
    });
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? updated : i)),
    }));
  },

  deleteItem: async (id) => {
    await invoke("delete_knowledge_item_cmd", { id });
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
  },

  compoundKnowledge: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const items = await invoke<KnowledgeItem[]>("compound_knowledge_cmd", { projectId });
      set({ items, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  searchKnowledge: async (q) => {
    set({ loading: true, error: null });
    try {
      const items = await invoke<KnowledgeItem[]>("search_knowledge_cmd", { q });
      const currentFilters = get().filters;
      set({ items, filters: { ...currentFilters, q }, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  setFilters: (filters) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },
}));
