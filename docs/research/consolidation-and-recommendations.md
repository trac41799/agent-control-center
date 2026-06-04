# Memory Layer Consolidation & Strategic Recommendations

**Agent Control Center (ACC)** — June 4, 2026  
**Status:** Assessment complete. Build recommendation: **YES, with phased scope.**

---

## 1. Current State Assessment

ACC possesses a substantial but fragmented memory architecture. Below is an honest assessment of what exists versus what is needed for each of the four objectives.

### 1.1 Existing Memory Infrastructure

| Capability | Implementation | Maturity | Gaps |
|-----------|---------------|----------|------|
| Agent memory files | Per-agent project files (CLAUDE.md, etc.) via Asset Manager | Production | File-level only; no semantic retrieval; no cross-agent synthesis |
| Reactive memory capture | PTY output pattern matching → toast → manual add | Functional | Heuristic only; requires human approval; no automatic extraction |
| Knowledge Compounder | 2-pass extraction (heuristic + LLM via OpenRouter) | Functional | Session-gated (fires only on wave complete); not real-time |
| Knowledge items + relations | SQLite (`knowledge_items` + `knowledge_relations`) | Foundation | No embeddings; no graph traversal; basic relations only |
| Token budget WIP | `WIP_CHECKPOINT_<ID>.md` files | Basic | Manual checkpoint only; no intelligent context management |
| Confidence scoring | Weighted average on merge (Jaccard-based) | Basic | No source credibility; no temporal decay; no multi-factor |
| Context compression | None | Missing | No window management within PTY sessions |
| Context retrieval | None (agents self-manage) | Missing | No embedding search; no BM25; no hybrid retrieval |

### 1.2 The Four Objectives — Gap Analysis

| # | Objective | ACC Has | Missing | Verdict |
|---|-----------|---------|---------|---------|
| 1 | Consistent context across sessions | WIP checkpoints, memory files | Session persistence, checkpoint/resume, cross-session identity, context compression, write-before-compaction hooks | **Needs significant build** |
| 2 | Efficient codebase exploration | Agents self-explore via PTY tools | Repo map, AST-aware retrieval, BM25/embedding search, hybrid retrieval, graph-aware relevance | **Needs full build** |
| 3 | Robust KG for agents + human visualization | Basic SQLite tables, Jaccard dedup | Embeddings, community detection, GraphRAG queries, visualization, code↔knowledge bridge | **Needs significant build** |
| 4 | Clifford/Bagua semantic layer | Nothing | Cl(3) implementation, rotor-based relations, Bagua tagging, benchmarks | **Research-grade; defer** |

---

## 2. VERDICT: Should We Build Our Own Memory Layer?

**YES — with a clear phased scope and a plug-and-play architecture.**

### Rationale

1. **No off-the-shelf solution fits.** Mem0, Letta, LangGraph, and LangMem are either SaaS-dependent, Python-only, or designed for chat agents — not for orchestrating 9 CLI coding agents in parallel PTY sessions. ACC's multi-agent PTY architecture is unique and requires a purpose-built memory layer.

2. **The pieces are individually small.** Each component (sqlite-vec, context compressor, multi-signal retrieval) is well-understood and has open-source reference implementations. The innovation is in the integration, not the primitives.

3. **ACC already has the hard infrastructure.** The PTY pipeline, event logger, SQLite database, Tauri command layer, and OpenRouter integration are already built. Adding memory on top is a matter of new tables, new middleware hooks, and new Tauri commands — not a rewrite.

4. **Plug-and-play is feasible.** The memory layer can be implemented as a Rust crate (`acc-memory`) with a Tauri command API, published as an ACC plugin — exactly the architecture the user envisions. It does not need to be a separate project unless scalability demands it.

5. **Timing is right.** The Knowledge Compounder (Module 16) has proven the concept. The next logical step is to generalize it into a real-time, always-on memory layer rather than a batch post-wave process.

### Counterargument (and mitigation)

*"Model context windows are growing to 1M+ tokens. Why build sophisticated memory when we can just dump everything into context?"*

The BEAM benchmark (Mem0, 2026) shows selective memory at 6,900 tokens/query scores 64.1 at BEAM 1M, while full-context approaches degrade to ~48.6 at BEAM 10M. Cost and latency still scale linearly with context size. **Selective, retrieved memory is economically and qualitatively superior, even at 1M+ context windows.**

