use chrono::Utc;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

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
