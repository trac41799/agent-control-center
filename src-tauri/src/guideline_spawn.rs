// src-tauri/src/guideline_spawn.rs
//
// T3: Guideline + Spawn helper (Closes G6)
// The "guideline" is the per-agent task spec. Convention:
// 1. Generate the guideline markdown via orchestrator::generate_agent_guideline
// 2. Write to <worktree>/.acc/GUIDELINE.md
// 3. Pass --guideline <path> as a CLI arg when spawning the agent
//
// This module wires 1+2+3 together so the caller (execute_wave) just calls
// one function: `prepare_and_spawn(...)` which returns the spawn args.

use std::fs;
use std::path::{Path, PathBuf};

use crate::orchestrator;

pub const GUIDELINE_REL_DIR: &str = ".acc";
pub const GUIDELINE_FILENAME: &str = "GUIDELINE.md";
pub const GUIDELINE_ARG_FLAG: &str = "--guideline";

/// Write the guideline markdown to <worktree>/.acc/GUIDELINE.md.
/// Returns the absolute path to the written file.
#[allow(clippy::too_many_arguments)]
pub fn write_guideline_to_worktree(
    worktree_path: &str,
    agent_ref: &str,
    task: &str,
    objective: &str,
    depends_on: Option<&str>,
    models: &[&str],
    files_to_create: &[&str],
    files_not_touch: &[&str],
) -> Result<PathBuf, String> {
    let guideline = orchestrator::generate_agent_guideline(
        agent_ref,
        task,
        objective,
        depends_on,
        models,
        files_to_create,
        files_not_touch,
    );

    let dir = Path::new(worktree_path).join(GUIDELINE_REL_DIR);
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create .acc dir: {}", e))?;

    let path = dir.join(GUIDELINE_FILENAME);
    fs::write(&path, &guideline).map_err(|e| format!("Failed to write guideline: {}", e))?;

    Ok(path)
}

/// Build the full argv for spawning an agent CLI that reads --guideline.
/// `base_args` are the agent's normal args (e.g., ["--model", "mimo-v2.5"]).
/// Returns: base_args + ["--guideline", <abs_path>]
pub fn build_spawn_args(base_args: &[String], guideline_path: &Path) -> Vec<String> {
    let mut args = base_args.to_vec();
    args.push(GUIDELINE_ARG_FLAG.to_string());
    args.push(guideline_path.to_string_lossy().to_string());
    args
}

/// Convenience: write guideline + return spawn args in one call.
#[allow(clippy::too_many_arguments)]
pub fn prepare_spawn(
    worktree_path: &str,
    agent_ref: &str,
    task: &str,
    objective: &str,
    depends_on: Option<&str>,
    models: &[&str],
    files_to_create: &[&str],
    files_not_touch: &[&str],
    base_args: &[String],
) -> Result<(PathBuf, Vec<String>), String> {
    let guideline_path = write_guideline_to_worktree(
        worktree_path,
        agent_ref,
        task,
        objective,
        depends_on,
        models,
        files_to_create,
        files_not_touch,
    )?;
    let args = build_spawn_args(base_args, &guideline_path);
    Ok((guideline_path, args))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_write_guideline_creates_file() {
        let tmp = TempDir::new().unwrap();
        let path = write_guideline_to_worktree(
            tmp.path().to_str().unwrap(),
            "agent-1",
            "Write tests for X",
            "Cover edge cases",
            None,
            &["mimo-v2.5"],
            &["src/x.test.ts"],
            &["package.json"],
        )
        .unwrap();

        assert!(path.exists());
        let content = fs::read_to_string(&path).unwrap();
        assert!(content.contains("agent-1"));
        assert!(content.contains("Write tests for X"));
        assert!(content.contains("Cover edge cases"));
        assert!(content.contains("mimo-v2.5"));
        assert!(content.contains("src/x.test.ts"));
        assert!(content.contains("package.json"));
    }

    #[test]
    fn test_write_guideline_creates_dot_acc_dir() {
        let tmp = TempDir::new().unwrap();
        let path = write_guideline_to_worktree(
            tmp.path().to_str().unwrap(),
            "a",
            "t", "o", None,
            &["m"], &[], &[],
        )
        .unwrap();

        assert!(path.parent().unwrap().ends_with(GUIDELINE_REL_DIR));
    }

    #[test]
    fn test_write_guideline_depends_on_in_output() {
        let tmp = TempDir::new().unwrap();
        let path = write_guideline_to_worktree(
            tmp.path().to_str().unwrap(),
            "a",
            "t", "o",
            Some("agent-0"),
            &["m"], &[], &[],
        )
        .unwrap();
        let content = fs::read_to_string(&path).unwrap();
        assert!(content.contains("agent-0"));
    }

    #[test]
    fn test_build_spawn_args_adds_guideline_flag() {
        let base = vec!["--model".to_string(), "mimo-v2.5".to_string()];
        let guideline = PathBuf::from("/tmp/wt/.acc/GUIDELINE.md");

        let args = build_spawn_args(&base, &guideline);

        assert_eq!(args.len(), 4);
        assert_eq!(args[0], "--model");
        assert_eq!(args[1], "mimo-v2.5");
        assert_eq!(args[2], "--guideline");
        assert!(args[3].contains("GUIDELINE.md"));
    }

    #[test]
    fn test_build_spawn_args_empty_base() {
        let base: Vec<String> = vec![];
        let guideline = PathBuf::from("/tmp/wt/.acc/GUIDELINE.md");

        let args = build_spawn_args(&base, &guideline);

        assert_eq!(args.len(), 2);
        assert_eq!(args[0], "--guideline");
    }

    #[test]
    fn test_prepare_spawn_returns_both() {
        let tmp = TempDir::new().unwrap();
        let base = vec!["--model".to_string(), "mimo-v2.5".to_string()];

        let (path, args) = prepare_spawn(
            tmp.path().to_str().unwrap(),
            "agent-x",
            "do the thing",
            "achieve the goal",
            None,
            &["mimo-v2.5"],
            &[],
            &[],
            &base,
        )
        .unwrap();

        assert!(path.exists());
        assert_eq!(args.len(), 4);
        assert_eq!(args[2], "--guideline");
    }
}
