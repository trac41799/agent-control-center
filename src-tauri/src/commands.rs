use crate::acb;
use crate::backward_channel;
use crate::assets;
use crate::budget;
use crate::control;
use crate::events::{self, EventRecord};
use crate::integrations;
use crate::intelligence;
use crate::knowledge;
use crate::orchestrator;
use crate::playbook;
use crate::pty::{AgentProcessInfo, PtyManager};
use crate::routing;
use crate::scheduler;
use crate::skillbridge::{detect_skillbridge, SkillBridgeInfo};
use chrono::Utc;
use rusqlite::Connection;
use std::collections::HashMap;
use std::fs;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::State;

pub struct AppState {
    pub pty_manager: Arc<PtyManager>,
    pub db: Mutex<Connection>,
}

impl Default for AppState {
    fn default() -> Self {
        Self::new(Connection::open(":memory:").unwrap())
    }
}

impl AppState {
    pub fn new(db: Connection) -> Self {
        Self {
            pty_manager: Arc::new(PtyManager::new()),
            db: Mutex::new(db),
        }
    }
}

#[tauri::command]
pub async fn spawn_agent(
    agent_id: String,
    project_path: String,
    command: String,
    args: Vec<String>,
    env_vars: HashMap<String, String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    state
        .pty_manager
        .spawn_process(agent_id, project_path, command, args, env_vars)
        .await
}

#[tauri::command]
pub async fn kill_agent(
    agent_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.pty_manager.kill_process(&agent_id).await
}

#[tauri::command]
pub async fn write_to_agent(
    agent_id: String,
    text: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.pty_manager.write_to_process(&agent_id, &text).await
}

#[tauri::command]
pub async fn list_agents(
    state: State<'_, AppState>,
) -> Result<Vec<AgentProcessInfo>, String> {
    Ok(state.pty_manager.list_processes().await)
}

#[tauri::command]
pub async fn get_agent_output(
    agent_id: String,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    let recv = state.pty_manager.get_output_receiver(&agent_id).await?;
    Ok(match recv {
        Some(_) => Some(agent_id),
        None => None,
    })
}

#[tauri::command]
pub async fn log_event(
    state: State<'_, AppState>,
    session_id: String,
    agent_id: String,
    event_type: String,
    target: Option<String>,
    lines_added: Option<i64>,
    lines_removed: Option<i64>,
    exit_code: Option<i64>,
) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    events::log_event(
        &db,
        &session_id,
        &agent_id,
        &event_type,
        target.as_deref(),
        lines_added,
        lines_removed,
        exit_code,
    )
}

#[tauri::command]
pub async fn log_event_with_payload(
    state: State<'_, AppState>,
    session_id: String,
    agent_id: String,
    event_type: String,
    target: Option<String>,
    detail: String,
) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    events::log_event_with_payload(
        &db,
        &session_id,
        &agent_id,
        &event_type,
        target.as_deref(),
        &detail,
    )
}

#[tauri::command]
pub async fn get_events(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<Vec<EventRecord>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    events::get_session_events(&db, &session_id)
}

#[tauri::command]
pub async fn get_event_detail(
    state: State<'_, AppState>,
    event_id: String,
) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    events::get_session_event_detail(&db, &event_id)
}

#[tauri::command]
pub async fn check_skillbridge() -> Result<SkillBridgeInfo, String> {
    Ok(detect_skillbridge())
}

// Integrations - Supabase
#[tauri::command]
pub async fn get_supabase_configs(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<Vec<integrations::SupabaseConfig>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    integrations::get_supabase_configs(&db, &project_id)
}

#[tauri::command]
pub async fn save_supabase_config(
    state: State<'_, AppState>,
    config: integrations::SupabaseConfig,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    integrations::save_supabase_config(&db, &config)
}

#[tauri::command]
pub async fn toggle_supabase_feature(
    state: State<'_, AppState>,
    config_id: String,
    feature: String,
    enabled: bool,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    integrations::toggle_supabase_feature(&db, &config_id, &feature, enabled)
}

#[tauri::command]
pub async fn detect_supabase(project_path: String) -> Result<Option<String>, String> {
    Ok(integrations::detect_supabase_project(&project_path))
}

// Integrations - GitHub
#[tauri::command]
pub async fn get_github_configs(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<Vec<integrations::GitHubConfig>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    integrations::get_github_configs(&db, &project_id)
}

