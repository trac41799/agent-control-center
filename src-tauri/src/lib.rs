mod acb;
mod assets;
mod budget;
mod commands;
mod control;
mod db;
mod events;
mod integrations;
mod intelligence;
mod knowledge;
mod orchestrator;
mod playbook;
mod pty;
mod routing;
mod scheduler;
mod skillbridge;
mod backward_channel;

use commands::AppState;
use log::info;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            let conn = db::init_db(app).expect("Failed to initialize database");
            let app_state = AppState::new(conn);
            app.manage(app_state);
            info!("Agent Control Center starting...");
            let window = app.get_webview_window("main").unwrap();
            window.set_title("Agent Control Center").unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::spawn_agent,
            commands::kill_agent,
            commands::write_to_agent,
            commands::list_agents,
            commands::get_agent_output,
            commands::log_event,
            commands::log_event_with_payload,
            commands::get_events,
            commands::get_event_detail,
            commands::check_skillbridge,
            // Assets (Phase 2)
            commands::scan_skills,
            commands::read_skill,
            commands::scan_memory,
            commands::write_memory,
            commands::list_mcps,
            commands::toggle_mcp,
            commands::store_secret,
            commands::list_secrets,
            commands::get_secret_value,
            commands::list_plugins,
            commands::generate_profile,
            // Integrations (Phase 7)
            commands::get_supabase_configs,
            commands::save_supabase_config,
            commands::toggle_supabase_feature,
            commands::detect_supabase,
            commands::get_github_configs,
            commands::save_github_config,
            commands::toggle_github_feature,
            commands::detect_github_repo_cmd,
            commands::check_repo_visibility_cmd,
            commands::list_github_issues_cmd,
            commands::check_migration_safety_cmd,
            commands::check_github_actions_cmd,
            // Intelligence (Phase 3)
            commands::record_outcome_cmd,
            commands::get_outcome_stats_cmd,
            commands::create_failure_analysis_cmd,
            commands::get_failure_analyses_cmd,
            commands::detect_limit_event_cmd,
            commands::record_limit_event_cmd,
            commands::resolve_limit_event_cmd,
            commands::get_unresolved_limits_cmd,
            commands::record_token_usage_cmd,
            commands::get_token_usage_stats_cmd,
            commands::run_heartbeat_check_cmd,
            // Phase 4: Routing
            commands::route_task_cmd,
            commands::get_models_cmd,
            commands::add_model_cmd,
            commands::toggle_model_cmd,
            commands::build_handoff_cmd,
            commands::check_agent_version_cmd,
            // Phase 5: Wave Orchestrator
            commands::create_wave_plan_cmd,
            commands::add_plan_agent_cmd,
            commands::get_plan_agents_cmd,
            commands::update_plan_agent_status_cmd,
            commands::generate_guideline_cmd,
            commands::validate_handoff_schema_cmd,
            commands::create_correction_cmd,
            commands::get_corrections_cmd,
            // Phase 5+: ACB
            commands::parse_acb_signal_cmd,
            commands::record_acb_signal_cmd,
            commands::get_open_signals_cmd,
            commands::resolve_signal_cmd,
            // Phase 6: Team Layer
            commands::detect_memory_candidate_cmd,
            commands::create_memory_candidate_cmd,
            commands::get_memory_candidates_cmd,
            commands::build_playbook_manifest_cmd,
            commands::build_feature_doc_prompt_cmd,
            // Subagent Orchestration
            commands::decide_orchestration_path_cmd,
            commands::detect_subagent_spawn_cmd,
            commands::get_subagent_patterns_cmd,
            commands::detect_subagent_activity_cmd,
            commands::record_subagent_token_usage_cmd,
            commands::generate_orchestrator_guideline_cmd,
            // Phase 9+: Autonomous Scheduler
            commands::create_cron_job_cmd,
            commands::get_cron_jobs_cmd,
            commands::update_cron_job_cmd,
            commands::delete_cron_job_cmd,
            commands::toggle_cron_job_cmd,
            commands::evaluate_cron_schedule_cmd,
            commands::get_cron_executions_cmd,
            commands::record_cron_execution_cmd,
            commands::update_cron_execution_cmd,
            // Phase 9: Knowledge Layer
            commands::create_knowledge_item_cmd,
            commands::get_knowledge_items_cmd,
            commands::update_knowledge_item_cmd,
            commands::delete_knowledge_item_cmd,
            commands::compound_knowledge_cmd,
            commands::add_knowledge_relation_cmd,
            commands::get_knowledge_relations_cmd,
            commands::search_knowledge_cmd,
            commands::get_knowledge_stats_cmd,
            // Phase 9++: Token Budget System
            commands::create_budget_cmd,
            commands::get_budgets_cmd,
            commands::update_budget_usage_cmd,
            commands::capture_wip_cmd,
            commands::resume_budget_cmd,
            commands::create_resumption_plan_cmd,
            commands::get_resumption_plan_cmd,
            commands::get_cost_breakdown_cmd,
            commands::check_budget_thresholds_cmd,
            // Phase 10+: Control Sessions & Cost Aggregation
            commands::claim_file_cmd,
            commands::release_file_cmd,
            commands::release_all_for_thread_cmd,
            commands::get_owned_files_cmd,
            commands::get_project_locks_cmd,
            commands::detect_conflicts_cmd,
            commands::get_cost_summary_cmd,
            // Backward Channel (Phase 8: Chat → Local LLM)
            commands::get_chat_platform_configs_cmd,
            commands::save_chat_platform_config_cmd,
            commands::delete_chat_platform_config_cmd,
            commands::toggle_chat_platform_config_cmd,
            commands::start_backward_channel_daemon_cmd,
            commands::stop_backward_channel_daemon_cmd,
            commands::get_backward_channel_daemon_status_cmd,
            commands::get_backward_channel_daemon_logs_cmd,
            commands::check_backward_channel_queue_health_cmd,
            commands::test_chat_platform_connection_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}