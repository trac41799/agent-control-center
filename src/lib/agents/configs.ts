import type { AgentConfig } from '../types'

export const AGENT_CONFIGS: AgentConfig[] = [
  {
    id: 'claude',
    label: 'Claude Code',
    spawnCmd: 'claude',
    defaultArgs: ['--dangerously-skip-permissions'],
    memoryFile: 'CLAUDE.md',
    globalConfigPath: '~/.claude/',
    mcpConfigFile: 'claude_desktop_config.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    supportsSubagents: true,
    subagentDetectionPattern: 'Dispatching subagent|Agent\\d+ started',
    waveCommand: 'claude --dangerously-skip-permissions "{prompt}"'
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    spawnCmd: 'opencode',
    defaultArgs: ['run'],
    memoryFile: '.opencode/memory/default.md',
    globalConfigPath: '~/.opencode/',
    mcpConfigFile: 'config.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    supportsSubagents: true,
    subagentDetectionPattern: 'Dispatching subagent|subagent_type',
    waveCommand: 'opencode run --model {model} --dir {dir} --format json "{prompt}"'
  },
  {
    id: 'aider',
    label: 'Aider',
    spawnCmd: 'aider',
    defaultArgs: [],
    memoryFile: 'CONVENTIONS.md',
    globalConfigPath: '~/.aider/',
    mcpConfigFile: '.aider.conf.yml',
    mcpConfigKey: 'mcp',
    tier: 1,
    waveEligible: true,
    supportsSubagents: false,
    waveCommand: 'aider --message "{prompt}" --yes --no-pretty'
  },
  {
    id: 'goose',
    label: 'Goose',
    spawnCmd: 'goose',
    defaultArgs: ['run'],
    memoryFile: '.goose/instructions.md',
    globalConfigPath: '~/.config/goose/',
    mcpConfigFile: 'config.yaml',
    mcpConfigKey: 'extensions',
    tier: 1,
    waveEligible: true,
    supportsSubagents: false,
    waveCommand: 'goose run --instructions "{prompt}"'
  },
  {
    id: 'cline',
    label: 'Cline CLI',
    spawnCmd: 'cline',
    defaultArgs: [],
    memoryFile: '.clinerules',
    globalConfigPath: '~/.cline/',
    mcpConfigFile: 'cline_mcp_settings.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    supportsSubagents: true,
    subagentDetectionPattern: 'Spawning subagent|Sub-task started',
    waveCommand: 'cline --task "{prompt}" --auto-approve'
  },
  {
    id: 'cursor',
    label: 'Cursor',
    spawnCmd: 'agent',
    defaultArgs: ['chat'],
    memoryFile: '.cursor/rules',
    globalConfigPath: '~/.cursor/',
    mcpConfigFile: 'mcp.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    requiresAuth: 'cursor-subscription',
    supportsSubagents: true,
    subagentDetectionPattern: 'Background agent|Parallel agent',
    waveCommand: 'agent chat "{prompt}"'
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    spawnCmd: 'gemini',
    defaultArgs: ['--output-format', 'json'],
    memoryFile: 'GEMINI.md',
    globalConfigPath: '~/.gemini/',
    mcpConfigFile: 'settings.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    supportsSubagents: true,
    subagentDetectionPattern: 'Delegating|subagent.*started|/agents\\s',
    waveCommand: 'gemini --output-format json "{prompt}"'
  },
  {
    id: 'qwen-code',
    label: 'Qwen Code',
    spawnCmd: 'qwen-code',
    defaultArgs: ['run'],
    memoryFile: 'qwen.md',
    globalConfigPath: '~/.qwen/',
    mcpConfigFile: 'settings.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    supportsSubagents: true,
    subagentDetectionPattern: 'Dispatching subagent|subagent_type',
    waveCommand: 'qwen-code run --model {model} "{prompt}"'
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    spawnCmd: 'codex',
    defaultArgs: ['run'],
    memoryFile: 'AGENTS.md',
    globalConfigPath: '~/.codex/',
    mcpConfigFile: 'config.json',
    mcpConfigKey: 'mcpServers',
    tier: 1,
    waveEligible: true,
    supportsSubagents: true,
    subagentDetectionPattern: 'spawn_agent|Spawned agent',
    waveCommand: 'codex run --model {model} "{prompt}"'
  }
]

export const CONNECTOR_SPECS: import('../types').ConnectorPlatformSpec[] = [
  {
    id: 'lark',
    label: 'Lark / Feishu',
    mcpServer: 'npx -y @larksuiteoapi/lark-mcp mcp',
    structured: false,
    approvalSignals: ['✅', 'approved', 'approve', 'go ahead', 'lgtm'],
    proposalMedium: 'doc',
    reportMedium: ['message', 'doc', 'base_record']
  },
  {
    id: 'slack',
    label: 'Slack',
    mcpServer: 'https://mcp.slack.com/mcp',
    structured: false,
    approvalSignals: ['✅', 'approved', 'lgtm', 'looks good'],
    proposalMedium: 'canvas',
    reportMedium: ['message']
  },
  {
    id: 'jira',
    label: 'Jira',
    mcpServer: 'https://mcp.atlassian.com/v1/sse',
    structured: true,
    approvalSignals: ['status:Approved', 'status:In Progress'],
    proposalMedium: 'issue',
    reportMedium: ['issue_update', 'attachment']
  }
]

export function getAgentConfig(id: string): AgentConfig | undefined {
  return AGENT_CONFIGS.find(agent => agent.id === id)
}

export function getWaveEligibleAgents(): AgentConfig[] {
  return AGENT_CONFIGS.filter(agent => agent.waveEligible)
}

export function getSubagentCapableAgents(): AgentConfig[] {
  return AGENT_CONFIGS.filter(agent => agent.supportsSubagents)
}