#[tauri::command]
pub async fn save_github_config(
    state: State<'_, AppState>,
    config: integrations::GitHubConfig,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    integrations::save_github_config(&db, &config)
}

#[tauri::command]
pub async fn toggle_github_feature(
    state: State<'_, AppState>,
    config_id: String,
    feature: String,
    enabled: bool,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    integrations::toggle_github_feature(&db, &config_id, &feature, enabled)
}

#[tauri::command]
pub async fn detect_github_repo_cmd(project_path: String) -> Result<Option<(String, String, String)>, String> {
    Ok(integrations::detect_github_repo(&project_path))
}

#[tauri::command]
pub async fn check_repo_visibility_cmd(owner: String, repo: String) -> Result<String, String> {
    integrations::check_repo_visibility(&owner, &repo)
}

#[tauri::command]
pub async fn list_github_issues_cmd(owner: String, repo: String, state: String) -> Result<Vec<integrations::GitHubIssue>, String> {
    integrations::list_github_issues(&owner, &repo, &state)
}

#[tauri::command]
pub async fn check_migration_safety_cmd(project_path: String) -> Result<Vec<String>, String> {
    integrations::check_migration_safety(&project_path)
}

#[tauri::command]
pub async fn check_github_actions_cmd(project_path: String) -> Result<Vec<String>, String> {
    integrations::check_github_actions(&project_path)
}

#[tauri::command]
pub async fn scan_skills(path: String) -> Result<Vec<assets::SkillEntry>, String> {
    Ok(assets::scan_skills_directory(&path))
}

#[tauri::command]
pub async fn read_skill(path: String) -> Result<String, String> {
    assets::read_skill_content(&path)
}

#[tauri::command]
pub async fn scan_memory(project_path: String) -> Result<Vec<assets::MemoryFileEntry>, String> {
    Ok(assets::scan_memory_files(&project_path))
}

#[tauri::command]
pub async fn write_memory(path: String, content: String) -> Result<(), String> {
    assets::write_memory_file(&path, &content)
}

#[tauri::command]
pub async fn list_mcps(agent_config_path: String) -> Result<Vec<assets::MCPEntry>, String> {
    Ok(assets::read_mcp_configs(&agent_config_path))
}

#[tauri::command]
pub async fn toggle_mcp(
    agent_config_path: String,
    mcp_name: String,
    enabled: bool,
) -> Result<(), String> {
    assets::toggle_mcp(&agent_config_path, &mcp_name, enabled)
}

#[tauri::command]
pub async fn store_secret(
    state: State<'_, AppState>,
    key_name: String,
    value: String,
    scope: String,
    agent_id: Option<String>,
    project_id: Option<String>,
) -> Result<assets::VaultEntry, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    assets::store_secret(
        &db,
        &key_name,
        &value,
        &scope,
        agent_id.as_deref(),
        project_id.as_deref(),
    )
}

#[tauri::command]
pub async fn list_secrets(state: State<'_, AppState>) -> Result<Vec<assets::VaultEntry>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    assets::list_secrets(&db)
}

#[tauri::command]
pub async fn get_secret_value(
    state: State<'_, AppState>,
    id: String,
) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    assets::get_secret_value(&db, &id)
}

#[tauri::command]
pub async fn list_plugins() -> Result<Vec<String>, String> {
    Ok(assets::list_plugins())
}

#[tauri::command]
pub async fn generate_profile(project_path: String) -> Result<serde_json::Value, String> {
    assets::generate_project_profile(&project_path)
}

// ============================================================================
// Phase 3: Intelligence Layer Commands
// ============================================================================

#[tauri::command]
pub async fn record_outcome_cmd(
    state: State<'_, AppState>,
    session_id: String,
    agent_id: String,
    task_type: String,
    outcome: String,
    duration_s: f64,
) -> Result<intelligence::OutcomeRecord, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    intelligence::record_outcome(&db, &session_id, &agent_id, &task_type, &outcome, duration_s)
}

#[tauri::command]
pub async fn get_outcome_stats_cmd(
    state: State<'_, AppState>,
    project_id: Option<String>,
    agent_id: Option<String>,
) -> Result<Vec<intelligence::OutcomeStats>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    intelligence::get_outcome_stats(&db, project_id.as_deref(), agent_id.as_deref())
}

#[tauri::command]
pub async fn create_failure_analysis_cmd(
    state: State<'_, AppState>,
    session_id: String,
    pty_excerpt: String,
) -> Result<intelligence::FailureAnalysis, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    intelligence::create_failure_analysis(&db, &session_id, &pty_excerpt)
}

