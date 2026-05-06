# Phase 2: Asset Manager — Changelog

## Added

### Backend
- **`assets.rs`** module with:
  - `scan_skills_directory()` — Scans skill markdown files from ~/.claude/skills, ~/.opencode/skills, ~/.gemini/skills, and custom paths
  - `read_skill_content()` — Reads individual skill file content
  - `scan_memory_files()` — Scans memory/instructions files (CLAUDE.md, AGENTS.md, GEMINI.md, .clinerules, etc.)
  - `read_memory_file()` / `write_memory_file()` — Read/write memory file content
  - `read_mcp_configs()` — Parses JSON MCP server configs (supports both `mcpServers` and `mcp_servers` keys)
  - `toggle_mcp()` — Enables/disables individual MCP servers in config
  - `store_secret()` / `list_secrets()` / `get_secret_value()` — Vault CRUD operations backed by SQLite
  - `list_plugins()` — Lists VS Code extensions from ~/.vscode/extensions
  - `generate_project_profile()` — Auto-detects project stack, test framework, package manager
- **Migration `002_assets.sql`** — `secrets_vault` table with scope/key indexes
- **11 Tauri commands** registered in `lib.rs` invoke handler

### Frontend
- **`assetStore.ts`** Zustand store covering skills, memory, MCPs, vault, plugins, and project profiles
- **`Assets.tsx`** page with 5 tabs:
  - Skills Library: scan, search, view content in modal
  - Memory Browser: scan, search, inline edit, save to disk
  - MCP Registry: load config, toggle servers with animated switch
  - Connector Vault: add secrets, reveal/hide values, copy to clipboard
  - Plugin Manager: scan VS Code extensions, generate project profile with stack detection

## Modified
- `src/App.tsx` — `/assets` route now renders `Assets` component
- `src-tauri/src/db.rs` — Runs migration 002 after 001
- `src-tauri/src/commands.rs` — Added `use crate::assets` import and 11 command functions
- `src-tauri/src/lib.rs` — Added `mod assets` and 11 command registrations
