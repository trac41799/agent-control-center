# ACC Robust Knowledge Graph — Wave Implementation Plan

**Date:** 2026-06-04  
**Spec:** `docs/2026-06-04-knowledge-graph/ACC-Robust-Knowledge-Graph-Feature-Spec.md`  
**Wave Pattern:** MAFW — sequential waves, parallel agents within each wave, handoff validation per agent

---

## Wave Structure

### Wave 1: Storage Foundation
**No dependencies between agents (fully parallel)**

| Agent | Task | Files Created | Files Modified |
|-------|------|---------------|----------------|
| `kg-migration` | SQL migration for 6 new KG tables + ALTER TABLE on knowledge_items | `src-tauri/migrations/010_knowledge_graph.sql` | `src-tauri/src/db.rs` |
| `kg-core-structs` | Rust structs + CRUD for new tables, multi-factor confidence, enhanced relation types | `src-tauri/src/kg_core.rs` | — |

### Wave 2: Backend Logic
**All agents depend on Wave 1; no file conflicts between agents (each writes separate module)**

| Agent | Task | Files Created |
|-------|------|---------------|
| `kg-extraction` | LLM-driven extraction pipeline (entities + relationships from session events + code diffs) | `src-tauri/src/kg_extraction.rs` |
| `kg-queries` | GraphRAG BFS/global search, multi-hop CTE, Leiden community detection | `src-tauri/src/kg_queries.rs` |
| `kg-git` | Git history co-change mining (Jaccard scores from commit history) | `src-tauri/src/kg_git.rs` |
| `kg-code` | Code entity ↔ knowledge bridge (tree-sitter entity query + bridge table operations) | `src-tauri/src/kg_code.rs` |

### Wave 3: Tauri Commands + Registration
**Depends on all Wave 2 modules existing**

| Agent | Task | Files Modified |
|-------|------|----------------|
| `kg-commands` | 10 new Tauri commands + module registration in lib.rs | `src-tauri/src/commands.rs`, `src-tauri/src/lib.rs` |

### Wave 4: Frontend
**Depends on Wave 3 (commands must exist); parallel UI + store work**

| Agent | Task | Files Modified |
|-------|------|----------------|
| `kg-types-store` | TypeScript interfaces + Zustand store extensions for KG | `src/lib/types.ts`, `src/stores/knowledgeStore.ts` |
| `kg-ui` | KG Explorer tab with Cytoscape.js in Knowledge panel | `src/pages/Knowledge.tsx` |

---

## Handoff Validation

Each agent writes `HANDOFF_<agent>.md` with 6 required sections:
1. **Completed Work** — files created/modified, functions implemented
2. **Test Results** — all existing tests pass; new tests for new code
3. **Interface Contracts Exposed** — pub functions, types, command signatures
4. **Files NOT Modified** — explicit list of files intentionally left untouched
5. **Design Decisions** — key implementation choices and trade-offs
6. **Handoff Instructions** — what the next agent needs to know

## QA Gates per Agent
- Rust agents: `cargo check` must pass before handoff
- Frontend agents: `npx tsc --noEmit` must pass before handoff
- All agents: verify no unused imports, no dead code