#[tauri::command]
pub async fn get_failure_analyses_cmd(
    state: State<'_, AppState>,
    session_id: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<intelligence::FailureAnalysis>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    intelligence::get_failure_analyses(&db, session_id.as_deref(), limit.unwrap_or(20))
}

#[tauri::command]
pub async fn detect_limit_event_cmd(raw_output: String) -> Result<Option<(String, String)>, String> {
    Ok(intelligence::detect_limit_event(&raw_output).map(|(a, b)| (a, b.to_string())))
}

#[tauri::command]
pub async fn record_limit_event_cmd(
    state: State<'_, AppState>,
    session_id: String,
    plan_agent_id: Option<String>,
    event_type: String,
    raw_message: String,
) -> Result<intelligence::LimitEvent, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    intelligence::record_limit_event(&db, &session_id, plan_agent_id.as_deref(), &event_type, &raw_message)
}

#[tauri::command]
pub async fn resolve_limit_event_cmd(
    state: State<'_, AppState>,
    event_id: String,
    resolution: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    intelligence::resolve_limit_event(&db, &event_id, &resolution)
}

#[tauri::command]
pub async fn get_unresolved_limits_cmd(
    state: State<'_, AppState>,
    session_id: Option<String>,
) -> Result<Vec<intelligence::LimitEvent>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    intelligence::get_unresolved_limits(&db, session_id.as_deref())
}

#[tauri::command]
pub async fn record_token_usage_cmd(
    state: State<'_, AppState>,
    session_id: String,
    agent_id: Option<String>,
    context: String,
    model: Option<String>,
    tokens_in: i64,
    tokens_out: i64,
) -> Result<intelligence::TokenUsage, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    intelligence::record_token_usage(&db, &session_id, agent_id.as_deref(), &context, model.as_deref(), tokens_in, tokens_out)
}

#[tauri::command]
pub async fn get_token_usage_stats_cmd(
    state: State<'_, AppState>,
    session_id: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    intelligence::get_token_usage_stats(&db, session_id.as_deref())
}

#[tauri::command]
pub async fn run_heartbeat_check_cmd(
    state: State<'_, AppState>,
    session_id: String,
    last_activity_at: String,
    pid_active: bool,
) -> Result<intelligence::HeartbeatResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    intelligence::run_heartbeat_check(&db, &session_id, &last_activity_at, pid_active)
}

// ============================================================================
// Phase 4: Routing Commands
// ============================================================================

#[tauri::command]
pub async fn route_task_cmd(state: State<'_, AppState>, task_desc: String, task_type: String, project_id: Option<String>) -> Result<Vec<routing::TaskSuggestion>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    routing::route_task(&db, &task_desc, &task_type, project_id.as_deref())
}

#[tauri::command]
pub async fn get_models_cmd(state: State<'_, AppState>) -> Result<Vec<routing::ModelEntry>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    routing::get_models(&db)
}

#[tauri::command]
pub async fn add_model_cmd(state: State<'_, AppState>, entry: routing::ModelEntry) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    routing::add_model(&db, &entry)
}

#[tauri::command]
pub async fn toggle_model_cmd(state: State<'_, AppState>, model_id: String, active: bool) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    routing::toggle_model(&db, &model_id, active)
}

#[tauri::command]
pub async fn build_handoff_cmd(agent_brief: routing::HandoffEnvelope) -> Result<String, String> {
    Ok(routing::build_handoff_envelope(&agent_brief))
}

#[tauri::command]
pub async fn check_agent_version_cmd(agent_id: String) -> Result<routing::AgentVersionInfo, String> {
    routing::check_agent_version(&agent_id)
}

// ============================================================================
// Phase 5: Wave Orchestrator Commands
// ============================================================================

#[tauri::command]
pub async fn create_wave_plan_cmd(state: State<'_, AppState>, project_id: String, slug: String) -> Result<orchestrator::WavePlan, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    orchestrator::create_wave_plan(&db, &project_id, &slug)
}

#[tauri::command]
pub async fn add_plan_agent_cmd(state: State<'_, AppState>, plan_id: String, agent_ref: String, task: String, wave: i64, depends_on: Option<String>, agent_id: Option<String>) -> Result<orchestrator::PlanAgent, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    orchestrator::add_plan_agent(&db, &plan_id, &agent_ref, &task, wave, depends_on.as_deref(), agent_id.as_deref())
}

