import { invoke } from '@tauri-apps/api/core'

export interface AgentProcessInfo {
  session_id: string
  status: string
  started_at: string
  project_path: string
}

export async function spawnAgent(
  agentId: string,
  projectPath: string,
  command: string,
  args: string[] = [],
  envVars: Record<string, string> = {}
): Promise<string> {
  return invoke<string>('spawn_agent', {
    agentId,
    projectPath,
    command,
    args,
    envVars,
  })
}

export async function killAgent(agentId: string): Promise<void> {
  return invoke<void>('kill_agent', { agentId })
}

export async function writeToAgent(agentId: string, text: string): Promise<void> {
  return invoke<void>('write_to_agent', { agentId, text })
}

export async function listAgents(): Promise<AgentProcessInfo[]> {
  return invoke<AgentProcessInfo[]>('list_agents')
}

export async function getAgentOutput(agentId: string): Promise<string | null> {
  return invoke<string | null>('get_agent_output', { agentId })
}