---

## 3. Recommended Architecture

### 3.1 High-Level Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ACC MEMORY PLUGIN (acc-memory)                    │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐ │
│  │ CONTEXT MANAGER   │  │ RETRIEVAL ENGINE │  │ KNOWLEDGE GRAPH    │ │
│  │ (per-agent)       │  │ (shared)         │  │ (shared)           │ │
│  │                   │  │                  │  │                    │ │
│  │ - 3-zone compress │  │ - Vector search  │  │ - Items + relations│ │
│  │ - Write-before-   │  │ - BM25 keyword   │  │ - Community detect │ │
│  │   compaction hook │  │ - Entity matching │  │ - GraphRAG queries │ │
│  │ - Token budget    │  │ - Memory decay    │  │ - Code↔KG bridge  │ │
│  │ - Session persist │  │ - Hybrid fusion   │  │ - Visualization   │ │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬───────────┘ │
│           │                     │                      │             │
│           └─────────────────────┼──────────────────────┘             │
│                                 │                                    │
│  ┌──────────────────────────────┴──────────────────────────────────┐ │
│  │                    STORAGE ENGINE (per-project)                   │ │
│  │                                                                   │ │
│  │  acc_memory.db  ┌──── sqlite-vec (vector tables)                 │ │
│  │                 ├──── knowledge_items + relations                │ │
│  │                 ├──── session_checkpoints                        │ │
│  │                 ├──── memory_facts (ADD-only extraction)         │ │
│  │                 ├──── code_entities (tree-sitter)                │ │
│  │                 └──── communities + summaries                    │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  INTEGRATION HOOKS (Tauri commands):                                  │
│    on_agent_message()   → extraction middleware                       │
│    get_context()        → retrieval + checkpoint assembly             │
│    compress_context()   → 3-zone compression + write-before hook      │
│    on_session_start()   → checkpoint load + memory injection          │
│    on_session_end()     → checkpoint persist                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Technology Choices

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Vector store | **sqlite-vec** | Zero-dependency, in-process, Windows-native, single `.c` file, SQL-based |
| Embedding model | **all-MiniLM-L6-v2** (384-dim, local) or **Voyage Code 2** (1536-dim, API) | Tiered: local for speed, cloud for quality; both available via ONNX runtime or API |
| BM25 index | **Custom in Rust** (~100 LOC) | Trivial to implement; no library needed |
| Code parsing | **tree-sitter** (Rust bindings) | 40+ languages, incremental parsing, already in ACC's dependency tree concept |
| Graph algorithms | **In-memory adjacency list** (Rust HashMap) + **PageRank / Leiden** | Avoids external graph DB dependency; <50K nodes fits in memory easily |
| Compressor | **Custom Rust** (Hermes 4-phase algorithm port) | Must integrate with PTY I/O pattern; no existing library fits |
| Visualization | **Cytoscape.js** | Zero-dependency, WebView-compatible, built-in graph algorithms, MIT license |
| Clifford/Bagua | **Deferred to Phase 5** (research) | Build basic Cl(3) Rust crate; benchmark vs. standard embedding approaches |

### 3.3 Multi-Scope Identity Model

Adopted from Mem0's production pattern, mapped to ACC's architecture:

| Scope | ACC Mapping | Purpose |
|-------|------------|---------|
| `user_id` | Human operator | Shared across all 9 agents |
| `agent_id` | Agent type (claude, opencode, etc.) | Per-agent learnings, preferences |
| `run_id` | Wave/plan execution | Task-specific context |
| `session_id` | PTY session UUID | Single session continuity |
| `org_id` | Project/repo | Team conventions, repo-wide knowledge |
| `file_id` | Source file path | File-specific patterns, antipatterns |

---

## 4. Phased Implementation Plan

### Phase 1: Foundation — Context Consistency (Weeks 1-3)

**Goal:** Agents maintain coherent context across sessions and within long sessions.

