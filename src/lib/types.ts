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