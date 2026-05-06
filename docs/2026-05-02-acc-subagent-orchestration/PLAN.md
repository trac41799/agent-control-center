# SAFE IMPLEMENTATION PLAN — Native Subagent Orchestration

**Date:** 2026-05-02
**Based on:** IMPACT-ASSESSMENT.md (6 gaps identified)
**Priority:** Critical (Gaps 1-3), Medium (Gaps 4-6)
**Strategy:** Additive only — no existing code paths altered; new functions appended, new files created

---

## Gap 1: Orchestrator Native vs External Decision Logic

### Where: `src-tauri/src/orchestrator.rs`

### What to add:

```rust
// New struct for orchestration execution decision
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrchestrationDecision {
    pub agent_ref: String,
    pub path: String,           // "native" | "external"
    pub mechanism: String,      // "task()" | "@agent" | "spawn_agent" | "waveCommand"
    pub detection: String,      // "pty_pattern" | "fs_watch"
    pub command: String,        // The actual command to inject/spawn
}

// Determine orchestration path for a plan agent
pub fn decide_orchestration_path(
    agent_ref: &str,
    agent_id: &str,
    task: &str,
    // We need the AgentConfig here but Rust can't directly import TS.
    // Instead: accept supports_subagents flag and wave_command as params.
    supports_subagents: bool,
    subagent_family: &str,     // "task-tool" | "gemini" | "codex" | "cline" | "cursor"
    wave_command: &str,
) -> OrchestrationDecision {
    if supports_subagents {
        let mechanism = match subagent_family {
            "task-tool" => "task()",
            "gemini" => "@agent",
            "codex" => "spawn_agent",
            "cline" | "cursor" => "native_cli",
            _ => "waveCommand",
        };
        OrchestrationDecision {
            agent_ref: agent_ref.to_string(),
            path: "native".to_string(),
            mechanism: mechanism.to_string(),
            detection: "pty_pattern".to_string(),
            command: format!("task(subagent_type='{}', prompt='{}')", agent_ref, task),
        }
    } else {
        OrchestrationDecision {
            agent_ref: agent_ref.to_string(),
            path: "external".to_string(),
            mechanism: "waveCommand".to_string(),
            detection: "fs_watch".to_string(),
            command: wave_command.replace("{prompt}", task).replace("{model}", "default").replace("{dir}", "."),
        }
    }
}
```

### New Tauri command: `decide_orchestration_path_cmd`

### Affected files: `orchestrator.rs` (append), `commands.rs` (+1 command), `lib.rs` (+1 handler)

---

## Gap 2: Handoff Monitor — PTY Pattern Detection for Native Subagents

### Where: `src-tauri/src/orchestrator.rs`

### What to add:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubagentSpawn {
    pub id: String,
    pub parent_session_id: String,
    pub agent_ref: String,
    pub agent_family: String,
    pub task: String,
    pub detected_at: String,
    pub status: String,
}

// Detect native subagent spawn in PTY output using the agent's subagentDetectionPattern
pub fn detect_subagent_spawn(
    pty_output: &str,
    detection_pattern: &str,     // e.g., "Dispatching subagent|subagent_type"
) -> Option<SubagentSpawn> {
    let patterns: Vec<&str> = detection_pattern.split('|').collect();
    for line in pty_output.lines() {
        for pattern in &patterns {
            if line.contains(pattern) {
                // Extract subagent name/task from the line
                let task = line.to_string();
                return Some(SubagentSpawn {
                    id: Uuid::new_v4().to_string(),
                    parent_session_id: String::new(), // filled by caller
                    agent_ref: String::new(),
                    agent_family: detection_pattern.to_string(),
                    task,
                    detected_at: Utc::now().to_rfc3339(),
                    status: "detected".to_string(),
                });
            }
        }
    }
    None
}
```

### New Tauri command: `detect_subagent_spawn_cmd`

### How the pipeline integrates:

```
PTY output line arrives
  → 1. ANSI strip (existing pipeline)
  → 2. Check against subagentDetectionPattern (NEW)
      └→ Match? → Record SubagentSpawn → Register sub-session → Status chip update
  → 3. Check against limit/error patterns (existing token guard)
  → 4. Check against ACB signal format (existing ACB parser)
  → 5. Rate-limited dispatch to xterm.js (existing)
