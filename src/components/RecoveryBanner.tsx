import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAgentStore } from "@/stores/agentStore";
import { AGENT_CONFIGS } from "@/lib/agents/configs";
import type { AppStateSnapshot, AgentSnapshotEntry } from "@/lib/types";

interface Props {
  snapshot: AppStateSnapshot;
  onDismiss: () => void;
}

export function RecoveryBanner({ snapshot, onDismiss }: Props) {
  const [restoring, setRestoring] = useState(false);
  const spawnAgent = useAgentStore((s) => s.spawnAgent);

  const handleRestore = async () => {
    setRestoring(true);
    try {
      for (const entry of snapshot.activeAgents) {
        const config = AGENT_CONFIGS.find((c) => c.id === entry.agentId);
        if (config) {
          try {
            await spawnAgent(config, entry.projectPath);
          } catch (e) {
            console.error(`Failed to restore agent ${entry.agentId}:`, e);
          }
        }
      }
    } finally {
      setRestoring(false);
      onDismiss();
    }
  };

  const handleClear = async () => {
    try {
      await invoke("clear_app_state");
    } catch {
      // ignore
    }
    onDismiss();
  };

  const agentLabels = snapshot.activeAgents
    .map((a: AgentSnapshotEntry) => a.agentId)
    .join(", ");

  return (
    <div className="flex items-center justify-between bg-amber-600/20 border-b border-amber-600/30 px-4 py-2.5 text-sm">
      <span className="text-amber-200">
        ACC closed unexpectedly with active agents ({agentLabels}). Restore
        previous session?
      </span>
      <div className="flex gap-2">
        <button
          onClick={handleRestore}
          disabled={restoring}
          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium disabled:opacity-50"
        >
          {restoring ? "Restoring..." : "Restore"}
        </button>
        <button
          onClick={handleClear}
          disabled={restoring}
          className="px-3 py-1 bg-transparent hover:bg-amber-600/30 text-amber-200 border border-amber-600/40 rounded text-xs disabled:opacity-50"
        >
          Start Fresh
        </button>
      </div>
    </div>
  );
}
