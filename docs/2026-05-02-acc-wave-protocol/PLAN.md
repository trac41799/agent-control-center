# ACC Wave Protocol - Plan

## Objective
Implement wave-based agent orchestration with dependency management, guideline generation, handoff validation, and correction loops.

## Approach
- Wave plans group agents into sequential execution phases
- Dependencies enforced via `depends_on` field
- Automatic guideline generation with budget tracking and communication protocol
- Handoff schema validation with 6 required sections
- Correction loop for failed agents with retry tracking

## Key Decisions
- Agents within a wave run in parallel (no intra-wave ordering)
- Cross-wave dependencies only (one wave must complete before next)
- Guidelines include token budget thresholds (60%, 80%, 95%)
- Corrections stored with retry_number for tracking

## Timeline
- Phase 5 orchestrator: complete