| Task | Effort | Dependencies |
|------|--------|-------------|
| Add `session_checkpoints` table to SQLite | 0.5 day | None |
| Implement checkpoint save/load Tauri commands | 1 day | Table |
| Implement per-agent context compressor (Hermes 3-zone port) | 3 days | PTY pipeline hooks |
| Implement write-before-compaction extraction hook | 1 day | Compressor |
| Wire into PTY session lifecycle (start/message/end) | 1 day | All above |
| Add circuit breaker (5 failures → 2-min cooldown) | 0.5 day | Extraction hook |
| **Total Phase 1** | **~7 days** | |

**Deliverable:** Agents resume sessions with prior context intact. Context compresses at 50% window threshold with fact extraction before compression.

### Phase 2: Retrieval — Efficient Codebase Exploration (Weeks 4-6)

**Goal:** Agents can efficiently explore large codebases without overflowing context.

| Task | Effort | Dependencies |
|------|--------|-------------|
| Integrate tree-sitter for AST-aware chunking | 2 days | Rust tree-sitter crate |
| Implement repo map generator (PageRank on dep graph) | 2 days | tree-sitter |
| Build BM25 index over repo files | 1 day | AST chunks |
| Add sqlite-vec to project, create `vec0` tables | 1 day | sqlite-vec crate |
| Implement embedding pipeline (all-MiniLM-L6-v2 via ONNX) | 2 days | sqlite-vec |
| Implement hybrid retrieval (BM25 + vector + entity fusion) | 2 days | BM25 + embeddings |
| Implement signature ladder (L0-L3) | 1 day | tree-sitter |
| Add `get_context()` Tauri command | 1 day | Retrieval |
| **Total Phase 2** | **~12 days** | |

**Deliverable:** Agents receive structured context: repo map (L0/L1) always present, relevant code chunks (L2/L3) via hybrid retrieval, full files on demand.

### Phase 3: Knowledge Graph — Robust KG (Weeks 7-10)

**Goal:** A rich, queryable, and visualizable knowledge graph constructed automatically from agent activity.

| Task | Effort | Dependencies |
|------|--------|-------------|
| Add embedding column to `knowledge_items` | 0.5 day | Phase 2 sqlite-vec |
| Augment relation types (caused_by, fixed_by, similar_to, precedes) | 0.5 day | Existing schema |
| Implement Leiden community detection | 2 days | In-memory graph |
| Implement community summarization (LLM-based) | 2 days | Communities |
| Implement GraphRAG Local Search (BFS subgraph expansion) | 2 days | Communities + relations |
| Implement GraphRAG Global Search (community summary retrieval) | 1 day | Community summaries |
| Add provenance tracking table + migration | 1 day | Schema |
| Add contradiction resolution engine | 2 days | Relations + embeddings |
| Add temporal validity columns | 0.5 day | Schema |
| Implement code entity extraction (tree-sitter → code_entities table) | 2 days | tree-sitter |
| Implement code↔knowledge bridge | 1 day | Code entities + knowledge items |
| Implement git co-change mining | 1.5 days | git2 crate |
| Build Cytoscape.js KG explorer component in React | 3 days | Tauri commands for graph data |
| Add human-in-the-loop curation (edit, merge, resolve) | 2 days | KG explorer |
| **Total Phase 3** | **~21 days** | |

**Deliverable:** Full knowledge graph with embeddings, communities, GraphRAG queries, code bridge, git mining, and interactive visualization.

### Phase 4: Multi-Agent Memory Synthesis (Weeks 11-12)

**Goal:** Agents benefit from each other's discoveries in real-time.

| Task | Effort | Dependencies |
|------|--------|-------------|
| Implement cross-agent fact surfacing (shared org_id scope) | 2 days | Multi-scope identity |
| Add "recent discoveries" retrieval filter | 1 day | Shared scope |
| Implement agent-to-agent memory handoff protocol | 2 days | ACB integration |
| Build memory inspection CLI (`acc memory list/search/stats`) | 2 days | All above |
| Add memory decay soft reranking | 1 day | Retrieval engine |
| **Total Phase 4** | **~8 days** | |

**Deliverable:** Agent A's discoveries become available to Agent B via shared memory scope. CLI for memory inspection.

### Phase 5: Clifford/Bagua Semantic Layer (Research, Weeks 13-16)

**Goal:** Determine if Clifford algebra + Bagua semantics provide measurable value for agent reasoning.

