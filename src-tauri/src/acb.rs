use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ACBSignal {
    pub id: String,
    pub session_id: String,
    pub wave: Option<i64>,
    pub from_agent: String,
    pub to_agent: String,
    pub signal_type: String,
    pub priority: String,
    pub body: String,
    pub ref_id: Option<String>,
    pub status: String,
    pub created_at: String,
    pub resolved_at: Option<String>,
}

pub fn parse_acb_signal(line: &str) -> Option<ACBSignal> {
    if !line.contains("[ACC:") {
        return None;
    }

    let start = line.find("[ACC:")?;
    let end = line[start..].find(']')?;
    let signal_str = &line[start..start + end + 1];

    let mut type_val = "";
    let mut from_val = "";
    let mut to_val = "ALL";
    let mut priority_val = "INFO";

    let inner = &signal_str[5..signal_str.len() - 1];
    for part in inner.split_whitespace() {
        if let Some((key, value)) = part.split_once('=') {
            match key {
                "from" => from_val = value,
                "to" => to_val = value,
                "priority" => priority_val = value,
                _ => {}
            }
        } else if !part.is_empty() && !part.contains('=') {
            type_val = part;
        }
    }

    let body_start = start + end + 1;
    let body = line[body_start..].trim().to_string();

    Some(ACBSignal {
        id: Uuid::new_v4().to_string(),
        session_id: String::new(),
        wave: None,
        from_agent: from_val.to_string(),
        to_agent: to_val.to_string(),
        signal_type: type_val.to_string(),
        priority: priority_val.to_string(),
        body,
        ref_id: None,
        status: "OPEN".to_string(),
        created_at: Utc::now().to_rfc3339(),
        resolved_at: None,
    })
}

pub fn record_acb_signal(db: &Connection, signal: &ACBSignal) -> Result<(), String> {
    db.execute(
        "INSERT INTO agent_messages (id, session_id, wave, from_agent, to_agent, type, priority, body, ref_id, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'OPEN', ?10)",
        rusqlite::params![signal.id, signal.session_id, signal.wave, signal.from_agent, signal.to_agent, signal.signal_type, signal.priority, signal.body, signal.ref_id, signal.created_at],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_open_signals(db: &Connection, session_id: Option<&str>) -> Result<Vec<ACBSignal>, String> {
    let query = if let Some(sid) = session_id {
        format!("SELECT id, session_id, wave, from_agent, to_agent, type, priority, body, ref_id, status, created_at, resolved_at FROM agent_messages WHERE status = 'OPEN' AND session_id = '{}' ORDER BY created_at DESC", sid)
    } else {
        "SELECT id, session_id, wave, from_agent, to_agent, type, priority, body, ref_id, status, created_at, resolved_at FROM agent_messages WHERE status = 'OPEN' ORDER BY created_at DESC".to_string()
    };
    let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;
    let signals = stmt.query_map([], |row| {
        Ok(ACBSignal {
            id: row.get(0)?, session_id: row.get(1)?, wave: row.get(2)?, from_agent: row.get(3)?,
            to_agent: row.get(4)?, signal_type: row.get(5)?, priority: row.get(6)?, body: row.get(7)?,
            ref_id: row.get(8)?, status: row.get(9)?, created_at: row.get(10)?, resolved_at: row.get(11)?,
        })
    }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(signals)
}

pub fn resolve_signal(db: &Connection, signal_id: &str) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    db.execute(
        "UPDATE agent_messages SET status = 'RESOLVED', resolved_at = ?1 WHERE id = ?2",
        rusqlite::params![now, signal_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
