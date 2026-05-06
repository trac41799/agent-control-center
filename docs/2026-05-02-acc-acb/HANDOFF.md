# ACC ACB - Handoff

## Completed Work
- Signal parser: extracts from_agent, to_agent, signal_type, priority, body from `[ACC:...]` format
- Signal lifecycle: OPEN -> RESOLVED with timestamp tracking
- Session-based filtering and priority categorization

## Files NOT Modified
- No changes to runner, orchestrator, or other modules

## Design Decisions
- `id` field in parse_acb_signal uses the `id=<msgid>` tag from input; not auto-generated
- `session_id` and `wave` set by caller when recording, not auto-detected
- Priority filtering: HIGH (red), MEDIUM (yellow), INFO (blue), LOW (gray)

## Handoff Instructions
- Integrate ACB parsing into Runner's PTY output stream
- Add auto-escalation for HIGH priority signals after timeout
