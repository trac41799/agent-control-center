# ACC Team Layer (Playbook) - Plan

## Objective
Implement team memory capture, playbook export, and automatic feature documentation generation.

## Approach
- Reactive memory capture: pattern detection in agent output
- Playbook manifest generation with configurable includes
- Feature doc prompt generation for 4 types: EXECUTIVE_PLAN, CHANGELOG, QA_REPORT, TECHNICAL_PLAN

## Key Decisions
- Memory candidates stored as "pending" awaiting confirmation
- Playbook includes: profile (always), skills, memory, presets (optional)
- Feature doc prompts follow structured templates

## Timeline
- Phase 6 Team Layer: complete
