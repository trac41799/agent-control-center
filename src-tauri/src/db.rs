use crate::backward_channel;
use rusqlite::{Connection, Result};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

pub fn get_db_path(app: &tauri::App) -> PathBuf {
    let app_data_dir = app.path().app_data_dir().expect("Failed to get app data directory");
    fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");
    app_data_dir.join("acc.db")
}

pub fn init_db(app: &tauri::App) -> Result<Connection> {
    let db_path = get_db_path(app);
    
    let conn = Connection::open(&db_path)?;
    
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    conn.execute_batch("PRAGMA synchronous=NORMAL;")?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;
    conn.execute_batch("PRAGMA cache_size=-32000;")?;
    conn.execute_batch("PRAGMA temp_store=MEMORY;")?;
    
    let migrations = include_str!("../migrations/001_init.sql");
    conn.execute_batch(migrations)?;
    
    let migration2 = include_str!("../migrations/002_assets.sql");
    conn.execute_batch(migration2)?;

    let migration3 = include_str!("../migrations/003_integrations.sql");
    conn.execute_batch(migration3)?;

    backward_channel::init_backward_channel_tables(&conn)
        .map_err(|e| rusqlite::Error::InvalidParameterName(format!("Migration 004 failed: {}", e)))?;
    
    Ok(conn)
}

pub fn init_db_path(db_path: &PathBuf) -> Result<Connection> {
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).expect("Failed to create database directory");
    }
    
    let conn = Connection::open(db_path)?;
    
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    conn.execute_batch("PRAGMA synchronous=NORMAL;")?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;
    conn.execute_batch("PRAGMA cache_size=-32000;")?;
    conn.execute_batch("PRAGMA temp_store=MEMORY;")?;
    
    let migrations = include_str!("../migrations/001_init.sql");
    conn.execute_batch(migrations)?;
    
    let migration2 = include_str!("../migrations/002_assets.sql");
    conn.execute_batch(migration2)?;

    let migration3 = include_str!("../migrations/003_integrations.sql");
    conn.execute_batch(migration3)?;

    backward_channel::init_backward_channel_tables(&conn)
        .map_err(|e| rusqlite::Error::InvalidParameterName(format!("Migration 004 failed: {}", e)))?;
    
    Ok(conn)
}