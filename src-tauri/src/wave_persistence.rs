// src-tauri/src/wave_persistence.rs
//
// Session Persistence / Crash Recovery
// Saves wave state to disk and can resume from checkpoints.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaveState {
    pub wave_id: String,
    pub agents: Vec<AgentState>,
    pub status: String,
    pub checkpoint: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentState {
    pub agent_id: String,
    pub worktree: String,
    pub status: String,
    pub session_id: Option<String>,
    pub cost_usd: f64,
}

fn get_wave_state_path(wave_id: &str) -> PathBuf {
    let data_dir = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("sourceforge")
        .join("waves");
    fs::create_dir_all(&data_dir).ok();
    data_dir.join(format!("{}.json", wave_id))
}

pub fn save_wave_state(state: &WaveState) -> Result<(), String> {
    let path = get_wave_state_path(&state.wave_id);
    let json = serde_json::to_string_pretty(state)
        .map_err(|e| format!("Failed to serialize: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write: {}", e))?;
    Ok(())
}

pub fn load_wave_state(wave_id: &str) -> Result<WaveState, String> {
    let path = get_wave_state_path(wave_id);
    if !path.exists() {
        return Err(format!("Wave state not found: {}", wave_id));
    }
    let json = fs::read_to_string(&path).map_err(|e| format!("Failed to read: {}", e))?;
    serde_json::from_str(&json).map_err(|e| format!("Failed to deserialize: {}", e))
}

pub fn resume_wave(wave_id: &str) -> Result<WaveState, String> {
    let state = load_wave_state(wave_id)?;
    // TODO: Actually resume the wave (spawn agents, etc.)
    Ok(state)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wave_state_can_serialize() {
        let state = WaveState {
            wave_id: "test-123".to_string(),
            agents: vec![],
            status: "running".to_string(),
            checkpoint: Utc::now(),
        };
        let json = serde_json::to_string(&state);
        assert!(json.is_ok());
    }

    #[test]
    fn test_wave_state_can_deserialize() {
        let json = r#"{"wave_id":"test-123","agents":[],"status":"running","checkpoint":"2026-06-15T12:00:00Z"}"#;
        let state: Result<WaveState, _> = serde_json::from_str(json);
        assert!(state.is_ok());
    }

    #[test]
    fn test_save_wave_state() {
        let state = WaveState {
            wave_id: "test-save".to_string(),
            agents: vec![],
            status: "running".to_string(),
            checkpoint: Utc::now(),
        };
        let result = save_wave_state(&state);
        assert!(result.is_ok());
    }

    #[test]
    fn test_load_wave_state() {
        let state = WaveState {
            wave_id: "test-load".to_string(),
            agents: vec![],
            status: "running".to_string(),
            checkpoint: Utc::now(),
        };
        save_wave_state(&state).unwrap();
        let loaded = load_wave_state("test-load");
        assert!(loaded.is_ok());
        assert_eq!(loaded.unwrap().wave_id, "test-load");
    }

    #[test]
    fn test_load_nonexistent_wave() {
        let result = load_wave_state("nonexistent-wave-xyz");
        assert!(result.is_err());
    }

    #[test]
    fn test_resume_wave_loads_state() {
        let state = WaveState {
            wave_id: "resume-test".to_string(),
            agents: vec![AgentState {
                agent_id: "agent-1".to_string(),
                worktree: "/tmp/wt1".to_string(),
                status: "running".to_string(),
                session_id: None,
                cost_usd: 0.0,
            }],
            status: "running".to_string(),
            checkpoint: Utc::now(),
        };
        save_wave_state(&state).unwrap();

        let result = resume_wave("resume-test");
        assert!(result.is_ok());
        assert_eq!(result.unwrap().agents.len(), 1);
    }
}
