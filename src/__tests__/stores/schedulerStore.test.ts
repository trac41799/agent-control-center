import { useSchedulerStore } from "@/stores/schedulerStore";
import { mockInvoke } from "../setup";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => undefined),
}));

const sampleJob = {
  id: "j1",
  name: "Daily Sync",
  description: "Sync knowledge",
  schedule: "0 9 * * *",
  task_template: "Run sync",
  auto_approve: false,
  escalation_policy: "{}",
  max_correction_retries: 3,
  enabled: true,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
};

const sampleExecution = {
  id: "e1",
  cron_job_id: "j1",
  status: "completed",
  started_at: "2026-06-01T09:00:00Z",
  completed_at: "2026-06-01T09:05:00Z",
};

beforeEach(() => {
  useSchedulerStore.setState({
    jobs: [],
    executions: [],
    nextRuns: [],
    escalations: [],
    lastFired: null,
    lastEscalation: null,
    eventListenersAttached: false,
    loading: false,
    error: null,
  });
});

describe("schedulerStore", () => {
  describe("loadJobs", () => {
    it("populates jobs", async () => {
      mockInvoke.mockResolvedValueOnce([sampleJob]);
      await useSchedulerStore.getState().loadJobs();
      expect(useSchedulerStore.getState().jobs).toEqual([sampleJob]);
    });

    it("sets error on failure", async () => {
      mockInvoke.mockRejectedValueOnce("fail");
      await useSchedulerStore.getState().loadJobs();
      expect(useSchedulerStore.getState().error).toBe("fail");
    });
  });

  describe("createJob", () => {
    it("appends job to list", async () => {
      mockInvoke.mockResolvedValueOnce(sampleJob);
      const input = { name: "Daily Sync", schedule: "0 9 * * *", task_template: "Run sync" };
      const result = await useSchedulerStore.getState().createJob(input);
      expect(result).toEqual(sampleJob);
      expect(useSchedulerStore.getState().jobs).toEqual([sampleJob]);
    });

    it("throws on failure", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("fail"));
      await expect(
        useSchedulerStore.getState().createJob({ name: "x", schedule: "* * * * *", task_template: "" })
      ).rejects.toThrow("fail");
    });
  });

  describe("updateJob", () => {
    it("replaces job in list", async () => {
      useSchedulerStore.setState({ jobs: [sampleJob] });
      const updated = { ...sampleJob, name: "Updated" };
      mockInvoke.mockResolvedValueOnce(updated);
      await useSchedulerStore.getState().updateJob("j1", { name: "Updated", schedule: "0 9 * * *", task_template: "" });
      expect(useSchedulerStore.getState().jobs[0].name).toBe("Updated");
    });
  });

  describe("deleteJob", () => {
    it("removes job from list", async () => {
      useSchedulerStore.setState({ jobs: [sampleJob], escalations: [sampleJob] });
      mockInvoke.mockResolvedValueOnce(undefined);
      await useSchedulerStore.getState().deleteJob("j1");
      expect(useSchedulerStore.getState().jobs).toHaveLength(0);
      expect(useSchedulerStore.getState().escalations).toHaveLength(0);
    });
  });

  describe("toggleJob", () => {
    it("toggles enabled state", async () => {
      useSchedulerStore.setState({ jobs: [sampleJob] });
      mockInvoke.mockResolvedValueOnce(undefined);
      await useSchedulerStore.getState().toggleJob("j1", false);
      expect(useSchedulerStore.getState().jobs[0].enabled).toBe(false);
    });
  });

  describe("runNow", () => {
    it("records execution and prepends", async () => {
      mockInvoke.mockResolvedValueOnce(sampleExecution);
      const result = await useSchedulerStore.getState().runNow("j1");
      expect(result).toEqual(sampleExecution);
      expect(useSchedulerStore.getState().executions).toEqual([sampleExecution]);
    });
  });

  describe("getExecutions", () => {
    it("populates executions", async () => {
      mockInvoke.mockResolvedValueOnce([sampleExecution]);
      await useSchedulerStore.getState().getExecutions("j1");
      expect(useSchedulerStore.getState().executions).toEqual([sampleExecution]);
    });
  });

  describe("evaluateSchedule", () => {
    it("populates nextRuns", async () => {
      const runs = ["2026-06-02T09:00:00Z", "2026-06-03T09:00:00Z"];
      mockInvoke.mockResolvedValueOnce(runs);
      await useSchedulerStore.getState().evaluateSchedule("0 9 * * *", 2);
      expect(useSchedulerStore.getState().nextRuns).toEqual(runs);
      expect(mockInvoke).toHaveBeenCalledWith("evaluate_cron_schedule_cmd", { cronExpr: "0 9 * * *", count: 2 });
    });
  });

  describe("escalations", () => {
    it("loadEscalations populates enabled jobs", async () => {
      mockInvoke.mockResolvedValueOnce([sampleJob, { ...sampleJob, id: "j2", enabled: false }]);
      await useSchedulerStore.getState().loadEscalations();
      expect(useSchedulerStore.getState().escalations).toHaveLength(1);
      expect(useSchedulerStore.getState().escalations[0].enabled).toBe(true);
    });

    it("clearEscalation removes from list", async () => {
      useSchedulerStore.setState({ escalations: [sampleJob] });
      await useSchedulerStore.getState().clearEscalation("j1");
      expect(useSchedulerStore.getState().escalations).toHaveLength(0);
    });
  });

  describe("event helpers", () => {
    it("pushExecution prepends execution", () => {
      useSchedulerStore.getState().pushExecution(sampleExecution);
      expect(useSchedulerStore.getState().executions).toEqual([sampleExecution]);
    });

    it("setLastFired sets event", () => {
      const event = { job_id: "j1", plan_id: "p1", execution_id: "e1", timestamp: "2026-06-01" };
      useSchedulerStore.getState().setLastFired(event);
      expect(useSchedulerStore.getState().lastFired).toEqual(event);
    });

    it("setLastEscalation sets event", () => {
      const event = { job_id: "j1", execution_id: "e1", error: "fail", failure_count: 3, timestamp: "2026-06-01" };
      useSchedulerStore.getState().setLastEscalation(event);
      expect(useSchedulerStore.getState().lastEscalation).toEqual(event);
    });

    it("clearError resets error", () => {
      useSchedulerStore.setState({ error: "some error" });
      useSchedulerStore.getState().clearError();
      expect(useSchedulerStore.getState().error).toBeNull();
    });
  });
});
