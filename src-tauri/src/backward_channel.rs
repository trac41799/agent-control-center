use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatPlatformConfig {
    pub id: String,
    pub project_id: String,
    pub platform: String,
    pub routing_key: String,
    pub enabled: bool,
    pub webhook_url: String,
    pub credentials: HashMap<String, String>,
    pub queue_provider: String,
    pub queue_config: HashMap<String, String>,
    pub reply_mode: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

pub fn init_backward_channel_tables(db: &Connection) -> Result<(), String> {
    db.execute_batch(include_str!("../migrations/004_backward_channel.sql"))
        .map_err(|e| format!("Failed to init backward channel tables: {}", e))
}

pub fn get_chat_platform_configs(
    db: &Connection,
    project_id: &str,
) -> Result<Vec<ChatPlatformConfig>, String> {
    let mut stmt = db
        .prepare(
            "SELECT id, project_id, platform, routing_key, enabled, webhook_url, \
             credentials, queue_provider, queue_config, reply_mode, status, \
             created_at, updated_at FROM chat_platform_configs WHERE project_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let configs = stmt
        .query_map(rusqlite::params![project_id], |row| {
            let creds_str: String = row.get(6)?;
            let credentials: HashMap<String, String> =
                serde_json::from_str(&creds_str).unwrap_or_default();
            let qc_str: String = row.get(8)?;
            let queue_config: HashMap<String, String> =
                serde_json::from_str(&qc_str).unwrap_or_default();
            Ok(ChatPlatformConfig {
                id: row.get(0)?,
                project_id: row.get(1)?,
                platform: row.get(2)?,
                routing_key: row.get(3)?,
                enabled: row.get(4)?,
                webhook_url: row.get(5)?,
                credentials,
                queue_provider: row.get(7)?,
                queue_config,
                reply_mode: row.get(9)?,
                status: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for cfg in configs {
        result.push(cfg.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn save_chat_platform_config(
    db: &Connection,
    config: &ChatPlatformConfig,
) -> Result<(), String> {
    let creds_json =
        serde_json::to_string(&config.credentials).map_err(|e| e.to_string())?;
    let qc_json =
        serde_json::to_string(&config.queue_config).map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR REPLACE INTO chat_platform_configs \
         (id, project_id, platform, routing_key, enabled, webhook_url, credentials, \
          queue_provider, queue_config, reply_mode, status, created_at, updated_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, datetime('now'))",
        rusqlite::params![
            config.id,
            config.project_id,
            config.platform,
            config.routing_key,
            config.enabled,
            config.webhook_url,
            creds_json,
            config.queue_provider,
            qc_json,
            config.reply_mode,
            config.status,
            config.created_at,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_chat_platform_config(db: &Connection, id: &str) -> Result<(), String> {
    db.execute(
        "DELETE FROM chat_platform_configs WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn toggle_chat_platform_config(
    db: &Connection,
    id: &str,
    enabled: bool,
) -> Result<(), String> {
    db.execute(
        "UPDATE chat_platform_configs SET enabled = ?1, updated_at = datetime('now') WHERE id = ?2",
        rusqlite::params![enabled, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