#[tauri::command]
pub async fn get_plan_agents_cmd(state: State<'_, AppState>, plan_id: String) -> Result<Vec<orchestrator::PlanAgent>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    orchestrator::get_plan_agents(&db, &plan_id)
}

#[tauri::command]
pub async fn update_plan_agent_status_cmd(state: State<'_, AppState>, agent_id: String, status: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    orchestrator::update_plan_agent_status(&db, &agent_id, &status)
}

#[tauri::command]
pub async fn generate_guideline_cmd(agent_ref: String, task: String, objective: String, depends_on: Option<String>, models: Vec<String>, files_to_create: Vec<String>, files_not_touch: Vec<String>) -> Result<String, String> {
    let models_ref: Vec<&str> = models.iter().map(|s| s.as_str()).collect();
    let create_ref: Vec<&str> = files_to_create.iter().map(|s| s.as_str()).collect();
    let notouch_ref: Vec<&str> = files_not_touch.iter().map(|s| s.as_str()).collect();
    Ok(orchestrator::generate_agent_guideline(&agent_ref, &task, &objective, depends_on.as_deref(), &models_ref, &create_ref, &notouch_ref))
}

#[tauri::command]
pub async fn validate_handoff_schema_cmd(content: String) -> Result<(bool, Vec<String>), String> {
    Ok(orchestrator::validate_handoff_schema(&content))
}

#[tauri::command]
pub async fn create_correction_cmd(state: State<'_, AppState>, plan_id: String, agent_ref: String, bug_desc: String, root_cause: String, fix_required: String, test_required: String, retry_number: i64) -> Result<orchestrator::CorrectionDoc, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    orchestrator::create_correction(&db, &plan_id, &agent_ref, &bug_desc, &root_cause, &fix_required, &test_required, retry_number)
}

#[tauri::command]
pub async fn get_corrections_cmd(state: State<'_, AppState>, plan_id: String) -> Result<Vec<orchestrator::CorrectionDoc>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    orchestrator::get_corrections(&db, &plan_id)
}

// ============================================================================
// Phase 5+: ACB Commands
// ============================================================================

#[tauri::command]
pub async fn parse_acb_signal_cmd(line: String) -> Result<Option<acb::ACBSignal>, String> {
    Ok(acb::parse_acb_signal(&line))
}

#[tauri::command]
pub async fn record_acb_signal_cmd(state: State<'_, AppState>, signal: acb::ACBSignal) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    acb::record_acb_signal(&db, &signal)
}

#[tauri::command]
pub async fn get_open_signals_cmd(state: State<'_, AppState>, session_id: Option<String>) -> Result<Vec<acb::ACBSignal>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    acb::get_open_signals(&db, session_id.as_deref())
}

#[tauri::command]
pub async fn resolve_signal_cmd(state: State<'_, AppState>, signal_id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    acb::resolve_signal(&db, &signal_id)
}

// ============================================================================
// Phase 6: Team Layer Commands
// ============================================================================

#[tauri::command]
pub async fn detect_memory_candidate_cmd(output: String) -> Result<Option<String>, String> {
    Ok(playbook::detect_memory_candidate(&output))
}

#[tauri::command]
pub async fn create_memory_candidate_cmd(state: State<'_, AppState>, session_id: String, project_id: String, content: String, source_pattern: Option<String>) -> Result<playbook::MemoryCandidate, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    playbook::create_memory_candidate(&db, &session_id, &project_id, &content, source_pattern.as_deref())
}

#[tauri::command]
pub async fn get_memory_candidates_cmd(state: State<'_, AppState>, session_id: Option<String>, status: Option<String>) -> Result<Vec<playbook::MemoryCandidate>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    playbook::get_memory_candidates(&db, session_id.as_deref(), status.as_deref())
}

#[tauri::command]
pub async fn build_playbook_manifest_cmd(name: String, project: String, stacks: Vec<String>, include_skills: bool, include_memory: bool, include_presets: bool) -> Result<playbook::PlaybookManifest, String> {
    Ok(playbook::build_playbook_manifest(&name, &project, &stacks, include_skills, include_memory, include_presets))
}

#[tauri::command]
pub async fn build_feature_doc_prompt_cmd(doc_type: String, session_id: String, feature_name: String) -> Result<String, String> {
    Ok(playbook::build_feature_doc_prompt(&doc_type, &session_id, &feature_name))
}

