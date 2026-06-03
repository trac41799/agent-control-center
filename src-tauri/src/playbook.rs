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

// === W5.D: Playbook Export/Import (.acc zip format) ===

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybookAssets {
    pub skills: Vec<String>,
    pub memory_files: Vec<String>,
    pub mcp_ids: Vec<String>,
    pub preset_ids: Vec<String>,
    pub profile_id: Option<String>,
}

const FEATURE_DOC_TYPES: &[&str] = &[
    "EXECUTIVE_PLAN",
    "TECHNICAL_PLAN",
    "CHANGELOG",
    "QA_REPORT",
];

fn crc32(data: &[u8]) -> u32 {
    let mut crc: u32 = 0xFFFFFFFF;
    for &b in data {
        crc ^= b as u32;
        for _ in 0..8 {
            let lsb = crc & 1;
            crc = if lsb != 0 { (crc >> 1) ^ 0xEDB88320 } else { crc >> 1 };
        }
    }
    !crc
}

fn dos_time_now() -> (u16, u16) {
    let now = chrono::Utc::now();
    let secs = now.timestamp() as i64;
    let time = ((secs / 2) % 86400) as u32;
    let hour = (time / 3600) as u16;
    let minute = ((time % 3600) / 60) as u16;
    let second = ((time % 60) * 2) as u16;
    let dos_time: u16 = (hour << 11) | (minute << 5) | second;
    let mut day_counter = 0i64;
    let mut y = 1980i64;
    let mut m = 1i64;
    let mut d = 1i64;
    let days_from_epoch = (secs / 86400) + (if secs % 86400 < 0 { -1 } else { 0 });
    let mut remaining = days_from_epoch;
    loop {
        let leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
        let year_days = if leap { 366 } else { 365 };
        if remaining < year_days { break; }
        remaining -= year_days;
        y += 1;
    }
    let mdays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let leap = (y % 4 == 0 && y % 100 != 0) || y % 400 == 0;
    let mut month_days = mdays;
    if leap { month_days[1] = 29; }
    for (i, &md) in month_days.iter().enumerate() {
        if remaining < md { m = (i + 1) as i64; d = remaining + 1; break; }
        remaining -= md;
    }
    let _ = day_counter;
    let dos_date: u16 = (((y - 1980) as u16) << 9) | ((m as u16) << 5) | (d as u16);
    (dos_time, dos_date)
}

struct ZipEntry {
    name: String,
    data: Vec<u8>,
    crc: u32,
    size: u32,
    local_offset: u32,
    dos_time: u16,
    dos_date: u16,
}

