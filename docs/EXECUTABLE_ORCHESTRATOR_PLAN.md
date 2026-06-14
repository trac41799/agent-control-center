# Executable Orchestrator Plan (Make Wave Real)

**Status:** Ready to execute
**Estimated time:** 3-4 hours
**Methodology:** TDD (Red → Green → Refactor)
**Goal:** Close the 6 critical gaps that prevent the Wave Orchestrator from actually spawning, monitoring, and killing AI agents in isolated worktrees. After completion, SourceForge can run the self-dogfooding experiment on `GAP_CLOSURE_PLAN.md`.

---

## Context (Why This Plan Exists)

The audit at the end of `docs/PRODUCTION_READINESS_ASSESSMENT.md` revealed that the Wave Orchestrator exists in skeleton form (data model, types, CRUD commands, guideline generator, handoff validator, PTY spawner, budget tables) but the **execution loop is unwired**. The 6 critical gaps:

| Gap | Description | Symptom |
|-----|-------------|---------|
| **G1** | `execute_wave` (orchestrator.rs:356) updates DB statuses but never spawns PTYs | Wave "runs" but nothing happens |
| **G2** | Handoff watcher (orchestrator.rs:374) is a stub; inner loop is `let _ = event;` | Can't detect when agents finish |
| **G3** | No worktree creation in orchestrator | Agents would trample each other in `main` worktree |
| **G4** | No budget kill switch | Runaway cost is unguarded |
| **G5** | No time cap (deadline) per agent | Agents can run forever |
| **G6** | `spawn_process` doesn't pass the guideline to the agent | The "task" never reaches the agent |

After closing G1-G6, the orchestrator can run a real wave: read plan → create worktrees → spawn agents with their guidelines → monitor output + cost + time → detect handoff files → enforce budget/time caps.

---

## Architecture Decision Records (Locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Guideline delivery** | Write to file, pass path as CLI arg `--guideline <path>` | Works with any agent CLI (opencode, claude, codex). Robust. |
| **Cost measurement** | Agent-reported cost via JSON line per turn in PTY output | Most accurate. Falls back to time cap if agent doesn't emit JSON. |
| **Worktree creation** | Shell out to `git worktree add` via `std::process::Command` | No `git2` crate available; shelling is simpler and battle-tested |
| **Kill mechanism** | Reuse existing `kill_sender: UnboundedSender<()>` in `ProcessHandle` | Already wired, just need to call `.send(())` from budget/time guards |
| **Stdin** | None — agent receives guideline via `--guideline` arg | Simpler, more reliable than piped stdin |

---

## TDD Workflow (Apply To Every Task)

1. **Red:** Write a failing Rust unit test in `src-tauri/src/<module>_test.rs` (or inline `#[cfg(test)]` block)
2. **Green:** Write minimal implementation to make it pass
3. **Refactor:** Clean up while keeping tests green
4. **Verify:** Run `cargo test --lib` (expect 0 failures)
5. **Commit:** `git commit -m "feat(orchestrator): <task summary>"`

---

## Task T1: Worktree Creation (Closes G3)

**Goal:** Add a Tauri command `create_worktree_cmd` that creates an isolated git worktree for each agent.

**Files:**
- MODIFY: `src-tauri/Cargo.toml` (no new deps needed)
- MODIFY: `src-tauri/src/lib.rs` (register new command)
- MODIFY: `src-tauri/src/commands.rs` (add `create_worktree_cmd`)
- NEW: `src-tauri/src/worktree.rs` (~120 lines, fully unit tested)
- MODIFY: `src/stores/orchestrationStore.ts` (add `createWorktree` action)
- NEW: `src/__tests__/stores/orchestrationStore.worktree.test.ts`

**Tests first (Red):**
1. `worktree::create_worktree(repo_path, branch, worktree_path)` returns `Ok(PathBuf)` for a valid repo
2. Returns `Err` if `repo_path` is not a git repo
3. Returns `Err` if branch already exists (idempotency check)
4. Cleans up partial worktree on failure
5. `create_worktree_cmd` (Tauri command) propagates errors as `Result<String, String>`
6. `orchestrationStore.createWorktree` invokes the command with correct args