| Task | Effort | Notes |
|------|--------|-------|
| Implement lightweight Cl(3) Rust crate with Bagua tagging | 5 days | 8 floats per multivector; geometric product, rotor, grade projection |
| Build synthetic KG benchmark (relation classification) | 2 days | Reproduce GeomE benchmark conditions |
| Benchmark Bagua-tagged rotors vs. standard embeddings | 2 days | Link prediction, relation classification |
| Build analogical reasoning test harness | 2 days | Adapted from Google word analogy test |
| If benchmarks positive (>5% improvement): integrate as semantic tagging layer in KG | 3 days | Annotate knowledge_relations with trigram categories |
| If benchmarks negative: document findings, shelve | 1 day | Write learnings report |

**Decision gate after benchmark:** Continue only if measurable improvement over baseline. The mathematical elegance is real, but practical value must be empirically validated before production integration.

**Total Phase 5** | **~12-15 days** |

---

## 5. Build vs. Buy vs. Separate Project Decision Matrix

| Component | Decision | Rationale |
|-----------|----------|-----------|
| sqlite-vec | **Buy** (open-source, integrate) | Mature, Mozilla-sponsored, zero-dependency. No reason to reinvent. |
| Context compressor | **Build** | Must integrate with PTY I/O. No existing compressor handles multi-agent terminal output. |
| BM25 index | **Build** | ~100 LOC. Trivial. |
| Embedding model | **Buy** (use existing model, run locally) | all-MiniLM-L6-v2 is open-source. Run via ONNX Runtime embedded in Rust. |
| Repo map generator | **Build** (leverage tree-sitter) | Core differentiator. Must be language-aware for ACC's supported stacks. |
| Graph algorithms (PageRank, Leiden) | **Build** (in-memory in Rust) | Lightweight. No graph DB needed at ACC scale. |
| KG visualization | **Build** (Cytoscape.js + React) | Must integrate with ACC's Tauri WebView and shadcn/ui design system. |
| Clifford/Bagua crate | **Build** (Rust) | Novel. No existing crate does this. Small enough to build in a week. |
| Extraction LLM calls | **Reuse** (ACC's existing OpenRouter integration) | Already built. Just add new prompt templates. |
| **Entire memory layer as separate project?** | **No — build as ACC plugin first** | The architecture is designed as a plug-and-play crate (`acc-memory`). If it proves valuable and reusable beyond ACC, extract into a separate project then. Premature extraction risks misalignment with ACC's specific needs. |

---

## 6. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| sqlite-vec immaturity (pre-v1) | Medium | Medium | Pin version; abstract behind trait for swap-out; test thoroughly |
| Context compression loses critical info | High | High | Write-before-compaction hook; persistent fact store; anti-thrashing lock |
| Embedding model quality insufficient for code | Medium | Medium | Tiered: local all-MiniLM for speed, upgrade to Voyage Code 2 if quality gaps appear |
| 9-agent concurrent memory access causes SQLite contention | Medium | Medium | WAL mode already active; per-agent partition keys; write queue per agent |
| Clifford/Bagua provides no measurable value | High | Low | Phase 5 is gated on benchmarks; if negative, only ~12 days lost; document as research |
| Cross-agent memory leakage (Agent A sees Agent B's secrets) | Low | High | Scope enforcement at query level; `agent_id` filtering mandatory; audit logging |
| Token cost of LLM-based extraction exceeds savings | Medium | Medium | Measure extraction-to-retrieval token tradeoff; add cost threshold; fall back to heuristic-only |

---

## 7. Key Design Principles

1. **ADD-only, never delete.** Like Mem0, memories are append-only with soft decay (0.3× floor). Coding knowledge never expires — it just becomes less relevant until it's needed again.

2. **The LLM is the best relevance judge.** Provide tools for exploration (repo map, hybrid search, graph traversal). Don't statically pre-select context. Let the agent request what it needs.

3. **Start compact, expand on demand.** Always send the repo map first (L0/L1). Let the agent request specific files at L2/L3. Progressive disclosure is more efficient than upfront context dumping.

4. **Cache aggressively, invalidate surgically.** Repo maps, embeddings, and graph rankings are expensive to compute. Cache them. Invalidate only on file change via filesystem watcher.

5. **BM25 first, embeddings second.** For exact symbol/function/file name searches, BM25 is faster and often more precise than embeddings. Use embeddings for conceptual/semantic queries.

6. **Shared org scope, isolated agent scope.** Cross-agent coordination happens through shared `org_id` memory. Per-agent learning stays isolated. Never mix the two without explicit attribution.

7. **Offline-first, zero external dependencies at runtime.** The memory layer must work with no internet, no Docker, no external services. sqlite-vec + ONNX Runtime + tree-sitter = fully local.

---

## 8. Immediate Next Steps (This Week)

1. **Stand up sqlite-vec in ACC's Rust backend.**
   - Add `sqlite-vec` as a Cargo dependency
   - Create `vec0` virtual table in `acc_memory.db`
   - Write test: insert 100 embeddings, query KNN, verify results

2. **Implement checkpoint persistence.**
   - Add `session_checkpoints` table
   - Write `checkpoint_save(session_id, state_blob)` and `checkpoint_load(session_id)` Tauri commands
   - Wire into PTY session start/end lifecycle

3. **Prototype the context compressor.**
   - Port Hermes 3-zone algorithm to Rust
   - Test on a recorded PTY session log
   - Measure: compression ratio, information preservation, token savings

4. **Begin tree-sitter integration.**
   - Add `tree-sitter` Rust crate
   - Choose 3 target languages (TypeScript, Python, Rust) for initial support
   - Implement AST-aware chunking for those languages

---

## 9. Open Questions for Further Research

1. **What is the optimal extraction-to-retrieval token ratio?** How many tokens spent on LLM-based fact extraction produces how many tokens saved at retrieval time? This needs empirical measurement.

2. **Can we replace the extraction LLM with a small local model?** A distilled model (e.g., Phi-4-mini, 3.8B params) running locally via ONNX could eliminate extraction API costs.

3. **What is the BEAM-equivalent benchmark for code-specific memory?** SWE-bench tests code generation quality, not memory quality. A code-specific memory benchmark (tracking patterns across multi-session projects) would be a valuable contribution.

4. **Does Clifford/Bagua semantic tagging measurably improve relation classification?** The Phase 5 benchmark will answer this. The structural isomorphism is elegant, but elegance ≠ utility.

5. **When should the memory layer become a separate project?** If adoption exceeds ACC (other tools want to use it), if the codebase exceeds 5K LOC, or if community contributions appear. Until then, co-locate.

---

## Appendix A: Files Referenced

| File | Description |
|------|-------------|
| `research/advanced-memory-layer-for-ai-agents.md` | Memory architecture, context compression, RAG, session persistence, storage tiers |
| `research/codebase-exploration-research.md` | Code-aware retrieval, repo map, context strategies, multi-agent exploration |
| `research/knowledge-graph-research.md` | KG architectures, GraphRAG, construction, exploration, visualization, code KG |
| `docs/research/clifford-bagua-semantic-layer.md` | Clifford algebra, Bagua mapping, GA for semantics, implementation feasibility |

## Appendix B: Key Source Summary

| Source | Key Finding |
|--------|------------|
| MemGPT (arXiv:2310.08560) | OS-inspired hierarchical memory with virtual context management |
| Mem0 State of Memory 2026 | 92.5 LoCoMo / 94.4 LongMemEval at 6,900 tokens/query; multi-signal retrieval; ADD-only extraction |
| Hermes Context Compression | 4-phase 3-zone algorithm; write-before-compaction; dual-threshold design |
| sqlite-vec (asg017) | Zero-dependency in-process vector search; 7.7k stars; Mozilla-sponsored |
| RepoCoder (arXiv:2303.12570) | Iterative retrieval-generation; 10%+ improvement on repo-level completion |
| GraphRAG (arXiv:2404.16130) | Leiden community detection; local/global/DRIFT search over LLM-generated KGs |
| GeomE (COLING 2020) | GA-based KG embeddings outperform baselines on standard benchmarks |
| Pustejovsky FGA (2026) | GA as mathematically superior foundation for semantic representation |
| Aider Repo Map | PageRank-based repository map; token-budget-constrained; tree-sitter backend |
| SWE-bench (ICLR 2024) | BM25 at 13K tokens performs competitively; retrieval quality dominates code task success |