fn zip_write_zip(entries: &[ZipEntry], dst: &std::path::Path) -> Result<(), String> {
    use std::io::{Seek, Write};
    let file = std::fs::File::create(dst).map_err(|e| format!("create zip: {e}"))?;
    let mut w = std::io::BufWriter::new(file);

    let mut central: Vec<u8> = Vec::new();
    let mut entry_count: u16 = 0;

    for e in entries {
        let name_bytes = e.name.as_bytes();
        let crc = e.crc;
        let size = e.size;
        let local_offset = w.get_mut().seek(std::io::SeekFrom::Current(0)).map_err(|err| format!("zip offset: {err}"))? as u32;

        w.write_all(&0x04034b50u32.to_le_bytes()).map_err(|err| format!("zip hdr: {err}"))?;
        w.write_all(&20u16.to_le_bytes()).map_err(|err| format!("zip ver: {err}"))?;
        w.write_all(&0u16.to_le_bytes()).map_err(|err| format!("zip flags: {err}"))?;
        w.write_all(&0u16.to_le_bytes()).map_err(|err| format!("zip method: {err}"))?;
        w.write_all(&e.dos_time.to_le_bytes()).map_err(|err| format!("zip time: {err}"))?;
        w.write_all(&e.dos_date.to_le_bytes()).map_err(|err| format!("zip date: {err}"))?;
        w.write_all(&crc.to_le_bytes()).map_err(|err| format!("zip crc: {err}"))?;
        w.write_all(&size.to_le_bytes()).map_err(|err| format!("zip csize: {err}"))?;
        w.write_all(&size.to_le_bytes()).map_err(|err| format!("zip usize: {err}"))?;
        w.write_all(&(name_bytes.len() as u16).to_le_bytes()).map_err(|err| format!("zip nlen: {err}"))?;
        w.write_all(&0u16.to_le_bytes()).map_err(|err| format!("zip elen: {err}"))?;
        w.write_all(name_bytes).map_err(|err| format!("zip name: {err}"))?;
        w.write_all(&e.data).map_err(|err| format!("zip data: {err}"))?;

        central.write_all(&0x02014b50u32.to_le_bytes()).map_err(|err| format!("cd sig: {err}"))?;
        central.write_all(&20u16.to_le_bytes()).map_err(|err| format!("cd ver made: {err}"))?;
        central.write_all(&20u16.to_le_bytes()).map_err(|err| format!("cd ver need: {err}"))?;
        central.write_all(&0u16.to_le_bytes()).map_err(|err| format!("cd flags: {err}"))?;
        central.write_all(&0u16.to_le_bytes()).map_err(|err| format!("cd method: {err}"))?;
        central.write_all(&e.dos_time.to_le_bytes()).map_err(|err| format!("cd time: {err}"))?;
        central.write_all(&e.dos_date.to_le_bytes()).map_err(|err| format!("cd date: {err}"))?;
        central.write_all(&crc.to_le_bytes()).map_err(|err| format!("cd crc: {err}"))?;
        central.write_all(&size.to_le_bytes()).map_err(|err| format!("cd csize: {err}"))?;
        central.write_all(&size.to_le_bytes()).map_err(|err| format!("cd usize: {err}"))?;
        central.write_all(&(name_bytes.len() as u16).to_le_bytes()).map_err(|err| format!("cd nlen: {err}"))?;
        central.write_all(&0u16.to_le_bytes()).map_err(|err| format!("cd elen: {err}"))?;
        central.write_all(&0u16.to_le_bytes()).map_err(|err| format!("cd clen: {err}"))?;
        central.write_all(&0u16.to_le_bytes()).map_err(|err| format!("cd dlen: {err}"))?;
        central.write_all(&0u16.to_le_bytes()).map_err(|err| format!("cd attr: {err}"))?;
        central.write_all(&0u32.to_le_bytes()).map_err(|err| format!("cd eatr: {err}"))?;
        central.write_all(&local_offset.to_le_bytes()).map_err(|err| format!("cd off: {err}"))?;
        central.write_all(name_bytes).map_err(|err| format!("cd name: {err}"))?;

        entry_count += 1;
        let _ = local_offset;
    }

    let central_start = w.get_mut().seek(std::io::SeekFrom::Current(0)).map_err(|err| format!("central start: {err}"))? as u32;
    w.write_all(&central).map_err(|err| format!("central write: {err}"))?;
    let central_size = central.len() as u32;

    w.write_all(&0x06054b50u32.to_le_bytes()).map_err(|err| format!("eocd sig: {err}"))?;
    w.write_all(&0u16.to_le_bytes()).map_err(|err| format!("eocd disk: {err}"))?;
    w.write_all(&0u16.to_le_bytes()).map_err(|err| format!("eocd sdisk: {err}"))?;
    w.write_all(&entry_count.to_le_bytes()).map_err(|err| format!("eocd count: {err}"))?;
    w.write_all(&entry_count.to_le_bytes()).map_err(|err| format!("eocd tcount: {err}"))?;
    w.write_all(&central_size.to_le_bytes()).map_err(|err| format!("eocd csize: {err}"))?;
    w.write_all(&central_start.to_le_bytes()).map_err(|err| format!("eocd coff: {err}"))?;
    w.write_all(&0u16.to_le_bytes()).map_err(|err| format!("eocd clen: {err}"))?;

    w.flush().map_err(|err| format!("flush: {err}"))?;
    Ok(())
}

