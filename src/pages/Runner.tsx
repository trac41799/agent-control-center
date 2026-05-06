import { useState, useMemo } from 'react'
import { useAgentStore } from '../stores/agentStore'
import { usePresetStore } from '../stores/presetStore'
import { useProjectStore } from '../stores/projectStore'
import AgentGrid from '../components/runner/AgentGrid'
import { OrchestratorToggle } from '../components/runner/OrchestratorToggle'
import { AGENT_CONFIGS } from '../lib/agents/configs'
import type { AgentConfig } from '../lib/types'

const AVAILABLE_AGENTS: AgentConfig[] = [
  { 
    id: 'claude-code', 
    label: 'Claude Code', 
    spawnCmd: 'claude', 
    defaultArgs: [], 
    memoryFile: '', 
    globalConfigPath: '', 
    mcpConfigFile: '', 
    mcpConfigKey: '', 
    tier: 1,
    supportsSubagents: false,
    waveEligible: false,
  },
  { 
    id: 'opencode', 
    label: 'OpenCode', 
    spawnCmd: 'opencode', 
    defaultArgs: [], 
    memoryFile: '', 
    globalConfigPath: '', 
    mcpConfigFile: '', 
    mcpConfigKey: '', 
    tier: 1,
    supportsSubagents: false,
    waveEligible: false,
  },
  { 
    id: 'aider', 
    label: 'Aider', 
    spawnCmd: 'aider', 
    defaultArgs: [], 
    memoryFile: '', 
    globalConfigPath: '', 
    mcpConfigFile: '', 
    mcpConfigKey: '', 
    tier: 1,
    supportsSubagents: false,
    waveEligible: false,
  },
]

export default function Runner() {
  const { agents, spawnAgent } = useAgentStore()
  const { presets, executePreset } = usePresetStore()
  const { currentProject, switchProject, recentPaths } = useProjectStore()
  const [showAgentDropdown, setShowAgentDropdown] = useState(false)
  const [orchestratorMode, setOrchestratorMode] = useState(false)
  const [orchestratorAgent, setOrchestratorAgent] = useState<string | null>(null)

  const agentLabels = useMemo(
    () =>
      AGENT_CONFIGS.map((a) => ({ id: a.id, label: a.label })),
    []
  )

  const agentCount = agents.size
  const totalFilesChanged = 0
  
  const handleSpawnAgent = async (agent: AgentConfig) => {
    try {
      const projectPath = currentProject?.path || '/projects/current'
      await spawnAgent(agent, projectPath)
      setShowAgentDropdown(false)
    } catch (e) {
      console.error('Failed to spawn agent:', e)
    }
  }
  
  const handlePresetClick = (presetId: string) => {
    const agentIds = Array.from(agents.keys())
    if (agentIds.length > 0) {
      executePreset(presetId, agentIds[0])
    }
  }
  
  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Project Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-glass-border bg-glass-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Project:</span>
          <select 
            className="bg-glass-20 border border-glass-border rounded-lg px-3 py-1.5 text-sm text-foreground outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20"
            value={currentProject?.path || ''}
            onChange={(e) => switchProject(e.target.value)}
          >
            <option value="">Select project...</option>
            {recentPaths.map((path) => (
              <option key={path} value={path}>{path}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button className="gradient-primary px-3 py-1.5 text-xs text-white rounded-lg shadow-glow-sm hover:shadow-glow-lg hover:-translate-y-px active:scale-[0.98] transition-all duration-200">
            Load Profile
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        {/* AGENTS Section */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="gradient-accent-bar" style={{ height: 22 }} />
              <h2 className="text-lg font-semibold text-foreground">AGENTS</h2>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                className="gradient-primary px-3 py-1.5 text-xs text-white rounded-lg shadow-glow-sm hover:shadow-glow-lg hover:-translate-y-px active:scale-[0.98] transition-all duration-200"
              >
                + Add Agent
              </button>
              {showAgentDropdown && (
                <div className="absolute right-0 top-full mt-1 w-40 glass-card shadow-lg z-10 p-1">
                  {AVAILABLE_AGENTS.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => handleSpawnAgent(agent)}
                      className="w-full px-3 py-2 text-left text-sm text-foreground glass-hover rounded-md transition-colors first:rounded-t-md last:rounded-b-md"
                    >
                      {agent.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mb-3">
            <OrchestratorToggle
              enabled={orchestratorMode}
              onToggle={setOrchestratorMode}
              orchestratorAgentId={orchestratorAgent}
              onSetOrchestrator={setOrchestratorAgent}
              agentLabels={agentLabels}
            />
          </div>
          
          <AgentGrid orchestratorId={orchestratorMode ? orchestratorAgent : null} />
        </section>
        
        {/* PRESETS Section */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="gradient-accent-bar" style={{ height: 22 }} />
            <h2 className="text-lg font-semibold text-foreground">PRESETS</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset.id)}
                className="px-3 py-1.5 text-sm bg-glass-20 border border-glass-border rounded-lg text-foreground glass-hover"
              >
                {preset.label}
              </button>
            ))}
            <button className="px-3 py-1.5 text-sm bg-glass-10 text-muted-foreground border border-dashed border-glass-border rounded-lg glass-hover">
              + New
            </button>
          </div>
        </section>
      </div>
      
      {/* Session Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-glass-border bg-glass-10 backdrop-blur-md text-sm">
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="font-medium text-xs uppercase tracking-wider">Session</span>
          <span>{agentCount} agents</span>
          <span>{totalFilesChanged} files changed</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 text-xs text-muted-foreground glass-hover rounded-md">
            Analyze
          </button>
          <button className="px-2 py-1 text-xs text-muted-foreground glass-hover rounded-md">
            Docs
          </button>
        </div>
      </div>
    </div>
  )
}
