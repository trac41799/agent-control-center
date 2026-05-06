# ACC ACB - Changelog

## 2026-05-02
### Added
- `acb.rs` - Agent Communication Bus with signal parsing and storage
- `parse_acb_signal` - extracts signal fields from `[ACC:...]` formatted strings
- `record_acb_signal` - stores signals in agent_messages table
- `get_open_signals` - retrieves unresolved signals with optional session filter
- `resolve_signal` - marks signals as RESOLVED with timestamp
- Frontend Messages.tsx page with signal parser, filter, and live display