fn zip_read_zip(src: &std::path::Path, dest_dir: &std::path::Path) -> Result<(), String> {
    use std::io::{Read, Seek, SeekFrom};
    let mut f = std::fs::File::open(src).map_err(|e| format!("open zip: {e}"))?;
    let total_size = f.metadata().map_err(|e| format!("zip meta: {e}"))?.len();

    f.seek(SeekFrom::End(-22)).map_err(|e| format!("seek eocd: {e}"))?;
    let mut tail = [0u8; 22];
    f.read_exact(&mut tail).map_err(|e| format!("read eocd: {e}"))?;
    if &tail[0..4] != &0x06054b50u32.to_le_bytes() {
        return Err("Not a zip file (EOCD signature mismatch)".to_string());
    }
    let central_size = u32::from_le_bytes(tail[12..16].try_into().unwrap()) as usize;
    let central_offset = u32::from_le_bytes(tail[16..20].try_into().unwrap()) as usize;
    let entry_count = u16::from_le_bytes(tail[10..12].try_into().unwrap()) as usize;
    if entry_count == 0 || central_size == 0 {
        return Err("Zip has no entries".to_string());
    }
    if (central_offset + central_size) as u64 > total_size {
        return Err("Zip central directory out of range".to_string());
    }

    f.seek(SeekFrom::Start(central_offset as u64)).map_err(|e| format!("seek central: {e}"))?;
    let mut central_buf = vec![0u8; central_size];
    f.read_exact(&mut central_buf).map_err(|e| format!("read central: {e}"))?;

    let mut i = 0usize;
    for _ in 0..entry_count {
        if &central_buf[i..i + 4] != &0x02014b50u32.to_le_bytes() {
            return Err("Central directory entry signature mismatch".to_string());
        }
        let comp_method = u16::from_le_bytes(central_buf[i + 10..i + 12].try_into().unwrap());
        let comp_size = u32::from_le_bytes(central_buf[i + 20..i + 24].try_into().unwrap()) as usize;
        let name_len = u16::from_le_bytes(central_buf[i + 28..i + 30].try_into().unwrap()) as usize;
        let extra_len = u16::from_le_bytes(central_buf[i + 30..i + 32].try_into().unwrap()) as usize;
        let comment_len = u16::from_le_bytes(central_buf[i + 32..i + 34].try_into().unwrap()) as usize;
        let local_offset = u32::from_le_bytes(central_buf[i + 42..i + 46].try_into().unwrap()) as u64;

        let name_start = i + 46;
        let name_end = name_start + name_len;
        let name = std::str::from_utf8(&central_buf[name_start..name_end])
            .map_err(|e| format!("entry name utf8: {e}"))?
            .to_string();
        i = name_end + extra_len + comment_len;

        f.seek(SeekFrom::Start(local_offset)).map_err(|e| format!("seek local: {e}"))?;
        let mut local_hdr = [0u8; 30];
        f.read_exact(&mut local_hdr).map_err(|e| format!("read local hdr: {e}"))?;
        if &local_hdr[0..4] != &0x04034b50u32.to_le_bytes() {
            return Err(format!("Local header signature mismatch for {name}"));
        }
        let l_name_len = u16::from_le_bytes(local_hdr[26..28].try_into().unwrap()) as usize;
        let l_extra_len = u16::from_le_bytes(local_hdr[28..30].try_into().unwrap()) as usize;
        f.seek(SeekFrom::Current((l_name_len + l_extra_len) as i64))
            .map_err(|e| format!("seek past name: {e}"))?;

        let mut data = vec![0u8; comp_size];
        f.read_exact(&mut data).map_err(|e| format!("read entry data: {e}"))?;
        if comp_method != 0 {
            return Err(format!("Entry '{name}' is compressed (method {comp_method}); only store-only is supported").to_string());
        }

        let out_path = dest_dir.join(&name);
        if let Some(parent) = out_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("mkdir for {name}: {e}"))?;
        }
        std::fs::write(&out_path, &data).map_err(|e| format!("write {name}: {e}"))?;
    }

    Ok(())
}

