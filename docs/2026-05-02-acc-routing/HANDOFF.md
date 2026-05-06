# ACC Routing - Handoff

## Completed Work
- Task Router: keyword detection + outcome stats ranking
- Model Router: full CRUD with active/inactive toggle
- Handoff Protocol: Markdown envelope generator
- Version Checker: shell-based version detection

## Files NOT Modified
- Existing runner, assets, integrations, intelligence modules untouched
- No database schema changes

## Design Decisions
- Routing is deterministic (rules-based) for v1, ML routing planned for v2
- `project_id` parameter accepted but unused in v1 routing logic
- Handoff schema validation checks 6 required sections

## Handoff Instructions
- Next phase: integrate routing with the Runner page for agent dispatch
- Add ML-based routing with confidence scoring (Phase 8)
