import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Clock4,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  RotateCcw,
  X,
  Check,
} from "lucide-react";
import type { CronJob, CronExecution } from "@/lib/types";

type TabId = "jobs" | "history";

const STATUS_COLORS: Record<string, string> = {
  running: "text-[#58a6ff] bg-[#58a6ff]/20 border-[#58a6ff]/30",
  success: "text-green-400 bg-green-500/20 border-green-500/30",
  failed: "text-red-400 bg-red-500/20 border-red-500/30",
  escalated: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
  scheduled: "text-gray-400 bg-gray-500/20 border-gray-500/30",
};

const EMPTY_JOB: Partial<CronJob> = {
  name: "",
  description: "",
  schedule: "0 */6 * * *",
  task_template: "",
  wave_preset: "",
  auto_approve: false,
  escalation_policy: "",
  max_correction_retries: 3,
  enabled: true,
};

export default function Scheduler() {
  const [tab, setTab] = useState<TabId>("jobs");
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [executions, setExecutions] = useState<CronExecution[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [form, setForm] = useState<Partial<CronJob>>({ ...EMPTY_JOB });
  const [historyFilter, setHistoryFilter] = useState("");

  useEffect(() => {
    // Placeholder: backend not ready yet
    setJobs([]);
    setExecutions([]);
  }, []);

  const openCreate = () => {
    setEditingJob(null);
    setForm({ ...EMPTY_JOB });
    setShowDialog(true);
  };

  const openEdit = (job: CronJob) => {
    setEditingJob(job);
    setForm({ ...job });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingJob(null);
  };

  const handleSave = () => {
    if (editingJob) {
      setJobs((prev) =>
        prev.map((j) => (j.id === editingJob.id ? { ...editingJob, ...form } as CronJob : j))
      );
    } else {
      const newJob: CronJob = {
        id: crypto.randomUUID(),
        schedule: form.schedule || "0 */6 * * *",
        task_template: form.task_template || "",
        escalation_policy: form.escalation_policy || "",
        auto_approve: form.auto_approve || false,
        max_correction_retries: form.max_correction_retries || 3,
        name: form.name || "Untitled",
        description: form.description,
        wave_preset: form.wave_preset,
        enabled: form.enabled ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setJobs((prev) => [...prev, newJob]);
    }
    closeDialog();
  };

  const toggleEnabled = (id: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, enabled: !j.enabled } : j))
    );
  };

  const deleteJob = (id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const runNow = (id: string) => {
    const exec: CronExecution = {
      id: crypto.randomUUID(),
      cron_job_id: id,
      status: "running",
      started_at: new Date().toISOString(),
    };
    setExecutions((prev) => [exec, ...prev]);
  };

  const filteredExecutions = executions.filter((e) => {
    if (!historyFilter) return true;
    return e.cron_job_id.includes(historyFilter);
  });

  const getJobName = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    return job?.name || jobId;
  };

  return (
    <div className="flex h-full flex-col p-6 gap-6">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <div className="gradient-accent-bar" />
          <h1>Scheduler</h1>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-lg bg-secondary/50 w-fit">
        {(["jobs", "history"] as TabId[]).map((t) => (
          <Button
            key={t}
            variant={tab === t ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab(t)}
          >
            {t === "jobs" ? "Jobs" : "History"}
          </Button>
        ))}
      </div>

      {tab === "jobs" && (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <Button onClick={openCreate} className="w-fit gap-1.5">
            <Plus className="size-4" /> New Job
          </Button>

          <ScrollArea className="flex-1">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Schedule</th>
                  <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Next Run</th>
                  <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="py-2 px-3 text-xs font-medium text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      <Clock4 className="size-8 mx-auto mb-2 opacity-50" />
                      No scheduled jobs. Create your first cron job to automate agent tasks.
                    </td>
                  </tr>
                )}
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border/50 hover:bg-accent/50">
                    <td className="py-3 px-3">
                      <div>
                        <span className="font-medium text-sm">{job.name}</span>
                        {job.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{job.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">{job.schedule}</code>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">
                      {job.next_run_at || "—"}
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          job.enabled
                            ? "border-green-500/30 text-green-400"
                            : "border-red-500/30 text-red-400"
                        )}
                      >
                        {job.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => toggleEnabled(job.id)}
                        >
                          {job.enabled ? (
                            <Pause className="size-3.5" />
                          ) : (
                            <Play className="size-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => runNow(job.id)}
                        >
                          <RotateCcw className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(job)}
                        >
                          <Edit className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:text-red-400"
                          onClick={() => deleteJob(job.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      )}

      {tab === "history" && (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="w-64">
            <Input
              placeholder="Filter by job..."
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
            />
          </div>

          <ScrollArea className="flex-1">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Job</th>
                  <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Started</th>
                  <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Completed</th>
                  <th className="py-2 px-3 text-xs font-medium text-muted-foreground">Duration</th>
                </tr>
              </thead>
              <tbody>
                {filteredExecutions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      <Clock4 className="size-8 mx-auto mb-2 opacity-50" />
                      No execution history yet. Run a job to see results here.
                    </td>
                  </tr>
                )}
                {filteredExecutions.map((exec) => {
                  const statusColor = STATUS_COLORS[exec.status] || STATUS_COLORS.scheduled;
                  const duration =
                    exec.completed_at
                      ? Math.round(
                          (new Date(exec.completed_at).getTime() -
                            new Date(exec.started_at).getTime()) /
                            1000
                        ) + "s"
                      : "—";
                  return (
                    <tr key={exec.id} className="border-b border-border/50 hover:bg-accent/50">
                      <td className="py-3 px-3 text-sm">{getJobName(exec.cron_job_id)}</td>
                      <td className="py-3 px-3">
                        <Badge variant="outline" className={cn("text-xs capitalize", statusColor)}>
                          {exec.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">
                        {new Date(exec.started_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">
                        {exec.completed_at
                          ? new Date(exec.completed_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">{duration}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      )}

      {/* Create/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingJob ? "Edit Job" : "Create Job"}
              </h2>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={closeDialog}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Name *</label>
                <Input
                  value={form.name || ""}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Daily Knowledge Sync"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Description</label>
                <Input
                  value={form.description || ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What does this job do?"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Schedule (Cron) *</label>
                <Input
                  value={form.schedule || ""}
                  onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))}
                  placeholder="0 */6 * * *"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Task Template</label>
                <Input
                  value={form.task_template || ""}
                  onChange={(e) => setForm((f) => ({ ...f, task_template: e.target.value }))}
                  placeholder="e.g., Run knowledge extraction for {project}"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Wave Preset</label>
                <Input
                  value={form.wave_preset || ""}
                  onChange={(e) => setForm((f) => ({ ...f, wave_preset: e.target.value }))}
                  placeholder="e.g., default-4-wave"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Escalation Policy</label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                  value={form.escalation_policy || ""}
                  onChange={(e) => setForm((f) => ({ ...f, escalation_policy: e.target.value }))}
                  placeholder="Escalation rules (JSON or policy text)..."
                />
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Max Retries</label>
                  <Input
                    type="number"
                    className="w-24"
                    value={form.max_correction_retries ?? 3}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, max_correction_retries: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>

                <label className="flex items-center gap-2 pt-5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.auto_approve || false}
                    onChange={(e) => setForm((f) => ({ ...f, auto_approve: e.target.checked }))}
                    className="rounded border-border"
                  />
                  <span className="text-sm">Auto-approve</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!form.name?.trim() || !form.schedule?.trim()} className="gap-1.5">
                <Check className="size-4" />
                {editingJob ? "Save Changes" : "Create Job"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
