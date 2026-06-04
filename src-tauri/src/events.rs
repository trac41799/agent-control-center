use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use tauri::AppHandle;
use uuid::Uuid;

static APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();

pub fn set_app_handle(handle: AppHandle) {
    let _ = APP_HANDLE.set(handle);
}

pub fn with_app_handle<F, R>(f: F) -> R
where
    F: FnOnce(&AppHandle) -> R,
{
    let handle = APP_HANDLE.get().expect("AppHandle not initialized");
    f(handle)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventRecord {
    pub id: String,
    pub session_id: String,
    pub timestamp: String,
    pub agent_id: Option<String>,
    pub event_type: String,
    pub target: Option<String>,
    pub lines_added: Option<i64>,
    pub lines_removed: Option<i64>,
    pub exit_code: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSummary {
    pub session_id: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub event_count: i64,
    pub agents: String,
    pub outcome: Option<String>,
}

pub fn log_event(
    db: &Connection,
    session_id: &str,
    agent_id: &str,
    event_type: &str,
    target: Option<&str>,
    lines_added: Option<i64>,
    lines_removed: Option<i64>,
    exit_code: Option<i64>,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let timestamp = chrono::Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO events (id, session_id, timestamp, agent_id, event_type, target, lines_added, lines_removed, exit_code)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        (
            &id,
            session_id,
            &timestamp,
            agent_id,
            event_type,
            target,
            lines_added,
            lines_removed,
            exit_code,
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(id)
}

pub fn log_event_with_payload(
    db: &Connection,
    session_id: &str,
    agent_id: &str,
    event_type: &str,
    target: Option<&str>,
    detail: &str,
) -> Result<String, String> {
    let event_id = log_event(db, session_id, agent_id, event_type, target, None, None, None)?;

    db.execute(
        "INSERT INTO event_payloads (event_id, detail) VALUES (?1, ?2)",
        (&event_id, detail),
    )
    .map_err(|e| e.to_string())?;

    Ok(event_id)
}

pub fn get_session_events(
    db: &Connection,
    session_id: &str,
) -> Result<Vec<EventRecord>, String> {
    let mut stmt = db
        .prepare(
            "SELECT id, session_id, timestamp, agent_id, event_type, target, lines_added, lines_removed, exit_code
             FROM events
             WHERE session_id = ?1
             ORDER BY timestamp ASC",
        )
        .map_err(|e| e.to_string())?;

    let events = stmt
        .query_map([session_id], |row| {
            Ok(EventRecord {
                id: row.get(0)?,
                session_id: row.get(1)?,
                timestamp: row.get(2)?,
                agent_id: row.get(3)?,
                event_type: row.get(4)?,
                target: row.get(5)?,
                lines_added: row.get(6)?,
                lines_removed: row.get(7)?,
                exit_code: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(events)
}

pub fn get_session_event_detail(
    db: &Connection,
    event_id: &str,
) -> Result<Option<String>, String> {
    let mut stmt = db
        .prepare("SELECT detail FROM event_payloads WHERE event_id = ?1")
        .map_err(|e| e.to_string())?;

    let detail = stmt
        .query_row([event_id], |row| row.get(0))
        .ok();

    Ok(detail)
}

pub fn get_all_sessions(
    db: &Connection,
) -> Result<Vec<SessionSummary>, String> {
    let mut stmt = db
        .prepare(
            "SELECT
                e.session_id,
                MIN(e.timestamp) AS started_at,
                MAX(e.timestamp) AS ended_at,
                COUNT(*) AS event_count,
                GROUP_CONCAT(DISTINCT e.agent_id) AS agents,
                s.outcome
             FROM events e
             LEFT JOIN sessions s ON s.id = e.session_id
             GROUP BY e.session_id
             ORDER BY started_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let sessions = stmt
        .query_map([], |row| {
            Ok(SessionSummary {
                session_id: row.get(0)?,
                started_at: row.get(1)?,
                ended_at: row.get(2)?,
                event_count: row.get(3)?,
                agents: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                outcome: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(sessions)
}