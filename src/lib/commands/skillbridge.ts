import { invoke } from '@tauri-apps/api/core'

export interface SkillBridgeInfo {
  status: 'not-installed' | 'installed' | 'running' | 'bridge-active'
  version?: string
  relayUrl?: string
  mcpUrl?: string
}

export async function checkSkillBridge(): Promise<SkillBridgeInfo> {
  const result = await invoke<SkillBridgeInfo>('check_skillbridge')
  return result
}