**Implementation (Green):**
```rust
// src-tauri/src/worktree.rs
use std::path::{Path, PathBuf};
use std::process::Command;

pub fn create_worktree(repo_path: &str, branch: &str, worktree_path: &str) -> Result<PathBuf, String> {
    let repo = Path::new(repo_path);
    if !repo.join(".git").exists() {
        return Err(format!("Not a git repo: {}", repo_path));
    }

    let status = Command::new("git")
        .args(["-C", repo_path, "worktree", "add", "-b", branch, worktree_path, "main"])
        .status()
        .map_err(|e| format!("git worktree add failed: {}", e))?;

    if !status.success() {
        return Err(format!("git worktree add exited with {:?}", status.code()));
    }

    Ok(PathBuf::from(worktree_path))
}
```

**Acceptance Criteria:**
- [ ] 6 tests pass
- [ ] Worktree appears in `git worktree list`
- [ ] Branch is created from `main`
- [ ] Failure paths return descriptive errors
- [ ] No `git2` dependency added

---

## Task T2: Process Hardening — Time + Cost Caps (Closes G4 + G5)

**Goal:** Add per-agent time deadline and cost cap to `ProcessHandle`. When either is hit, send kill signal.

**Files:**
- MODIFY: `src-tauri/src/pty.rs` (extend `ProcessHandle` and `spawn_process`)
- NEW: `src-tauri/src/pty_guards.rs` (~150 lines, fully unit tested)
- MODIFY: `src-tauri/src/commands.rs` (extend `spawn_agent` to accept `deadline_secs` and `cost_cap_usd`)

**Tests first (Red):**
1. `ProcessHandle::new()` initializes with `None` for deadline and cost cap
2. `is_expired()` returns `false` when no deadline set
3. `is_expired()` returns `true` when `Instant::now() > deadline`
4. `is_over_budget(cost)` returns `false` when no cap set
5. `is_over_budget(cost)` returns `true` when `cost > cap`
6. `parse_cost_from_output()` extracts cost from JSON line `{"cost_usd": 0.012}`
7. `parse_cost_from_output()` returns `None` for non-JSON line
8. Guard loop ticks every 5 seconds and triggers kill on expiry/over-budget
9. Guard loop is cancellable (no panic on shutdown)

**Implementation sketch:**
```rust
// src-tauri/src/pty_guards.rs
use std::time::{Duration, Instant};
use tokio::sync::mpsc::UnboundedSender;

pub struct ProcessGuards {
    pub deadline: Option<Instant>,
    pub cost_cap_usd: Option<f64>,
    pub current_cost_usd: f64,
    pub kill_tx: UnboundedSender<()>,
}

impl ProcessGuards {
    pub fn is_expired(&self) -> bool {
        self.deadline.map_or(false, |d| Instant::now() > d)
    }

    pub fn is_over_budget(&self, cost: f64) -> bool {
        self.cost_cap_usd.map_or(false, |cap| cost > cap)
    }

    pub fn record_cost(&mut self, cost: f64) {
        self.current_cost_usd += cost;
    }

    pub fn kill(&self) {
        let _ = self.kill_tx.send(());
    }
}

pub fn parse_cost_from_output(line: &str) -> Option<f64> {
    // Looks for {"cost_usd": 0.012} or {"usage": {"cost": 0.012}}
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(line) {
        if let Some(c) = v.get("cost_usd").and_then(|x| x.as_f64()) {
            return Some(c);
        }
        if let Some(c) = v.get("usage").and_then(|u| u.get("cost")).and_then(|x| x.as_f64()) {
            return Some(c);
        }
    }
    None
}

pub async fn run_guards(guards: ProcessGuards, mut output_rx: mpsc::UnboundedReceiver<String>) {
    let mut interval = tokio::time::interval(Duration::from_secs(5));
    loop {
        tokio::select! {
            _ = interval.tick() => {
                if guards.is_expired() || guards.is_over_budget(guards.current_cost_usd) {
                    guards.kill();
                    break;
                }
            }
            Some(line) = output_rx.recv() => {
                if let Some(cost) = parse_cost_from_output(&line) {
                    // re-borrow mutably
                    let mut g = guards;
                    g.record_cost(cost);
                    if g.is_over_budget(g.current_cost_usd) {
                        g.kill();
                        break;
                    }
                }
            }
            else => break,
        }
    }
}
```

