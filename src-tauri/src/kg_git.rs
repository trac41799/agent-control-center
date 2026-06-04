use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CochangeWarning {
    pub file_a: String,
    pub file_b: String,
    pub jaccard_score: f64,
    pub cochange_count: i64,
}

pub fn mine_cochange_patterns(
    repo_path: &str,
    project_id: Option<&str>,
    db: &Connection,
) -> Result<usize, String> {
    let git_dir = Path::new(repo_path).join(".git");
    if !git_dir.exists() {
        return Err(format!("Not a git repository: {}", repo_path));
    }

    let output = run_git_log(repo_path)?;
    let commits = parse_git_log(&output);

    let file_commit_map = build_file_commit_map(&commits);
    let pairs = compute_jaccard_scores(&file_commit_map, commits.len() as f64, 0.3);

    let mut stored = 0usize;
    for (file_a, file_b, jaccard, cochange_count) in &pairs {
        use crate::kg_core;
        let file_a_str = file_a.as_str();
        let file_b_str = file_b.as_str();
        if let Some(a) = file_a_str.strip_prefix(r"\") {
            let _ = kg_core::upsert_git_cochange(
                db,
                a,
                file_b_str.strip_prefix(r"\").unwrap_or(file_b_str),
                project_id,
                *jaccard,
                *cochange_count,
            );
            stored += 1;
        } else {
            let _ = kg_core::upsert_git_cochange(
                db,
                file_a_str,
                file_b_str,
                project_id,
                *jaccard,
                *cochange_count,
            );
            stored += 1;
        }
    }

    Ok(stored)
}

fn run_git_log(repo_path: &str) -> Result<String, String> {
    let output = std::process::Command::new("git")
        .args([
            "-C",
            repo_path,
            "log",
            "--name-only",
            "--pretty=format:COMMIT:%H",
            "--diff-filter=AM",
            "-500",
        ])
        .output()
        .map_err(|e| format!("git log failed: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("git log error: {}", stderr));
    }

    String::from_utf8(output.stdout).map_err(|e| format!("git log output decode: {}", e))
}

fn parse_git_log(log: &str) -> Vec<Vec<String>> {
    let mut commits: Vec<Vec<String>> = Vec::new();
    let mut current_files: Vec<String> = Vec::new();

    for line in log.lines() {
        if line.starts_with("COMMIT:") {
            if !current_files.is_empty() {
                commits.push(current_files);
                current_files = Vec::new();
            }
        } else {
            let trimmed = line.trim();
            if !trimmed.is_empty() {
                current_files.push(trimmed.to_string());
            }
        }
    }
    if !current_files.is_empty() {
        commits.push(current_files);
    }

    commits
}

fn build_file_commit_map(commits: &[Vec<String>]) -> HashMap<String, Vec<usize>> {
    let mut map: HashMap<String, Vec<usize>> = HashMap::new();
    for (commit_idx, files) in commits.iter().enumerate() {
        for file in files {
            map.entry(file.clone()).or_default().push(commit_idx);
        }
    }
    map
}

fn compute_jaccard_scores(
    file_commit_map: &HashMap<String, Vec<usize>>,
    _total_commits: f64,
    min_jaccard: f64,
) -> Vec<(String, String, f64, i64)> {
    let mut results = Vec::new();
    let files: Vec<(&String, &Vec<usize>)> = file_commit_map.iter().collect();

    for i in 0..files.len() {
        let (file_a, commits_a) = files[i];
        let commit_set_a: std::collections::HashSet<_> = commits_a.iter().collect();
        let size_a = commit_set_a.len() as f64;

        for j in (i + 1)..files.len() {
            let (file_b, commits_b) = files[j];
            let commit_set_b: std::collections::HashSet<_> = commits_b.iter().collect();
            let size_b = commit_set_b.len() as f64;

            let intersection_count = commit_set_a.intersection(&commit_set_b).count() as f64;
            let union_count = size_a + size_b - intersection_count;

            if union_count > 0.0 {
                let jaccard = intersection_count / union_count;
                if jaccard >= min_jaccard {
                    results.push((
                        file_a.clone(),
                        file_b.clone(),
                        jaccard,
                        intersection_count as i64,
                    ));
                }
            }
        }
    }

    results.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal));
    results.truncate(1000);
    results
}

pub fn get_cochange_warnings(
    db: &Connection,
    file_path: &str,
    min_jaccard: f64,
) -> Result<Vec<CochangeWarning>, String> {
    use crate::kg_core;

    let relations = kg_core::get_cochanges_for_file(db, file_path, min_jaccard)?;
    let warnings = relations
        .into_iter()
        .map(|r| {
            let (file_a, file_b) = if r.file_a == file_path {
                (r.file_a, r.file_b)
            } else {
                (r.file_b, r.file_a)
            };
            CochangeWarning {
                file_a,
                file_b,
                jaccard_score: r.jaccard_score,
                cochange_count: r.cochange_count,
            }
        })
        .collect();
    Ok(warnings)
}
