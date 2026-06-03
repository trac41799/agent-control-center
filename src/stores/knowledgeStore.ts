import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  KnowledgeItem,
  KnowledgeQuery,
  KnowledgeRelation,
} from "@/lib/types";

export interface PreflightWarning {
  id: string;
  title: string;
  content: string;
  confidence: number;
  confirmation_count: number;
  stack_tags?: string;
}

export interface KnowledgeStats {
  total: number;
  avg_confidence: number;
  by_type: Array<{ type: string; count: number }>;
  by_status: Array<{ status: string; count: number }>;
  by_stack: Array<{ stack: string; count: number }>;
}

export interface KnowledgeItemInput {
  type: string;
  title: string;
  content: string;
  tags?: string;
  stack_tags?: string;
  agent_tags?: string;
  project_id?: string;
  session_ids?: string;
  plan_ids?: string;
  is_global?: boolean;
}

interface KnowledgeStore {
  items: KnowledgeItem[];
  loading: boolean;
  error: string | null;
  filters: KnowledgeQuery;
  relations: Record<string, KnowledgeRelation[]>;
  stats: KnowledgeStats | null;
  preflight: PreflightWarning[];
  preflightStack: string | null;
  compounderRunning: boolean;
  lastCompounderResult: KnowledgeItem[] | null;
  lastCompounderAt: string | null;

  loadItems: (projectId?: string) => Promise<void>;
  loadKnowledge: (projectId?: string) => Promise<void>;
  createItem: (
    item: KnowledgeItemInput & { type: string; title: string; content: string }
  ) => Promise<KnowledgeItem>;
  addKnowledgeItem: (
    text: string,
    category: string,
    stackTags: string
  ) => Promise<KnowledgeItem>;
  updateItem: (id: string, updates: Partial<KnowledgeItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  compoundKnowledge: (projectId?: string) => Promise<void>;
  searchKnowledge: (q: string) => Promise<void>;
  loadRelations: (itemId: string) => Promise<void>;
  addRelation: (fromId: string, toId: string, type: string) => Promise<void>;
  loadStats: (projectId?: string) => Promise<void>;
  loadPreflight: (stack: string) => Promise<void>;
  runCompounder: (
    sessionId: string,
    projectId?: string
  ) => Promise<KnowledgeItem[] | null>;
  setFilters: (filters: Partial<KnowledgeQuery>) => void;
  clearError: () => void;
  subscribeKnowledgeEvents: () => Promise<UnlistenFn>;
}

export const useKnowledgeStore = create<KnowledgeStore>((set, get) => ({
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

  loadKnowledge: async (projectId) => {
    await get().loadItems(projectId);
  },

  createItem: async (item) => {
    const input: KnowledgeItemInput = {
      type: item.type,
      title: item.title,
      content: item.content,
      tags: item.tags,
      stack_tags: item.stack_tags,
      agent_tags: item.agent_tags,
      project_id: item.project_id,
      session_ids: item.session_ids,
      plan_ids: item.plan_ids,
      is_global: item.is_global ?? false,
    };
    const created = await invoke<KnowledgeItem>("create_knowledge_item_cmd", {
      item: input,
    });
    set((state) => ({ items: [created, ...state.items] }));
    return created;
  },

  addKnowledgeItem: async (text, category, stackTags) => {
    const title = text.length > 60 ? text.slice(0, 57) + "..." : text;
    return get().createItem({
      type: category,
      title,
      content: text,
      stack_tags: stackTags || undefined,
    });
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
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
      relations: Object.fromEntries(
        Object.entries(state.relations).filter(
          ([k]) => k !== id && !state.relations[k]?.some((r) => r.to_id === id)
        )
      ),
    }));
  },

  compoundKnowledge: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const items = await invoke<KnowledgeItem[]>("compound_knowledge_cmd", {
        projectId,
      });
      set({ items, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  searchKnowledge: async (q) => {
    set({ loading: true, error: null });
    try {
      const items = await invoke<KnowledgeItem[]>("search_knowledge_cmd", {
        q,
      });
      const currentFilters = get().filters;
      set({ items, filters: { ...currentFilters, q }, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  loadRelations: async (itemId) => {
    try {
      const relations = await invoke<KnowledgeRelation[]>(
        "get_knowledge_relations_cmd",
        { fromId: itemId }
      );
      set((state) => ({
        relations: { ...state.relations, [itemId]: relations },
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  addRelation: async (fromId, toId, type) => {
    try {
      const rel = await invoke<KnowledgeRelation>("add_knowledge_relation_cmd", {
        fromId,
        toId,
        relationType: type,
      });
      set((state) => {
        const existing = state.relations[fromId] || [];
        return { relations: { ...state.relations, [fromId]: [rel, ...existing] } };
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  loadStats: async (projectId) => {
    try {
      const stats = await invoke<KnowledgeStats>("get_knowledge_stats_cmd", {
        projectId,
      });
      set({ stats });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  loadPreflight: async (stack) => {
    try {
      const preflight = await invoke<PreflightWarning[]>(
        "get_preflight_warnings_cmd",
        { stack }
      );
      set({ preflight, preflightStack: stack });
    } catch (e) {
      set({ error: String(e), preflight: [], preflightStack: stack });
    }
  },

  runCompounder: async (sessionId, projectId) => {
    set({ compounderRunning: true, error: null });
    try {
      const items = await invoke<KnowledgeItem[] | null>("run_compounder_cmd", {
        sessionId,
        projectId,
      });
      const result = items || [];
      set({
        lastCompounderResult: result,
        lastCompounderAt: new Date().toISOString(),
        compounderRunning: false,
      });
      if (result.length > 0) {
        await get().loadItems(projectId);
      }
      return result;
    } catch (e) {
      set({ error: String(e), compounderRunning: false });
      return null;
    }
  },

  setFilters: (filters) => {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },

  clearError: () => set({ error: null }),

  subscribeKnowledgeEvents: async () => {
    const unlisten = await listen<KnowledgeItem>(
      "knowledge-item-created",
      (event) => {
        const item = event.payload;
        set((state) => {
          if (state.items.some((i) => i.id === item.id)) return state;
          return { items: [item, ...state.items] };
        });
      }
    );
    return unlisten;
  },
}));
