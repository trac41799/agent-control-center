# ACC ACB (Agent Communication Bus) - Plan

## Objective
Implement a lightweight agent communication bus using embedded signal parsing in PTY output with structured messaging.

## Approach
- Parse `[ACC:TYPE from=X to=Y priority=Z] message` signals from PTY output
- Store signals in `agent_messages` table
- Support OPEN/RESOLVED lifecycle
- Filter by session_id and priority

## Key Decisions
- Signal format: `[ACC:TYPE from=AGENT to=AGENT priority=LEVEL] body`
- Priority levels: HIGH, MEDIUM, INFO, LOW
- No message broker dependency - embedded in PTY stream
- Resolved signals are filtered out by default

## Timeline
- Phase 5+ ACB: complete
