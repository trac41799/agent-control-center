// src-tauri/src/agent_adapters/opencode.rs
//
// OpenCode CLI Adapter
// Implements AgentAdapter for the OpenCode CLI tool.

use super::{AgentAdapter, AgentSession};
use chrono::Utc;
use std::process::Command;

pub struct OpenCodeAdapter {
    binary_path: String,
}

impl OpenCodeAdapter {
    pub fn new() -> Self {
        Self {
            binary_path: "opencode".to_string(),
        }
    }

    pub fn with_binary(path: String) -> Self {
        Self { binary_path: path }
    }
}

impl AgentAdapter for OpenCodeAdapter {
    fn name(&self) -> &str {
        "opencode"
    }

    fn version(&self) -> &str {
        let output = Command::new(&self.binary_path)
            .arg("--version")
            .output();

        match output {
            Ok(o) if o.status.success() => {
                let version = String::from_utf8_lossy(&o.stdout);
                // Leak the string to get a 'static reference
                // This is acceptable because version strings are typically small and long-lived
                Box::leak(version.trim().to_string().into_boxed_str())
            }
            _ => "unknown",
        }
    }

    fn spawn(&self, _task: &str, _worktree: &str) -> Result<AgentSession, String> {
        // TODO: Implement actual spawn with opencode CLI
        // This requires:
        // 1. Running opencode with the task and worktree
        // 2. Capturing the session ID
        // 3. Returning an AgentSession
        Err("OpenCode spawn not yet implemented - requires CLI integration".to_string())
    }

    fn kill(&self, _session: &AgentSession) -> Result<(), String> {
        // TODO: Implement kill
        // This requires:
        // 1. Finding the opencode process by session ID
        // 2. Sending a kill signal
        Ok(())
    }

    fn stream_output(&self, _session: &AgentSession) -> Result<Vec<String>, String> {
        // TODO: Implement streaming
        // This requires:
        // 1. Attaching to the opencode process output
        // 2. Streaming lines as they arrive
        Ok(vec![])
    }

    fn parse_cost(&self, output: &str) -> Option<f64> {
        // OpenCode outputs cost in JSON format
        // Try both formats: {"cost_usd": 0.123} and {"usage": {"cost": 0.456}}
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(output) {
            if let Some(c) = v.get("cost_usd").and_then(|x| x.as_f64()) {
                return Some(c);
            }
            if let Some(c) = v.get("usage").and_then(|u| u.get("cost")).and_then(|x| x.as_f64()) {
                return Some(c);
            }
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_opencode_adapter_name() {
        let adapter = OpenCodeAdapter::new();
        assert_eq!(adapter.name(), "opencode");
    }

    #[test]
    fn test_opencode_adapter_version() {
        let adapter = OpenCodeAdapter::new();
        // Version might be "unknown" if opencode is not installed, but should not panic
        let version = adapter.version();
        assert!(!version.is_empty());
    }

    #[test]
    fn test_opencode_adapter_parse_cost() {
        let adapter = OpenCodeAdapter::new();
        assert_eq!(adapter.parse_cost(r#"{"cost_usd": 0.123}"#), Some(0.123));
        assert_eq!(adapter.parse_cost(r#"{"usage": {"cost": 0.456}}"#), Some(0.456));
        assert_eq!(adapter.parse_cost("not json"), None);
        assert_eq!(adapter.parse_cost(r#"{"other": "data"}"#), None);
    }

    #[test]
    fn test_opencode_adapter_spawn_not_implemented() {
        let adapter = OpenCodeAdapter::new();
        let result = adapter.spawn("test task", "/tmp/worktree");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not yet implemented"));
    }
}
