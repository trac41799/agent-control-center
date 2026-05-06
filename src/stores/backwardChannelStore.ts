import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { ChatPlatformConfig, DaemonStatus, QueueInfo } from "@/lib/types";

interface BackwardChannelStore {
  platformConfigs: ChatPlatformConfig[];
  daemonStatus: DaemonStatus;
  queueInfo: QueueInfo;
  loading: boolean;
  error: string | null;

  getPlatformConfigs: (projectId: string) => Promise<void>;
  savePlatformConfig: (config: ChatPlatformConfig) => Promise<void>;
  deletePlatformConfig: (id: string) => Promise<void>;
  togglePlatformConfig: (id: string, enabled: boolean) => Promise<void>;

  startDaemon: (configPath: string) => Promise<void>;
  stopDaemon: () => Promise<void>;
  getDaemonStatus: () => Promise<void>;
  getDaemonLogs: (lines: number) => Promise<string[]>;

  checkQueueHealth: () => Promise<void>;
  testPlatformConnection: (platform: string, config: Record<string, string>) => Promise<boolean>;

  clearError: () => void;
}

export const useBackwardChannelStore = create<BackwardChannelStore>((set) => ({
  platformConfigs: [],
  daemonStatus: {
    running: false,
    pid: null,
    uptime_s: null,
    queue_depth: 0,
    active_platforms: [],
    last_event_at: null,
    error: null,
  },
  queueInfo: {
    provider: "upstash",
    connected: false,
    queue_depth: 0,
    latency_ms: null,
  },
  loading: false,
  error: null,

  getPlatformConfigs: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const configs = await invoke<ChatPlatformConfig[]>(
        "get_chat_platform_configs",
        { projectId },
      );
      set({ platformConfigs: configs, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  savePlatformConfig: async (config) => {
    set({ loading: true, error: null });
    try {
      await invoke("save_chat_platform_config", { config });
      set({ loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  deletePlatformConfig: async (id) => {
    set({ loading: true, error: null });
    try {
      await invoke("delete_chat_platform_config", { id });
      set({ loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  togglePlatformConfig: async (id, enabled) => {
    set({ error: null });
    try {
      await invoke("toggle_chat_platform_config", { id, enabled });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  startDaemon: async (configPath) => {
    set({ loading: true, error: null });
    try {
      await invoke("start_backward_channel_daemon", { configPath });
      set({ loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  stopDaemon: async () => {
    set({ loading: true, error: null });
    try {
      await invoke("stop_backward_channel_daemon");
      set({ loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  getDaemonStatus: async () => {
    set({ loading: true, error: null });
    try {
      const status = await invoke<DaemonStatus>(
        "get_backward_channel_daemon_status",
      );
      set({ daemonStatus: status, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  getDaemonLogs: async (lines) => {
    set({ loading: true, error: null });
    try {
      const logs = await invoke<string[]>(
        "get_backward_channel_daemon_logs",
        { lines },
      );
      set({ loading: false });
      return logs;
    } catch (e) {
      set({ error: String(e), loading: false });
      return [];
    }
  },

  checkQueueHealth: async () => {
    set({ loading: true, error: null });
    try {
      const info = await invoke<QueueInfo>(
        "check_backward_channel_queue_health",
      );
      set({ queueInfo: info, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  testPlatformConnection: async (platform, config) => {
    set({ loading: true, error: null });
    try {
      const ok = await invoke<boolean>(
        "test_chat_platform_connection",
        { platform, config },
      );
      set({ loading: false });
      return ok;
    } catch (e) {
      set({ error: String(e), loading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
