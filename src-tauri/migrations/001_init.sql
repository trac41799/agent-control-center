-- ============================================================
-- ACC Database Initialization Schema
-- Migration: 001_init.sql
-- Created: 2026-05-02
-- Description: Full SQLite schema with WAL mode, 34 tables, 22+ indexes
-- ============================================================

-- ============================================================
-- PRAGMAS (must execute before any table creation)
-- ============================================================
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA foreign_keys=ON;
PRAGMA cache_size=-32000;
PRAGMA temp_store=MEMORY;

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id              TEXT PRIMARY KEY,
  path            TEXT NOT NULL UNIQUE,
  name            TEXT,
  stack           TEXT,
  test_framework  TEXT,
  package_manager TEXT,
  profile         TEXT,
  connector_id    TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

-- ============================================================
-- AGENTS (registered agent configurations)
-- ============================================================
CREATE TABLE IF NOT EXISTS agents (
  id              TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  spawn_cmd       TEXT NOT NULL,
  spawn_args      TEXT,
  memory_file     TEXT,
  config_path     TEXT,
  mcp_config_key  TEXT,
  tier            INTEGER NOT NULL,
  requires_auth   TEXT,
  supports_subagents INTEGER DEFAULT 0,
  is_active       INTEGER DEFAULT 1
);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id              TEXT PRIMARY KEY,
  project_id      TEXT REFERENCES projects(id),
  agent_id        TEXT REFERENCES agents(id),
  model           TEXT,
  started_at      TEXT NOT NULL,
  ended_at        TEXT,
  task_desc       TEXT,
  task_type       TEXT,
  outcome         TEXT,
  outcome_at      TEXT,
  plan_id         TEXT REFERENCES feature_plans(id)
);

-- ============================================================
-- SESSION EVENTS (replay)
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id              TEXT PRIMARY KEY,
  session_id      TEXT REFERENCES sessions(id),
  timestamp       TEXT NOT NULL,
  agent_id        TEXT,
  event_type      TEXT NOT NULL,
  target          TEXT,
  lines_added     INTEGER,
  lines_removed   INTEGER,
  exit_code       INTEGER
);

-- Payload table: large content stored separately, fetched on demand
CREATE TABLE IF NOT EXISTS event_payloads (
  event_id        TEXT PRIMARY KEY REFERENCES events(id),
  detail          TEXT
);

-- ============================================================
-- ASSETS (skills, memory, MCPs, connectors, plugins)
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL,
  agent_scope     TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  file_path       TEXT,
  content         TEXT,
  config          TEXT,
  tags            TEXT,
  source_format   TEXT,
  is_active       INTEGER DEFAULT 1,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_assets (
  project_id      TEXT REFERENCES projects(id),
  asset_id        TEXT REFERENCES assets(id),
  applied_at      TEXT NOT NULL,
  PRIMARY KEY (project_id, asset_id)
);

-- ============================================================
-- MCP REGISTRY
-- ============================================================
CREATE TABLE IF NOT EXISTS mcps (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,
  command         TEXT,
  args            TEXT,
  env_key_names   TEXT,
  agent_scope     TEXT,
  is_active       INTEGER DEFAULT 1,
  is_connector    INTEGER DEFAULT 0
);

-- ============================================================
-- PRESET COMMANDS
-- ============================================================
CREATE TABLE IF NOT EXISTS presets (
  id              TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  agent_id        TEXT REFERENCES agents(id),
  command         TEXT NOT NULL,
  tags            TEXT,
  project_id      TEXT,
  sort_order      INTEGER DEFAULT 0
);

-- ============================================================
-- MODEL REGISTRY
-- ============================================================
CREATE TABLE IF NOT EXISTS models (
  id              TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  provider        TEXT NOT NULL,
  model_path      TEXT NOT NULL,
  strengths       TEXT,
  agent_id        TEXT,
  alternation_index INTEGER,
  is_active       INTEGER DEFAULT 1
);

