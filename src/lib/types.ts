export type AgentTier = 1 | 2

export interface AgentConfig {
  id: string
  label: string
  spawnCmd: string
  defaultArgs: string[]
  memoryFile: string
  globalConfigPath: string
  mcpConfigFile: string
  mcpConfigKey: string
  tier: AgentTier
  requiresAuth?: string
  supportsSubagents: boolean
  subagentDetectionPattern?: string
  waveCommand?: string
  waveEligible: boolean
  knownFlagVersions?: Record<string, Partial<AgentConfig>>
}

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'writing'
  | 'running tests'
  | 'done'
  | 'failed'
  | 'stalled'

export interface SessionSummary {
  session_id: string
  started_at: string
  ended_at: string | null
  event_count: number
  agents: string
  outcome: string | null
}

export interface EventRecord {
  id: string
  session_id: string
  timestamp: string
  agent_id: string | null
  event_type: string
  target: string | null
  lines_added: number | null
  lines_removed: number | null
  exit_code: number | null
  detail?: string
}

export interface SessionEvent {
  id: string
  session_id: string
  timestamp: number
  agent_id: string
  event_type: string
  target?: string
  lines_added?: number
  lines_removed?: number
  exit_code?: number
}

export type SkillBridgeStatus = 'not-installed' | 'installed' | 'running' | 'bridge-active'

export interface ConnectorPlatformSpec {
  id: string
  label: string
  mcpServer: string
  structured: boolean
  approvalSignals: string[]
  proposalMedium: string
  reportMedium: string[]
}

export interface ConnectorConfig {
  id: string
  platform: string
  enabled: boolean
  config: Record<string, unknown>
  credentials?: ConnectorCredentials
  status: 'disconnected' | 'connected' | 'error'
}

export interface ConnectorCredentials {
  apiKey?: string
  token?: string
  refreshToken?: string
  expiresAt?: number
}

export interface Preset {
  id: string
  label: string
  agent_id: string
  command: string
  tags: string[]
  project_id?: string
  sort_order: number
}

export interface ProjectProfile {
  id: string
  path: string
  name: string
  stack: string[]
  test_framework?: string
  package_manager?: string
  active_agents: string[]
  active_skills: string[]
  active_mcps: string[]
  preferred_models: string[]
  connector?: string
  memory_snapshot?: string
}

export interface AgentMessage {
  id: string
  session_id: string
  timestamp: number
  role: 'user' | 'assistant' | 'system'
  content: string
  model?: string
  tokens_used?: number
}

export interface WavePlan {
  id: string
  project_id: string
  feature_id: string
  waves: Wave[]
  status: 'pending' | 'executing' | 'completed' | 'failed'
}

export interface Wave {
  wave_number: number
  agent_assignments: AgentAssignment[]
  dependencies: string[]
  status: 'pending' | 'ready' | 'executing' | 'completed' | 'failed'
}

export interface AgentAssignment {
  agent_id: string
  model?: string
  prompt?: string
  status: 'pending' | 'spawned' | 'completed' | 'failed'
}

export interface HandoffDoc {
  agent_id: string
  timestamp: number
  files_created: string[]
  files_modified: string[]
  tests_passed: boolean
  summary: string
}

export interface CorrectionDoc {
  target_agent: string
  issue: string
  suggestion: string
  timestamp: number
  max_attempts: number
  current_attempt: number
}

export interface BudgetPlan {
  project_id: string
  total_tokens: number
  spent_tokens: number
  remaining_tokens: number
  allocation: Record<string, number>
}

export type MCPConfig = Record<string, unknown>

export interface KnowledgeEntry {
  id: string
  project_id: string
  type: 'context' | 'pattern' | 'handoff' | 'correction'
  content: string
  source_agent?: string
  timestamp: number
}

export interface FileChange {
  path: string
  type: 'created' | 'modified' | 'deleted'
  timestamp: number
  agent_id?: string
}

export interface StallTimer {
  session_id: string
  started_at: number
  duration_ms: number
  reset_on_activity: boolean
}

