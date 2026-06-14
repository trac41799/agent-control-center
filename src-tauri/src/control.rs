use chrono::Utc;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::path::{Path, PathBuf};

// ============================================================================
// Data Structures
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileOwnership {
    pub id: String,
    pub project_id: String,
    pub file_path: String,
    pub claimed_by_thread_id: String,
    pub claimed_at: String,
    pub released_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreadSession {
    pub thread_id: String,
    pub project_id: String,
    pub agent_id: String,
    pub wave: i64,
    pub status: String,
    pub started_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictReport {
    pub file_path: String,
    pub claimed_by: String,
    pub requested_by: String,
    pub severity: String,
}

// ============================================================================
// File Ownership Registry
// ============================================================================

pub fn claim_file(
    db: &Connection,
    project_id: &str,
    file_path: &str,
    claimed_by_thread_id: &str,
) -> Result<FileOwnership, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let existing = db.query_row(
        "SELECT id FROM file_ownership_registry WHERE project_id = ?1 AND file_path = ?2 AND released_at IS NULL",
        rusqlite::params![project_id, file_path],
        |row| row.get::<_, String>(0),
    );

    if let Ok(existing_id) = existing {
        return Err(format!("FILE_CONFLICT: {} already claimed by entry {}", file_path, existing_id));
    }

    db.execute(
        "INSERT INTO file_ownership_registry (id, project_id, file_path, claimed_by_thread_id, claimed_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, project_id, file_path, claimed_by_thread_id, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(FileOwnership {
        id,
        project_id: project_id.to_string(),
        file_path: file_path.to_string(),
        claimed_by_thread_id: claimed_by_thread_id.to_string(),
        claimed_at: now,
        released_at: None,
    })
}