pub fn collect_skills_from_home() -> Vec<String> {
    let home = std::env::var("HOME").unwrap_or_default();
    if home.is_empty() {
        return Vec::new();
    }
    let mut paths: Vec<String> = Vec::new();
    for sub in [".claude/skills", ".opencode/skills", ".gemini/skills"] {
        let dir = std::path::Path::new(&home).join(sub);
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.extension().map_or(false, |e| e == "md") {
                    paths.push(p.to_string_lossy().to_string());
                }
            }
        }
    }
    paths
}

pub fn collect_memory_files_for_project(project_path: &str) -> Vec<String> {
    let known: &[(&str, &str)] = &[
        ("CLAUDE.md", "claude"),
        ("GEMINI.md", "gemini"),
        ("AGENTS.md", "opencode"),
        ("CONVENTIONS.md", "opencode"),
        ("qwen.md", "qwen"),
    ];
    let mut out: Vec<String> = Vec::new();
    for (rel, _agent) in known {
        let full = std::path::Path::new(project_path).join(rel);
        if full.exists() {
            out.push(full.to_string_lossy().to_string());
        }
    }
    out
}

pub fn collect_mcp_ids(db: &Connection) -> Result<Vec<String>, String> {
    let mut stmt = db
        .prepare("SELECT id FROM mcps_registry")
        .map_err(|e| e.to_string())?;
    let ids: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(ids)
}

pub fn collect_preset_ids(db: &Connection) -> Result<Vec<String>, String> {
    let mut stmt = db
        .prepare("SELECT id FROM presets")
        .map_err(|e| e.to_string())?;
    let ids: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    Ok(ids)
}

