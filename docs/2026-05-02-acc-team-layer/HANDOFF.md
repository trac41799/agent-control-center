# ACC Team Layer - Handoff

## Completed Work
- Memory candidate detection with 7 keyword patterns
- Memory candidate storage with session/project/pattern tracking
- Playbook manifest: versioned JSON with optional includes
- Feature doc prompts: 4 templated document type prompts

## Files NOT Modified
- No changes to other modules

## Design Decisions
- Memory detection is pattern-based (no ML), designed for PTY output scanning
- Playbook manifest uses "1.0" version format for export compatibility
- FeatureDocRequest struct defined but not yet wired to a command (prompts are generated individually)

## Handoff Instructions
- Wire FeatureDocRequest to batch generation in a future phase
- Add memory candidate promotion flow (pending -> confirmed -> knowledge_item)
