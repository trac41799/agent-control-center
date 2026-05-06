import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface CronJob {
  id: string;
  name: string;
  description?: string;
  project_id?: string;
  schedule: string;
  task_template: string;
  wave_preset?: string;
  auto_approve: boolean;
  escalation_policy: string;
  notification_channels?: string;
  max_correction_retries: number;
  enabled: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CronJobInput {
  name: string;
  description?: string;
  project_id?: string;
  schedule: string;
  task_template: string;
  wave_preset?: string;
  auto_approve?: boolean;
  escalation_policy?: string;
  notification_channels?: string;
  max_correction_retries?: number;
  enabled?: boolean;
}

export interface CronExecution {
  id: string;
  cron_job_id: string;
  plan_id?: string;
  status: string;
  escalation_reason?: string;
  escalation_source?: string;
  started_at: string;
  completed_at?: string;
  notified_at?: string;
}

interface SchedulerStore {
  jobs: CronJob[];
  executions: CronExecution[];
  nextRuns: string[];
  loading: boolean;
  error: string | null;

  loadJobs: (projectId?: string) => Promise<void>;
  createJob: (input: CronJobInput) => Promise<CronJob>;
  updateJob: (id: string, data: CronJobInput) => Promise<CronJob>;
  deleteJob: (id: string) => Promise<void>;
  toggleJob: (id: string, enabled: boolean) => Promise<void>;
  getExecutions: (jobId: string) => Promise<void>;
  evaluateSchedule: (cronExpr: string, count?: number) => Promise<void>;
  clearError: () => void;
}

export const useSchedulerStore = create<SchedulerStore>((set) => ({
  jobs: [],
  executions: [],
  nextRuns: [],
  loading: false,
  error: null,

  loadJobs: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const jobs = await invoke<CronJob[]>("get_cron_jobs_cmd", { projectId, enabledOnly: false });
      set({ jobs, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createJob: async (input) => {
    set({ error: null });
    try {
      const job = await invoke<CronJob>("create_cron_job_cmd", { input });
      set((state) => ({ jobs: [...state.jobs, job] }));
      return job;
    } catch (e: unknown) {
      set({ error: String(e) });
      throw e;
    }
  },

  updateJob: async (id, data) => {
    set({ error: null });
    try {
      const updated = await invoke<CronJob>("update_cron_job_cmd", { id, input: data });
      set((state) => ({
        jobs: state.jobs.map((j) => (j.id === id ? updated : j)),
      }));
      return updated;
    } catch (e: unknown) {
      set({ error: String(e) });
      throw e;
    }
  },

  deleteJob: async (id) => {
    set({ error: null });
    try {
      await invoke("delete_cron_job_cmd", { id });
      set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) }));
    } catch (e: unknown) {
      set({ error: String(e) });
      throw e;
    }
  },

  toggleJob: async (id, enabled) => {
    set({ error: null });
    try {
      await invoke("toggle_cron_job_cmd", { id, enabled });
      set((state) => ({
        jobs: state.jobs.map((j) => (j.id === id ? { ...j, enabled } : j)),
      }));
    } catch (e: unknown) {
      set({ error: String(e) });
      throw e;
    }
  },

  getExecutions: async (jobId) => {
    set({ loading: true, error: null });
    try {
      const executions = await invoke<CronExecution[]>("get_cron_executions_cmd", {
        jobId,
        status: null,
      });
      set({ executions, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  evaluateSchedule: async (cronExpr, count = 5) => {
    set({ loading: true, error: null });
    try {
      const runs = await invoke<string[]>("evaluate_cron_schedule_cmd", {
        cronExpr,
        count,
      });
      set({ nextRuns: runs, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