// ============================================================================
// Subagent Orchestration commands
// ============================================================================

#[tauri::command]
pub async fn decide_orchestration_path_cmd(
    agent_ref: String,
    task: String,
    supports_subagents: bool,
    subagent_family: String,
    wave_command: String,
    model: String,
    dir: String,
) -> Result<orchestrator::OrchestrationDecision, String> {
    Ok(orchestrator::decide_orchestration_path(&agent_ref, &task, supports_subagents, &subagent_family, &wave_command, &model, &dir))
}

#[tauri::command]
pub async fn detect_subagent_spawn_cmd(
    pty_output: String,
    detection_pattern: String,
    parent_session_id: String,
    agent_ref: String,
) -> Result<Option<orchestrator::SubagentSpawn>, String> {
    Ok(orchestrator::detect_subagent_spawn(&pty_output, &detection_pattern, &parent_session_id, &agent_ref))
}

#[tauri::command]
pub async fn get_subagent_patterns_cmd() -> Result<Vec<intelligence::SubagentDetection>, String> {
    Ok(intelligence::get_subagent_patterns())
}

#[tauri::command]
pub async fn detect_subagent_activity_cmd(pty_output: String, patterns: Vec<String>) -> Result<Vec<String>, String> {
    let pattern_refs: Vec<&str> = patterns.iter().map(|s| s.as_str()).collect();
    Ok(intelligence::detect_subagent_activity(&pty_output, &pattern_refs))
}

#[tauri::command]
pub async fn record_subagent_token_usage_cmd(
    state: State<'_, AppState>,
    session_id: String,
    parent_agent_id: Option<String>,
    subagent_agent_id: Option<String>,
    context: String,
    model: Option<String>,
    tokens_in: i64,
    tokens_out: i64,
) -> Result<intelligence::TokenUsage, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    intelligence::record_subagent_token_usage(&db, &session_id, parent_agent_id.as_deref(), subagent_agent_id.as_deref(), &context, model.as_deref(), tokens_in, tokens_out)
}

#[tauri::command]
pub async fn generate_orchestrator_guideline_cmd(
    agent_ref: String,
    task: String,
    objective: String,
    depends_on: Option<String>,
    supports_subagents: bool,
    subagent_family: String,
    sub_agent_refs: Vec<String>,
    models: Vec<String>,
    files_to_create: Vec<String>,
    files_not_touch: Vec<String>,
) -> Result<String, String> {
    let sa_refs: Vec<&str> = sub_agent_refs.iter().map(|s| s.as_str()).collect();
    let m_refs: Vec<&str> = models.iter().map(|s| s.as_str()).collect();
    let fc_refs: Vec<&str> = files_to_create.iter().map(|s| s.as_str()).collect();
    let fn_refs: Vec<&str> = files_not_touch.iter().map(|s| s.as_str()).collect();
    Ok(orchestrator::generate_orchestrator_guideline(&agent_ref, &task, &objective, depends_on.as_deref(), supports_subagents, &subagent_family, &sa_refs, &m_refs, &fc_refs, &fn_refs))
}

// ============================================================================
// Phase 9+: Autonomous Scheduler Commands
// ============================================================================

#[tauri::command]
pub async fn create_cron_job_cmd(
    state: State<'_, AppState>,
    input: scheduler::CronJobInput,
) -> Result<scheduler::CronJob, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    scheduler::create_cron_job(&db, &input)
}

#[tauri::command]
pub async fn get_cron_jobs_cmd(
    state: State<'_, AppState>,
    project_id: Option<String>,
    enabled_only: Option<bool>,
) -> Result<Vec<scheduler::CronJob>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    scheduler::get_cron_jobs(&db, project_id.as_deref(), enabled_only.unwrap_or(false))
}

#[tauri::command]
pub async fn update_cron_job_cmd(
    state: State<'_, AppState>,
    id: String,
    input: scheduler::CronJobInput,
) -> Result<scheduler::CronJob, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    scheduler::update_cron_job(&db, &id, &input)
}

#[tauri::command]
pub async fn delete_cron_job_cmd(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    scheduler::delete_cron_job(&db, &id)
}

#[tauri::command]
pub async fn toggle_cron_job_cmd(
    state: State<'_, AppState>,
    id: String,
    enabled: bool,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    scheduler::toggle_cron_job(&db, &id, enabled)
}

