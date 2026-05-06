use serde::{Deserialize, Serialize};
use rusqlite::Connection;
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SupabaseConfig {
    pub id: String,
    pub project_id: String,
    pub supabase_project_ref: String,
    pub supabase_url: String,
    pub anon_key: Option<String>,
    pub service_role_key: Option<String>,
    pub feature_groups: HashMap<String, bool>,
    pub read_only: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitHubConfig {
    pub id: String,
    pub project_id: String,
    pub repo_owner: String,
    pub repo_name: String,
    pub repo_visibility: String,
    pub lockdown_enabled: bool,
    pub token_present: bool,
    pub features: HashMap<String, bool>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitHubIssue {
    pub id: String,
    pub repo_owner: String,
    pub repo_name: String,
    pub issue_number: i64,
    pub title: String,
    pub body: String,
    pub state: String,
    pub labels: Vec<String>,
    pub assignee: Option<String>,
    pub created_at: String,
    pub connector_status: String,
}

// Superbase helpers
pub fn get_supabase_configs(db: &Connection, project_id: &str) -> Result<Vec<SupabaseConfig>, String> {
    let mut stmt = db.prepare(
        "SELECT id, project_id, supabase_project_ref, supabase_url, anon_key, service_role_key, feature_groups, read_only, created_at FROM supabase_configs WHERE project_id = ?1"
    ).map_err(|e| e.to_string())?;

    let configs = stmt.query_map(rusqlite::params![project_id], |row| {
        let fg_str: String = row.get(6)?;
        let feature_groups: HashMap<String, bool> = serde_json::from_str(&fg_str).unwrap_or_default();
        Ok(SupabaseConfig {
            id: row.get(0)?,
            project_id: row.get(1)?,
            supabase_project_ref: row.get(2)?,
            supabase_url: row.get(3)?,
            anon_key: row.get(4)?,
            service_role_key: row.get(5)?,
            feature_groups,
            read_only: row.get(7)?,
            created_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for cfg in configs {
        result.push(cfg.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn save_supabase_config(db: &Connection, config: &SupabaseConfig) -> Result<(), String> {
    let fg_json = serde_json::to_string(&config.feature_groups).map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR REPLACE INTO supabase_configs (id, project_id, supabase_project_ref, supabase_url, anon_key, service_role_key, feature_groups, read_only, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![config.id, config.project_id, config.supabase_project_ref, config.supabase_url, config.anon_key, config.service_role_key, fg_json, config.read_only, config.created_at],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn toggle_supabase_feature(db: &Connection, config_id: &str, feature: &str, enabled: bool) -> Result<(), String> {
    let configs = db.query_row(
        "SELECT feature_groups FROM supabase_configs WHERE id = ?1",
        rusqlite::params![config_id],
        |row| {
            let fg_str: String = row.get(0)?;
            Ok(fg_str)
        }
    ).map_err(|e| e.to_string())?;

    let mut feature_groups: HashMap<String, bool> = serde_json::from_str(&configs).unwrap_or_default();
    feature_groups.insert(feature.to_string(), enabled);
    let fg_json = serde_json::to_string(&feature_groups).map_err(|e| e.to_string())?;

    db.execute(
        "UPDATE supabase_configs SET feature_groups = ?1 WHERE id = ?2",
        rusqlite::params![fg_json, config_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn detect_supabase_project(project_path: &str) -> Option<String> {
    let supabase_toml = format!("{}/supabase/config.toml", project_path);
    if std::path::Path::new(&supabase_toml).exists() {
        if let Ok(content) = std::fs::read_to_string(&supabase_toml) {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("project_id") {
                    if let Some(id) = trimmed.split('=').nth(1) {
                        return Some(id.trim().trim_matches('"').to_string());
                    }
                }
            }
        }
        return Some("local".to_string());
    }
    None
}

// GitHub helpers
pub fn get_github_configs(db: &Connection, project_id: &str) -> Result<Vec<GitHubConfig>, String> {
    let mut stmt = db.prepare(
        "SELECT id, project_id, repo_owner, repo_name, repo_visibility, lockdown_enabled, token_present, features, created_at FROM github_configs WHERE project_id = ?1"
    ).map_err(|e| e.to_string())?;

    let configs = stmt.query_map(rusqlite::params![project_id], |row| {
        let f_str: String = row.get(7)?;
        let features: HashMap<String, bool> = serde_json::from_str(&f_str).unwrap_or_default();
        Ok(GitHubConfig {
            id: row.get(0)?,
            project_id: row.get(1)?,
            repo_owner: row.get(2)?,
            repo_name: row.get(3)?,
            repo_visibility: row.get(4)?,
            lockdown_enabled: row.get(5)?,
            token_present: row.get(6)?,
            features,
            created_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for cfg in configs {
        result.push(cfg.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn save_github_config(db: &Connection, config: &GitHubConfig) -> Result<(), String> {
    let f_json = serde_json::to_string(&config.features).map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR REPLACE INTO github_configs (id, project_id, repo_owner, repo_name, repo_visibility, lockdown_enabled, token_present, features, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![config.id, config.project_id, config.repo_owner, config.repo_name, config.repo_visibility, config.lockdown_enabled, config.token_present, f_json, config.created_at],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn toggle_github_feature(db: &Connection, config_id: &str, feature: &str, enabled: bool) -> Result<(), String> {
    let features_str = db.query_row(
        "SELECT features FROM github_configs WHERE id = ?1",
        rusqlite::params![config_id],
        |row| {
            let s: String = row.get(0)?;
            Ok(s)
        }
    ).map_err(|e| e.to_string())?;

    let mut features: HashMap<String, bool> = serde_json::from_str(&features_str).unwrap_or_default();
    features.insert(feature.to_string(), enabled);
    let f_json = serde_json::to_string(&features).map_err(|e| e.to_string())?;

    db.execute(
        "UPDATE github_configs SET features = ?1 WHERE id = ?2",
        rusqlite::params![f_json, config_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn detect_github_repo(project_path: &str) -> Option<(String, String, String)> {
    let git_config = format!("{}/.git/config", project_path);
    if let Ok(content) = std::fs::read_to_string(&git_config) {
        let mut url = None;
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("url = ") {
                url = Some(trimmed.replace("url = ", "").trim().to_string());
            }
        }
        if let Some(u) = url {
            let cleaned = u
                .replace("https://github.com/", "")
                .replace("git@github.com:", "")
                .replace(".git", "");
            let parts: Vec<&str> = cleaned.split('/').collect();
            if parts.len() >= 2 {
                return Some((parts[0].to_string(), parts[1].to_string(), "unknown".to_string()));
            }
        }
    }
    None
}

pub fn check_repo_visibility(owner: &str, repo: &str) -> Result<String, String> {
    let url = format!("https://api.github.com/repos/{}/{}", owner, repo);
    if let Ok(response) = ureq::get(&url)
        .set("Accept", "application/vnd.github.v3+json")
        .set("User-Agent", "agent-control-center")
        .call()
    {
        if response.status() == 200 {
            if let Ok(json) = response.into_string() {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&json) {
                    if let Some(vis) = val.get("visibility").and_then(|v| v.as_str()) {
                        return Ok(vis.to_string());
                    }
                    if val.get("private").and_then(|v| v.as_bool()).unwrap_or(true) {
                        return Ok("private".to_string());
                    }
                    return Ok("public".to_string());
                }
            }
        }
    }
    Ok("unknown".to_string())
}

pub fn list_github_issues(owner: &str, repo: &str, state: &str) -> Result<Vec<GitHubIssue>, String> {
    let url = format!(
        "https://api.github.com/repos/{}/{}/issues?state={}&per_page=30",
        owner, repo, state
    );
    let response = ureq::get(&url)
        .set("Accept", "application/vnd.github.v3+json")
        .set("User-Agent", "agent-control-center")
        .call()
        .map_err(|e| format!("GitHub API error: {}", e))?;

    let body = response.into_string().map_err(|e| e.to_string())?;
    let json: Vec<serde_json::Value> =
        serde_json::from_str(&body).map_err(|e| e.to_string())?;

    let issues = json
        .iter()
        .filter_map(|issue| {
            if issue.get("pull_request").is_some() {
                return None;
            }
            Some(GitHubIssue {
                id: issue
                    .get("node_id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                repo_owner: owner.to_string(),
                repo_name: repo.to_string(),
                issue_number: issue.get("number").and_then(|v| v.as_i64()).unwrap_or(0),
                title: issue
                    .get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                body: issue
                    .get("body")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                state: issue
                    .get("state")
                    .and_then(|v| v.as_str())
                    .unwrap_or("open")
                    .to_string(),
                labels: issue
                    .get("labels")
                    .and_then(|v| v.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|l| {
                                l.get("name")
                                    .and_then(|n| n.as_str())
                                    .map(String::from)
                            })
                            .collect()
                    })
                    .unwrap_or_default(),
                assignee: issue
                    .get("assignee")
                    .and_then(|v| v.get("login"))
                    .and_then(|l| l.as_str())
                    .map(String::from),
                created_at: issue
                    .get("created_at")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                connector_status: "detected".to_string(),
            })
        })
        .collect();

    Ok(issues)
}

pub fn check_migration_safety(project_path: &str) -> Result<Vec<String>, String> {
    let migration_dir = format!("{}/supabase/migrations", project_path);
    let mut warnings = Vec::new();

    if std::path::Path::new(&migration_dir).exists() {
        warnings.push(format!("Migration directory exists: {}", migration_dir));
    }

    if let Ok(entries) = std::fs::read_dir(&migration_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map_or(false, |e| e == "sql") {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    let upper = content.to_uppercase();
                    if upper.contains("DROP TABLE")
                        || upper.contains("DROP COLUMN")
                        || upper.contains("TRUNCATE")
                    {
                        warnings.push(format!(
                            "Destructive SQL in {}: contains DROP/TRUNCATE",
                            path.display()
                        ));
                    }
                }
            }
        }
    }

    Ok(warnings)
}

pub fn check_github_actions(project_path: &str) -> Result<Vec<String>, String> {
    let workflows_dir = format!("{}/.github/workflows", project_path);
    let mut workflows = Vec::new();

    if std::path::Path::new(&workflows_dir).exists() {
        if let Ok(entries) = std::fs::read_dir(&workflows_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map_or(false, |e| e == "yml" || e == "yaml") {
                    workflows.push(
                        path.file_name()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string(),
                    );
                }
            }
        }
    }

    Ok(workflows)
}
