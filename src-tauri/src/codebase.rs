use chrono::Utc;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodebaseFile {
    pub id: String,
    pub project_id: String,
    pub file_path: String,
    pub file_name: String,
    pub extension: String,
    pub language: Option<String>,
    pub loc: Option<i64>,
    pub last_modified: Option<String>,
    pub coverage_status: Option<String>,
    pub last_indexed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodebaseSymbol {
    pub id: String,
    pub file_id: String,
    pub symbol_name: String,
    pub symbol_type: String,
    pub signature: Option<String>,
    pub line_start: Option<i64>,
    pub line_end: Option<i64>,
    pub parent_symbol_id: Option<String>,
    pub page_rank: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodebaseChunk {
    pub id: String,
    pub file_id: String,
    pub chunk_type: String,
    pub symbol_name: Option<String>,
    pub parent_context: Option<String>,
    pub content: String,
    pub line_start: Option<i64>,
    pub line_end: Option<i64>,
    pub token_count: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodebaseDependency {
    pub id: String,
    pub source_file_id: String,
    pub target_file_id: String,
    pub dep_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoMapOutput {
    pub file_path: String,
    pub symbols: Vec<SymbolBrief>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolBrief {
    pub symbol_name: String,
    pub symbol_type: String,
    pub signature: Option<String>,
    pub line_start: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub chunk_id: String,
    pub file_path: String,
    pub symbol_name: Option<String>,
    pub content: String,
    pub relevance_score: f64,
    pub match_type: String,
    pub line_start: Option<i64>,
    pub line_end: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodebaseCoverage {
    pub total_files: i64,
    pub mapped: i64,
    pub summarized: i64,
    pub analyzed: i64,
    pub unexplored: i64,
    pub coverage_pct: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoMapConfig {
    pub map_tokens: i64,
    pub languages: Vec<String>,
    pub include_tests: bool,
    pub update_mode: String,
}

impl Default for RepoMapConfig {
    fn default() -> Self {
        Self {
            map_tokens: 2000,
            languages: Vec::new(),
            include_tests: true,
            update_mode: "on-change".to_string(),
        }
    }
}

const SKIP_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    "target",
    "dist",
    ".venv",
    "__pycache__",
    ".next",
    "build",
    ".cache",
    ".idea",
    ".vscode",
    ".DS_Store",
    "venv",
    ".svn",
];

fn detect_language(ext: &str) -> Option<String> {
    match ext.to_lowercase().as_str() {
        "rs" => Some("rust".to_string()),
        "py" => Some("python".to_string()),
        "js" => Some("javascript".to_string()),
        "ts" | "tsx" => Some("typescript".to_string()),
        "jsx" => Some("jsx".to_string()),
        "go" => Some("go".to_string()),
        "rb" => Some("ruby".to_string()),
        "java" => Some("java".to_string()),
        "kt" | "kts" => Some("kotlin".to_string()),
        "swift" => Some("swift".to_string()),
        "php" => Some("php".to_string()),
        "c" | "h" => Some("c".to_string()),
        "cpp" | "cc" | "cxx" | "hpp" => Some("cpp".to_string()),
        "cs" => Some("csharp".to_string()),
        "sql" => Some("sql".to_string()),
        "sh" | "bash" | "zsh" => Some("shell".to_string()),
        "yaml" | "yml" => Some("yaml".to_string()),
        "json" => Some("json".to_string()),
        "md" | "markdown" => Some("markdown".to_string()),
        "html" | "htm" => Some("html".to_string()),
        "css" => Some("css".to_string()),
        "scss" | "sass" => Some("scss".to_string()),
        "vue" => Some("vue".to_string()),
        "svelte" => Some("svelte".to_string()),
        "ex" | "exs" => Some("elixir".to_string()),
        "dart" => Some("dart".to_string()),
        "toml" => Some("toml".to_string()),
        "lua" => Some("lua".to_string()),
        "zig" => Some("zig".to_string()),
        "clj" | "cljs" | "cljc" => Some("clojure".to_string()),
        "scala" => Some("scala".to_string()),
        "erl" => Some("erlang".to_string()),
        "hs" => Some("haskell".to_string()),
        "r" | "rdata" => Some("r".to_string()),
        "m" => Some("matlab".to_string()),
        "pl" | "pm" => Some("perl".to_string()),
        "tf" | "tfvars" => Some("terraform".to_string()),
        "dockerfile" => Some("docker".to_string()),
        "makefile" | "mk" => Some("make".to_string()),
        _ => None,
    }
}

fn is_test_file(file_name: &str) -> bool {
    let lower = file_name.to_lowercase();
    lower.starts_with("test_")
        || lower.ends_with("_test.go")
        || lower.ends_with("_test.py")
        || lower.ends_with(".spec.ts")
        || lower.ends_with(".spec.tsx")
        || lower.ends_with(".spec.js")
        || lower.ends_with(".test.ts")
        || lower.ends_with(".test.tsx")
        || lower.ends_with(".test.js")
        || lower.ends_with("_test.rs")
}

pub fn discover_project_files(
    db: &Connection,
    project_id: &str,
    project_path: &str,
) -> Result<Vec<CodebaseFile>, String> {
    let mut files = Vec::new();
    let root = Path::new(project_path);
    if !root.exists() || !root.is_dir() {
        return Err(format!("Project path does not exist: {}", project_path));
    }

    let mut dirs: Vec<std::path::PathBuf> = vec![root.to_path_buf()];
    while let Some(dir) = dirs.pop() {
        let read_dir = match fs::read_dir(&dir) {
            Ok(d) => d,
            Err(_) => continue,
        };
        for entry in read_dir.flatten() {
            let path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_string();

            if path.is_dir() {
                if !SKIP_DIRS.contains(&file_name.as_str()) && !file_name.starts_with('.') {
                    dirs.push(path);
                }
                continue;
            }

            if !path.is_file() {
                continue;
            }

            let ext = path
                .extension()
                .map(|e| e.to_string_lossy().to_lowercase())
                .unwrap_or_default();
            if ext.is_empty() {
                continue;
            }

            if let Some(language) = detect_language(&ext) {
                let loc = count_lines(&path).ok();
                let last_modified = fs::metadata(&path)
                    .ok()
                    .and_then(|m| m.modified().ok())
                    .map(|t| {
                        chrono::DateTime::<chrono::Utc>::from(t)
                            .format("%Y-%m-%d %H:%M:%S")
                            .to_string()
                    });

                let file_path = path.to_string_lossy().to_string();
                let id = format!("cb-{}", Uuid::new_v4());

                db.execute(
                    "INSERT OR IGNORE INTO codebase_files (id, project_id, file_path, file_name, extension, language, loc, last_modified, coverage_status, last_indexed_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'unexplored', NULL)",
                    rusqlite::params![id, project_id, file_path, file_name, ext, language, loc, last_modified],
                )
                .map_err(|e| e.to_string())?;

                let final_id: String = db
                    .query_row(
                        "SELECT id FROM codebase_files WHERE project_id = ?1 AND file_path = ?2",
                        rusqlite::params![project_id, file_path],
                        |row| row.get(0),
                    )
                    .map_err(|e| e.to_string())?;

                files.push(CodebaseFile {
                    id: final_id,
                    project_id: project_id.to_string(),
                    file_path,
                    file_name,
                    extension: ext,
                    language: Some(language),
                    loc,
                    last_modified,
                    coverage_status: Some("unexplored".to_string()),
                    last_indexed_at: None,
                });
            }
        }
    }

    Ok(files)
}

fn count_lines(path: &Path) -> Result<i64, String> {
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    Ok(content.lines().count() as i64)
}

pub fn build_repo_map(
    db: &Connection,
    project_id: &str,
    project_path: &str,
    config: &RepoMapConfig,
) -> Result<Vec<RepoMapOutput>, String> {
    let files = discover_project_files(db, project_id, project_path)?;

    for file in &files {
        if !config.include_tests && is_test_file(&file.file_name) {
            continue;
        }
        if !config.languages.is_empty() {
            if let Some(ref lang) = file.language {
                if !config.languages.contains(lang) {
                    continue;
                }
            }
        }

        let content = match fs::read_to_string(&file.file_path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let _ = extract_symbols_from_file(db, file, &content);
        let _ = chunk_file(db, file, &content);

        let edges = extract_dependency_edges(&file.file_path, &content, &file.extension);
        let _ = store_dependency_edges(db, &edges, project_id);
    }

    let _ = compute_page_rank(db, project_id, 4);
    let result = select_symbols_within_budget(db, project_id, config.map_tokens)?;

    let now = Utc::now().to_rfc3339();
    db.execute(
        "UPDATE codebase_files SET coverage_status = 'mapped', last_indexed_at = ?1 WHERE project_id = ?2 AND coverage_status = 'unexplored'",
        rusqlite::params![now, project_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(result)
}

fn extract_python_symbols(content: &str) -> Vec<(String, String, String, i64, i64)> {
    let mut symbols = Vec::new();
    let lines: Vec<&str> = content.lines().collect();
    let total = lines.len();

    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        if trimmed.starts_with("class ") && trimmed.contains('(')
            || trimmed.starts_with("class ") && trimmed.ends_with(':')
        {
            let name = trimmed
                .strip_prefix("class ")
                .and_then(|s| s.split(|c: char| c == '(' || c == ':').next())
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            if !name.is_empty() {
                let end = find_scope_end(&lines, i, total);
                symbols.push((
                    name,
                    "class".to_string(),
                    trimmed.to_string(),
                    i as i64,
                    end as i64,
                ));
            }
        } else if trimmed.starts_with("def ") {
            let name = trimmed
                .strip_prefix("def ")
                .and_then(|s| s.split('(').next())
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            if !name.is_empty() {
                let end = find_scope_end(&lines, i, total);
                symbols.push((
                    name,
                    "function".to_string(),
                    trimmed.to_string(),
                    i as i64,
                    end as i64,
                ));
            }
        } else if trimmed.starts_with("async def ") {
            let name = trimmed
                .strip_prefix("async def ")
                .and_then(|s| s.split('(').next())
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            if !name.is_empty() {
                let end = find_scope_end(&lines, i, total);
                symbols.push((
                    name,
                    "function".to_string(),
                    trimmed.to_string(),
                    i as i64,
                    end as i64,
                ));
            }
        }
    }
    symbols
}

fn extract_tsjs_symbols(content: &str) -> Vec<(String, String, String, i64, i64)> {
    let mut symbols = Vec::new();
    let lines: Vec<&str> = content.lines().collect();
    let total = lines.len();

    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();

        if trimmed.starts_with("export ") {
            let rest = trimmed.strip_prefix("export ").unwrap_or("").trim();
            if rest.starts_with("function ")
                || rest.starts_with("class ")
                || rest.starts_with("interface ")
                || rest.starts_with("type ")
                || rest.starts_with("const ")
                || rest.starts_with("let ")
                || rest.starts_with("var ")
            {
                let inner = rest;
                let name = extract_tsjs_name(inner);
                let sym_type = detect_tsjs_type(inner);
                if !name.is_empty() {
                    let end = find_scope_end(&lines, i, total);
                    symbols.push((name, sym_type, trimmed.to_string(), i as i64, end as i64));
                }
                continue;
            }
        }

        if trimmed.starts_with("function ") {
            let name = trimmed
                .strip_prefix("function ")
                .and_then(|s| s.split('(').next())
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            if !name.is_empty() {
                let end = find_scope_end(&lines, i, total);
                symbols.push((
                    name,
                    "function".to_string(),
                    trimmed.to_string(),
                    i as i64,
                    end as i64,
                ));
            }
        } else if trimmed.starts_with("class ") {
            let name = trimmed
                .strip_prefix("class ")
                .and_then(|s| s.split(|c: char| c == '{' || c == ' ' || c == '(').next())
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            if !name.is_empty() {
                let end = find_scope_end(&lines, i, total);
                symbols.push((
                    name,
                    "class".to_string(),
                    trimmed.to_string(),
                    i as i64,
                    end as i64,
                ));
            }
        } else if trimmed.starts_with("interface ") {
            let name = trimmed
                .strip_prefix("interface ")
                .and_then(|s| s.split(|c: char| c == '{' || c == ' ').next())
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            if !name.is_empty() {
                let end = find_scope_end(&lines, i, total);
                symbols.push((
                    name,
                    "interface".to_string(),
                    trimmed.to_string(),
                    i as i64,
                    end as i64,
                ));
            }
        } else if trimmed.starts_with("type ") && trimmed.contains(" = ") {
            let name = trimmed
                .strip_prefix("type ")
                .and_then(|s| s.split(|c: char| c == ' ' || c == '=').next())
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            if !name.is_empty() {
                let end = find_scope_end(&lines, i, total);
                symbols.push((
                    name,
                    "type".to_string(),
                    trimmed.to_string(),
                    i as i64,
                    end as i64,
                ));
            }
        } else if let Some(pos) = trimmed.find(" = ") {
            let prefix = &trimmed[..pos];
            if prefix.starts_with("const ")
                || prefix.starts_with("let ")
                || prefix.starts_with("var ")
            {
                let name = prefix
                    .split_whitespace()
                    .nth(1)
                    .map(|s| s.to_string())
                    .unwrap_or_default();
                if !name.is_empty() && !name.starts_with('{') && !name.starts_with('[') {
                    let end = find_scope_end(&lines, i, total);
                    symbols.push((
                        name,
                        "variable".to_string(),
                        trimmed.to_string(),
                        i as i64,
                        end as i64,
                    ));
                }
            }
        }
    }
    symbols
}

fn extract_tsjs_name(s: &str) -> String {
    let s = s.trim();
    if s.starts_with("function ") {
        s.strip_prefix("function ")
            .and_then(|s| s.split('(').next())
            .map(|s| s.trim().to_string())
            .unwrap_or_default()
    } else if s.starts_with("class ") {
        s.strip_prefix("class ")
            .and_then(|s| s.split(|c: char| c == '{' || c == ' ').next())
            .map(|s| s.trim().to_string())
            .unwrap_or_default()
    } else if s.starts_with("interface ") {
        s.strip_prefix("interface ")
            .and_then(|s| s.split(|c: char| c == '{' || c == ' ').next())
            .map(|s| s.trim().to_string())
            .unwrap_or_default()
    } else if s.starts_with("type ") {
        s.strip_prefix("type ")
            .and_then(|s| s.split(|c: char| c == ' ' || c == '=').next())
            .map(|s| s.trim().to_string())
            .unwrap_or_default()
    } else {
        s.split_whitespace().nth(1).unwrap_or("").to_string()
    }
}

fn detect_tsjs_type(s: &str) -> String {
    if s.starts_with("function ") {
        "function".to_string()
    } else if s.starts_with("class ") {
        "class".to_string()
    } else if s.starts_with("interface ") {
        "interface".to_string()
    } else if s.starts_with("type ") {
        "type".to_string()
    } else if s.starts_with("const ") || s.starts_with("let ") || s.starts_with("var ") {
        "variable".to_string()
    } else {
        "symbol".to_string()
    }
}

fn extract_rust_symbols(content: &str) -> Vec<(String, String, String, i64, i64)> {
    let mut symbols = Vec::new();
    let lines: Vec<&str> = content.lines().collect();
    let total = lines.len();

    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();

        if trimmed.starts_with("pub ") {
            let rest = trimmed.strip_prefix("pub ").unwrap_or("").trim();
            if rest.starts_with("fn ")
                || rest.starts_with("struct ")
                || rest.starts_with("enum ")
                || rest.starts_with("trait ")
                || rest.starts_with("impl ")
                || rest.starts_with("type ")
                || rest.starts_with("mod ")
            {
                let (name, sym_type) = extract_rust_pub_item(rest);
                if !name.is_empty() {
                    let end = find_scope_end(&lines, i, total);
                    symbols.push((name, sym_type, trimmed.to_string(), i as i64, end as i64));
                }
                continue;
            }
        }

        if trimmed.starts_with("fn ") {
            let name = trimmed
                .strip_prefix("fn ")
                .and_then(|s| s.split(|c: char| c == '(' || c == '<').next())
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            if !name.is_empty() {
                let end = find_scope_end(&lines, i, total);
                symbols.push((
                    name,
                    "function".to_string(),
                    trimmed.to_string(),
                    i as i64,
                    end as i64,
                ));
            }
        } else if trimmed.starts_with("struct ") {
            let name = trimmed
                .strip_prefix("struct ")
                .and_then(|s| s.split(|c: char| c == '{' || c == ' ' || c == ';').next())
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            if !name.is_empty() {
                let end = find_scope_end(&lines, i, total);
                symbols.push((
                    name,
                    "struct".to_string(),
                    trimmed.to_string(),
                    i as i64,
                    end as i64,
                ));
            }
        } else if trimmed.starts_with("enum ") {
            let name = trimmed
                .strip_prefix("enum ")
                .and_then(|s| s.split(|c: char| c == '{' || c == ' ').next())
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            if !name.is_empty() {
                let end = find_scope_end(&lines, i, total);
                symbols.push((
                    name,
                    "enum".to_string(),
                    trimmed.to_string(),
                    i as i64,
                    end as i64,
                ));
            }
        } else if trimmed.starts_with("trait ") {
            let name = trimmed
                .strip_prefix("trait ")
                .and_then(|s| s.split(|c: char| c == '{' || c == ' ').next())
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            if !name.is_empty() {
                let end = find_scope_end(&lines, i, total);
                symbols.push((
                    name,
                    "trait".to_string(),
                    trimmed.to_string(),
                    i as i64,
                    end as i64,
                ));
            }
        } else if trimmed.starts_with("impl") && !trimmed.starts_with("impl ") {
            // impl blocks that are not followed by space (e.g. impl<T>)
        } else if trimmed.starts_with("impl ") {
            let rest = trimmed.strip_prefix("impl ").unwrap_or("");
            let name = rest
                .split(|c: char| c == '{' || c == ' ' || c == '<')
                .next()
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            if !name.is_empty() {
                let end = find_scope_end(&lines, i, total);
                symbols.push((
                    format!("impl {}", name),
                    "impl".to_string(),
                    trimmed.to_string(),
                    i as i64,
                    end as i64,
                ));
            }
        }
    }
    symbols
}

fn extract_rust_pub_item(s: &str) -> (String, String) {
    if s.starts_with("fn ") {
        let name = s
            .strip_prefix("fn ")
            .and_then(|s| s.split(|c: char| c == '(' || c == '<').next())
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        (name, "function".to_string())
    } else if s.starts_with("struct ") {
        let name = s
            .strip_prefix("struct ")
            .and_then(|s| s.split(|c: char| c == '{' || c == ' ' || c == ';').next())
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        (name, "struct".to_string())
    } else if s.starts_with("enum ") {
        let name = s
            .strip_prefix("enum ")
            .and_then(|s| s.split(|c: char| c == '{' || c == ' ').next())
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        (name, "enum".to_string())
    } else if s.starts_with("trait ") {
        let name = s
            .strip_prefix("trait ")
            .and_then(|s| s.split(|c: char| c == '{' || c == ' ').next())
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        (name, "trait".to_string())
    } else if s.starts_with("type ") {
        let name = s
            .strip_prefix("type ")
            .and_then(|s| s.split(|c: char| c == ' ' || c == '=').next())
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        (name, "type".to_string())
    } else {
        (String::new(), "symbol".to_string())
    }
}

fn extract_go_symbols(content: &str) -> Vec<(String, String, String, i64, i64)> {
    let mut symbols = Vec::new();
    let lines: Vec<&str> = content.lines().collect();
    let total = lines.len();

    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();

        if trimmed.starts_with("func ") {
            let name = trimmed
                .strip_prefix("func ")
                .and_then(|s| {
                    // Handle methods like (t *Type) MethodName
                    let after_paren = if s.starts_with('(') {
                        s.split(')').nth(1).unwrap_or("").trim()
                    } else {
                        s
                    };
                    after_paren.split('(').next()
                })
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            if !name.is_empty() {
                let end = find_scope_end(&lines, i, total);
                symbols.push((
                    name,
                    "function".to_string(),
                    trimmed.to_string(),
                    i as i64,
                    end as i64,
                ));
            }
        } else if trimmed.starts_with("type ")
            && (trimmed.contains(" struct ") || trimmed.contains(" interface "))
        {
            let name = trimmed
                .strip_prefix("type ")
                .and_then(|s| s.split_whitespace().next())
                .map(|s| s.to_string())
                .unwrap_or_default();
            let sym_type = if trimmed.contains(" struct ") {
                "struct".to_string()
            } else {
                "interface".to_string()
            };
            if !name.is_empty() {
                let end = find_scope_end(&lines, i, total);
                symbols.push((name, sym_type, trimmed.to_string(), i as i64, end as i64));
            }
        }
    }
    symbols
}

fn find_scope_end(lines: &[&str], start: usize, _total: usize) -> usize {
    let mut brace_depth: i64 = 0;
    let mut started = false;
    let mut i = start;

    while i < lines.len() {
        let line = lines[i];
        for c in line.chars() {
            if c == '{' {
                brace_depth += 1;
                started = true;
            } else if c == '}' {
                brace_depth -= 1;
            }
        }
        if started && brace_depth <= 0 {
            return i + 1;
        }
        i += 1;
    }

    lines.len()
}

pub fn extract_symbols_from_file(
    db: &Connection,
    file: &CodebaseFile,
    content: &str,
) -> Result<Vec<CodebaseSymbol>, String> {
    let raw_symbols = match file.language.as_deref() {
        Some("python") => extract_python_symbols(content),
        Some("typescript") | Some("javascript") | Some("jsx") => extract_tsjs_symbols(content),
        Some("rust") => extract_rust_symbols(content),
        Some("go") => extract_go_symbols(content),
        _ => Vec::new(),
    };

    let mut symbols = Vec::new();

    for (name, sym_type, signature, line_start, line_end) in raw_symbols {
        let id = format!("sym-{}", Uuid::new_v4());
        db.execute(
            "INSERT OR IGNORE INTO codebase_symbols (id, file_id, symbol_name, symbol_type, signature, line_start, line_end, parent_symbol_id, page_rank)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, 0.0)",
            rusqlite::params![id, file.id, name, sym_type, signature, line_start, line_end],
        )
        .map_err(|e| e.to_string())?;

        symbols.push(CodebaseSymbol {
            id,
            file_id: file.id.clone(),
            symbol_name: name,
            symbol_type: sym_type,
            signature: Some(signature),
            line_start: Some(line_start),
            line_end: Some(line_end),
            parent_symbol_id: None,
            page_rank: 0.0,
        });
    }

    Ok(symbols)
}

pub fn extract_dependency_edges(
    file_path: &str,
    content: &str,
    ext: &str,
) -> Vec<(String, String)> {
    let mut edges = Vec::new();
    let source = file_path.to_string();

    match ext.to_lowercase().as_str() {
        "py" => {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("import ") {
                    let target = trimmed
                        .strip_prefix("import ")
                        .unwrap_or("")
                        .split_whitespace()
                        .next()
                        .unwrap_or("")
                        .to_string();
                    if !target.is_empty() {
                        edges.push((source.clone(), target));
                    }
                } else if trimmed.starts_with("from ") {
                    let target = trimmed
                        .strip_prefix("from ")
                        .and_then(|s| s.split_whitespace().next())
                        .map(|s| s.to_string())
                        .unwrap_or_default();
                    if !target.is_empty() {
                        edges.push((source.clone(), target));
                    }
                }
            }
        }
        "ts" | "tsx" | "js" | "jsx" => {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("import ") {
                    if let Some(quote_start) = trimmed.find('\'') {
                        if let Some(quote_end) = trimmed[quote_start + 1..].find('\'') {
                            let target =
                                trimmed[quote_start + 1..quote_start + 1 + quote_end].to_string();
                            if !target.is_empty() {
                                edges.push((source.clone(), target));
                            }
                        }
                    } else if let Some(quote_start) = trimmed.find('\"') {
                        if let Some(quote_end) = trimmed[quote_start + 1..].find('\"') {
                            let target =
                                trimmed[quote_start + 1..quote_start + 1 + quote_end].to_string();
                            if !target.is_empty() {
                                edges.push((source.clone(), target));
                            }
                        }
                    }
                } else if trimmed.contains("require(") {
                    if let Some(paren_start) = trimmed.find('(') {
                        if let Some(paren_end) = trimmed[paren_start + 1..].find(')') {
                            let inner =
                                trimmed[paren_start + 1..paren_start + 1 + paren_end].trim();
                            let target = inner.trim_matches('\'').trim_matches('\"').to_string();
                            if !target.is_empty() {
                                edges.push((source.clone(), target));
                            }
                        }
                    }
                }
            }
        }
        "rs" => {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("use ") {
                    let target = trimmed
                        .strip_prefix("use ")
                        .and_then(|s| {
                            let s = s.split("::").next().unwrap_or("");
                            let s = s.split(';').next().unwrap_or("");
                            Some(s.to_string())
                        })
                        .unwrap_or_default();
                    if !target.is_empty() {
                        edges.push((source.clone(), target));
                    }
                }
            }
        }
        "go" => {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("import ") {
                    let rest = trimmed.strip_prefix("import ").unwrap_or("").trim();
                    let target = rest
                        .trim_matches('"')
                        .trim_matches('(')
                        .trim_matches(')')
                        .trim()
                        .to_string();
                    if !target.is_empty() {
                        edges.push((source.clone(), target));
                    }
                }
            }
        }
        _ => {}
    }

    edges
}

fn store_dependency_edges(
    db: &Connection,
    edges: &[(String, String)],
    project_id: &str,
) -> Result<(), String> {
    for (source_path, target_module) in edges {
        let source_file: Option<String> = db
            .query_row(
                "SELECT id FROM codebase_files WHERE project_id = ?1 AND file_path = ?2",
                rusqlite::params![project_id, source_path],
                |row| row.get(0),
            )
            .ok();

        let target_file: Option<String> = db
            .query_row(
                "SELECT id FROM codebase_files WHERE project_id = ?1 AND (file_path LIKE ?2 OR file_name = ?3) LIMIT 1",
                rusqlite::params![project_id, format!("%/{}", target_module), target_module],
                |row| row.get(0),
            )
            .ok();

        if let (Some(src_id), Some(tgt_id)) = (source_file, target_file) {
            if src_id != tgt_id {
                let dep_id = format!("dep-{}", Uuid::new_v4());
                let _ = db.execute(
                    "INSERT OR IGNORE INTO codebase_dependencies (id, source_file_id, target_file_id, dep_type) VALUES (?1, ?2, ?3, 'import')",
                    rusqlite::params![dep_id, src_id, tgt_id],
                );
            }
        }
    }
    Ok(())
}

pub fn compute_page_rank(
    db: &Connection,
    project_id: &str,
    iterations: usize,
) -> Result<(), String> {
    let mut stmt = db
        .prepare(
            "SELECT cf.id, COUNT(cd.id) as out_degree
             FROM codebase_files cf
             LEFT JOIN codebase_dependencies cd ON cf.id = cd.source_file_id
             WHERE cf.project_id = ?1
             GROUP BY cf.id",
        )
        .map_err(|e| e.to_string())?;

    let file_info: Vec<(String, usize)> = stmt
        .query_map(rusqlite::params![project_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)? as usize))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let file_ids: Vec<String> = file_info.iter().map(|(id, _)| id.clone()).collect();
    let n = file_ids.len();
    if n == 0 {
        return Ok(());
    }

    let mut edge_list: Vec<(usize, usize)> = Vec::new();
    let mut dep_stmt = db
        .prepare("SELECT source_file_id, target_file_id FROM codebase_dependencies WHERE source_file_id IN (SELECT id FROM codebase_files WHERE project_id = ?1)")
        .map_err(|e| e.to_string())?;

    let index_map: HashMap<&str, usize> = file_ids
        .iter()
        .enumerate()
        .map(|(i, id)| (id.as_str(), i))
        .collect();

    let dep_rows: Vec<(String, String)> = dep_stmt
        .query_map(rusqlite::params![project_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    for (src, tgt) in &dep_rows {
        if let (Some(&si), Some(&ti)) = (index_map.get(src.as_str()), index_map.get(tgt.as_str())) {
            edge_list.push((si, ti));
        }
    }

    let mut out_degree = vec![0usize; n];
    for &(si, _) in &edge_list {
        out_degree[si] += 1;
    }

    let mut rank = vec![1.0; n];
    let d = 0.85;

    for _ in 0..iterations {
        let mut new_rank = vec![0.0; n];
        for i in 0..n {
            new_rank[i] = (1.0 - d) / n as f64;
        }

        for &(si, ti) in &edge_list {
            if out_degree[si] > 0 {
                new_rank[ti] += d * rank[si] / out_degree[si] as f64;
            }
        }

        rank = new_rank;
    }

    for (i, file_id) in file_ids.iter().enumerate() {
        let pr = rank[i];
        db.execute(
            "UPDATE codebase_symbols SET page_rank = ?1 WHERE file_id = ?2",
            rusqlite::params![pr, file_id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn estimate_token_count(text: &str) -> i64 {
    text.split_whitespace().count() as i64
}

pub fn select_symbols_within_budget(
    db: &Connection,
    project_id: &str,
    max_tokens: i64,
) -> Result<Vec<RepoMapOutput>, String> {
    let mut stmt = db
        .prepare(
            "SELECT cs.id, cs.file_id, cs.symbol_name, cs.symbol_type, cs.signature, cs.line_start, cs.line_end, cs.page_rank, cf.file_path
             FROM codebase_symbols cs
             JOIN codebase_files cf ON cs.file_id = cf.id
             WHERE cf.project_id = ?1 AND cs.page_rank > 0.0
             ORDER BY cs.page_rank DESC",
        )
        .map_err(|e| e.to_string())?;

    let all_symbols: Vec<(
        String,
        String,
        String,
        String,
        Option<String>,
        Option<i64>,
        Option<i64>,
        f64,
        String,
    )> = stmt
        .query_map(rusqlite::params![project_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<i64>>(5)?,
                row.get::<_, Option<i64>>(6)?,
                row.get::<_, f64>(7)?,
                row.get::<_, String>(8)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut file_map: HashMap<String, Vec<SymbolBrief>> = HashMap::new();
    let mut token_count: i64 = 0;

    for (
        _id,
        _file_id,
        symbol_name,
        symbol_type,
        signature,
        line_start,
        _line_end,
        _page_rank,
        file_path,
    ) in all_symbols
    {
        let brief = SymbolBrief {
            symbol_name,
            symbol_type,
            signature,
            line_start,
        };

        let sig_tokens = brief
            .signature
            .as_ref()
            .map(|s| estimate_token_count(s))
            .unwrap_or(0);
        let name_tokens = estimate_token_count(&brief.symbol_name);
        let estimated = sig_tokens + name_tokens + 2;

        if token_count + estimated > max_tokens {
            break;
        }

        token_count += estimated;
        file_map.entry(file_path).or_default().push(brief);
    }

    let mut output: Vec<RepoMapOutput> = file_map
        .into_iter()
        .map(|(file_path, symbols)| RepoMapOutput { file_path, symbols })
        .collect();

    output.sort_by(|a, b| {
        let a_max_pr = a
            .symbols
            .iter()
            .map(|s| s.line_start.unwrap_or(0))
            .max()
            .unwrap_or(0);
        let b_max_pr = b
            .symbols
            .iter()
            .map(|s| s.line_start.unwrap_or(0))
            .max()
            .unwrap_or(0);
        b_max_pr.cmp(&a_max_pr)
    });

    Ok(output)
}

pub fn chunk_file(
    db: &Connection,
    file: &CodebaseFile,
    content: &str,
) -> Result<Vec<CodebaseChunk>, String> {
    let lines: Vec<&str> = content.lines().collect();
    let total_lines = lines.len();
    let mut chunks = Vec::new();

    if total_lines < 500 {
        let chunk_id = format!("chunk-{}", Uuid::new_v4());
        let token_count = estimate_token_count(content);

        db.execute(
            "INSERT OR IGNORE INTO codebase_chunks (id, file_id, chunk_type, symbol_name, parent_context, content, line_start, line_end, token_count)
             VALUES (?1, ?2, 'file', NULL, NULL, ?3, 0, ?4, ?5)",
            rusqlite::params![chunk_id, file.id, content, total_lines as i64, token_count],
        )
        .map_err(|e| e.to_string())?;

        chunks.push(CodebaseChunk {
            id: chunk_id,
            file_id: file.id.clone(),
            chunk_type: "file".to_string(),
            symbol_name: None,
            parent_context: None,
            content: content.to_string(),
            line_start: Some(0),
            line_end: Some(total_lines as i64),
            token_count: Some(token_count),
        });

        return Ok(chunks);
    }

    let symbols = match file.language.as_deref() {
        Some("python") => extract_python_symbols(content),
        Some("typescript") | Some("javascript") | Some("jsx") => extract_tsjs_symbols(content),
        Some("rust") => extract_rust_symbols(content),
        Some("go") => extract_go_symbols(content),
        _ => Vec::new(),
    };

    if symbols.is_empty() {
        let chunk_id = format!("chunk-{}", Uuid::new_v4());
        let token_count = estimate_token_count(content);

        db.execute(
            "INSERT OR IGNORE INTO codebase_chunks (id, file_id, chunk_type, symbol_name, parent_context, content, line_start, line_end, token_count)
             VALUES (?1, ?2, 'file', NULL, NULL, ?3, 0, ?4, ?5)",
            rusqlite::params![chunk_id, file.id, content, total_lines as i64, token_count],
        )
        .map_err(|e| e.to_string())?;

        chunks.push(CodebaseChunk {
            id: chunk_id,
            file_id: file.id.clone(),
            chunk_type: "file".to_string(),
            symbol_name: None,
            parent_context: None,
            content: content.to_string(),
            line_start: Some(0),
            line_end: Some(total_lines as i64),
            token_count: Some(token_count),
        });

        return Ok(chunks);
    }

    let mut prev_end = 0usize;
    for (name, sym_type, _sig, ls, le) in &symbols {
        let start = *ls as usize;
        let end = std::cmp::min(*le as usize, total_lines);

        if start < prev_end || start >= total_lines {
            continue;
        }

        if start > prev_end {
            let between: String = lines[prev_end..start].join("\n").trim().to_string();
            if !between.is_empty() {
                let chunk_id = format!("chunk-{}", Uuid::new_v4());
                let token_count = estimate_token_count(&between);

                db.execute(
                    "INSERT OR IGNORE INTO codebase_chunks (id, file_id, chunk_type, symbol_name, parent_context, content, line_start, line_end, token_count)
                     VALUES (?1, ?2, 'gap', NULL, NULL, ?3, ?4, ?5, ?6)",
                    rusqlite::params![chunk_id, file.id, between, prev_end as i64, start as i64, token_count],
                )
                .map_err(|e| e.to_string())?;

                chunks.push(CodebaseChunk {
                    id: chunk_id,
                    file_id: file.id.clone(),
                    chunk_type: "gap".to_string(),
                    symbol_name: None,
                    parent_context: None,
                    content: between,
                    line_start: Some(prev_end as i64),
                    line_end: Some(start as i64),
                    token_count: Some(token_count),
                });
            }
        }

        let chunk_content: String = lines[start..end].join("\n");
        let chunk_id = format!("chunk-{}", Uuid::new_v4());
        let token_count = estimate_token_count(&chunk_content);

        let chunk_type = if sym_type == "class" {
            "class".to_string()
        } else {
            "function".to_string()
        };

        let (final_content, final_token_count) =
            if sym_type == "class" && (end as i64 - start as i64) > 500 {
                split_class_at_methods(db, file, &chunk_content, start as i64, &mut chunks, name)
            } else {
                (chunk_content, token_count)
            };

        db.execute(
            "INSERT OR IGNORE INTO codebase_chunks (id, file_id, chunk_type, symbol_name, parent_context, content, line_start, line_end, token_count)
             VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7, ?8)",
            rusqlite::params![chunk_id, file.id, chunk_type, name, final_content, start as i64, end as i64, final_token_count],
        )
        .map_err(|e| e.to_string())?;

        chunks.push(CodebaseChunk {
            id: chunk_id,
            file_id: file.id.clone(),
            chunk_type,
            symbol_name: Some(name.clone()),
            parent_context: None,
            content: final_content,
            line_start: Some(start as i64),
            line_end: Some(end as i64),
            token_count: Some(final_token_count),
        });

        prev_end = end;
    }

    if prev_end < total_lines {
        let remaining: String = lines[prev_end..total_lines].join("\n").trim().to_string();
        if !remaining.is_empty() {
            let chunk_id = format!("chunk-{}", Uuid::new_v4());
            let token_count = estimate_token_count(&remaining);

            db.execute(
                "INSERT OR IGNORE INTO codebase_chunks (id, file_id, chunk_type, symbol_name, parent_context, content, line_start, line_end, token_count)
                 VALUES (?1, ?2, 'tail', NULL, NULL, ?3, ?4, ?5, ?6)",
                rusqlite::params![chunk_id, file.id, remaining, prev_end as i64, total_lines as i64, token_count],
            )
            .map_err(|e| e.to_string())?;

            chunks.push(CodebaseChunk {
                id: chunk_id,
                file_id: file.id.clone(),
                chunk_type: "tail".to_string(),
                symbol_name: None,
                parent_context: None,
                content: remaining,
                line_start: Some(prev_end as i64),
                line_end: Some(total_lines as i64),
                token_count: Some(token_count),
            });
        }
    }

    Ok(chunks)
}

fn split_class_at_methods(
    db: &Connection,
    file: &CodebaseFile,
    content: &str,
    base_offset: i64,
    chunks: &mut Vec<CodebaseChunk>,
    class_name: &str,
) -> (String, i64) {
    let lines: Vec<&str> = content.lines().collect();
    let total = lines.len();

    let mut method_starts: Vec<usize> = Vec::new();
    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        if file.language.as_deref() == Some("python") && trimmed.starts_with("def ") {
            method_starts.push(i);
        } else if file.language.as_deref() == Some("rust") && trimmed.starts_with("fn ") {
            method_starts.push(i);
        } else if file.language.as_deref() == Some("typescript")
            && (trimmed.starts_with("function ")
                || trimmed.starts_with("public ")
                || trimmed.starts_with("private ")
                || trimmed.starts_with("protected "))
        {
            method_starts.push(i);
        } else if file.language.as_deref() == Some("go") && trimmed.starts_with("func ") {
            method_starts.push(i);
        }
    }

    if method_starts.len() <= 1 {
        return (content.to_string(), estimate_token_count(content));
    }

    method_starts.push(total);

    let mut class_header = String::new();
    let mut method_chunks: Vec<(usize, usize, String)> = Vec::new();

    for w in method_starts.windows(2) {
        let ws = w[0];
        let we = w[1];
        if ws == 0 {
            continue;
        }
        if class_header.is_empty() {
            class_header = lines[0..ws].join("\n");
        }
        let method_name = lines[ws].trim().to_string();
        method_chunks.push((ws, we, method_name));
    }

    for (ws, we, ref method_content) in &method_chunks {
        let chunk_id = format!("chunk-{}", Uuid::new_v4());
        let seg_tokens = estimate_token_count(method_content);
        let full_content = if !class_header.is_empty() {
            format!("{}\n{}", class_header, method_content)
        } else {
            method_content.clone()
        };

        let _ = db.execute(
            "INSERT OR IGNORE INTO codebase_chunks (id, file_id, chunk_type, symbol_name, parent_context, content, line_start, line_end, token_count)
             VALUES (?1, ?2, 'method', ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![
                chunk_id,
                file.id,
                format!("{}.{}", class_name, *ws),
                class_name,
                full_content,
                (base_offset + *ws as i64),
                (base_offset + *we as i64),
                seg_tokens,
            ],
        );

        chunks.push(CodebaseChunk {
            id: chunk_id,
            file_id: file.id.clone(),
            chunk_type: "method".to_string(),
            symbol_name: Some(format!("{}.{}", class_name, *ws)),
            parent_context: Some(class_name.to_string()),
            content: full_content,
            line_start: Some(base_offset + *ws as i64),
            line_end: Some(base_offset + *we as i64),
            token_count: Some(seg_tokens),
        });
    }

    (String::new(), 0)
}

pub fn tokenize(text: &str) -> Vec<String> {
    let stop_words: HashSet<&str> = [
        "a", "an", "the", "is", "in", "at", "for", "to", "of", "on", "with", "by", "from", "as",
        "be", "this", "that", "it", "was", "are", "have", "has", "had", "do", "does", "did",
        "will", "would", "could", "should", "may", "might", "shall", "can", "need", "dare",
        "ought", "used",
    ]
    .iter()
    .cloned()
    .collect();

    text.split(|c: char| c.is_whitespace() || c.is_ascii_punctuation())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_lowercase())
        .filter(|s| s.len() > 1 && !stop_words.contains(s.as_str()))
        .collect()
}

pub fn build_bm25_index(db: &Connection, project_id: &str) -> Result<(), String> {
    let mut chunk_stmt = db
        .prepare(
            "SELECT cc.id, cc.content FROM codebase_chunks cc
             JOIN codebase_files cf ON cc.file_id = cf.id
             WHERE cf.project_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let chunks: Vec<(String, String)> = chunk_stmt
        .query_map(rusqlite::params![project_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    for (chunk_id, content) in &chunks {
        let tokens = tokenize(content);
        let mut freq: HashMap<String, i64> = HashMap::new();
        for token in tokens {
            *freq.entry(token).or_insert(0) += 1;
        }

        for (token, count) in freq {
            db.execute(
                "INSERT OR IGNORE INTO codebase_bm25_index (id, chunk_id, token, frequency) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![format!("bm25-{}", Uuid::new_v4()), chunk_id, token, count],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

pub fn search_bm25(
    db: &Connection,
    project_id: &str,
    query: &str,
    top_k: i64,
) -> Result<Vec<SearchResult>, String> {
    let query_tokens = tokenize(query);
    if query_tokens.is_empty() {
        return Ok(Vec::new());
    }

    let total_chunks: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM codebase_chunks cc
             JOIN codebase_files cf ON cc.file_id = cf.id
             WHERE cf.project_id = ?1",
            rusqlite::params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if total_chunks == 0 {
        return Ok(Vec::new());
    }

    let mut chunk_token_counts: HashMap<String, i64> = HashMap::new();
    let mut tc_stmt = db
        .prepare(
            "SELECT cc.id, cc.token_count FROM codebase_chunks cc
             JOIN codebase_files cf ON cc.file_id = cf.id
             WHERE cf.project_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let tc_rows: Vec<(String, Option<i64>)> = tc_stmt
        .query_map(rusqlite::params![project_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, Option<i64>>(1)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    for (chunk_id, tc) in tc_rows {
        chunk_token_counts.insert(chunk_id, tc.unwrap_or(0));
    }

    let avgdl: f64 = if !chunk_token_counts.is_empty() {
        let sum: i64 = chunk_token_counts.values().sum();
        sum as f64 / chunk_token_counts.len() as f64
    } else {
        1.0
    };

    let k1 = 1.2;
    let b = 0.75;

    let mut chunk_scores: HashMap<
        String,
        (
            f64,
            Option<String>,
            Option<String>,
            Option<i64>,
            Option<i64>,
        ),
    > = HashMap::new();

    for qt in &query_tokens {
        let matching: Vec<(String, i64)> = {
            let mut m_stmt = db
                .prepare(
                    "SELECT bi.chunk_id, bi.frequency FROM codebase_bm25_index bi
                     JOIN codebase_chunks cc ON bi.chunk_id = cc.id
                     JOIN codebase_files cf ON cc.file_id = cf.id
                     WHERE bi.token = ?1 AND cf.project_id = ?2",
                )
                .map_err(|e| e.to_string())?;

            let mapped = m_stmt
                .query_map(rusqlite::params![qt, project_id], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
                })
                .map_err(|e| e.to_string())?;
            mapped
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?
        };

        let n_qt = matching.len() as f64;
        let idf = (1.0 + (total_chunks as f64 - n_qt + 0.5) / (n_qt + 0.5)).ln();

        for (chunk_id, tf) in &matching {
            let dl = *chunk_token_counts.get(chunk_id).unwrap_or(&1) as f64;
            let score =
                idf * (*tf as f64 * (k1 + 1.0)) / (*tf as f64 + k1 * (1.0 - b + b * (dl / avgdl)));

            let entry = chunk_scores
                .entry(chunk_id.clone())
                .or_insert((0.0, None, None, None, None));
            entry.0 += score;
        }
    }

    let mut flattened: Vec<(String, f64)> = chunk_scores
        .iter()
        .map(|(k, (v, _, _, _, _))| (k.clone(), *v))
        .collect();

    flattened.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    let top_chunks: Vec<String> = flattened
        .into_iter()
        .take(top_k as usize)
        .map(|(id, _)| id)
        .collect();

    let mut results = Vec::new();
    for chunk_id in top_chunks {
        let detail: Option<(String, Option<String>, String, Option<i64>, Option<i64>)> = db
            .query_row(
                "SELECT cf.file_path, cc.symbol_name, cc.content, cc.line_start, cc.line_end
                 FROM codebase_chunks cc
                 JOIN codebase_files cf ON cc.file_id = cf.id
                 WHERE cc.id = ?1",
                rusqlite::params![chunk_id],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, Option<String>>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, Option<i64>>(3)?,
                        row.get::<_, Option<i64>>(4)?,
                    ))
                },
            )
            .ok();

        if let Some((file_path, symbol_name, content, ls, le)) = detail {
            let score = chunk_scores
                .get(&chunk_id)
                .map(|(s, _, _, _, _)| *s)
                .unwrap_or(0.0);
            results.push(SearchResult {
                chunk_id,
                file_path,
                symbol_name,
                content,
                relevance_score: score,
                match_type: "bm25".to_string(),
                line_start: ls,
                line_end: le,
            });
        }
    }

    Ok(results)
}

pub fn search_codebase(
    db: &Connection,
    project_id: &str,
    query: &str,
    top_k: i64,
) -> Result<Vec<SearchResult>, String> {
    let mut results = search_bm25(db, project_id, query, top_k)?;

    let query_tokens: HashSet<String> = tokenize(query).into_iter().collect();

    // Entity boost: boost results whose file contains symbols matching query tokens
    for result in &mut results {
        let mut boost = 1.0;
        let file_symbols: Vec<String> = {
            let mut s_stmt = db
                .prepare(
                    "SELECT cs.symbol_name FROM codebase_symbols cs
                     JOIN codebase_files cf ON cs.file_id = cf.id
                     WHERE cf.file_path = ?1",
                )
                .map_err(|e| e.to_string())?;

            let s_mapped = s_stmt
                .query_map(rusqlite::params![result.file_path], |row| {
                    row.get::<_, String>(0)
                })
                .map_err(|e| e.to_string())?;
            s_mapped
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?
        };
        for sym in &file_symbols {
            let sym_lower = sym.to_lowercase();
            if query_tokens.contains(&sym_lower) {
                boost = 1.5;
                break;
            }
        }

        result.relevance_score *= boost;
        if boost > 1.0 {
            result.match_type = "hybrid".to_string();
        }
    }

    // Graph expansion: from top results, find neighbor files and add their chunks
    let top_file_paths: HashSet<String> = results
        .iter()
        .take(3)
        .map(|r| r.file_path.clone())
        .collect();

    let mut neighbor_ids: Vec<String> = Vec::new();
    for fp in &top_file_paths {
        let sources: Vec<String> = {
            let mut stmt = db
                .prepare(
                    "SELECT cf.id FROM codebase_dependencies cd
                     JOIN codebase_files cf ON cd.target_file_id = cf.id
                     WHERE cd.source_file_id = (SELECT id FROM codebase_files WHERE file_path = ?1 AND project_id = ?2 LIMIT 1)
                     LIMIT 5",
                )
                .map_err(|e| e.to_string())?;

            let sources_mapped = stmt.query_map(rusqlite::params![fp, project_id], |row| {
                row.get::<_, String>(0)
            })
            .map_err(|e| e.to_string())?;
            sources_mapped
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
        };
        neighbor_ids.extend(sources);
    }

    for nid in neighbor_ids {
        let neighbor_chunks: Vec<SearchResult> = {
            let mut stmt = db
                .prepare(
                    "SELECT cc.id, cf.file_path, cc.symbol_name, cc.content, cc.line_start, cc.line_end, cc.token_count
                     FROM codebase_chunks cc
                     JOIN codebase_files cf ON cc.file_id = cf.id
                     WHERE cc.file_id = ?1
                     LIMIT 3",
                )
                .map_err(|e| e.to_string())?;

            let neighbor_mapped = stmt.query_map(rusqlite::params![nid], |row| {
                Ok(SearchResult {
                    chunk_id: row.get::<_, String>(0)?,
                    file_path: row.get::<_, String>(1)?,
                    symbol_name: row.get::<_, Option<String>>(2)?,
                    content: row.get::<_, String>(3)?,
                    relevance_score: 0.5,
                    match_type: "hybrid".to_string(),
                    line_start: row.get::<_, Option<i64>>(4)?,
                    line_end: row.get::<_, Option<i64>>(5)?,
                })
            })
            .map_err(|e| e.to_string())?;
            neighbor_mapped
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
        };
        results.extend(neighbor_chunks);
    }

    results.sort_by(|a, b| {
        b.relevance_score
            .partial_cmp(&a.relevance_score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    results.truncate(top_k as usize);

    Ok(results)
}

pub fn get_file_signature_ladder(
    db: &Connection,
    file_id: &str,
    level: &str,
) -> Result<String, String> {
    let file: CodebaseFile = db
        .query_row(
            "SELECT id, project_id, file_path, file_name, extension, language, loc, last_modified, coverage_status, last_indexed_at
             FROM codebase_files WHERE id = ?1",
            rusqlite::params![file_id],
            |row| {
                Ok(CodebaseFile {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    file_path: row.get(2)?,
                    file_name: row.get(3)?,
                    extension: row.get(4)?,
                    language: row.get(5)?,
                    loc: row.get(6)?,
                    last_modified: row.get(7)?,
                    coverage_status: row.get(8)?,
                    last_indexed_at: row.get(9)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    let symbols: Vec<CodebaseSymbol> = {
        let mut stmt = db
            .prepare(
                "SELECT id, file_id, symbol_name, symbol_type, signature, line_start, line_end, parent_symbol_id, page_rank
                 FROM codebase_symbols WHERE file_id = ?1 ORDER BY line_start",
            )
            .map_err(|e| e.to_string())?;

        let sym_mapped = stmt.query_map(rusqlite::params![file_id], |row| {
            Ok(CodebaseSymbol {
                id: row.get(0)?,
                file_id: row.get(1)?,
                symbol_name: row.get(2)?,
                symbol_type: row.get(3)?,
                signature: row.get(4)?,
                line_start: row.get(5)?,
                line_end: row.get(6)?,
                parent_symbol_id: row.get(7)?,
                page_rank: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;
        sym_mapped
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?
    };

    match level {
        "L0" => {
            let exported: Vec<String> = symbols
                .iter()
                .map(|s| format!("{}: {}", s.symbol_type, s.symbol_name))
                .collect();
            Ok(format!(
                "File: {}\nExported: {}",
                file.file_name,
                exported.join(", ")
            ))
        }
        "L1" => {
            let sigs: Vec<String> = symbols
                .iter()
                .map(|s| s.signature.as_deref().unwrap_or(&s.symbol_name).to_string())
                .collect();
            Ok(sigs.join("\n"))
        }
        "L2" => {
            let lines: Vec<String> = symbols
                .iter()
                .map(|s| {
                    let sig = s.signature.as_deref().unwrap_or(&s.symbol_name);
                    let loc = s
                        .line_end
                        .zip(s.line_start)
                        .map(|(e, st)| (e - st).to_string())
                        .unwrap_or_else(|| "?".to_string());
                    let summary = sig.chars().take(80).collect::<String>();
                    format!("{} [{} lines] {}", sig, loc, summary)
                })
                .collect();
            Ok(lines.join("\n"))
        }
        "L3" => {
            let content = fs::read_to_string(&file.file_path).map_err(|e| e.to_string())?;
            Ok(content)
        }
        _ => Err(format!("Unknown signature level: {}", level)),
    }
}

pub fn get_coverage_stats(db: &Connection, project_id: &str) -> Result<CodebaseCoverage, String> {
    let total_files: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM codebase_files WHERE project_id = ?1",
            rusqlite::params![project_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let mapped: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM codebase_files WHERE project_id = ?1 AND coverage_status = 'mapped'",
            rusqlite::params![project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let summarized: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM codebase_files WHERE project_id = ?1 AND coverage_status = 'summarized'",
            rusqlite::params![project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let analyzed: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM codebase_files WHERE project_id = ?1 AND coverage_status = 'analyzed'",
            rusqlite::params![project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let unexplored: i64 = db
        .query_row(
            "SELECT COUNT(*) FROM codebase_files WHERE project_id = ?1 AND (coverage_status IS NULL OR coverage_status = 'unexplored')",
            rusqlite::params![project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let coverage_pct = if total_files > 0 {
        let covered = mapped + summarized + analyzed;
        (covered as f64 / total_files as f64) * 100.0
    } else {
        0.0
    };

    Ok(CodebaseCoverage {
        total_files,
        mapped,
        summarized,
        analyzed,
        unexplored,
        coverage_pct,
    })
}

pub fn invalidate_cache(db: &Connection, project_id: &str, file_path: &str) -> Result<(), String> {
    let file_id: Option<String> = db
        .query_row(
            "SELECT id FROM codebase_files WHERE project_id = ?1 AND file_path = ?2",
            rusqlite::params![project_id, file_path],
            |row| row.get(0),
        )
        .ok();

    let file_id = match file_id {
        Some(id) => id,
        None => return Ok(()),
    };

    db.execute(
        "DELETE FROM codebase_bm25_index WHERE chunk_id IN (SELECT id FROM codebase_chunks WHERE file_id = ?1)",
        rusqlite::params![file_id],
    )
    .map_err(|e| e.to_string())?;

    db.execute(
        "DELETE FROM codebase_chunks WHERE file_id = ?1",
        rusqlite::params![file_id],
    )
    .map_err(|e| e.to_string())?;

    db.execute(
        "DELETE FROM codebase_symbols WHERE file_id = ?1",
        rusqlite::params![file_id],
    )
    .map_err(|e| e.to_string())?;

    db.execute(
        "DELETE FROM codebase_dependencies WHERE source_file_id = ?1 OR target_file_id = ?1",
        rusqlite::params![file_id],
    )
    .map_err(|e| e.to_string())?;

    db.execute(
        "UPDATE codebase_files SET coverage_status = 'unexplored', last_indexed_at = NULL WHERE id = ?1",
        rusqlite::params![file_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn get_repo_map(db: &Connection, project_id: &str) -> Result<Vec<RepoMapOutput>, String> {
    let mut stmt = db
        .prepare(
            "SELECT cs.symbol_name, cs.symbol_type, cs.signature, cs.line_start, cf.file_path
             FROM codebase_symbols cs
             JOIN codebase_files cf ON cs.file_id = cf.id
             WHERE cf.project_id = ?1 AND cs.page_rank > 0.0
             ORDER BY cs.page_rank DESC, cs.line_start ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows: Vec<(String, String, Option<String>, Option<i64>, String)> = stmt
        .query_map(rusqlite::params![project_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<i64>>(3)?,
                row.get::<_, String>(4)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut file_map: HashMap<String, Vec<SymbolBrief>> = HashMap::new();
    for (symbol_name, symbol_type, signature, line_start, file_path) in rows {
        file_map.entry(file_path).or_default().push(SymbolBrief {
            symbol_name,
            symbol_type,
            signature,
            line_start,
        });
    }

    let mut output: Vec<RepoMapOutput> = file_map
        .into_iter()
        .map(|(file_path, symbols)| RepoMapOutput { file_path, symbols })
        .collect();

    output.sort_by(|a, b| a.file_path.cmp(&b.file_path));
    Ok(output)
}