#[tauri::command]
pub async fn evaluate_cron_schedule_cmd(
    cron_expr: String,
    count: Option<i64>,
) -> Result<Vec<String>, String> {
    let count = count.unwrap_or(5);
    Ok(scheduler::compute_next_runs(&cron_expr, Utc::now(), count))
}

#[tauri::command]
pub async fn get_cron_executions_cmd(
    state: State<'_, AppState>,
    job_id: Option<String>,
    status: Option<String>,
) -> Result<Vec<scheduler::CronExecution>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    scheduler::get_cron_executions(&db, job_id.as_deref(), status.as_deref())
}

#[tauri::command]
pub async fn record_cron_execution_cmd(
    state: State<'_, AppState>,
    job_id: String,
    plan_id: Option<String>,
) -> Result<scheduler::CronExecution, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    scheduler::record_cron_execution(&db, &job_id, plan_id.as_deref())
}

#[tauri::command]
pub async fn update_cron_execution_cmd(
    state: State<'_, AppState>,
    id: String,
    status: String,
    completed: bool,
    escalation_reason: Option<String>,
    escalation_source: Option<String>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    scheduler::update_cron_execution(&db, &id, &status, completed, escalation_reason.as_deref(), escalation_source.as_deref())
}

// ============================================================================
// Phase 9++: Token Budget System Commands
// ============================================================================

#[tauri::command]
pub async fn create_budget_cmd(
    state: State<'_, AppState>,
    input: budget::BudgetInput,
) -> Result<budget::AgentBudget, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    budget::create_budget(&db, &input)
}

#[tauri::command]
pub async fn get_budgets_cmd(
    state: State<'_, AppState>,
    session_id: Option<String>,
    plan_agent_id: Option<String>,
    state_filter: Option<String>,
) -> Result<Vec<budget::AgentBudget>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    budget::get_budgets(
        &db,
        session_id.as_deref(),
        plan_agent_id.as_deref(),
        state_filter.as_deref(),
    )
}

#[tauri::command]
pub async fn update_budget_usage_cmd(
    state: State<'_, AppState>,
    budget_id: String,
    tokens_used: i64,
) -> Result<budget::AgentBudget, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    budget::update_budget_usage(&db, &budget_id, tokens_used)
}

#[tauri::command]
pub async fn capture_wip_cmd(
    state: State<'_, AppState>,
    budget_id: String,
    wip_path: String,
) -> Result<budget::AgentBudget, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    budget::capture_wip(&db, &budget_id, &wip_path)
}

#[tauri::command]
pub async fn resume_budget_cmd(
    state: State<'_, AppState>,
    budget_id: String,
    additional_tokens: i64,
) -> Result<budget::AgentBudget, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    budget::resume_budget(&db, &budget_id, additional_tokens)
}

#[tauri::command]
pub async fn create_resumption_plan_cmd(
    state: State<'_, AppState>,
    wave_id: String,
    pending_task_id: Option<String>,
    plan_path: String,
    agents_completed: Vec<String>,
    agents_wipd: Vec<String>,
    agents_pending: Vec<String>,
    estimated_remaining_tokens: Option<i64>,
) -> Result<budget::WaveResumptionPlan, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    budget::create_resumption_plan(
        &db,
        &wave_id,
        pending_task_id.as_deref(),
        &plan_path,
        &agents_completed,
        &agents_wipd,
        &agents_pending,
        estimated_remaining_tokens,
    )
}

#[tauri::command]
pub async fn get_resumption_plan_cmd(
    state: State<'_, AppState>,
    wave_id: String,
) -> Result<Option<budget::WaveResumptionPlan>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    budget::get_resumption_plan(&db, &wave_id)
}

#[tauri::command]
pub async fn get_cost_breakdown_cmd(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<Vec<budget::CostBreakdown>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    budget::get_cost_breakdown(&db, &session_id)
}

#[tauri::command]
pub async fn check_budget_thresholds_cmd(
    state: State<'_, AppState>,
) -> Result<Vec<budget::AgentBudget>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    budget::check_budget_thresholds(&db)
}

// ============================================================================
// Phase 9: Knowledge Layer Commands
// ============================================================================

#[tauri::command]
pub async fn create_knowledge_item_cmd(
    state: State<'_, AppState>,
    item: knowledge::KnowledgeItemInput,
) -> Result<knowledge::KnowledgeItem, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    knowledge::create_knowledge_item(&db, &item)
}