pub fn collect_profile_id(db: &Connection) -> Result<Option<String>, String> {
    let mut stmt = db
        .prepare("SELECT id FROM projects ORDER BY updated_at DESC LIMIT 1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;
    Ok(rows.next().and_then(|r| r.ok()))
}

pub fn build_playbook_assets(db: &Connection, project_path: Option<&str>) -> Result<PlaybookAssets, String> {
    Ok(PlaybookAssets {
        skills: collect_skills_from_home(),
        memory_files: match project_path {
            Some(p) => collect_memory_files_for_project(p),
            None => Vec::new(),
        },
        mcp_ids: collect_mcp_ids(db)?,
        preset_ids: collect_preset_ids(db)?,
        profile_id: collect_profile_id(db)?,
    })
}

pub fn export_playbook(
    db: &Connection,
    name: &str,
    project_path: Option<&str>,
    output_path: &str,
) -> Result<PlaybookManifest, String> {
    let assets = build_playbook_assets(db, project_path)?;
    let manifest = PlaybookManifest {
        version: "1.0".to_string(),
        name: name.to_string(),
        project: project_path.unwrap_or("").to_string(),
        exported_at: Utc::now().to_rfc3339(),
        stacks: Vec::new(),
        includes: vec!["profile".to_string(), "assets".to_string()],
    };

    let (dos_time, dos_date) = dos_time_now();
    let mut entries: Vec<ZipEntry> = Vec::new();

    let mut manifest_json = serde_json::to_string_pretty(&serde_json::json!({
        "manifest": manifest,
        "assets": assets,
    }))
    .map_err(|e| format!("manifest json: {e}"))?;
    manifest_json.push('\n');
    let manifest_bytes = manifest_json.into_bytes();
    let manifest_crc = crc32(&manifest_bytes);
    entries.push(ZipEntry {
        name: "manifest.json".to_string(),
        crc: manifest_crc,
        size: manifest_bytes.len() as u32,
        data: manifest_bytes,
        local_offset: 0,
        dos_time,
        dos_date,
    });

    for skill_path in &assets.skills {
        if let Ok(content) = std::fs::read(skill_path) {
            let file_name = std::path::Path::new(skill_path)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "skill.md".to_string());
            let arcname = format!("skills/{}", file_name);
            let crc = crc32(&content);
            entries.push(ZipEntry {
                name: arcname,
                crc,
                size: content.len() as u32,
                data: content,
                local_offset: 0,
                dos_time,
                dos_date,
            });
        }
    }

    for mem_path in &assets.memory_files {
        if let Ok(content) = std::fs::read(mem_path) {
            let file_name = std::path::Path::new(mem_path)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "memory.md".to_string());
            let arcname = format!("memory/{}", file_name);
            let crc = crc32(&content);
            entries.push(ZipEntry {
                name: arcname,
                crc,
                size: content.len() as u32,
                data: content,
                local_offset: 0,
                dos_time,
                dos_date,
            });
        }
    }

    for mcp_id in &assets.mcp_ids {
        let line = format!("{}\n", mcp_id);
        let bytes = line.into_bytes();
        let crc = crc32(&bytes);
        entries.push(ZipEntry {
            name: format!("mcps/{}.id", mcp_id),
            crc,
            size: bytes.len() as u32,
            data: bytes,
            local_offset: 0,
            dos_time,
            dos_date,
        });
    }

    for preset_id in &assets.preset_ids {
        let line = format!("{}\n", preset_id);
        let bytes = line.into_bytes();
        let crc = crc32(&bytes);
        entries.push(ZipEntry {
            name: format!("presets/{}.id", preset_id),
            crc,
            size: bytes.len() as u32,
            data: bytes,
            local_offset: 0,
            dos_time,
            dos_date,
        });
    }

    let dst = std::path::Path::new(output_path);
    if let Some(parent) = dst.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).map_err(|e| format!("mkdir for output: {e}"))?;
        }
    }
    zip_write_zip(&entries, dst)?;

    Ok(manifest)
}

pub fn import_playbook(
    db: &Connection,
    zip_path: &str,
    project_path: &str,
) -> Result<PlaybookManifest, String> {
    let zip = std::path::Path::new(zip_path);
    if !zip.exists() {
        return Err(format!("Zip not found: {zip_path}"));
    }

    let temp_dir = std::env::temp_dir().join(format!("acc_import_{}", Uuid::new_v4()));
    std::fs::create_dir_all(&temp_dir).map_err(|e| format!("tempdir: {e}"))?;
    let extract_result = zip_read_zip(zip, &temp_dir);

    let result = (|| -> Result<PlaybookManifest, String> {
        extract_result?;

        let manifest_path = temp_dir.join("manifest.json");
        let manifest_str = std::fs::read_to_string(&manifest_path)
            .map_err(|e| format!("manifest.json missing: {e}"))?;
        let manifest_value: serde_json::Value = serde_json::from_str(&manifest_str)
            .map_err(|e| format!("manifest parse: {e}"))?;
        let manifest_obj = manifest_value
            .get("manifest")
            .cloned()
            .ok_or_else(|| "manifest field missing".to_string())?;
        let manifest: PlaybookManifest = serde_json::from_value(manifest_obj)
            .map_err(|e| format!("manifest decode: {e}"))?;
        let assets_value = manifest_value
            .get("assets")
            .cloned()
            .unwrap_or(serde_json::json!({}));
        let assets: PlaybookAssets = serde_json::from_value(assets_value)
            .map_err(|e| format!("assets decode: {e}"))?;

        let project_skills_dir = std::path::Path::new(project_path)
            .join(".claude")
            .join("skills");
        std::fs::create_dir_all(&project_skills_dir)
            .map_err(|e| format!("mkdir project skills: {e}"))?;
        let skills_src = temp_dir.join("skills");
        if skills_src.exists() {
            if let Ok(entries) = std::fs::read_dir(&skills_src) {
                for entry in entries.flatten() {
                    let from = entry.path();
                    if from.is_file() {
                        let to = project_skills_dir.join(entry.file_name());
                        std::fs::copy(&from, &to)
                            .map_err(|e| format!("copy skill: {e}"))?;
                    }
                }
            }
        }

        let memory_dst = std::path::Path::new(project_path);
        let memory_src = temp_dir.join("memory");
        if memory_src.exists() {
            if let Ok(entries) = std::fs::read_dir(&memory_src) {
                for entry in entries.flatten() {
                    let from = entry.path();
                    if from.is_file() {
                        let to = memory_dst.join(entry.file_name());
                        std::fs::copy(&from, &to)
                            .map_err(|e| format!("copy memory: {e}"))?;
                    }
                }
            }
        }

        for mcp_id in &assets.mcp_ids {
            let _ = crate::assets::write_mcp_to_target(db, "claude", mcp_id, true);
        }

        Ok(manifest)
    })();

    let _ = std::fs::remove_dir_all(&temp_dir);
    result
}

