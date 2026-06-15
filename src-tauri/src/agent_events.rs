// src-tauri/src/agent_events.rs
//
// Agent Event Streaming
// Provides Tauri event infrastructure for real-time agent output streaming.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentOutputEvent {
    pub agent_id: String,
    pub session_id: String,
    pub line: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStatusEvent {
    pub agent_id: String,
    pub session_id: String,
    pub status: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentCostEvent {
    pub agent_id: String,
    pub session_id: String,
    pub cost_usd: f64,
    pub timestamp: String,
}

/// Emit an agent output event to the frontend
pub fn emit_agent_output(app: &AppHandle, event: AgentOutputEvent) {
    let _ = app.emit("agent-output", event);
}

/// Emit an agent status event to the frontend
pub fn emit_agent_status(app: &AppHandle, event: AgentStatusEvent) {
    let _ = app.emit("agent-status", event);
}

/// Emit an agent cost event to the frontend
pub fn emit_agent_cost(app: &AppHandle, event: AgentCostEvent) {
    let _ = app.emit("agent-cost", event);
}

/// Create an output event
pub fn create_output_event(agent_id: &str, session_id: &str, line: &str) -> AgentOutputEvent {
    AgentOutputEvent {
        agent_id: agent_id.to_string(),
        session_id: session_id.to_string(),
        line: line.to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    }
}

/// Create a status event
pub fn create_status_event(agent_id: &str, session_id: &str, status: &str) -> AgentStatusEvent {
    AgentStatusEvent {
        agent_id: agent_id.to_string(),
        session_id: session_id.to_string(),
        status: status.to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    }
}

/// Create a cost event
pub fn create_cost_event(agent_id: &str, session_id: &str, cost_usd: f64) -> AgentCostEvent {
    AgentCostEvent {
        agent_id: agent_id.to_string(),
        session_id: session_id.to_string(),
        cost_usd,
        timestamp: chrono::Utc::now().to_rfc3339(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_output_event() {
        let event = create_output_event("agent-1", "session-1", "test line");
        assert_eq!(event.agent_id, "agent-1");
        assert_eq!(event.session_id, "session-1");
        assert_eq!(event.line, "test line");
        assert!(!event.timestamp.is_empty());
    }

    #[test]
    fn test_create_status_event() {
        let event = create_status_event("agent-1", "session-1", "running");
        assert_eq!(event.agent_id, "agent-1");
        assert_eq!(event.status, "running");
    }

    #[test]
    fn test_create_cost_event() {
        let event = create_cost_event("agent-1", "session-1", 0.05);
        assert_eq!(event.cost_usd, 0.05);
    }
}