#[tauri::command]
pub async fn get_knowledge_items_cmd(
    state: State<'_, AppState>,
    q: Option<String>,
    stack: Option<String>,
    agent: Option<String>,
    project_id: Option<String>,
    r#type: Option<String>,
    status: Option<String>,
    min_confidence: Option<f64>,
    is_global: Option<bool>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<knowledge::KnowledgeItem>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let query = knowledge::KnowledgeQuery {
        q,
        stack,
        agent,
        project_id,
        r#type,
        status,
        min_confidence,
        is_global,
        limit,
        offset,
    };
    knowledge::get_knowledge_items(&db, &query)
}

#[tauri::command]
pub async fn update_knowledge_item_cmd(
    state: State<'_, AppState>,
    id: String,
    updates: knowledge::KnowledgeItemUpdate,
) -> Result<knowledge::KnowledgeItem, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    knowledge::update_knowledge_item(&db, &id, &updates)
}

#[tauri::command]
pub async fn delete_knowledge_item_cmd(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    knowledge::delete_knowledge_item(&db, &id)
}

#[tauri::command]
pub async fn compound_knowledge_cmd(
    state: State<'_, AppState>,
    project_id: Option<String>,
) -> Result<Vec<knowledge::KnowledgeItem>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    knowledge::compound_knowledge(&db, project_id.as_deref())
}

#[tauri::command]
pub async fn add_knowledge_relation_cmd(
    state: State<'_, AppState>,
    from_id: String,
    to_id: String,
    relation_type: String,
) -> Result<knowledge::KnowledgeRelation, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    knowledge::add_knowledge_relation(&db, &from_id, &to_id, &relation_type)
}

#[tauri::command]
pub async fn get_knowledge_relations_cmd(
    state: State<'_, AppState>,
    from_id: String,
) -> Result<Vec<knowledge::KnowledgeRelation>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    knowledge::get_knowledge_relations(&db, &from_id)
}

#[tauri::command]
pub async fn search_knowledge_cmd(
    state: State<'_, AppState>,
    q: String,
    limit: Option<i64>,
) -> Result<Vec<knowledge::KnowledgeItem>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    knowledge::search_knowledge(&db, &q, limit.unwrap_or(50))
}

#[tauri::command]
pub async fn get_knowledge_stats_cmd(
    state: State<'_, AppState>,
    project_id: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    knowledge::get_knowledge_stats(&db, project_id.as_deref())
}

// ============================================================================
// Phase 10+: Control Sessions & Cost Aggregation
// ============================================================================

#[tauri::command]
pub async fn claim_file_cmd(
    state: State<'_, AppState>,
    project_id: String,
    file_path: String,
    claimed_by_thread_id: String,
) -> Result<control::FileOwnership, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    control::claim_file(&db, &project_id, &file_path, &claimed_by_thread_id)
}

#[tauri::command]
pub async fn release_file_cmd(
    state: State<'_, AppState>,
    project_id: String,
    file_path: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    control::release_file(&db, &project_id, &file_path)
}

#[tauri::command]
pub async fn release_all_for_thread_cmd(
    state: State<'_, AppState>,
    thread_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    control::release_all_for_thread(&db, &thread_id)
}

#[tauri::command]
pub async fn get_owned_files_cmd(
    state: State<'_, AppState>,
    thread_id: String,
) -> Result<Vec<control::FileOwnership>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    control::get_owned_files(&db, &thread_id)
}

#[tauri::command]
pub async fn get_project_locks_cmd(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<Vec<control::FileOwnership>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    control::get_project_locks(&db, &project_id)
}

#[tauri::command]
pub async fn detect_conflicts_cmd(
    state: State<'_, AppState>,
    project_id: String,
    file_paths: Vec<String>,
    requesting_thread: String,
) -> Result<Vec<control::ConflictReport>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    control::detect_conflicts(&db, &project_id, &file_paths, &requesting_thread)
}

#[tauri::command]
pub async fn get_cost_summary_cmd(
    state: State<'_, AppState>,
    project_id: Option<String>,
) -> Result<control::CostSummary, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    control::get_cost_summary(&db, project_id.as_deref())
}

// ============================================================================
// Backward Channel Commands (Phase 8: Chat → Local LLM)
// ============================================================================

#[tauri::command]
pub async fn get_chat_platform_configs_cmd(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<Vec<backward_channel::ChatPlatformConfig>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    backward_channel::get_chat_platform_configs(&db, &project_id)
}

