import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export type ControlState = "promoted" | "active" | "paused" | "completed";

export interface ControlSession {
  id: string;
  thread_id: string;
  plan_id: string | null;
  panel_id: string;
  state: ControlState;
  docs_dir: string;
  claimed_files: string[];
  started_at: string;
  paused_at: string | null;
  completed_at: string | null;
}

interface FileOwnership {
  id: string;
  project_id: string;
  file_path: string;
  claimed_by_thread_id: string;
  claimed_at: string;
  released_at: string | null;
}

interface ControlStore {
  sessions: ControlSession[];
  conflicts: string[];
  controlModeActive: boolean;
  deferredNotice: string | null;
  loadSessions: (threadId: string) => Promise<void>;
  promoteToControl: (threadId: string, panelId: string, planId?: string) => Promise<void>;
  setState: (sessionId: string, state: ControlState) => Promise<void>;
  setControlMode: (active: boolean) => void;
  loadConflicts: (threadId: string) => Promise<void>;
  clearNotice: () => void;
}

export const useControlStore = create<ControlStore>((set, _get) => ({
  sessions: [],
  conflicts: [],
  controlModeActive: false,
  deferredNotice: null,

  loadSessions: async (_threadId: string) => {
    set({ deferredNotice: "Control sessions require W5.0 integration wave to be fully functional. UI is display-only." });
  },

  promoteToControl: async (_threadId: string, _panelId: string, _planId?: string) => {
    set({ deferredNotice: "Promote to Control requires W5.0 integration wave (promote_to_control_cmd not yet wired)." });
  },

  setState: async (_sessionId: string, _state: ControlState) => {
    set({ deferredNotice: "Control state changes require W5.0 integration wave (set_control_state_cmd not yet wired)." });
  },

  setControlMode: (active: boolean) => {
    set({ controlModeActive: active });
  },

  loadConflicts: async (threadId: string) => {
    try {
      const owned = await invoke<FileOwnership[]>("get_owned_files_cmd", { threadId });
      const conflicts = owned.map((f) => `${f.file_path} (claimed by ${f.claimed_by_thread_id})`);
      set({ conflicts });
    } catch {
      set({ conflicts: [] });
    }
  },

  clearNotice: () => {
    set({ deferredNotice: null });
  },
}));