// === W5.D: 4-Call Feature Doc Generator ===

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureDocResult {
    pub doc_type: String,
    pub content: String,
    pub model: String,
    pub tokens_used: u32,
}

pub async fn generate_feature_docs(
    plan_id: &str,
    session_id: &str,
    feature_name: &str,
    api_key: &str,
) -> Result<Vec<FeatureDocResult>, String> {
    if api_key.is_empty() {
        return Err("OPENROUTER_API_KEY not set".to_string());
    }

    let mut docs: Vec<FeatureDocResult> = Vec::new();
    for doc_type in FEATURE_DOC_TYPES {
        let prompt = build_feature_doc_prompt(doc_type, session_id, feature_name);
        let augmented = format!(
            "{prompt}\n\n---\nPlan ID: {plan_id}\nSession ID: {session_id}\nFeature: {feature_name}\nDoc Type: {doc_type}\n---"
        );
        let req = crate::intelligence::OpenRouterRequest {
            prompt: augmented,
            model: Some("deepseek/deepseek-chat-v3".to_string()),
            priority: crate::intelligence::Priority::Normal,
            max_tokens: Some(2048),
            temperature: Some(0.4),
        };
        let resp = crate::intelligence::invoke_with_backoff(req, api_key, 3)
            .await
            .map_err(|e| format!("{doc_type} generation failed: {e}"))?;
        docs.push(FeatureDocResult {
            doc_type: doc_type.to_string(),
            content: resp.content,
            model: resp.model,
            tokens_used: resp.tokens_used,
        });
    }
    Ok(docs)
}

pub fn write_feature_docs_to_disk(
    docs: &[FeatureDocResult],
    project_docs_dir: &std::path::Path,
    feature_slug: &str,
) -> Result<Vec<String>, String> {
    std::fs::create_dir_all(project_docs_dir)
        .map_err(|e| format!("mkdir docs: {e}"))?;
    let mut written: Vec<String> = Vec::new();
    for d in docs {
        let file_name = match d.doc_type.as_str() {
            "EXECUTIVE_PLAN" => format!("{feature_slug}-EXECUTIVE_PLAN.md"),
            "TECHNICAL_PLAN" => format!("{feature_slug}-TECHNICAL_PLAN.md"),
            "CHANGELOG" => format!("{feature_slug}-CHANGELOG.md"),
            "QA_REPORT" => format!("{feature_slug}-QA_REPORT.md"),
            _ => format!("{feature_slug}-{}.md", d.doc_type),
        };
        let path = project_docs_dir.join(&file_name);
        std::fs::write(&path, &d.content)
            .map_err(|e| format!("write {file_name}: {e}"))?;
        written.push(path.to_string_lossy().to_string());
    }
    Ok(written)
}