**Acceptance Criteria:**
- [ ] 9 tests pass
- [ ] Spawning an agent with `deadline_secs: 30` kills it after 30s
- [ ] Spawning an agent with `cost_cap_usd: 0.50` kills it when reported cost exceeds $0.50
- [ ] Guards don't fire if no caps are set
- [ ] No memory leaks (guards task exits cleanly on process exit)

---

## Task T3: Guideline → Stdin Pipeline (Closes G6)

**Goal:** Modify `spawn_process` to accept an `initial_prompt: Option<String>`. Write the prompt to the process's stdin immediately after spawn, then close stdin.

**Files:**
- MODIFY: `src-tauri/src/pty.rs` (extend `spawn_process` signature)
- MODIFY: `src-tauri/src/commands.rs` (extend `spawn_agent` Tauri command)
- MODIFY: `src/lib/pty/commands.ts` (mirror in TS, no behavior change)
- MODIFY: `src/stores/agentStore.ts` (accept `initialPrompt` in `spawnAgent`)

**Tests first (Red):**
1. `spawn_process` with `initial_prompt = None` does not write to stdin
2. `spawn_process` with `initial_prompt = Some("hello")` writes "hello\n" to stdin
3. After writing prompt, stdin is closed
4. `cmd.arg("--guideline")` and `cmd.arg(path)` are added to args when `guideline_path` is provided
5. Prompt is flushed before `output_rx` starts collecting

**Implementation sketch:**
```rust
pub async fn spawn_process(
    &self,
    agent_id: String,
    project_path: String,
    command: String,
    args: Vec<String>,
    env_vars: HashMap<String, String>,
    initial_prompt: Option<String>,
) -> Result<String, String> {
    // ... existing setup ...
    let mut child = cmd.spawn()?;

    if let Some(prompt) = initial_prompt {
        if let Some(mut stdin) = child.stdin.take() {
            use tokio::io::AsyncWriteExt;
            stdin.write_all(prompt.as_bytes()).await.map_err(|e| e.to_string())?;
            stdin.write_all(b"\n").await.map_err(|e| e.to_string())?;
            drop(stdin); // closes the pipe
        }
    }

    // ... existing output collection ...
}
```

**Acceptance Criteria:**
- [ ] 5 tests pass
- [ ] Spawning with `initial_prompt` results in the prompt appearing in the process's stdin
- [ ] Backward compatible: existing calls without `initial_prompt` work unchanged
- [ ] No race condition between stdin write and stdout collection

---

## Task T4: Handoff Watcher Parser (Closes G2)

**Goal:** Replace the stub `start_handoff_watcher` with one that actually parses `HANDOFF_<agent_ref>.md` files, validates the schema, and updates `plan_agents` status to `done` or `failed`.

**Files:**
- MODIFY: `src-tauri/src/orchestrator.rs` (rewrite `start_handoff_watcher`)
- NEW: `src-tauri/src/handoff_parser.rs` (~100 lines, fully unit tested)
- MODIFY: `src-tauri/src/commands.rs` (add `parse_handoff_file_cmd` for one-off parsing)

**Tests first (Red):**
1. `parse_handoff_file(path)` reads a valid HANDOFF_*.md and returns `HandoffEnvelope`
2. Returns `Err` with missing sections if schema validation fails
3. Returns `Err` if file doesn't exist
4. Returns `Err` if file is empty
5. `validate_handoff_schema` (existing, in orchestrator.rs:141) works on file content
6. Watcher updates `plan_agents.status = 'done'` when valid handoff is detected
7. Watcher updates `plan_agents.status = 'failed'` with a `CorrectionDoc` when invalid handoff detected
8. Watcher doesn't fire on non-HANDOFF file changes

