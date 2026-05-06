import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface SupabaseConfig {
  id: string;
  project_id: string;
  supabase_project_ref: string;
  supabase_url: string;
  anon_key: string | null;
  service_role_key: string | null;
  feature_groups: Record<string, boolean>;
  read_only: boolean;
  created_at: string;
}

export interface GitHubConfig {
  id: string;
  project_id: string;
  repo_owner: string;
  repo_name: string;
  repo_visibility: string;
  lockdown_enabled: boolean;
  token_present: boolean;
  features: Record<string, boolean>;
  created_at: string;
}

export interface GitHubIssue {
  id: string;
  repo_owner: string;
  repo_name: string;
  issue_number: number;
  title: string;
  body: string;
  state: string;
  labels: string[];
  assignee: string | null;
  created_at: string;
  connector_status: string;
}

interface IntegrationStore {
  supabaseConfigs: SupabaseConfig[];
  githubConfigs: GitHubConfig[];
  githubIssues: GitHubIssue[];
  migrationWarnings: string[];
  actionsWorkflows: string[];
  supabaseDetected: string | null;
  githubDetected: { owner: string; repo: string; visibility: string } | null;
  loading: boolean;
  error: string | null;

  getSupabaseConfigs: (projectId: string) => Promise<void>;
  saveSupabaseConfig: (config: SupabaseConfig) => Promise<void>;
  toggleSupabaseFeature: (configId: string, feature: string, enabled: boolean) => Promise<void>;
  detectSupabase: (projectPath: string) => Promise<void>;
  getGitHubConfigs: (projectId: string) => Promise<void>;
  saveGitHubConfig: (config: GitHubConfig) => Promise<void>;
  toggleGitHubFeature: (configId: string, feature: string, enabled: boolean) => Promise<void>;
  detectGitHub: (projectPath: string) => Promise<void>;
  checkRepoVisibility: (owner: string, repo: string) => Promise<string>;
  listGitHubIssues: (owner: string, repo: string, state: string) => Promise<void>;
  checkMigrationSafety: (projectPath: string) => Promise<void>;
  checkGitHubActions: (projectPath: string) => Promise<void>;
  clearError: () => void;
}

export const useIntegrationStore = create<IntegrationStore>((set) => ({
  supabaseConfigs: [],
  githubConfigs: [],
  githubIssues: [],
  migrationWarnings: [],
  actionsWorkflows: [],
  supabaseDetected: null,
  githubDetected: null,
  loading: false,
  error: null,

  getSupabaseConfigs: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const configs = await invoke<SupabaseConfig[]>("get_supabase_configs", { projectId });
      set({ supabaseConfigs: configs, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
  saveSupabaseConfig: async (config) => {
    set({ loading: true, error: null });
    try {
      await invoke("save_supabase_config", { config });
      set({ loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
  toggleSupabaseFeature: async (configId, feature, enabled) => {
    set({ error: null });
    try {
      await invoke("toggle_supabase_feature", { configId, feature, enabled });
    } catch (e) {
      set({ error: String(e) });
    }
  },
  detectSupabase: async (projectPath) => {
    set({ error: null });
    try {
      const result = await invoke<string | null>("detect_supabase", { projectPath });
      set({ supabaseDetected: result });
    } catch (e) {
      set({ error: String(e) });
    }
  },
  getGitHubConfigs: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const configs = await invoke<GitHubConfig[]>("get_github_configs", { projectId });
      set({ githubConfigs: configs, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
  saveGitHubConfig: async (config) => {
    set({ loading: true, error: null });
    try {
      await invoke("save_github_config", { config });
      set({ loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
  toggleGitHubFeature: async (configId, feature, enabled) => {
    set({ error: null });
    try {
      await invoke("toggle_github_feature", { configId, feature, enabled });
    } catch (e) {
      set({ error: String(e) });
    }
  },
  detectGitHub: async (projectPath) => {
    set({ error: null });
    try {
      const result = await invoke<[string, string, string] | null>("detect_github_repo_cmd", { projectPath });
      if (result) {
        const [owner, repo, visibility] = result;
        set({ githubDetected: { owner, repo, visibility } });
      }
    } catch (e) {
      set({ error: String(e) });
    }
  },
  checkRepoVisibility: async (owner, repo) => {
    try {
      return await invoke<string>("check_repo_visibility_cmd", { owner, repo });
    } catch {
      return "unknown";
    }
  },
  listGitHubIssues: async (owner, repo, state) => {
    set({ loading: true, error: null });
    try {
      const issues = await invoke<GitHubIssue[]>("list_github_issues_cmd", { owner, repo, state });
      set({ githubIssues: issues, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
  checkMigrationSafety: async (projectPath) => {
    set({ error: null });
    try {
      const warnings = await invoke<string[]>("check_migration_safety_cmd", { projectPath });
      set({ migrationWarnings: warnings });
    } catch (e) {
      set({ error: String(e) });
    }
  },
  checkGitHubActions: async (projectPath) => {
    set({ error: null });
    try {
      const workflows = await invoke<string[]>("check_github_actions_cmd", { projectPath });
      set({ actionsWorkflows: workflows });
    } catch (e) {
      set({ error: String(e) });
    }
  },
  clearError: () => set({ error: null }),
}));