export interface ACBSignal {
  id: string
  source_agent: string
  target_agent?: string
  signal_type: 'handoff' | 'correction' | 'block' | 'unblock' | 'message'
  payload: Record<string, unknown>
  timestamp: number
}

export interface FileOwnership {
  id: string
  project_id: string
  file_path: string
  claimed_by_thread_id: string
  claimed_at: string
  released_at?: string
}

export interface ConflictReport {
  file_path: string
  claimed_by: string
  requested_by: string
  severity: string
}

export interface CostSummary {
  total_tokens_in: number
  total_tokens_out: number
  total_tokens: number
  estimated_total_cost_usd: number
  by_model: ModelCostSummary[]
  by_project: ProjectCostSummary[]
  by_session: SessionCostSummary[]
}

export interface ModelCostSummary {
  model: string
  tokens_in: number
  tokens_out: number
  sessions: number
  estimated_cost_usd: number
}

export interface ProjectCostSummary {
  project_id: string
  project_name?: string
  tokens_in: number
  tokens_out: number
  sessions: number
  estimated_cost_usd: number
}

export interface SessionCostSummary {
  session_id: string
  agent_id?: string
  task_type?: string
  tokens_in: number
  tokens_out: number
  estimated_cost_usd: number
  started_at?: string
}

export interface BudgetInput {
  session_id: string | null
  plan_agent_id: string | null
  agent_id: string
  task_complexity: string | null
  model: string | null
  budget_total: number | null
}

export interface KnowledgeItem {
  id: string
  type: string
  title: string
  content: string
  tags?: string
  stack_tags?: string
  agent_tags?: string
  project_id?: string
  session_ids?: string
  plan_ids?: string
  confidence: number
  confirmation_count: number
  is_global: boolean
  first_seen: string
  last_confirmed: string
  status: string
  pending_task_data?: string
}

export interface KnowledgeRelation {
  from_id: string
  to_id: string
  relation_type: string
  created_at: string
}

export interface KnowledgeQuery {
  q?: string
  stack?: string
  agent?: string
  project_id?: string
  type?: string
  status?: string
  min_confidence?: number
  is_global?: boolean
  limit?: number
  offset?: number
}

// ============================================================================
// Knowledge Graph Types
// ============================================================================

export interface GraphNode {
  id: string
  title: string
  type: string
  confidence: number
  depth: number
}

export interface GraphEdge {
  from_id: string
  to_id: string
  relation_type: string
  depth: number
}