#[tauri::command]
pub async fn save_chat_platform_config_cmd(
    state: State<'_, AppState>,
    config: backward_channel::ChatPlatformConfig,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    backward_channel::save_chat_platform_config(&db, &config)
}

#[tauri::command]
pub async fn delete_chat_platform_config_cmd(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    backward_channel::delete_chat_platform_config(&db, &id)
}

#[tauri::command]
pub async fn toggle_chat_platform_config_cmd(
    state: State<'_, AppState>,
    id: String,
    enabled: bool,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    backward_channel::toggle_chat_platform_config(&db, &id, enabled)
}

#[tauri::command]
pub async fn start_backward_channel_daemon_cmd(
    config_path: Option<String>,
) -> Result<String, String> {
    let path = config_path.unwrap_or_else(|| "./agent_registry.yaml".to_string());
    let child = Command::new("python3")
        .arg("local-daemon/main.py")
        .arg("--config")
        .arg(&path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start daemon: {}", e))?;

    let pid = child.id();
    fs::write("/tmp/acc-backward-daemon.pid", pid.to_string())
        .map_err(|e| format!("Failed to write PID file: {}", e))?;

    Ok(format!("Daemon started with PID {}", pid))
}

#[tauri::command]
pub async fn stop_backward_channel_daemon_cmd() -> Result<(), String> {
    let pid_str = fs::read_to_string("/tmp/acc-backward-daemon.pid")
        .map_err(|_| "Daemon not running (no PID file)".to_string())?;
    let pid: u32 = pid_str.trim().parse()
        .map_err(|_| "Invalid PID file".to_string())?;

    #[cfg(unix)]
    {
        unsafe { libc::kill(pid as i32, libc::SIGTERM); }
    }
    #[cfg(not(unix))]
    {
        Command::new("taskkill").args(["/PID", &pid.to_string()]).spawn()
            .map_err(|e| format!("Failed to kill: {}", e))?;
    }

    fs::remove_file("/tmp/acc-backward-daemon.pid").ok();
    Ok(())
}

#[tauri::command]
pub async fn get_backward_channel_daemon_status_cmd() -> Result<serde_json::Value, String> {
    let pid_str = match fs::read_to_string("/tmp/acc-backward-daemon.pid") {
        Ok(s) => s,
        Err(_) => return Ok(serde_json::json!({
            "running": false, "pid": null, "uptime_s": null,
            "queue_depth": 0, "active_platforms": [],
            "last_event_at": null, "error": null
        })),
    };

    let pid: i32 = pid_str.trim().parse().unwrap_or(0);

    #[cfg(unix)]
    let running = unsafe { libc::kill(pid, 0) == 0 };
    #[cfg(not(unix))]
    let running = true;

    Ok(serde_json::json!({
        "running": running,
        "pid": if running { Some(pid) } else { None::<i32> },
        "uptime_s": null,
        "queue_depth": 0,
        "active_platforms": [],
        "last_event_at": null,
        "error": if !running { Some("Process not running") } else { None::<&str> }
    }))
}

#[tauri::command]
pub async fn get_backward_channel_daemon_logs_cmd(
    lines: Option<i64>,
) -> Result<Vec<String>, String> {
    let n = lines.unwrap_or(50) as usize;
    match fs::read_to_string("/tmp/acc-backward-daemon.log") {
        Ok(log) => {
            let all: Vec<&str> = log.lines().collect();
            let start = if all.len() > n { all.len() - n } else { 0 };
            Ok(all[start..].iter().map(|s| s.to_string()).collect())
        }
        Err(_) => Ok(vec!["No log file found".to_string()]),
    }
}

#[tauri::command]
pub async fn check_backward_channel_queue_health_cmd() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "provider": "upstash",
        "connected": false,
        "queue_depth": 0,
        "latency_ms": null
    }))
}

#[tauri::command]
pub async fn test_chat_platform_connection_cmd(
    platform: String,
    config: HashMap<String, String>,
) -> Result<bool, String> {
    match platform.as_str() {
        "lark" => Ok(config.contains_key("app_id") && config.contains_key("app_secret")),
        "slack" => Ok(config.contains_key("signing_secret") && config.contains_key("bot_token")),
        "discord" => Ok(config.contains_key("public_key") && config.contains_key("bot_token")),
        "telegram" => Ok(config.contains_key("bot_token")),
        _ => Err(format!("Unknown platform: {}", platform)),
    }
}