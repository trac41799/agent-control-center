import { useMemo } from 'react'
import { useAgentStore } from '../../stores/agentStore'
import { getWaveEligibleAgents } from '../../lib/agents/configs'
import AgentPanel from './AgentPanel'

interface AgentGridProps {
  orchestratorId?: string | null
}

export default function AgentGrid({ orchestratorId = null }: AgentGridProps) {
  const { agents } = useAgentStore()
  const activeAgents = Array.from(agents.values())

  const waveEligibleIds = useMemo(() => {
    if (!orchestratorId) return new Set<string>()
    return new Set(getWaveEligibleAgents().map((a) => a.id))
  }, [orchestratorId])

  if (activeAgents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">No agents running</p>
        <p className="text-sm">Spawn an agent to get started</p>
      </div>
    )
  }

  const orchestratorSession = orchestratorId
    ? activeAgents.find((s) => s.config.id === orchestratorId)
    : null

  const remainingAgents = orchestratorSession
    ? activeAgents.filter((s) => s.config.id !== orchestratorId)
    : activeAgents

  return (
    <div className="flex flex-col gap-4">
      {orchestratorSession && (
        <div className="w-full">
          <AgentPanel
            config={orchestratorSession.config}
            isOrchestrator
            waveEligible={waveEligibleIds.has(orchestratorSession.config.id)}
          />
        </div>
      )}

      {remainingAgents.length > 0 && (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}
        >
          {remainingAgents.map((session) => (
            <AgentPanel
              key={session.sessionId}
              config={session.config}
              waveEligible={orchestratorId ? waveEligibleIds.has(session.config.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
