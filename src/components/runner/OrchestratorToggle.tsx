import { Button } from "@/components/ui/button"
import { Workflow, LayoutGrid } from "lucide-react"

interface OrchestratorToggleProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  orchestratorAgentId: string | null
  onSetOrchestrator: (agentId: string) => void
  agentLabels: Array<{ id: string; label: string }>
}

export function OrchestratorToggle({
  enabled,
  onToggle,
  orchestratorAgentId,
  onSetOrchestrator,
  agentLabels,
}: OrchestratorToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <Button
        variant={enabled ? "default" : "ghost"}
        size="sm"
        onClick={() => onToggle(!enabled)}
        className="gap-2"
      >
        {enabled ? (
          <>
            <Workflow className="size-4" />
            Orchestrator Mode
          </>
        ) : (
          <>
            <LayoutGrid className="size-4" />
            Normal Mode
          </>
        )}
      </Button>

      {enabled && (
        <select
          className="h-8 rounded-md border bg-background px-2 text-sm"
          value={orchestratorAgentId || ""}
          onChange={(e) => onSetOrchestrator(e.target.value)}
        >
          <option value="">Select orchestrator...</option>
          {agentLabels.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
