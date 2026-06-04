import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { CodebaseFile, RepoMapOutput, SearchResult, CodebaseCoverage, RepoMapConfig } from "@/lib/types";

interface CodebaseStore {
  // State
  files: CodebaseFile[]
  repoMap: RepoMapOutput[]
  searchResults: SearchResult[]
  coverage: CodebaseCoverage | null
  loading: boolean
  error: string | null
  selectedFile: CodebaseFile | null
  fileSignatures: string

  // Actions
  buildRepoMap: (projectId: string, projectPath: string, config?: Partial<RepoMapConfig>) => Promise<void>
  getRepoMap: (projectId: string) => Promise<void>
  searchCodebase: (projectId: string, query: string, topK?: number) => Promise<void>
  getFileSignatures: (projectId: string, filePath: string, level: string) => Promise<void>
  getCoverageStats: (projectId: string) => Promise<void>
  invalidateCache: (projectId: string, filePath: string) => Promise<void>
  selectFile: (file: CodebaseFile | null) => void
  clearSearch: () => void
  clearError: () => void
}

export const useCodebaseStore = create<CodebaseStore>((set, get) => ({
  files: [],
  repoMap: [],
  searchResults: [],
  coverage: null,
  loading: false,
  error: null,
  selectedFile: null,
  fileSignatures: "",

  buildRepoMap: async (projectId, projectPath, config) => {
    set({ loading: true, error: null });
    try {
      const fullConfig: RepoMapConfig = {
        map_tokens: 2000,
        languages: [],
        include_tests: true,
        update_mode: config?.update_mode || "full",
        ...config,
      };

      const result = await invoke<RepoMapOutput[]>("build_repo_map_cmd", {
        projectId,
        projectPath,
        config: fullConfig,
      });
      set({ repoMap: result, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  getRepoMap: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const result = await invoke<RepoMapOutput[]>("get_repo_map_cmd", { projectId });
      set({ repoMap: result, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  searchCodebase: async (projectId, query, topK = 10) => {
    set({ loading: true, error: null });
    try {
      const result = await invoke<SearchResult[]>("search_codebase_cmd", {
        projectId,
        query,
        topK,
      });
      set({ searchResults: result, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  getFileSignatures: async (projectId, filePath, level) => {
    set({ loading: true, error: null });
    try {
      const result = await invoke<string>("get_file_signatures_cmd", {
        projectId,
        filePath,
        level,
      });
      set({ fileSignatures: result, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  getCoverageStats: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const result = await invoke<CodebaseCoverage | null>("get_coverage_stats_cmd", { projectId });
      if (result) set({ coverage: result });
      set({ loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  invalidateCache: async (projectId, filePath) => {
    set({ loading: true, error: null });
    try {
      await invoke<void>("invalidate_cache_cmd", { projectId, filePath });
      await get().getRepoMap(projectId);
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  selectFile: (file) => set({ selectedFile: file }),

  clearSearch: () => set({ searchResults: [] }),

  clearError: () => set({ error: null }),
}));
