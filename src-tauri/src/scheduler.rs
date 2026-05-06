use chrono::{DateTime, Datelike, Duration, Timelike, Utc};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ============================================================================
// Data Structures
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CronJob {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub project_id: Option<String>,
    pub schedule: String,
    pub task_template: String,
    pub wave_preset: Option<String>,
    pub auto_approve: bool,
    pub escalation_policy: String,
    pub notification_channels: Option<String>,
    pub max_correction_retries: i64,
    pub enabled: bool,
    pub last_run_at: Option<String>,
    pub next_run_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CronJobInput {
    pub name: String,
    pub description: Option<String>,
    pub project_id: Option<String>,
    pub schedule: String,
    pub task_template: String,
    pub wave_preset: Option<String>,
    pub auto_approve: Option<bool>,
    pub escalation_policy: Option<String>,
    pub notification_channels: Option<String>,
    pub max_correction_retries: Option<i64>,
    pub enabled: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CronExecution {
    pub id: String,
    pub cron_job_id: String,
    pub plan_id: Option<String>,
    pub status: String,
    pub escalation_reason: Option<String>,
    pub escalation_source: Option<String>,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub notified_at: Option<String>,
}

// ============================================================================
// Cron Expression Parser
// ============================================================================

fn matches_field(value: i64, field: &str, min: i64, _max: i64) -> bool {
    if field == "*" {
        return true;
    }
    for part in field.split(',') {
        let part = part.trim();
        if let Some(step_str) = part.strip_prefix("*/") {
            if let Ok(step) = step_str.parse::<i64>() {
                if step > 0 && (value - min) % step == 0 {
                    return true;
                }
            }
        } else if let Some(dash_pos) = part.find('-') {
            let start_str = &part[..dash_pos];
            let end_str = &part[dash_pos + 1..];
            if let (Ok(start), Ok(end)) = (start_str.parse::<i64>(), end_str.parse::<i64>()) {
                if value >= start && value <= end {
                    return true;
                }
            }
        } else if let Ok(spec) = part.parse::<i64>() {
            if spec == value {
                return true;
            }
        }
    }
    false
}

fn parse_cron_parts(expr: &str) -> Option<[String; 5]> {
    let parts: Vec<&str> = expr.split_whitespace().collect();
    if parts.len() != 5 {
        return None;
    }
    Some([
        parts[0].to_string(),
        parts[1].to_string(),
        parts[2].to_string(),
        parts[3].to_string(),
        parts[4].to_string(),
    ])
}

fn compute_next_run(expr: &str, from: DateTime<Utc>) -> Option<DateTime<Utc>> {
    let parts = parse_cron_parts(expr)?;

    let mut current = from + Duration::minutes(1);
    current = current
        .with_second(0)
        .and_then(|t| t.with_nanosecond(0))
        .unwrap_or(current);

    for _ in 0..1_051_200 {
        let minute = current.minute() as i64;
        let hour = current.hour() as i64;
        let dom = current.day() as i64;
        let month = current.month() as i64;
        let dow = current.weekday().num_days_from_sunday() as i64;

        if matches_field(minute, &parts[0], 0, 59)
            && matches_field(hour, &parts[1], 0, 23)
            && matches_field(dom, &parts[2], 1, 31)
            && matches_field(month, &parts[3], 1, 12)
            && matches_field(dow, &parts[4], 0, 7)
        {
            return Some(current);
        }
        current = current + Duration::minutes(1);
    }
    None
}

pub fn compute_next_runs(expr: &str, from: DateTime<Utc>, count: i64) -> Vec<String> {
    let mut results = Vec::new();
    let mut cursor = from;
    for _ in 0..count {
        match compute_next_run(expr, cursor) {
            Some(next) => {
                results.push(next.to_rfc3339());
                cursor = next;
            }
            None => break,
        }
    }
    results
}

// ============================================================================
// Template Expansion
// ============================================================================

pub fn expand_template(
    template: &str,
    triggered_at: &str,
    project_name: &str,
    session_id: &str,
) -> String {
    template
        .replace("{{triggered_at}}", triggered_at)
        .replace("{{project_name}}", project_name)
        .replace("{{session_id}}", session_id)
}

// ============================================================================
// Escalation Policy Parsing
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EscalationPolicy {
    pub max_retries: Option<i64>,
    pub retry_delay_minutes: Option<i64>,
    pub notify_on_escalation: Option<bool>,
    pub escalation_channels: Option<Vec<String>>,
}

pub fn parse_escalation_policy(json: &str) -> Result<EscalationPolicy, String> {
    if json.is_empty() || json == "{}" {
        return Ok(EscalationPolicy {
            max_retries: Some(3),
            retry_delay_minutes: Some(30),
            notify_on_escalation: Some(true),
            escalation_channels: Some(vec!["slack".to_string(), "email".to_string()]),
        });
    }
    serde_json::from_str(json).map_err(|e| format!("Failed to parse escalation policy: {}", e))
}

// ============================================================================
// DB Helpers
// ============================================================================

fn row_to_cron_job(row: &rusqlite::Row) -> rusqlite::Result<CronJob> {
    Ok(CronJob {
        id: row.get("id")?,
        name: row.get("name")?,
        description: row.get("description")?,
        project_id: row.get("project_id")?,
        schedule: row.get("schedule")?,
        task_template: row.get("task_template")?,
        wave_preset: row.get("wave_preset")?,
        auto_approve: row.get("auto_approve")?,
        escalation_policy: row.get("escalation_policy")?,
        notification_channels: row.get("notification_channels")?,
        max_correction_retries: row.get("max_correction_retries")?,
        enabled: row.get("enabled")?,
        last_run_at: row.get("last_run_at")?,
        next_run_at: row.get("next_run_at")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

fn row_to_cron_execution(row: &rusqlite::Row) -> rusqlite::Result<CronExecution> {
    Ok(CronExecution {
        id: row.get("id")?,
        cron_job_id: row.get("cron_job_id")?,
        plan_id: row.get("plan_id")?,
        status: row.get("status")?,
        escalation_reason: row.get("escalation_reason")?,
        escalation_source: row.get("escalation_source")?,
        started_at: row.get("started_at")?,
        completed_at: row.get("completed_at")?,
        notified_at: row.get("notified_at")?,
    })
}

fn get_cron_job_by_id(db: &Connection, id: &str) -> Result<CronJob, String> {
    db.query_row(
        "SELECT id, name, description, project_id, schedule, task_template, wave_preset, \
         auto_approve, escalation_policy, notification_channels, max_correction_retries, \
         enabled, last_run_at, next_run_at, created_at, updated_at \
         FROM cron_jobs WHERE id = ?1",
        rusqlite::params![id],
        row_to_cron_job,
    )
    .map_err(|e| format!("Cron job not found: {}", e))
}

// ============================================================================
// CRUD Operations
// ============================================================================

pub fn create_cron_job(db: &Connection, input: &CronJobInput) -> Result<CronJob, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let auto_approve = input.auto_approve.unwrap_or(true);
    let escalation_policy = input
        .escalation_policy
        .clone()
        .unwrap_or_else(|| serde_json::json!({"max_retries": 3, "retry_delay_minutes": 30, "notify_on_escalation": true, "escalation_channels": ["slack", "email"]}).to_string());
    let max_correction_retries = input.max_correction_retries.unwrap_or(3);
    let enabled = input.enabled.unwrap_or(true);

    let next_run_at = compute_next_run(&input.schedule, Utc::now()).map(|dt| dt.to_rfc3339());

    db.execute(
        "INSERT INTO cron_jobs (id, name, description, project_id, schedule, task_template, \
         wave_preset, auto_approve, escalation_policy, notification_channels, \
         max_correction_retries, enabled, next_run_at, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        rusqlite::params![
            id,
            input.name,
            input.description,
            input.project_id,
            input.schedule,
            input.task_template,
            input.wave_preset,
            auto_approve,
            escalation_policy,
            input.notification_channels,
            max_correction_retries,
            enabled,
            next_run_at,
            now,
            now,
        ],
    )
    .map_err(|e| e.to_string())?;

    get_cron_job_by_id(db, &id)
}

pub fn get_cron_jobs(
    db: &Connection,
    project_id: Option<&str>,
    enabled_only: bool,
) -> Result<Vec<CronJob>, String> {
    let query = if enabled_only {
        if let Some(pid) = project_id {
            format!(
                "SELECT id, name, description, project_id, schedule, task_template, wave_preset, \
                 auto_approve, escalation_policy, notification_channels, max_correction_retries, \
                 enabled, last_run_at, next_run_at, created_at, updated_at \
                 FROM cron_jobs WHERE project_id = '{}' AND enabled = 1 \
                 ORDER BY next_run_at ASC",
                pid
            )
        } else {
            "SELECT id, name, description, project_id, schedule, task_template, wave_preset, \
             auto_approve, escalation_policy, notification_channels, max_correction_retries, \
             enabled, last_run_at, next_run_at, created_at, updated_at \
             FROM cron_jobs WHERE enabled = 1 \
             ORDER BY next_run_at ASC"
                .to_string()
        }
    } else if let Some(pid) = project_id {
        format!(
            "SELECT id, name, description, project_id, schedule, task_template, wave_preset, \
             auto_approve, escalation_policy, notification_channels, max_correction_retries, \
             enabled, last_run_at, next_run_at, created_at, updated_at \
             FROM cron_jobs WHERE project_id = '{}' \
             ORDER BY next_run_at ASC",
            pid
        )
    } else {
        "SELECT id, name, description, project_id, schedule, task_template, wave_preset, \
         auto_approve, escalation_policy, notification_channels, max_correction_retries, \
         enabled, last_run_at, next_run_at, created_at, updated_at \
         FROM cron_jobs ORDER BY next_run_at ASC"
            .to_string()
    };

    let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;
    let jobs = stmt
        .query_map([], row_to_cron_job)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(jobs)
}

pub fn update_cron_job(db: &Connection, id: &str, input: &CronJobInput) -> Result<CronJob, String> {
    let current = get_cron_job_by_id(db, id)?;

    let auto_approve = input.auto_approve.unwrap_or(current.auto_approve);
    let escalation_policy = input
        .escalation_policy
        .clone()
        .unwrap_or(current.escalation_policy);
    let notification_channels = input
        .notification_channels
        .clone()
        .or(current.notification_channels);
    let max_correction_retries = input
        .max_correction_retries
        .unwrap_or(current.max_correction_retries);
    let enabled = input.enabled.unwrap_or(current.enabled);
    let description = input.description.clone().or(current.description);
    let project_id = input.project_id.clone().or(current.project_id);
    let wave_preset = input.wave_preset.clone().or(current.wave_preset);

    let schedule_changed = input.schedule != current.schedule;
    let next_run_at = if schedule_changed {
        compute_next_run(&input.schedule, Utc::now()).map(|dt| dt.to_rfc3339())
    } else {
        current.next_run_at.clone()
    };

    let now = Utc::now().to_rfc3339();

    db.execute(
        "UPDATE cron_jobs SET name = ?1, description = ?2, project_id = ?3, schedule = ?4, \
         task_template = ?5, wave_preset = ?6, auto_approve = ?7, escalation_policy = ?8, \
         notification_channels = ?9, max_correction_retries = ?10, enabled = ?11, \
         next_run_at = ?12, updated_at = ?13 WHERE id = ?14",
        rusqlite::params![
            input.name,
            description,
            project_id,
            input.schedule,
            input.task_template,
            wave_preset,
            auto_approve,
            escalation_policy,
            notification_channels,
            max_correction_retries,
            enabled,
            next_run_at,
            now,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;

    get_cron_job_by_id(db, id)
}

pub fn delete_cron_job(db: &Connection, id: &str) -> Result<(), String> {
    let affected = db
        .execute("DELETE FROM cron_jobs WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err(format!("Cron job '{}' not found", id));
    }
    Ok(())
}

pub fn toggle_cron_job(db: &Connection, id: &str, enabled: bool) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    let affected = db
        .execute(
            "UPDATE cron_jobs SET enabled = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![enabled, now, id],
        )
        .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err(format!("Cron job '{}' not found", id));
    }
    Ok(())
}

pub fn evaluate_schedule(db: &Connection, id: &str, count: i64) -> Result<Vec<String>, String> {
    let job = get_cron_job_by_id(db, id)?;
    Ok(compute_next_runs(&job.schedule, Utc::now(), count))
}

// ============================================================================
// Cron Execution Operations
// ============================================================================

pub fn get_cron_executions(
    db: &Connection,
    job_id: Option<&str>,
    status: Option<&str>,
) -> Result<Vec<CronExecution>, String> {
    let mut conditions = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(jid) = job_id {
        conditions.push(format!("cron_job_id = ?{}", params.len() + 1));
        params.push(Box::new(jid.to_string()));
    }
    if let Some(st) = status {
        conditions.push(format!("status = ?{}", params.len() + 1));
        params.push(Box::new(st.to_string()));
    }

    let query = if conditions.is_empty() {
        "SELECT id, cron_job_id, plan_id, status, escalation_reason, escalation_source, \
         started_at, completed_at, notified_at \
         FROM cron_executions ORDER BY started_at DESC"
            .to_string()
    } else {
        format!(
            "SELECT id, cron_job_id, plan_id, status, escalation_reason, escalation_source, \
             started_at, completed_at, notified_at \
             FROM cron_executions WHERE {} ORDER BY started_at DESC",
            conditions.join(" AND ")
        )
    };

    let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let executions = stmt
        .query_map(param_refs.as_slice(), row_to_cron_execution)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(executions)
}

pub fn record_cron_execution(
    db: &Connection,
    job_id: &str,
    plan_id: Option<&str>,
) -> Result<CronExecution, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let now_dt = Utc::now();

    let job = get_cron_job_by_id(db, job_id)?;
    let next_run_at = compute_next_run(&job.schedule, now_dt).map(|dt| dt.to_rfc3339());

    db.execute(
        "INSERT INTO cron_executions (id, cron_job_id, plan_id, status, started_at) \
         VALUES (?1, ?2, ?3, 'running', ?4)",
        rusqlite::params![id, job_id, plan_id, now],
    )
    .map_err(|e| e.to_string())?;

    db.execute(
        "UPDATE cron_jobs SET last_run_at = ?1, next_run_at = ?2, updated_at = ?3 WHERE id = ?4",
        rusqlite::params![now, next_run_at, now, job_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(CronExecution {
        id,
        cron_job_id: job_id.to_string(),
        plan_id: plan_id.map(|s| s.to_string()),
        status: "running".to_string(),
        escalation_reason: None,
        escalation_source: None,
        started_at: now,
        completed_at: None,
        notified_at: None,
    })
}

pub fn update_cron_execution(
    db: &Connection,
    id: &str,
    status: &str,
    completed: bool,
    escalation_reason: Option<&str>,
    escalation_source: Option<&str>,
) -> Result<(), String> {
    let completed_at = if completed {
        Some(Utc::now().to_rfc3339())
    } else {
        None
    };

    db.execute(
        "UPDATE cron_executions SET status = ?1, completed_at = ?2, \
         escalation_reason = ?3, escalation_source = ?4 WHERE id = ?5",
        rusqlite::params![status, completed_at, escalation_reason, escalation_source, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn test_matches_field_star() {
        assert!(matches_field(5, "*", 0, 59));
        assert!(matches_field(59, "*", 0, 59));
    }

    #[test]
    fn test_matches_field_specific() {
        assert!(matches_field(9, "9", 0, 23));
        assert!(!matches_field(10, "9", 0, 23));
    }

    #[test]
    fn test_matches_field_range() {
        assert!(matches_field(3, "1-5", 0, 7));
        assert!(!matches_field(0, "1-5", 0, 7));
        assert!(matches_field(5, "1-5", 0, 7));
    }

    #[test]
    fn test_matches_field_step() {
        assert!(matches_field(0, "*/4", 0, 23));
        assert!(matches_field(4, "*/4", 0, 23));
        assert!(matches_field(8, "*/4", 0, 23));
        assert!(!matches_field(9, "*/4", 0, 23));
    }

    #[test]
    fn test_compute_next_run_daily_9am() {
        let from = Utc.with_ymd_and_hms(2026, 5, 3, 8, 0, 0).unwrap();
        let next = compute_next_run("0 9 * * *", from);
        assert!(next.is_some());
        let next = next.unwrap();
        assert_eq!(next.hour(), 9);
        assert_eq!(next.minute(), 0);
        assert_eq!(next.day(), 3);
    }

    #[test]
    fn test_compute_next_run_weekdays() {
        let from = Utc.with_ymd_and_hms(2026, 5, 4, 8, 0, 0).unwrap(); // Monday
        let next = compute_next_run("0 9 * * 1-5", from);
        assert!(next.is_some());
        let next = next.unwrap();
        assert!(next.weekday().num_days_from_monday() < 5);
        assert_eq!(next.hour(), 9);
    }

    #[test]
    fn test_compute_next_run_every_4_hours() {
        let from = Utc.with_ymd_and_hms(2026, 5, 3, 7, 0, 0).unwrap();
        let next = compute_next_run("0 */4 * * *", from);
        assert!(next.is_some());
        let next = next.unwrap();
        assert_eq!(next.minute(), 0);
        assert_eq!(next.hour(), 8);
    }

    #[test]
    fn test_parse_cron_parts_valid() {
        let parts = parse_cron_parts("0 9 * * 1-5");
        assert!(parts.is_some());
        let parts = parts.unwrap();
        assert_eq!(parts[0], "0");
        assert_eq!(parts[1], "9");
        assert_eq!(parts[2], "*");
        assert_eq!(parts[3], "*");
        assert_eq!(parts[4], "1-5");
    }

    #[test]
    fn test_parse_cron_parts_invalid() {
        assert!(parse_cron_parts("invalid").is_none());
        assert!(parse_cron_parts("0 9 * *").is_none());
    }

    #[test]
    fn test_expand_template() {
        let result = expand_template(
            "Task at {{triggered_at}} for {{project_name}} (session {{session_id}})",
            "2026-05-03T09:00:00Z",
            "my-project",
            "abc-123",
        );
        assert!(result.contains("2026-05-03T09:00:00Z"));
        assert!(result.contains("my-project"));
        assert!(result.contains("abc-123"));
        assert!(!result.contains("{{"));
    }

    #[test]
    fn test_parse_escalation_policy_default() {
        let policy = parse_escalation_policy("{}").unwrap();
        assert_eq!(policy.max_retries, Some(3));
    }

    #[test]
    fn test_parse_escalation_policy_custom() {
        let json = r#"{"max_retries": 5, "retry_delay_minutes": 15}"#;
        let policy = parse_escalation_policy(json).unwrap();
        assert_eq!(policy.max_retries, Some(5));
        assert_eq!(policy.retry_delay_minutes, Some(15));
    }
}
