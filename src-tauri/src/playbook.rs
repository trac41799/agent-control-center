use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use chrono::Utc;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybookManifest {
    pub version: String,
    pub name: String,
    pub project: String,
    pub exported_at: String,
    pub stacks: Vec<String>,
    pub includes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryCandidate {
    pub id: String,
    pub session_id: String,
    pub project_id: String,
    pub content: String,
    pub source_pattern: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureDocRequest {
    pub session_id: String,
    pub project_id: String,
    pub feature_name: String,
    pub doc_types: Vec<String>,
}

// Reactive Memory Capture - pattern detection
pub fn detect_memory_candidate(output: &str) -> Option<String> {
    let patterns = [
        "I see this project uses",
        "I'll remember to",
        "Note that",
        "Important:",
        "this pattern",
        "the convention here is",
        "the architecture follows",
    ];

    for line in output.lines() {
        for pattern in &patterns {
            if line.contains(pattern) {
                return Some(line.to_string());
            }
        }
    }
    None
}

pub fn create_memory_candidate(db: &Connection, session_id: &str, project_id: &str, content: &str, source_pattern: Option<&str>) -> Result<MemoryCandidate, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    db.execute(
        "INSERT INTO memory_candidates (id, session_id, project_id, content, source_pattern, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 'pending', ?6)",
        rusqlite::params![id, session_id, project_id, content, source_pattern, now],
    ).map_err(|e| e.to_string())?;

    Ok(MemoryCandidate { id, session_id: session_id.to_string(), project_id: project_id.to_string(), content: content.to_string(), source_pattern: source_pattern.map(String::from), status: "pending".to_string(), created_at: now })
}

pub fn get_memory_candidates(db: &Connection, session_id: Option<&str>, status: Option<&str>) -> Result<Vec<MemoryCandidate>, String> {
    let query = match (session_id, status) {
        (Some(sid), Some(s)) => format!("SELECT id, session_id, project_id, content, source_pattern, status, created_at FROM memory_candidates WHERE session_id = '{}' AND status = '{}' ORDER BY created_at DESC", sid, s),
        (Some(sid), None) => format!("SELECT id, session_id, project_id, content, source_pattern, status, created_at FROM memory_candidates WHERE session_id = '{}' ORDER BY created_at DESC", sid),
        (None, Some(s)) => format!("SELECT id, session_id, project_id, content, source_pattern, status, created_at FROM memory_candidates WHERE status = '{}' ORDER BY created_at DESC", s),
        (None, None) => "SELECT id, session_id, project_id, content, source_pattern, status, created_at FROM memory_candidates ORDER BY created_at DESC LIMIT 50".to_string(),
    };
    let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;
    let candidates = stmt.query_map([], |row| {
        Ok(MemoryCandidate {
            id: row.get(0)?, session_id: row.get(1)?, project_id: row.get(2)?, content: row.get(3)?,
            source_pattern: row.get(4)?, status: row.get(5)?, created_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(candidates)
}

// Playbook Export
pub fn build_playbook_manifest(name: &str, project: &str, stacks: &[String], include_skills: bool, include_memory: bool, include_presets: bool) -> PlaybookManifest {
    let mut includes = vec!["profile".to_string()];
    if include_skills { includes.push("skills".to_string()); }
    if include_memory { includes.push("memory".to_string()); }
    if include_presets { includes.push("presets".to_string()); }
    PlaybookManifest {
        version: "1.0".to_string(),
        name: name.to_string(),
        project: project.to_string(),
        exported_at: Utc::now().to_rfc3339(),
        stacks: stacks.to_vec(),
        includes,
    }
}

// Feature Doc Generator - builds prompt for 4 doc types
pub fn build_feature_doc_prompt(doc_type: &str, session_id: &str, feature_name: &str) -> String {
    match doc_type {
        "EXECUTIVE_PLAN" => format!("Generate an executive summary plan for the feature '{}' (session: {}). Include: objective, approach, key decisions, timeline estimate, and risks.", feature_name, session_id),
        "CHANGELOG" => format!("Generate a detailed changelog for the feature '{}' (session: {}). Include: all files created/modified, features added, bugs fixed, and breaking changes.", feature_name, session_id),
        "QA_REPORT" => format!("Generate a QA report for the feature '{}' (session: {}). Include: test coverage summary, test results, edge cases tested, known issues, and overall verdict.", feature_name, session_id),
        "TECHNICAL_PLAN" => format!("Generate a technical implementation plan for the feature '{}' (session: {}). Include: architecture overview, component hierarchy, data flow, API changes, and deployment notes.", feature_name, session_id),
        _ => format!("Generate documentation for '{}' (session: {})", feature_name, session_id),
    }
}