-- ============================================================
-- OUTCOME STATISTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS outcome_stats (
  agent_id        TEXT NOT NULL,
  task_type       TEXT NOT NULL,
  project_id      TEXT,
  total           INTEGER DEFAULT 0,
  done            INTEGER DEFAULT 0,
  failed          INTEGER DEFAULT 0,
  revised         INTEGER DEFAULT 0,
  avg_duration_s  REAL,
  PRIMARY KEY (agent_id, task_type, project_id)
);

-- ============================================================
-- FEATURE PLANS (Wave Orchestrator)
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_plans (
  id              TEXT PRIMARY KEY,
  project_id      TEXT REFERENCES projects(id),
  slug            TEXT NOT NULL,
  docs_path       TEXT,
  status          TEXT DEFAULT 'planning',
  detected_item_id TEXT,
  created_at      TEXT NOT NULL,
  completed_at    TEXT
);

CREATE TABLE IF NOT EXISTS plan_agents (
  id              TEXT PRIMARY KEY,
  plan_id         TEXT REFERENCES feature_plans(id),
  agent_ref       TEXT NOT NULL,
  task            TEXT NOT NULL,
  wave            INTEGER NOT NULL,
  model_id        TEXT REFERENCES models(id),
  depends_on      TEXT,
  agent_id        TEXT REFERENCES agents(id),
  status          TEXT DEFAULT 'queued',
  guideline_path  TEXT,
  handoff_path    TEXT,
  started_at      TEXT,
  completed_at    TEXT,
  retry_count     INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS corrections (
  id              TEXT PRIMARY KEY,
  plan_id         TEXT REFERENCES feature_plans(id),
  agent_ref       TEXT NOT NULL,
  bug_desc        TEXT,
  root_cause      TEXT,
  fix_required    TEXT,
  test_required   TEXT,
  retry_number    INTEGER DEFAULT 1,
  resolved        INTEGER DEFAULT 0,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS failure_analyses (
  id              TEXT PRIMARY KEY,
  session_id      TEXT REFERENCES sessions(id),
  pty_excerpt     TEXT,
  diagnosis       TEXT,
  created_at      TEXT NOT NULL
);

-- ============================================================
-- UPSTREAM CONNECTORS
-- ============================================================
CREATE TABLE IF NOT EXISTS connector_configs (
  id              TEXT PRIMARY KEY,
  platform        TEXT NOT NULL,
  project_id      TEXT REFERENCES projects(id),
  mcp_server      TEXT NOT NULL,
  watch_targets   TEXT,
  watch_keywords  TEXT,
  poll_interval   INTEGER DEFAULT 15,
  auto_propose    TEXT,
  approval_signals TEXT,
  approval_timeout INTEGER DEFAULT 10080,
  reminder_after  INTEGER DEFAULT 1440,
  proposal_folder TEXT,
  delivery_log_id TEXT,
  is_active       INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS detected_items (
  id              TEXT PRIMARY KEY,
  connector_id    TEXT REFERENCES connector_configs(id),
  platform_msg_id TEXT NOT NULL,
  sender          TEXT,
  thread_id       TEXT,
  raw_content     TEXT,
  classification  TEXT,
  status          TEXT DEFAULT 'pending',
  detected_at     TEXT NOT NULL,
  proposal_doc_id TEXT,
  proposal_url    TEXT,
  approved_at     TEXT,
  approved_by     TEXT,
  plan_id         TEXT REFERENCES feature_plans(id),
  completed_at    TEXT
);

CREATE TABLE IF NOT EXISTS delivery_log (
  id              TEXT PRIMARY KEY,
  detected_item_id TEXT REFERENCES detected_items(id),
  plan_id         TEXT REFERENCES feature_plans(id),
  platform        TEXT NOT NULL,
  summary_msg_id  TEXT,
  changelog_doc_id TEXT,
  qa_doc_id       TEXT,
  platform_record_id TEXT,
  posted_at       TEXT NOT NULL
);

-- ============================================================
-- MEMORY CAPTURE CANDIDATES
-- ============================================================
CREATE TABLE IF NOT EXISTS memory_candidates (
  id              TEXT PRIMARY KEY,
  session_id      TEXT REFERENCES sessions(id),
  project_id      TEXT REFERENCES projects(id),
  content         TEXT NOT NULL,
  source_pattern  TEXT,
  status          TEXT DEFAULT 'pending',
  created_at      TEXT NOT NULL
);

-- ============================================================
-- KNOWLEDGE COMPOUNDER
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_items (
  id                  TEXT PRIMARY KEY,
  type                TEXT NOT NULL,
  title               TEXT NOT NULL,
  content             TEXT NOT NULL,
  tags                TEXT,
  stack_tags          TEXT,
  agent_tags          TEXT,
  project_id          TEXT REFERENCES projects(id),
  session_ids         TEXT,
  plan_ids            TEXT,
  confidence          REAL DEFAULT 0.1,
  confirmation_count  INTEGER DEFAULT 1,
  is_global           INTEGER DEFAULT 0,
  first_seen          TEXT NOT NULL,
  last_confirmed      TEXT NOT NULL,
  status              TEXT DEFAULT 'active',
  pending_task_data   TEXT
);

CREATE TABLE IF NOT EXISTS knowledge_relations (
  from_id       TEXT REFERENCES knowledge_items(id),
  to_id         TEXT REFERENCES knowledge_items(id),
  relation_type TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  PRIMARY KEY (from_id, to_id, relation_type)
);

-- ============================================================
-- SUPABASE PROJECT CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS supabase_configs (
  id              TEXT PRIMARY KEY,
  project_id      TEXT REFERENCES projects(id) UNIQUE,
  project_ref     TEXT,
  feature_groups  TEXT,
  lockdown_migrations INTEGER DEFAULT 1,
  readonly_execute_sql INTEGER DEFAULT 1,
  updated_at      TEXT NOT NULL
);

-- ============================================================
-- GITHUB PROJECT CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS github_configs (
  id              TEXT PRIMARY KEY,
  project_id      TEXT REFERENCES projects(id) UNIQUE,
  repo_owner      TEXT,
  repo_name       TEXT,
  repo_visibility TEXT DEFAULT 'private',
  lockdown_mode   INTEGER DEFAULT 0,
  enabled_toolsets TEXT,
  default_branch  TEXT DEFAULT 'main',
  pr_template     TEXT,
  updated_at      TEXT NOT NULL
);

-- ============================================================
-- AGENT COMMUNICATION BUS (ACB)
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_messages (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL,
  wave        INTEGER,
  from_agent  TEXT NOT NULL,
  to_agent    TEXT NOT NULL,
  type        TEXT NOT NULL,
  priority    TEXT NOT NULL,
  body        TEXT NOT NULL,
  ref_id      TEXT,
  status      TEXT DEFAULT 'OPEN',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

-- ============================================================
-- TOKEN USAGE
-- ============================================================
CREATE TABLE IF NOT EXISTS token_usage (
  id            TEXT PRIMARY KEY,
  session_id    TEXT REFERENCES sessions(id),
  agent_id      TEXT,
  context       TEXT NOT NULL,
  model         TEXT,
  tokens_in     INTEGER DEFAULT 0,
  tokens_out    INTEGER DEFAULT 0,
  recorded_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS limit_events (
  id            TEXT PRIMARY KEY,
  session_id    TEXT REFERENCES sessions(id),
  plan_agent_id TEXT REFERENCES plan_agents(id),
  event_type    TEXT NOT NULL,
  raw_message   TEXT,
  resolved      INTEGER DEFAULT 0,
  resolved_at   TEXT,
  resolution    TEXT
);

-- ============================================================
-- AUTONOMOUS SCHEDULER
-- ============================================================
CREATE TABLE IF NOT EXISTS cron_jobs (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  description           TEXT,
  project_id            TEXT REFERENCES projects(id),
  schedule              TEXT NOT NULL,
  task_template         TEXT NOT NULL,
  wave_preset           TEXT,
  auto_approve          INTEGER DEFAULT 1,
  escalation_policy     TEXT NOT NULL,
  notification_channels TEXT,
  max_correction_retries INTEGER DEFAULT 2,
  enabled               INTEGER DEFAULT 1,
  last_run_at           TEXT,
  next_run_at           TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cron_executions (
  id                TEXT PRIMARY KEY,
  cron_job_id       TEXT REFERENCES cron_jobs(id),
  plan_id           TEXT REFERENCES feature_plans(id),
  status            TEXT DEFAULT 'running',
  escalation_reason TEXT,
  escalation_source TEXT,
  started_at        TEXT NOT NULL,
  completed_at      TEXT,
  notified_at       TEXT
);

-- ============================================================
-- TOKEN BUDGET SYSTEM
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_budgets (
  id                TEXT PRIMARY KEY,
  session_id        TEXT REFERENCES sessions(id),
  plan_agent_id     TEXT REFERENCES plan_agents(id),
  agent_id          TEXT NOT NULL,
  task_complexity   TEXT,
  model             TEXT,
  budget_total      INTEGER NOT NULL,
  budget_used       INTEGER DEFAULT 0,
  state             TEXT DEFAULT 'active',
  wip_path          TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wave_resumption_plans (
  id                TEXT PRIMARY KEY,
  wave_id           TEXT REFERENCES feature_plans(id),
  pending_task_id   TEXT REFERENCES knowledge_items(id),
  plan_path         TEXT NOT NULL,
  agents_completed  TEXT,
  agents_wipd       TEXT,
  agents_pending    TEXT,
  estimated_remaining_tokens INTEGER,
  created_at        TEXT NOT NULL
);

-- ============================================================
-- AGENT VERSIONS (track agent version history)
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_versions (
  id              TEXT PRIMARY KEY,
  agent_id        TEXT REFERENCES agents(id),
  version         TEXT NOT NULL,
  installed_at    TEXT NOT NULL,
  is_current      INTEGER DEFAULT 1,
  changelog       TEXT
);

-- ============================================================
-- SKILLBRIDGE INTEGRATION
-- ============================================================
CREATE TABLE IF NOT EXISTS skillbridge_config (
  id              TEXT PRIMARY KEY DEFAULT 'default',
  status          TEXT NOT NULL DEFAULT 'not-installed',
  version         TEXT,
  relay_url       TEXT,
  mcp_url         TEXT,
  detected_at     TEXT,
  updated_at      TEXT NOT NULL
);

-- ============================================================
-- MODEL COSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS model_costs (
  id                TEXT PRIMARY KEY,
  model_id          TEXT REFERENCES models(id) NOT NULL,
  cost_per_1k_input REAL NOT NULL,
  cost_per_1k_output REAL NOT NULL,
  provider          TEXT NOT NULL,
  currency          TEXT DEFAULT 'USD',
  updated_at        TEXT NOT NULL
);

-- ============================================================
-- FILE OWNERSHIP REGISTRY
-- ============================================================
CREATE TABLE IF NOT EXISTS file_ownership_registry (
  id                  TEXT PRIMARY KEY,
  project_id          TEXT REFERENCES projects(id) NOT NULL,
  file_path           TEXT NOT NULL,
  claimed_by_thread_id TEXT NOT NULL,
  claimed_at          TEXT NOT NULL,
  released_at         TEXT,
  UNIQUE(project_id, file_path)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Session replay: filter + sort by session and time
CREATE INDEX IF NOT EXISTS idx_events_session    ON events(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_agent      ON events(session_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_events_type       ON events(session_id, event_type);

-- Outcome routing: filter by project for confidence stats
CREATE INDEX IF NOT EXISTS idx_outcomes_project  ON outcome_stats(project_id, agent_id);

-- Knowledge preflight: filter by stack + confidence level
CREATE INDEX IF NOT EXISTS idx_knowledge_query   ON knowledge_items(status, confidence, is_global);
CREATE INDEX IF NOT EXISTS idx_knowledge_stack   ON knowledge_items(status);

-- Connector polling: filter pending detected items per connector
CREATE INDEX IF NOT EXISTS idx_detected_status   ON detected_items(connector_id, status);
CREATE INDEX IF NOT EXISTS idx_detected_platform ON detected_items(status);

-- ACB message bus: open signals per session
CREATE INDEX IF NOT EXISTS idx_messages_session  ON agent_messages(session_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_wave     ON agent_messages(session_id, from_agent);

-- Token usage: aggregate by session and context type
CREATE INDEX IF NOT EXISTS idx_token_session     ON token_usage(session_id, context);

-- Limit events: look up unresolved events per wave agent
CREATE INDEX IF NOT EXISTS idx_limit_agent       ON limit_events(plan_agent_id, resolved);

-- Cron scheduler: find active jobs and execution history
CREATE INDEX IF NOT EXISTS idx_cron_jobs_next    ON cron_jobs(enabled, next_run_at);
CREATE INDEX IF NOT EXISTS idx_cron_exec_job     ON cron_executions(cron_job_id, status);
CREATE INDEX IF NOT EXISTS idx_cron_exec_plan    ON cron_executions(plan_id);

-- Token budgets: live counter lookup per session, active monitoring
CREATE INDEX IF NOT EXISTS idx_agent_budgets_session ON agent_budgets(session_id, state);
CREATE INDEX IF NOT EXISTS idx_agent_budgets_active  ON agent_budgets(state) WHERE state != 'completed';

-- Wave resumption plans: lookup by wave
CREATE INDEX IF NOT EXISTS idx_resumption_wave   ON wave_resumption_plans(wave_id);

-- Pending tasks: filter knowledge_items by pending_task type and status
CREATE INDEX IF NOT EXISTS idx_pending_tasks     ON knowledge_items(type, status) WHERE type = 'pending_task' AND status IN ('pending', 'reminded');

-- File ownership: quick lookup for conflict detection
CREATE INDEX IF NOT EXISTS idx_file_ownership_project ON file_ownership_registry(project_id, file_path);
CREATE INDEX IF NOT EXISTS idx_file_ownership_thread  ON file_ownership_registry(claimed_by_thread_id);

-- Model costs: lookup by model for budget planner
CREATE INDEX IF NOT EXISTS idx_model_costs_model ON model_costs(model_id);

-- Sessions: project lookup
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);

-- Sessions: outcome lookup
CREATE INDEX IF NOT EXISTS idx_sessions_outcome ON sessions(outcome);

-- Plan agents: plan and status lookup
CREATE INDEX IF NOT EXISTS idx_plan_agents_plan ON plan_agents(plan_id, status);
CREATE INDEX IF NOT EXISTS idx_plan_agents_wave ON plan_agents(plan_id, wave);

-- Corrections: plan lookup
CREATE INDEX IF NOT EXISTS idx_corrections_plan ON corrections(plan_id, resolved);

-- Memory candidates: session lookup
CREATE INDEX IF NOT EXISTS idx_memory_candidates_session ON memory_candidates(session_id, status);

-- Knowledge: project and global lookup
CREATE INDEX IF NOT EXISTS idx_knowledge_project ON knowledge_items(project_id, status);

-- Delivery log: detected item lookup
CREATE INDEX IF NOT EXISTS idx_delivery_detected ON delivery_log(detected_item_id);

-- Cron executions: status lookup
CREATE INDEX IF NOT EXISTS idx_cron_exec_status ON cron_executions(status);