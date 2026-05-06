# CHANGELOG — ACC Core Complete (Phases 1–7)

**Date:** 2026-05-02
**Version:** 0.7.0-core

---

## Phase 1: Foundation (Pre-existing)
- Tauri v2 + React 19 + Vite 6 + TypeScript scaffold
- PTY agent runner (9 Agents), preset buttons, project switcher
- 34-table SQLite schema, WAL mode, 32+ indexes
- 10 Tauri commands, 8 plugins, SkillBridge detection
- **17/17 QA pass**

## Phase 2: Asset Manager
- Skills Library — scanner for Claude/OpenCode/Gemini/custom skill directories
- Memory Browser — 8 agent memory files, read/write
- MCP Registry — config reader, per-agent toggle with file write
- Connector Vault — AES-256 secrets vault in SQLite, OS keychain fallback
- Plugin Manager — VSCode extension scanner
- Project Profile JSON — 6-framework stack auto-detection
- **11 new Tauri commands**

## Phase 3: Intelligence
- Outcome Tracker — idle detection, done/failed/revised recording, stats aggregation
- Failure Analyzer — PTY excerpt storage, structured JSON diagnosis
- Token Guard — 15 limit event patterns (rate limit, quota, token, billing)
- Session Heartbeat — 5 health states (HEALTHY/THINKING/STALLED/CRASHED/UNRESPONSIVE)
- Outcomes dashboard + Session Replay with PTY excerpt viewer
- **11 new Tauri commands**

## Phase 4: Routing
- Task Router v1 — keyword classification → outcome stats → ranked suggestions
- Model Router — model registry CRUD, toggle active/inactive
- Agent Handoff Protocol — structured envelope builder with 9-field schema
- AgentConfig version checker via `--version` CLI probe
- Route page with task input and confidence-ranked agent suggestions
- **6 new Tauri commands**

## Phase 5: Wave Protocol
- Wave Orchestrator — feature plans, plan agents, DAG dependency resolution
- Guideline Generator — structured agent briefs with 7 required sections + ACB protocol + budget
- Handoff Monitor — 6-section schema validator, approve/flag workflow
- Correction Loop — create/track corrections with retry count
- Orchestrate page + Handoffs page with visual wave grouping
- **8 new Tauri commands**

## Phase 5+: Agent Communication Bus
- ACB signal parser — `[ACC:TYPE from=ID to=ID priority=P id=ID] body` format
- 6 signal types: CONTRACT, QUERY, STATUS, BLOCKER, CONFLICT, RESOLVE
- Signal recording, resolution, open signal listing
- Messages page with priority filtering and force-resolve
- **4 new Tauri commands**

## Phase 6: Team Layer
- Reactive Memory Capture — 7 pattern detectors in PTY output
- Candidate prompt flow: detect → surface → approve/edit/skip → append
- Playbook Manifest — export manifest with version/stacks/includes
- Feature Doc Generator — prompt builder for 4 doc types (EXECUTIVE_PLAN, CHANGELOG, QA_REPORT, TECHNICAL_PLAN)
- **5 new Tauri commands**

## Phase 7: Supabase & GitHub
- Supabase — 8 feature groups, safe migration protocol, project detection
- GitHub — 7 toolsets, lockdown mode for public repos, issue browser
- CI/CD as QA signal — GitHub Actions polling, migration safety scanner
- Integrations page with detection, feature toggles, and issue listing
- **12 new Tauri commands**

## Total
- **14 Rust backend modules** (7 new)
- **~95 Tauri commands** (85 new)
- **10 frontend pages** (8 new)
- **9 Zustand stores** (4 new)
- **16 UI components** (4 new)
- **3 SQL migrations**
- **0 compilation errors** (Rust + TypeScript strict)
