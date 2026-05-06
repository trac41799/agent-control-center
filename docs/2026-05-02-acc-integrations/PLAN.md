# Phase 7: Supabase & GitHub First-Class Integrations

## Plan

### Objective
Integrate Supabase and GitHub as first-class connectors in the Agent Control Center,
enabling AI agents to interact with cloud infrastructure through structured APIs.

### Scope

**Backend (Rust/Tauri)**
- New `integrations` module with Supabase and GitHub data structures
- Supabase: config CRUD, project detection, feature group toggling, migration safety check
- GitHub: config CRUD, repo detection, visibility check, issue listing, lockdown toggle, actions scan
- 11 new Tauri commands exposed to frontend
- Database migration (003) replacing legacy schemas with full Phase 7 schemas

**Frontend (React/TypeScript)**
- Zustand store (`integrationStore.ts`) for state management
- Integrations page with Supabase and GitHub tabs
- Auto-detection of Supabase projects and GitHub repositories from local filesystem
- Feature group toggle matrix (with locked features for safety)
- GitHub issue browser with filtering by state
- Migration safety scanner, GitHub Actions workflow scanner
- Read-only enforcement and lockdown mode for safety-critical operations

### Architecture

```
src-tauri/src/integrations.rs   <- Core logic, DB helpers, API calls
src-tauri/src/commands.rs       <- Tauri command wrappers (11 new)
src-tauri/src/lib.rs            <- Module registration + invoke_handler
src-tauri/src/db.rs             <- Migration 003 registration
src-tauri/migrations/003_integrations.sql  <- Schema migration

src/stores/integrationStore.ts  <- Zustand store
src/pages/Integrations.tsx      <- Page component with Supabase/GitHub tabs
src/App.tsx                     <- Route update
```

### Key Decisions

1. **ureq** for HTTP (synchronous, matches desktop app pattern)
2. **Read-only default** for Supabase configs (safety-first)
3. **Locked features** (branching, development, code_security, projects) require explicit unlock
4. **Drop-and-recreate** migration pattern (safe for dev phase)
5. **Filesystem detection** before API calls (`.git/config`, `supabase/config.toml`)