**Implementation sketch:**
```rust
// src-tauri/src/handoff_parser.rs
use std::path::Path;
use std::fs;

pub struct HandoffEnvelope {
    pub original_task: String,
    pub completed_by: String,
    pub model_used: String,
    pub output_summary: String,
    pub changed_files: Vec<String>,
    pub handoff_instruction: String,
}

pub fn parse_handoff_file(path: &Path) -> Result<HandoffEnvelope, String> {
    let content = fs::read_to_string(path).map_err(|e| format!("Read failed: {}", e))?;
    if content.trim().is_empty() {
        return Err("Handoff file is empty".to_string());
    }

    let (valid, missing) = crate::orchestrator::validate_handoff_schema(&content);
    if !valid {
        return Err(format!("Missing sections: {:?}", missing));
    }

    // Extract fields via simple regex/parsing
    Ok(HandoffEnvelope {
        original_task: extract_section(&content, "Original Task").unwrap_or_default(),
        completed_by: extract_section(&content, "Completed By").unwrap_or_default(),
        model_used: extract_section(&content, "Model Used").unwrap_or_default(),
        output_summary: extract_section(&content, "Output Summary").unwrap_or_default(),
        changed_files: extract_list(&content, "Files Changed"),
        handoff_instruction: extract_section(&content, "Handoff Instructions").unwrap_or_default(),
    })
}

fn extract_section(content: &str, header: &str) -> Option<String> {
    let re = regex::Regex::new(&format!("(?m)^## {}\n([\\s\\S]*?)(?=^## |\\Z)")).ok()?;
    re.captures(content)?.get(1).map(|m| m.as_str().trim().to_string())
}
```

**Acceptance Criteria:**
- [ ] 8 tests pass
- [ ] Watcher correctly identifies HANDOFF_*.md files in watch path
- [ ] Valid handoff → `plan_agents.status = 'done'`
- [ ] Invalid handoff → `plan_agents.status = 'failed'` + `CorrectionDoc` created
- [ ] Non-handoff file changes are ignored

---

## Task T5: Real Wave Execution (Closes G1)

**Goal:** Rewrite `execute_wave` to actually spawn agents in worktrees with their guidelines, using T1-T4.

**Files:**
- MODIFY: `src-tauri/src/orchestrator.rs` (rewrite `execute_wave`)
- MODIFY: `src-tauri/src/commands.rs` (extend `execute_wave` signature with `cost_cap_usd` and `deadline_secs`)
- MODIFY: `src/stores/orchestrationStore.ts` (extend `executeWave` action)
- MODIFY: `src/pages/Orchestrate.tsx` (wire UI to pass caps)

**Tests first (Red):**
1. `execute_wave(plan_id, base_repo_path, cost_cap_usd, deadline_secs)` creates N worktrees for N agents
2. Spawns N agents in parallel via `pty.spawn_process`
3. Each agent's guideline is generated, written to file, and passed via `--guideline` arg
4. Each agent has its own cost/time guard from T2
5. Wave status transitions: `planning` → `executing` → `completed` (all done) or `partial` (some failed)
6. Returns `WaveExecutionReport` with per-agent: `agent_ref`, `status`, `cost_usd`, `elapsed_secs`, `handoff_path`
7. Wave fails fast if worktree creation fails for any agent
8. Idempotent: re-running on a `completed` wave is a no-op