pub fn release_file(
    db: &Connection,
    project_id: &str,
    file_path: &str,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    db.execute(
        "UPDATE file_ownership_registry SET released_at = ?1 WHERE project_id = ?2 AND file_path = ?3 AND released_at IS NULL",
        rusqlite::params![now, project_id, file_path],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn release_all_for_thread(
    db: &Connection,
    thread_id: &str,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    db.execute(
        "UPDATE file_ownership_registry SET released_at = ?1 WHERE claimed_by_thread_id = ?2 AND released_at IS NULL",
        rusqlite::params![now, thread_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_owned_files(
    db: &Connection,
    thread_id: &str,
) -> Result<Vec<FileOwnership>, String> {
    let mut stmt = db
        .prepare(
            "SELECT id, project_id, file_path, claimed_by_thread_id, claimed_at, released_at
             FROM file_ownership_registry
             WHERE claimed_by_thread_id = ?1 AND released_at IS NULL
             ORDER BY claimed_at",
        )
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_map(rusqlite::params![thread_id], |row| {
            Ok(FileOwnership {
                id: row.get(0)?,
                project_id: row.get(1)?,
                file_path: row.get(2)?,
                claimed_by_thread_id: row.get(3)?,
                claimed_at: row.get(4)?,
                released_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());
    result
}

pub fn get_project_locks(
    db: &Connection,
    project_id: &str,
) -> Result<Vec<FileOwnership>, String> {
    let mut stmt = db
        .prepare(
            "SELECT id, project_id, file_path, claimed_by_thread_id, claimed_at, released_at
             FROM file_ownership_registry
             WHERE project_id = ?1 AND released_at IS NULL
             ORDER BY file_path",
        )
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_map(rusqlite::params![project_id], |row| {
            Ok(FileOwnership {
                id: row.get(0)?,
                project_id: row.get(1)?,
                file_path: row.get(2)?,
                claimed_by_thread_id: row.get(3)?,
                claimed_at: row.get(4)?,
                released_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());
    result
}

pub fn detect_conflicts(
    db: &Connection,
    project_id: &str,
    file_paths: &[String],
    requesting_thread: &str,
) -> Result<Vec<ConflictReport>, String> {
    let mut conflicts = Vec::new();

    for fp in file_paths {
        let existing: Result<String, _> = db.query_row(
            "SELECT claimed_by_thread_id FROM file_ownership_registry
             WHERE project_id = ?1 AND file_path = ?2 AND released_at IS NULL",
            rusqlite::params![project_id, fp],
            |row| row.get(0),
        );

        if let Ok(owner) = existing {
            if owner != requesting_thread {
                conflicts.push(ConflictReport {
                    file_path: fp.clone(),
                    claimed_by: owner,
                    requested_by: requesting_thread.to_string(),
                    severity: "WARNING".to_string(),
                });
            }
        }
    }

    Ok(conflicts)
}

// ============================================================================
// Cost Aggregation (Phase 10+ extension)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostSummary {
    pub total_tokens_in: i64,
    pub total_tokens_out: i64,
    pub total_tokens: i64,
    pub estimated_total_cost_usd: f64,
    pub by_model: Vec<ModelCostSummary>,
    pub by_project: Vec<ProjectCostSummary>,
    pub by_session: Vec<SessionCostSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelCostSummary {
    pub model: String,
    pub tokens_in: i64,
    pub tokens_out: i64,
    pub sessions: i64,
    pub estimated_cost_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectCostSummary {
    pub project_id: String,
    pub project_name: Option<String>,
    pub tokens_in: i64,
    pub tokens_out: i64,
    pub sessions: i64,
    pub estimated_cost_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionCostSummary {
    pub session_id: String,
    pub agent_id: Option<String>,
    pub task_type: Option<String>,
    pub tokens_in: i64,
    pub tokens_out: i64,
    pub estimated_cost_usd: f64,
    pub started_at: Option<String>,
}

pub fn get_cost_summary(
    db: &Connection,
    project_id: Option<&str>,
) -> Result<CostSummary, String> {
    // Totals
    let total_query = if let Some(pid) = project_id {
        format!(
            "SELECT COALESCE(SUM(tu.tokens_in), 0), COALESCE(SUM(tu.tokens_out), 0),
                    COALESCE(SUM(tu.tokens_in * COALESCE(mc.cost_per_1k_input, 0) / 1000.0), 0)
                    + COALESCE(SUM(tu.tokens_out * COALESCE(mc.cost_per_1k_output, 0) / 1000.0), 0)
             FROM token_usage tu
             LEFT JOIN model_costs mc ON tu.model = mc.model_id
             INNER JOIN sessions s ON tu.session_id = s.id
             WHERE s.project_id = '{}'",
            pid
        )
    } else {
        "SELECT COALESCE(SUM(tu.tokens_in), 0), COALESCE(SUM(tu.tokens_out), 0),
                COALESCE(SUM(tu.tokens_in * COALESCE(mc.cost_per_1k_input, 0) / 1000.0), 0)
                + COALESCE(SUM(tu.tokens_out * COALESCE(mc.cost_per_1k_output, 0) / 1000.0), 0)
         FROM token_usage tu
         LEFT JOIN model_costs mc ON tu.model = mc.model_id"
            .to_string()
    };

    let (total_in, total_out, total_cost): (f64, f64, f64) = db
        .query_row(&total_query, [], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })
        .map_err(|e| e.to_string())?;

    // By model
    let by_model = get_model_cost_summary(db, project_id)?;

    // By project
    let by_project = get_project_cost_summary(db)?;

    // By session
    let by_session = get_session_cost_summary(db, project_id)?;

    Ok(CostSummary {
        total_tokens_in: total_in as i64,
        total_tokens_out: total_out as i64,
        total_tokens: (total_in + total_out) as i64,
        estimated_total_cost_usd: total_cost,
        by_model,
        by_project,
        by_session,
    })
}

fn get_model_cost_summary(
    db: &Connection,
    project_id: Option<&str>,
) -> Result<Vec<ModelCostSummary>, String> {
    let query = if let Some(pid) = project_id {
        format!(
            "SELECT COALESCE(tu.model, 'unknown'),
                    COALESCE(SUM(tu.tokens_in), 0), COALESCE(SUM(tu.tokens_out), 0),
                    COUNT(DISTINCT tu.session_id),
                    COALESCE(SUM(tu.tokens_in * COALESCE(mc.cost_per_1k_input, 0) / 1000.0), 0)
                    + COALESCE(SUM(tu.tokens_out * COALESCE(mc.cost_per_1k_output, 0) / 1000.0), 0)
             FROM token_usage tu
             LEFT JOIN model_costs mc ON tu.model = mc.model_id
             INNER JOIN sessions s ON tu.session_id = s.id
             WHERE s.project_id = '{}'
             GROUP BY tu.model
             ORDER BY SUM(tu.tokens_in + tu.tokens_out) DESC",
            pid
        )
    } else {
        "SELECT COALESCE(tu.model, 'unknown'),
                COALESCE(SUM(tu.tokens_in), 0), COALESCE(SUM(tu.tokens_out), 0),
                COUNT(DISTINCT tu.session_id),
                COALESCE(SUM(tu.tokens_in * COALESCE(mc.cost_per_1k_input, 0) / 1000.0), 0)
                + COALESCE(SUM(tu.tokens_out * COALESCE(mc.cost_per_1k_output, 0) / 1000.0), 0)
         FROM token_usage tu
         LEFT JOIN model_costs mc ON tu.model = mc.model_id
         GROUP BY tu.model
         ORDER BY SUM(tu.tokens_in + tu.tokens_out) DESC"
            .to_string()
    };

    let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;
    let result = stmt
        .query_map([], |row| {
            Ok(ModelCostSummary {
                model: row.get(0)?,
                tokens_in: row.get(1)?,
                tokens_out: row.get(2)?,
                sessions: row.get(3)?,
                estimated_cost_usd: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());
    result
}

fn get_project_cost_summary(
    db: &Connection,
) -> Result<Vec<ProjectCostSummary>, String> {
    let query = "SELECT s.project_id, p.name,
                        COALESCE(SUM(tu.tokens_in), 0), COALESCE(SUM(tu.tokens_out), 0),
                        COUNT(DISTINCT s.id),
                        COALESCE(SUM(tu.tokens_in * COALESCE(mc.cost_per_1k_input, 0) / 1000.0), 0)
                        + COALESCE(SUM(tu.tokens_out * COALESCE(mc.cost_per_1k_output, 0) / 1000.0), 0)
                 FROM token_usage tu
                 INNER JOIN sessions s ON tu.session_id = s.id
                 LEFT JOIN projects p ON s.project_id = p.id
                 LEFT JOIN model_costs mc ON tu.model = mc.model_id
                 GROUP BY s.project_id
                 ORDER BY SUM(tu.tokens_in + tu.tokens_out) DESC";

    let mut stmt = db.prepare(query).map_err(|e| e.to_string())?;
    let result = stmt
        .query_map([], |row| {
            Ok(ProjectCostSummary {
                project_id: row.get(0)?,
                project_name: row.get(1)?,
                tokens_in: row.get(2)?,
                tokens_out: row.get(3)?,
                sessions: row.get(4)?,
                estimated_cost_usd: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());
    result
}

fn get_session_cost_summary(
    db: &Connection,
    project_id: Option<&str>,
) -> Result<Vec<SessionCostSummary>, String> {
    let query = if let Some(pid) = project_id {
        format!(
            "SELECT tu.session_id, s.agent_id, s.task_type,
                    COALESCE(SUM(tu.tokens_in), 0), COALESCE(SUM(tu.tokens_out), 0),
                    COALESCE(SUM(tu.tokens_in * COALESCE(mc.cost_per_1k_input, 0) / 1000.0), 0)
                    + COALESCE(SUM(tu.tokens_out * COALESCE(mc.cost_per_1k_output, 0) / 1000.0), 0),
                    s.started_at
             FROM token_usage tu
             LEFT JOIN model_costs mc ON tu.model = mc.model_id
             INNER JOIN sessions s ON tu.session_id = s.id
             WHERE s.project_id = '{}'
             GROUP BY tu.session_id
             ORDER BY s.started_at DESC
             LIMIT 50",
            pid
        )
    } else {
        "SELECT tu.session_id, s.agent_id, s.task_type,
                COALESCE(SUM(tu.tokens_in), 0), COALESCE(SUM(tu.tokens_out), 0),
                COALESCE(SUM(tu.tokens_in * COALESCE(mc.cost_per_1k_input, 0) / 1000.0), 0)
                + COALESCE(SUM(tu.tokens_out * COALESCE(mc.cost_per_1k_output, 0) / 1000.0), 0),
                s.started_at
         FROM token_usage tu
         LEFT JOIN model_costs mc ON tu.model = mc.model_id
         INNER JOIN sessions s ON tu.session_id = s.id
         GROUP BY tu.session_id
         ORDER BY s.started_at DESC
         LIMIT 50"
            .to_string()
    };

    let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;
    let result = stmt
        .query_map([], |row| {
            Ok(SessionCostSummary {
                session_id: row.get(0)?,
                agent_id: row.get(1)?,
                task_type: row.get(2)?,
                tokens_in: row.get(3)?,
                tokens_out: row.get(4)?,
                estimated_cost_usd: row.get(5)?,
                started_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string());
    result
}

// === W5.F: Control Session State Machine ===

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ControlState {
    Promoted,
    Active,
    Paused,
    Completed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ControlSession {
    pub id: String,
    pub thread_id: String,
    pub plan_id: Option<String>,
    pub panel_id: String,
    pub state: ControlState,
    pub docs_dir: String,
    pub claimed_files: Vec<String>,
    pub started_at: String,
    pub paused_at: Option<String>,
    pub completed_at: Option<String>,
}

pub fn promote_to_control(
    db: &Connection,
    thread_id: &str,
    panel_id: &str,
    plan_id: Option<&str>,
) -> Result<ControlSession, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let date_slug = now.split('T').next().unwrap_or("2026-01-01");
    let docs_dir = format!("docs/{thread_id}/{date_slug}/");

    db.execute(
        "INSERT INTO control_sessions (id, thread_id, plan_id, panel_id, state, docs_dir, started_at)
         VALUES (?1, ?2, ?3, ?4, 'promoted', ?5, ?6)",
        rusqlite::params![id, thread_id, plan_id, panel_id, docs_dir, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(ControlSession {
        id,
        thread_id: thread_id.to_string(),
        plan_id: plan_id.map(String::from),
        panel_id: panel_id.to_string(),
        state: ControlState::Promoted,
        docs_dir,
        claimed_files: Vec::new(),
        started_at: now,
        paused_at: None,
        completed_at: None,
    })
}

pub fn set_control_state(
    db: &Connection,
    session_id: &str,
    new_state: ControlState,
) -> Result<(), String> {
    let state_str = match new_state {
        ControlState::Promoted => "promoted",
        ControlState::Active => "active",
        ControlState::Paused => "paused",
        ControlState::Completed => "completed",
    };
    let now = Utc::now().to_rfc3339();
    db.execute(
        "UPDATE control_sessions
         SET state = ?1,
             paused_at = CASE WHEN ?1 = 'paused' THEN ?2 ELSE paused_at END,
             completed_at = CASE WHEN ?1 = 'completed' THEN ?2 ELSE completed_at END
         WHERE id = ?3",
        rusqlite::params![state_str, now, session_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_control_sessions(
    db: &Connection,
    thread_id: Option<&str>,
) -> Result<Vec<ControlSession>, String> {
    let mut sql = String::from(
        "SELECT id, thread_id, plan_id, panel_id, state, docs_dir, started_at, paused_at, completed_at
         FROM control_sessions",
    );
    if thread_id.is_some() {
        sql.push_str(" WHERE thread_id = ?1");
    }
    sql.push_str(" ORDER BY started_at DESC");

    let mut stmt = db.prepare(&sql).map_err(|e| e.to_string())?;
    let mapper = |row: &rusqlite::Row<'_>| -> rusqlite::Result<ControlSession> {
        let state_str: String = row.get(4)?;
        let state = match state_str.as_str() {
            "promoted" => ControlState::Promoted,
            "active" => ControlState::Active,
            "paused" => ControlState::Paused,
            "completed" => ControlState::Completed,
            _ => ControlState::Promoted,
        };
        Ok(ControlSession {
            id: row.get(0)?,
            thread_id: row.get(1)?,
            plan_id: row.get(2)?,
            panel_id: row.get(3)?,
            state,
            docs_dir: row.get(5)?,
            claimed_files: Vec::new(),
            started_at: row.get(6)?,
            paused_at: row.get(7)?,
            completed_at: row.get(8)?,
        })
    };

    let sessions = if let Some(tid) = thread_id {
        stmt.query_map(rusqlite::params![tid], mapper)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect()
    } else {
        stmt.query_map([], mapper)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect()
    };
    Ok(sessions)
}

pub fn ensure_thread_docs_dir(
    project_path: &Path,
    thread_id: &str,
) -> Result<PathBuf, String> {
    let date_slug = Utc::now().format("%Y-%m-%d").to_string();
    let dir = project_path.join("docs").join(thread_id).join(date_slug);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

pub async fn start_thread_handoff_watcher(
    db: std::sync::Arc<tokio::sync::Mutex<Connection>>,
    project_path: PathBuf,
    thread_id: String,
) -> Result<(), String> {
    let watch_path = project_path.join("docs").join(&thread_id);
    if !watch_path.exists() {
        std::fs::create_dir_all(&watch_path).map_err(|e| e.to_string())?;
    }
    let project_id = String::new();
    crate::orchestrator::start_handoff_watcher(db, watch_path, project_id).await
}

pub fn detect_cross_thread_conflicts(
    db: &Connection,
) -> Result<Vec<String>, String> {
    let mut stmt = db
        .prepare(
            "SELECT file_path,
                    COUNT(DISTINCT claimed_by_thread_id) AS thread_count,
                    GROUP_CONCAT(DISTINCT claimed_by_thread_id) AS threads
             FROM file_ownership_registry
             WHERE released_at IS NULL
             GROUP BY file_path
             HAVING thread_count > 1",
        )
        .map_err(|e| e.to_string())?;
    let conflicts: Vec<String> = stmt
        .query_map([], |row| {
            let path: String = row.get(0)?;
            let threads: String = row.get(2)?;
            Ok(format!("{path} claimed by threads: {threads}"))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(conflicts)
}
