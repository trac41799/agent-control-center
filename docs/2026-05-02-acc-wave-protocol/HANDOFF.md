# ACC Wave Protocol - Handoff

## Completed Work
- Wave plan creation with auto-generated docs_path
- Plan agent management with status lifecycle (queued -> running -> done/failed)
- Agent guideline generation with budget, communication protocol, and test requirements
- Handoff schema validation (6 required sections)
- Correction loop with root cause, fix, and test requirement tracking

## Files NOT Modified
- No changes to runner, assets, or intelligence modules

## Design Decisions
- `guideline_path` and `handoff_path` stored as options, generated on demand
- Status transitions auto-set `started_at` or `completed_at` timestamps
- Corrections store full bug_desc, root_cause, fix_required, test_required

## Handoff Instructions
- Next: integrate with ACB for real-time agent communication status
- Consider adding auto-retry logic when corrections are resolved
