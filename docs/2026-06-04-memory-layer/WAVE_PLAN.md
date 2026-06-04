# ACC Memory Layer — Wave Implementation Plan

**Date:** 2026-06-04
**Spec:** `docs/2026-06-04-memory-layer/ACC-Memory-Layer-Feature-Spec.md`

## Wave Structure

### Wave 1: Storage Engine (Foundation)
**Agent:** `memory-storage`
**Dependencies:** None
**Files to Create:**
- `src-tauri/src/memory.rs` — Complete memory module with all 4 components:
  - Storage Engine: MemoryFact, SessionCheckpoint structs + CRUD
  - Extraction Middleware: heuristic + LLM fact extraction, circuit breaker
  - Context Compressor: 3-zone 4-phase compression, anti-thrashing lock
  - Retrieval Engine: hybrid vector+BM25+entity search, score fusion, decay
- `src-tauri/migrations/009_memory.sql` — vec_memories, memory_facts, session_checkpoints tables

**Files to Modify:**
- `src-tauri/src/db.rs` — Register 009_memory migration

### Wave 2: Tauri Commands + Registration
**Agent:** `memory-commands`
**Dependencies:** Wave 1 (needs memory module structs)
**Files to Modify:**
- `src-tauri/src/commands.rs` — Add 7 Tauri commands for memory operations
- `src-tauri/src/lib.rs` — Register `mod memory` and all new commands in invoke_handler

### Wave 3: Frontend UI Components
**Agent:** `memory-ui`
**Dependencies:** Wave 2 (needs command bindings)
**Files to Create:**
- `src/components/memory/MemoryPanel.tsx` — Fact timeline, search, filter chips
- `src/components/memory/MemoryStats.tsx` — Stats charts per agent
- `src/components/memory/CompressionIndicator.tsx` — Green/yellow/orange/red dot
- `src/stores/memoryStore.ts` — Zustand store for memory state
- `src/pages/MemoryPage.tsx` — Tab integration page

## Handoff Validation
Each agent writes HANDOFF_<agent>.md with 6 required sections:
1. Completed Work
2. Test Results
3. Interface Contracts Exposed
4. Files NOT Modified
5. Design Decisions
6. Handoff Instructions