**Implementation sketch:**
```rust
pub async fn execute_wave(
    db: &Connection,
    pty: &PtyManager,
    plan_id: &str,
    base_repo_path: &str,
    cost_cap_usd: f64,
    deadline_secs: u64,
) -> Result<WaveExecutionReport, String> {
    let agents = get_plan_agents(db, plan_id)?;

    // 1. Update statuses to 'running'
    for agent in &agents {
        if agent.status == "queued" {
            update_plan_agent_status(db, &agent.id, "running")?;
        }
    }

    let mut report = WaveExecutionReport::default();

    // 2. For each agent: create worktree + generate guideline + spawn
    for agent in &agents {
        let worktree_path = format!(".worktrees/{}-{}", plan_id, agent.agent_ref);
        let branch = format!("agent/{}-{}", plan_id, agent.agent_ref);

        worktree::create_worktree(base_repo_path, &branch, &worktree_path)?;

        let guideline = generate_agent_guideline(
            &agent.agent_ref,
            &agent.task,
            &agent.task, // objective = task for now
            agent.depends_on.as_deref(),
            &["mimo-v2.5"],
            &[], // files_to_create: TBD by plan
            &[], // files_not_touch: TBD by plan
        );

        let guideline_path = format!("{}/.acc/GUIDELINE.md", worktree_path);
        std::fs::create_dir_all(format!("{}/.acc", worktree_path))?;
        std::fs::write(&guideline_path, &guideline)?;

        let session_id = pty.spawn_process(
            agent.agent_ref.clone(),
            worktree_path.clone(),
            "mimo".to_string(), // agent CLI
            vec!["--model".to_string(), "mimo-v2.5".to_string(),
                 "--guideline".to_string(), guideline_path.clone()],
            HashMap::new(),
            None, // initial_prompt: agent reads --guideline
        ).await?;

        report.add_agent(agent.agent_ref.clone(), session_id, worktree_path);
    }

    Ok(report)
}
```

**Acceptance Criteria:**
- [ ] 8 tests pass
- [ ] Wave with 3 agents creates 3 worktrees
- [ ] Wave with 3 agents spawns 3 PTY processes
- [ ] Each process's args include `--guideline <path>`
- [ ] Wave status correctly updates in DB
- [ ] Manual smoke test: create a wave with 1 agent, verify it spawns and runs

---

## Total Test Count

| Task | New Tests | Files Modified | Files New |
|------|-----------|---------------|-----------|
| T1: Worktree | 6 | 4 | 1 |
| T2: Time/Cost Caps | 9 | 2 | 1 |
| T3: Stdin Pipeline | 5 | 4 | 0 |
| T4: Handoff Parser | 8 | 2 | 1 |
| T5: Real Wave | 8 | 3 | 0 |
| **Total** | **36** | **15** | **3** |

---

## Execution Order (Recommended)

1. **T1** (worktree) — foundational, no deps
2. **T3** (stdin pipeline) — extends PTY, no deps on T1
3. **T2** (time/cost caps) — extends PTY, no deps
4. **T4** (handoff parser) — uses `validate_handoff_schema` (existing)
5. **T5** (real wave) — depends on T1, T2, T3, T4

T1-T4 are independent of each other and can be done in any order. T5 must be last.

---

## Verification At The End

After all 5 tasks complete:

1. **Rust tests:** `cd src-tauri && cargo test --lib` → all pass
2. **TypeScript tests:** `npm test` → all pass (260 + new tests)
3. **TypeScript build:** `npm run build` → 0 errors
4. **Rust build:** `cd src-tauri && cargo build` → 0 errors
5. **Manual smoke test:**
   ```bash
   # Create a wave with 1 agent pointing to a dummy task
   # Verify worktree is created
   # Verify agent CLI is spawned with --guideline
   # Verify the agent receives the guideline content
   ```
6. **Document the new commands** in `docs/CLI.md` or similar

---

## Post-Plan: Self-Dogfooding Experiment

After this plan is complete, we have everything needed to run the experiment from the previous spec:
- Wave plans with N agents (existing)
- Worktree isolation per agent (T1)
- Time/cost caps (T2)
- Guideline delivery (T3)
- Handoff detection (T4)
- Real wave execution (T5)

The next plan will be `docs/SELFDOGFOODING_EXPERIMENT.md` which runs 5 agents in parallel on 5 of the tasks from `GAP_CLOSURE_PLAN.md`.

---

## Rollback Plan

If at any point a task introduces regressions or proves unworkable:

```bash
# Identify the breaking commit
git log --oneline -10

# Revert the task's commit(s)
git revert <commit-sha> --no-edit

# Or hard reset to before this plan
git reset --hard <sha-before-this-plan>

# Or nuclear: blow away the experiment branch
git checkout main
git branch -D experiment/executable-orchestrator
```

No worktree state is touched (worktrees are created at runtime, not committed). Rust dependencies (`Cargo.toml`) are unchanged. Safe to roll back at any step.