export interface SubgraphResult {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface CommunitySearchResult {
  community_id: string
  title: string
  summary: string
  level: number
  item_count: number
  member_items: Array<{ id: string; title: string; type: string; confidence: number }>
}

export interface KnowledgeContradiction {
  id: string
  item_a_id: string
  item_b_id: string
  conflict_type: string | null
  description: string | null
  resolution: string
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

export interface CodeKnowledgeJoin {
  title: string
  type: string
  confidence: number
  entity_name: string
  qualified_path: string | null
  relation_type: string
}

export interface CochangeWarning {
  file_a: string
  file_b: string
  jaccard_score: number
  cochange_count: number
}

export interface CronJob {
  id: string
  name: string
  description?: string
  project_id?: string
  schedule: string
  task_template: string
  wave_preset?: string
  auto_approve: boolean
  escalation_policy: string
  notification_channels?: string
  max_correction_retries: number
  enabled: boolean
  last_run_at?: string
  next_run_at?: string
  created_at: string
  updated_at: string
}

export interface CronJobInput {
  name: string
  description?: string
  project_id?: string
  schedule: string
  task_template: string
  wave_preset?: string
  auto_approve?: boolean
  escalation_policy?: string
  notification_channels?: string
  max_correction_retries?: number
  enabled?: boolean
}

export interface CronExecution {
  id: string
  cron_job_id: string
  plan_id?: string
  status: string
  escalation_reason?: string
  escalation_source?: string
  started_at: string
  completed_at?: string
  notified_at?: string
}

export interface AgentBudget {
  id: string
  session_id?: string
  plan_agent_id?: string
  agent_id: string
  task_complexity?: string
  model?: string
  budget_total: number
  budget_used: number
  state: string
  wip_path?: string
  usage_percent: number
  created_at: string
  updated_at: string
}

export interface WaveResumptionPlan {
  id: string
  wave_id: string
  pending_task_id?: string
  plan_path: string
  agents_completed?: string
  agents_wipd?: string
  agents_pending?: string
  estimated_remaining_tokens?: number
  created_at: string
}

export interface CostBreakdown {
  model?: string
  tokens_in: number
  tokens_out: number
  estimated_cost_usd: number
}

// ============================================================================
// Backward Channel Types (Phase 8: Chat → Local LLM)
// ============================================================================

export interface ChatPlatformConfig {
  id: string
  platform: string                    // 'lark' | 'slack' | 'discord' | 'telegram'
  routing_key: string                 // platform-specific routing key
  enabled: boolean
  webhook_url: string                 // deployed webhook server URL
  credentials: Record<string, string> // platform-specific credentials
  queue_provider: string              // 'upstash' | 'postgres' | 'redis' | 'file'
  queue_config: Record<string, string> // provider-specific config
  reply_mode: string                  // 'mcp_tool' | 'post_process' | 'inline'
  status: 'disconnected' | 'connected' | 'error' | 'configured'
  created_at: string
  updated_at: string
}

export interface DaemonStatus {
  running: boolean
  pid: number | null
  uptime_s: number | null
  queue_depth: number
  active_platforms: string[]
  last_event_at: string | null
  error: string | null
}

export interface QueueInfo {
  provider: string
  connected: boolean
  queue_depth: number
  latency_ms: number | null
}

// ============================================================================
// Codebase Exploration Types
// ============================================================================

export interface CodebaseFile {
  id: string
  project_id: string
  file_path: string
  file_name: string
  extension: string
  language: string | null
  loc: number
  last_modified: string
  coverage_status: 'unexplored' | 'mapped' | 'summarized' | 'analyzed'
  last_indexed_at: string | null
}

export interface CodebaseSymbol {
  id: string
  file_id: string
  symbol_name: string
  symbol_type: string
  signature: string | null
  line_start: number
  line_end: number
  parent_symbol_id: string | null
  page_rank: number
}

export interface RepoMapOutput {
  file_path: string
  symbols: SymbolBrief[]
}

export interface SymbolBrief {
  symbol_name: string
  symbol_type: string
  signature: string | null
  line_start: number
}

export interface CodebaseChunk {
  id: string
  file_id: string
  chunk_type: string
  symbol_name: string | null
  parent_context: string | null
  content: string
  line_start: number
  line_end: number
  token_count: number
}

export interface SearchResult {
  chunk_id: string
  file_path: string
  symbol_name: string | null
  content: string
  relevance_score: number
  match_type: string
  line_start: number
  line_end: number
}

export interface CodebaseCoverage {
  total_files: number
  mapped: number
  summarized: number
  analyzed: number
  unexplored: number
  coverage_pct: number
}

export interface RepoMapConfig {
  map_tokens: number
  languages: string[]
  include_tests: boolean
  update_mode: string
}

// ============================================================
// Memory Layer Types
// ============================================================
export interface MemoryFact {
  id: string;
  agent_id: string;
  session_id: string;
  user_id: string;
  org_id: string;
  fact_type: string;
  content: string;
  embedding?: number[];
  metadata?: string;
  confidence: number;
  access_count: number;
  last_accessed?: string;
  created_at: string;
}

export interface MemoryFactInput {
  agent_id: string;
  session_id: string;
  user_id: string;
  org_id: string;
  fact_type: string;
  content: string;
  metadata?: string;
  confidence?: number;
}

export interface MemoryQuery {
  agent_id?: string;
  session_id?: string;
  org_id?: string;
  fact_type?: string;
  min_confidence?: number;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface SessionCheckpoint {
  id: string;
  agent_id: string;
  session_id: string;
  turn_number: number;
  state_blob: number[];
  summary?: string;
  token_count?: number;
  created_at: string;
}

export interface MemorySearchResult {
  fact: MemoryFact;
  score: number;
  match_type: string;
}

export interface MemoryStats {
  total_facts: number;
  total_checkpoints: number;
  by_type: Array<{ type: string; count: number }>;
  avg_confidence: number;
  total_tokens_saved: number;
}

// ============================================================================
// Crash Recovery Types
// ============================================================================

export interface AgentSnapshotEntry {
  agentId: string
  sessionId: string
  status: string
  projectPath: string
  startedAt: string
}

export interface AppStateSnapshot {
  activeAgents: AgentSnapshotEntry[]
  lastProjectPath: string | null
  savedAt: string
}

// ============================================================================
// Agent Install Check Types
// ============================================================================

export interface PlatformInstallHints {
  windows: string
  macos: string
  linux: string
}

export interface AgentInstallStatus {
  installed: boolean
  command: string
  install_hint: string | null
  platform_hints: PlatformInstallHints
}

const AGENT_INSTALL_HINTS: Record<string, { hint: string; platformHints: PlatformInstallHints }> = {
  claude: {
    hint: 'npm install -g @anthropic-ai/claude-code',
    platformHints: {
      windows: 'npm install -g @anthropic-ai/claude-code',
      macos: 'brew install claude-code || npm install -g @anthropic-ai/claude-code',
      linux: 'npm install -g @anthropic-ai/claude-code',
    },
  },
  opencode: {
    hint: 'npm install -g @anomalyco/opencode',
    platformHints: {
      windows: 'npm install -g @anomalyco/opencode',
      macos: 'brew install opencode || npm install -g @anomalyco/opencode',
      linux: 'npm install -g @anomalyco/opencode',
    },
  },
  aider: {
    hint: 'pip install aider-chat',
    platformHints: {
      windows: 'pip install aider-chat',
      macos: 'brew install aider || pip install aider-chat',
      linux: 'pip install aider-chat',
    },
  },
  goose: {
    hint: 'npm install -g @goose-ai/cli',
    platformHints: {
      windows: 'npm install -g @goose-ai/cli',
      macos: 'npm install -g @goose-ai/cli',
      linux: 'npm install -g @goose-ai/cli',
    },
  },
  codex: {
    hint: 'npm install -g @openai/codex',
    platformHints: {
      windows: 'npm install -g @openai/codex',
      macos: 'npm install -g @openai/codex',
      linux: 'npm install -g @openai/codex',
    },
  },
}

export function getAgentInstallHint(agentId: string): string | null {
  const lower = agentId.toLowerCase()
  for (const [key, val] of Object.entries(AGENT_INSTALL_HINTS)) {
    if (lower.includes(key)) return val.hint
  }
  return null
}

export function getAgentPlatformHints(agentId: string): PlatformInstallHints | null {
  const lower = agentId.toLowerCase()
  for (const [key, val] of Object.entries(AGENT_INSTALL_HINTS)) {
    if (lower.includes(key)) return val.platformHints
  }
  return null
}

export function getPlatformHint(platformHints: PlatformInstallHints): string {
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('win')) return platformHints.windows
  if (ua.includes('mac')) return platformHints.macos
  return platformHints.linux
}

export class AgentNotInstalledError extends Error {
  command: string
  installHint: string | null
  platformHint: string | null

  constructor(command: string, agentId: string) {
    const hint = getAgentInstallHint(agentId)
    const platformHints = getAgentPlatformHints(agentId)
    const platformHint = platformHints ? getPlatformHint(platformHints) : null
    const message = platformHint
      ? `Agent '${agentId}' is not installed. Install it with: ${platformHint}`
      : `Agent '${agentId}' is not installed (command: ${command}). Please install it and try again.`
    super(message)
    this.name = 'AgentNotInstalledError'
    this.command = command
    this.installHint = hint
    this.platformHint = platformHint
  }
}