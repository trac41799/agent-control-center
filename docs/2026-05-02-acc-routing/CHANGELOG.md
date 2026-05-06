# ACC Routing - Changelog

## 2026-05-02
### Added
- `routing.rs` - Task Router with keyword detection and outcome-based ranking
- `ModelEntry` CRUD operations (get_models, add_model, toggle_model)
- `build_handoff_envelope` - generates structured markdown handoff documents
- `check_agent_version` - runs agent binary with --version flag
- All corresponding Tauri commands registered in commands.rs
- Frontend Route.tsx page with task input and agent suggestion display
