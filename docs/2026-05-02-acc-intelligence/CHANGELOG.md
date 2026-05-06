# CHANGELOG — ACC Phase 3 Intelligence

**Date:** 2026-05-02
**Version:** 0.3.0-intelligence

## Added

### Backend (Rust)
- Intelligence module with outcome tracker, failure analyzer, token guard, heartbeat
- 15 limit event detection patterns (rate limit, quota, token, context, billing)
- Token usage recording with per-model aggregation
- Session heartbeat with 5 health states
- Intelligence prompt builder for 3 analysis modes

### Commands (11 new)
`record_outcome_cmd`, `get_outcome_stats_cmd`, `create_failure_analysis_cmd`, `get_failure_analyses_cmd`, `detect_limit_event_cmd`, `record_limit_event_cmd`, `resolve_limit_event_cmd`, `get_unresolved_limits_cmd`, `record_token_usage_cmd`, `get_token_usage_stats_cmd`, `run_heartbeat_check_cmd`

### Frontend
- Outcomes page: per-agent per-task-type success rate grid with sort/filter/bars
- Replay page: failure analysis browser with search, diagnosis detail, PTY excerpt viewer
- Intelligence Zustand store with 13 async actions
- Badge and Card shadcn/ui components

## Build Verification
- `cargo check`: 0 errors, 11 warnings (pre-existing dead_code)
- `npx tsc --noEmit`: 0 errors
