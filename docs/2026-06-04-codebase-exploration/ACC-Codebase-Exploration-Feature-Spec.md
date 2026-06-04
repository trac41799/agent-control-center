# ACC Efficient Codebase Exploration — Feature Specification

**Date:** 2026-06-04  
**Status:** Accepted for ACC build-in  
**Source Research:** `docs/research/codebase-exploration-research.md`  
**Integration Target:** New Phase 10 (Memory Layer) in ACC Roadmap

---

## 1. Problem Statement

ACC agents currently explore codebases in an ad-hoc manner via PTY tools (grep, glob, file reads). This is inefficient:

- **No structured codebase overview** — agents start blind, discovering the repo structure through trial and error
- **Context flooding** — agents read entire files when they only need signatures; large repos overflow context
- **No relevance scoring** — agents waste tokens on irrelevant files; no mechanism to prioritize
- **No caching** — repeated reads of the same files across sessions; re-parsing costs time and tokens
- **Solo exploration** — agents explore independently; no shared understanding accumulates

This means: token waste, slow task initiation, and inconsistent codebase understanding across agents and sessions.

## 2. Proposed Solution

A **3-layer codebase intelligence system** integrated into ACC's backend, providing agents with structured, compact, relevance-ranked context on demand.

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: TASK-SPECIFIC CONTEXT (50-80K tokens)                  │
│  Full files being edited, direct deps, test files, error logs    │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: MODULE CONTEXT (10-20K tokens)                         │
│  Signatures of related modules, docstrings, call graph neighbors │
│  Hybrid retrieval results (BM25 + embeddings)                     │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: REPO MAP (1-5K tokens)                                 │
│  Tree-sitter symbol table, PageRank-filtered key symbols          │
│  File dependency graph (compact), always in context               │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 Component 1: Repo Map Generator

Based on Aider's repository map approach, adapted for ACC's multi-agent context.

**Construction pipeline:**
```
Source files → tree-sitter parse → Extract symbols (functions, classes, exports)
                                   ↓
                           Build dependency graph (files = nodes, imports = edges)
                                   ↓
                           PageRank graph ranking (identify most-referenced symbols)
                                   ↓
                           Token-budget-constrained selection (default: 2K tokens)
                                   ↓
                               Compact repo map output
```

**Output format:**
```
src/models/user.py:
│class User(BaseModel):
│    id: str
│    email: str
│    def authenticate(password: str) -> bool
│    def get_permissions() -> list[str]

src/services/auth.py:
│def login(email: str, password: str) -> Optional[User]
│def verify_token(token: str) -> User
│def refresh_token(token: str) -> TokenPair
```

**Configurable:**
- `map_tokens`: 500-5000 (default 2000)
- `languages`: auto-detected from project stack
- `include_tests`: boolean (default true)
- `update_mode`: `on-change` (incremental) | `full` (every session)

**Caching:** Repo map cached on disk; invalidated via `notify` crate on file change. Only re-parsed files are re-embedded. Full re-rank only when >10% of files change.

### 2.2 Component 2: AST-Aware Chunking

Tree-sitter-based code chunking that preserves syntactic units:

**Chunking strategy:**
| Threshold | Action |
|-----------|--------|
| File <500 LOC | Keep whole file as one chunk |
| File 500-2000 LOC | Chunk at class boundaries |
| Class >500 LOC | Chunk at method boundaries |
| Method >200 LOC | Chunk at major control-flow boundaries |

**Each chunk annotated with:**
- File path, symbol name, type signature, line range
- Parent context (which class/module contains this chunk)
- Import preamble (relevant imports included in chunk header)
- Dependency edges (which other chunks this chunk calls/imports)

**Languages (Phase 1):** TypeScript, Python, Rust, Go  
**Languages (Phase 2):** All tree-sitter supported languages

### 2.3 Component 3: Hybrid Retrieval Engine

Multi-signal retrieval combining BM25 and vector embeddings:

```
Query: "How does authentication handle token expiry?"

1. BM25 keyword search → scores files by token match ("auth", "token", "expiry")
2. Vector embedding search (cosine similarity) → scores chunks by semantic meaning
3. Entity boost → chunks referencing "auth.ts", "token", "JWT" get score multiplier
4. Graph expansion → from top-10 seeds, expand 1-hop along call/dependency edges
5. Score fusion → 0.6 * normalized_bm25 + 0.4 * normalized_vector
6. Relevance filtering → drop chunks below threshold; keep top-k within token budget
7. Result: ranked list of chunks with relevance scores
```

**BM25 index:** Built in Rust (~100 LOC), refreshed incrementally on file change. Stored as in-memory index + on-disk snapshot.

**Embedding index:** `vec0` virtual table in sqlite-vec. Chunks embedded via all-MiniLM-L6-v2 (384-dim) using ONNX Runtime. Re-embedded only on file change.

**Re-ranking factors:**
- Graph centrality (PageRank) of the file
- Edit recency (recently modified files weighted higher)
- Conversation relevance (files mentioned in current session boosted)
- File type matching (test files boosted for test tasks, source files for feature tasks)

### 2.4 Component 4: Signature Ladder

Progressive disclosure of code detail — agents request more detail on demand, not upfront:

| Level | Content | Tokens per file | When |
|-------|---------|-----------------|------|
| **L0: Skeleton** | File name + exported symbol names | ~10-50 | Always (repo map) |
| **L1: Signatures** | Function/class signatures with types | ~100-500 | On file mention |
| **L2: Annotated** | Signatures + docstrings + 1-line body summaries | ~300-2000 | On file read request |
| **L3: Full body** | Complete implementation | Full file | On file edit / deep analysis |

**Agent interaction pattern:**
```
1. Agent receives task + L0/L1 repo map
2. Agent identifies candidate files, requests L2 for 2-5 files
3. Agent analyzes L2, may request L3 for critical files
4. Agent discovers gaps → requests more files via dependency graph traversal
5. Agent has sufficient context → produces solution
```

This mirrors how Aider and SWE-agent operate — the LLM is the best relevance judge when given the right tools to explore.

### 2.5 Component 5: Shared Codebase Understanding (Multi-Agent)

A central `CodebaseKnowledgeGraph` that accumulates understanding across agents:

```rust
struct CodebaseKnowledgeGraph {
    symbols: HashMap<String, SymbolRecord>,    // name → definition
    dependencies: Vec<Edge>,                    // file dependency edges
    call_graph: Vec<Edge>,                      // function call edges
    file_summaries: HashMap<String, FileSummary>,
    exploration_coverage: HashMap<String, CoverageStatus>,
    lock: RwLock<()>,
}
```

**Agent roles (optional, for large repos):**
- **Explorer Agent**: Navigates the codebase, finds key structures, produces maps
- **Summarizer Agent**: Produces compact function/class summaries
- **Coordinator (user's agent)**: Directs exploration based on task

**Coverage tracking:**
- Files categorized: `unexplored`, `mapped` (L0/L1 only), `summarized` (L2), `analyzed` (L3)
- Coverage percentage displayed in project header
- Gaps surfaced: "12 files in src/legacy/ have never been mapped"

## 3. Integration Points

| Existing Module | Integration |
|----------------|------------|
| **Project Intelligence** (Module 3) | Stack detection drives language selection for tree-sitter; file discovery |
| **Agent Runner** (agentStore.ts) | Repo map injected as context preamble on agent spawn; `get_context` command |
| **Knowledge Compounder** (knowledge.rs) | Code entities extracted by tree-sitter feed into `code_entities` → `code_to_knowledge` bridge |
| **Knowledge Panel** (Knowledge.tsx) | New tab: "Codebase" showing repo map, coverage stats, entity search |
| **Preflight** (Guideline Generator) | Anti-patterns linked to specific code entities via bridge table |
| **Memory Layer** (new) | Code chunks stored in sqlite-vec for retrieval; embeddings reused |

## 4. Tauri Commands

| Command | Purpose |
|---------|---------|
| `build_repo_map(project_id)` | Generate/refresh repo map; returns compact symbol table |
| `get_repo_map(project_id)` | Return cached repo map (fast) |
| `search_codebase(project_id, query, k)` | Hybrid search across codebase; returns ranked chunks |
| `get_code_chunk(project_id, file_path, level)` | Return chunk at specified signature ladder level |
| `get_file_context(project_id, file_path, depth)` | Return file + dependency neighborhood up to depth hops |
| `get_coverage_stats(project_id)` | Return exploration coverage percentages |
| `invalidate_cache(project_id, file_path)` | Force re-parse + re-embed of changed file |

## 5. Performance Targets

| Metric | Target |
|--------|--------|
| Repo map generation (1K files) | <5 seconds initial, <1 second incremental |
| BM25 search (100K chunks) | <50ms |
| Vector similarity search (100K chunks) | <10ms |
| Hybrid retrieval (query-to-context) | <200ms |
| Signature ladder: L1→L2 expansion | <100ms |
| Per-project disk overhead | <100MB for 100K files (embeddings + indexes) |

## 6. Dependencies

| Dependency | Purpose |
|-----------|---------|
| tree-sitter (Rust crate) | AST parsing for 40+ languages |
| tree-sitter grammars (TypeScript, Python, Rust, Go) | Language-specific parsers |
| sqlite-vec | Vector index over code chunks |
| all-MiniLM-L6-v2 / ONNX Runtime | Local embedding model |
| notify (existing) | File change watcher for cache invalidation |

## 7. Risks

| Risk | Mitigation |
|------|-----------|
| Tree-sitter parsing overhead on large repos | Incremental re-parse; cache ASTs; background thread |
| Embedding quality for code insufficient | Tiered: local all-MiniLM first; benchmark; upgrade to Voyage Code 2 if gaps |
| Repo map too large for small context windows | PageRank pruning; configurable token budget; adaptive compression |
| Cross-language support gaps | Phase 1: 4 languages; Phase 2: all tree-sitter grammars |

## 8. Research Basis

Full research: `docs/research/codebase-exploration-research.md`

Key influences:
- **Aider Repo Map**: PageRank-based symbol ranking; token-budget-constrained selection; tree-sitter backend
- **RepoCoder**: Iterative retrieval-generation; 10%+ improvement on repo-level completion
- **SWE-agent**: Agent-Computer Interface; scroll-based incremental reading
- **BM25 + Embedding Hybrid**: Validated by SWE-bench; BM25 competitive at 13K tokens
- **LLMLingua**: Coarse-to-fine prompt compression (complementary to signature ladder)
