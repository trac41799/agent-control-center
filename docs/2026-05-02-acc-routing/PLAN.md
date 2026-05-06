# ACC Routing - Plan

## Objective
Implement intelligent task routing that matches tasks to the most suitable AI agents based on outcome history.

## Approach
- Keyword-based task type detection (refactor, review, test, implement, debug, document)
- Outcome stats lookup for success-rate ranking
- Fallback to default agent-type mappings when no history exists

## Key Decisions
- Rules-based routing v1: no ML dependency
- Weighted by success_rate DESC, then total DESC
- Default agents: claude (refactor/implement/debug), aider (test), opencode (review/document)

## Timeline
- Phase 4 routing module: complete
- Model router: complete
- Handoff protocol: complete
- Version checker: complete