```

### Affected files: `orchestrator.rs` (append), `commands.rs` (+1), `lib.rs` (+1)

---

## Gap 3: Intelligence Layer — Subagent Outcome Tracking

### Where: `src-tauri/src/intelligence.rs`

### What to add:

```rust
// Subagent detection pattern matcher for PTY output
pub fn detect_subagent_activity(pty_output: &str, patterns: &[&str]) -> Vec<String> {
    let mut detections = Vec::new();
    for line in pty_output.lines() {
        for pattern in patterns {
            if line.contains(pattern) {
                detections.push(line.to_string());
            }
        }
    }
    detections
}

// Get the known detection patterns for all agents
pub fn get_subagent_detection_patterns() -> Vec<(&'static str, &'static str)> {
    vec![
        ("claude", "Dispatching subagent|Agent\\d+ started"),
        ("opencode", "Dispatching subagent|subagent_type"),
        ("qwen-code", "Dispatching subagent|subagent_type"),
        ("gemini", "Delegating|subagent.*started|/agents\\s"),
        ("codex", "spawn_agent|Spawned agent"),
        ("cline", "Spawning subagent|Sub-task started"),
        ("cursor", "Background agent|Parallel agent"),
    ]
}
```

### New Tauri command: `detect_subagent_activity_cmd`, `get_subagent_patterns_cmd`

### Affected files: `intelligence.rs` (append), `commands.rs` (+2), `lib.rs` (+2)

---

## Gap 4: Token Guard — Subagent Attribution

### Where: `src-tauri/src/intelligence.rs`

### What to add:

```rust
// Add subagent_agent_id field to token recording
pub fn record_subagent_token_usage(
    db: &Connection,
    session_id: &str,
    parent_agent_id: Option<&str>,
    subagent_agent_id: Option<&str>,
    context: &str,
    model: Option<&str>,
    tokens_in: i64,
    tokens_out: i64,
) -> Result<TokenUsage, String> {
    // Same as record_token_usage but with subagent attribution
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO token_usage (id, session_id, agent_id, context, model, tokens_in, tokens_out, recorded_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, session_id, subagent_agent_id.or(parent_agent_id), context, model, tokens_in, tokens_out, now],
    ).map_err(|e| e.to_string())?;

    Ok(TokenUsage { id, session_id: session_id.to_string(), agent_id: subagent_agent_id.or(parent_agent_id).map(String::from), context: context.to_string(), model: model.map(String::from), tokens_in, tokens_out, recorded_at: now })
}
```

### New Tauri command: `record_subagent_token_usage_cmd`

---

## Gap 5: Guideline Generator — Subagent Instructions

### Where: `src-tauri/src/orchestrator.rs`

### What to add:

```rust
// Extended guideline with subagent instructions for orchestrator agents
pub fn generate_orchestrator_guideline(
    agent_ref: &str,
    task: &str,
    objective: &str,
    depends_on: Option<&str>,
    supports_subagents: bool,
    subagent_family: &str,
    sub_agent_refs: &[&str],
) -> String {
    let base = generate_agent_guideline(agent_ref, task, objective, depends_on, &[], &[], &[]);
    
    if !supports_subagents || sub_agent_refs.is_empty() {
        return base;
    }
    
    let subagent_section = match subagent_family {
        "task-tool" => format!(
            "## Subagent Delegation (Native — {})\n\n\
             You are the ORCHESTRATOR for this wave. Delegate tasks to subagents using your native task() mechanism:\n\n\
             ```\n\
             {}\n\
             ```\n\n\
             Subagents assigned:\n{}\n\n\
             After all subagents complete, consolidate their outputs and produce the final HANDOFF.",
            agent_ref,
            sub_agent_refs.iter().map(|a| format!("task(subagent_type='{}', prompt='<task specific to {}>')", a, a)).collect::<Vec<_>>().join("\n"),
            sub_agent_refs.iter().map(|a| format!("- **{}** — delegate when ready", a)).collect::<Vec<_>>().join("\n"),
        ),
        "gemini" => format!(
            "## Subagent Delegation (Native — Gemini)\n\n\
             Delegate to subagents using @agent_name syntax:\n{}\n\n\
             Use /agents to list available agents. Each @delegation runs in parallel.",
            sub_agent_refs.iter().map(|a| format!("- `@{} <task>` — delegate to {}", a, a)).collect::<Vec<_>>().join("\n"),
        ),
        "codex" => format!(
            "## Subagent Delegation (Native — Codex)\n\n\
             Use spawn_agent to delegate tasks:\n{}\n\n\
             Each spawned agent runs independently. Monitor their progress via status updates.",
            sub_agent_refs.iter().map(|a| format!("- `spawn_agent('{}', '<task>')`", a)).collect::<Vec<_>>().join("\n"),
        ),
        _ => format!(
            "## Subagent Execution\n\n\
             Subagents will be spawned externally by ACC as separate sessions.\n\
             Coordinate via HANDOFF files written to the docs/ directory.",
        ),
    };
    
    format!("{}\n\n{}", base, subagent_section)
}
```

### New Tauri command: `generate_orchestrator_guideline_cmd`

---

## Gap 6: Runner UI — Orchestrator Mode Toggle

### Where: `src/pages/Runner.tsx` and `src/components/runner/`

### What to add:

1. **Orchestrator mode toggle button** in Runner header that switches between:
   - **Normal mode:** Equal-sized agent panels in responsive grid
   - **Orchestrator mode:** Full-width orchestrator panel on top + smaller sub-agent grid below

2. **Wave dropdown filter:** When orchestrator mode is active, agent dropdowns only show `waveEligible: true` agents (use existing `getWaveEligibleAgents()`)

3. **Per-agent orchestrator badge:** When an agent is the active orchestrator, show "🎯 Orchestrator" badge in its panel header

### New component: `src/components/runner/OrchestratorToggle.tsx`

### Affected files: `Runner.tsx` (modify), new `OrchestratorToggle.tsx` (create)

---

## Implementation Order (Safe, Additive)

| Step | Gap | Files | Commands | Risk |
|------|-----|-------|----------|------|
| 1 | G1 | `orchestrator.rs` + functions | `decide_orchestration_path_cmd` | Low — new function |
| 2 | G2 | `orchestrator.rs` + functions | `detect_subagent_spawn_cmd` | Low — new function |
| 3 | G3 | `intelligence.rs` + functions | `detect_subagent_activity_cmd`, `get_subagent_patterns_cmd` | Low — new functions |
| 4 | G5 | `orchestrator.rs` + function | `generate_orchestrator_guideline_cmd` | Low — extended wrapper |
| 5 | G4 | `intelligence.rs` + function | `record_subagent_token_usage_cmd` | Low — new function |
| 6 | G6 | `Runner.tsx`, `OrchestratorToggle.tsx` | None (frontend only) | Medium — modifies existing page |

---

## Verification Strategy

After each step:
```bash
cargo check && npx tsc --noEmit   # Compilation gate
cargo build                        # Full build gate
```

After all steps:
```bash
cargo check                         # Must be 0 errors, ≤12 warnings
npx tsc --noEmit                    # Must be 0 errors
cargo build                         # Full build must succeed
```

Integration tests (manual):
- Spawn Claude Code (task-tool family) as orchestrator → verify `task()` command generated
- Spawn Aider (no subagents) as orchestrator → verify `waveCommand` fallback used
- Feed PTY output with subagent patterns → verify detection fires
- Generate guideline for task-tool orchestrator → verify subagent delegation section present

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Breaking existing compilation | All changes are additive — new functions, new commands, no existing function signatures changed |
| Conflicting with existing orchestration code | New functions have distinct names (`_orchestrator`, `_subagent` suffixes) |
| Missing AgentConfig data in Rust | `decide_orchestration_path` accepts params directly (supports_subagents: bool, etc.) rather than importing TS config |
| Pipeline integration complexity | Subagent detection is an independent step in the PTY pipeline; doesn't interfere with existing ANSI strip, rate limiter, or ACB parser |
