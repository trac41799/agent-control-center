# Phase 7 Changelog

## 2026-05-02 - Supabase & GitHub First-Class Integrations

### Added

#### Rust Backend
- `src-tauri/src/integrations.rs` - New module with SupabaseConfig, GitHubConfig, GitHubIssue structs
- `get_supabase_configs()` / `save_supabase_config()` / `toggle_supabase_feature()` - Supabase config CRUD
- `detect_supabase_project()` - Filesystem-based project detection via `supabase/config.toml`
- `get_github_configs()` / `save_github_config()` / `toggle_github_feature()` - GitHub config CRUD
- `detect_github_repo()` - Parse `.git/config` for GitHub remote URL
- `check_repo_visibility()` - GitHub API call to determine public/private status
- `list_github_issues()` - Fetch and parse GitHub issues (excludes PRs)
- `check_migration_safety()` - Scan Supabase migrations for destructive SQL patterns
- `check_github_actions()` - Discover GitHub Actions workflow YAML files
- 11 new Tauri commands in `commands.rs`
- `ureq` HTTP client dependency added to `Cargo.toml`

#### Frontend
- `src/stores/integrationStore.ts` - Zustand store with full CRUD + detection + scanning methods
- `src/pages/Integrations.tsx` - Two-tab page (Supabase, GitHub) with:
  - Project path auto-detection
  - Config form (URL, anon key, service role key)
  - Feature group toggle matrix with locked/unlocked states
  - Read-only enforcement for Supabase
  - Lockdown mode toggle for GitHub
  - GitHub issue browser with open/closed/all filtering
  - Migration safety scanner results display
  - CI/CD workflow scanner results display
  - Saved config detail views

#### Database
- `src-tauri/migrations/003_integrations.sql` - Replaces legacy supabase_configs/github_configs tables with Phase 7 schema
  - `supabase_configs`: id, project_id, supabase_project_ref, supabase_url, anon_key, service_role_key, feature_groups, read_only, created_at
  - `github_configs`: id, project_id, repo_owner, repo_name, repo_visibility, lockdown_enabled, token_present, features, created_at
  - 3 new indexes for query performance

### Changed
- `src/App.tsx` - `/connectors` route now maps to `Integrations` component
- `src-tauri/src/lib.rs` - Added `mod integrations;` and 11 new commands in invoke_handler
- `src-tauri/src/db.rs` - Migration 003 registered in both `init_db()` and `init_db_path()`
- `src-tauri/src/commands.rs` - Added `use crate::integrations;` import

### Dependencies Added
- `ureq = { version = "2", features = ["json"] }` (Rust backend)
