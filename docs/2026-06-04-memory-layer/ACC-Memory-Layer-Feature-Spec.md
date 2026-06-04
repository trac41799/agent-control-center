# ACC Advanced Memory Layer — Feature Specification

**Date:** 2026-06-04  
**Status:** Accepted for ACC build-in  
**Source Research:** `docs/research/advanced-memory-layer-for-ai-agents.md`  
**Integration Target:** Phases 9++, 10+ of ACC Roadmap

---

## 1. Problem Statement

ACC orchestrates 9 AI coding agents across parallel PTY sessions. Currently:

- Agents have **no persistent context across sessions** beyond manual WIP checkpoints
- **No context compression** — long sessions hit model limits with no graceful degradation
- **No semantic retrieval** — agents cannot search past decisions, patterns, or constraints
- **Memory files** (CLAUDE.md etc.) are the only cross-session store, manually edited
- The Knowledge Compounder (Module 16) is **batch post-wave**, not real-time

This means: every session starts mostly from scratch, critical constraints get dropped when context fills, and agents cannot learn from each other's discoveries without manual intervention.

## 2. Proposed Solution

A **4-component memory plugin** (`acc-memory`) integrated into ACC's Rust backend and React frontend:

```
┌──────────────────────────────────────────────────────────┐
│                    ACC MEMORY PLUGIN                       │
├──────────────────────────────────────────────────────────┤
│ 1. STORAGE ENGINE     │ sqlite-vec + SQLite (per-project) │
│ 2. EXTRACTION HOOK    │ ADD-only fact capture per turn     │
│ 3. CONTEXT COMPRESSOR │ 3-zone compactor per agent         │
│ 4. RETRIEVAL ENGINE   │ Hybrid: vector + BM25 + entity     │
└──────────────────────────────────────────────────────────┘
```

### 2.1 Component 1: Storage Engine

| Decision | Rationale |
|----------|-----------|
| **sqlite-vec** | Zero-dependency (single `.c` file), in-process, Windows-native, SQL-based |
| Per-project `acc_memory.db` | Same as existing SQLite pattern; one file to backup/transfer |
| Partitioned by `agent_id` + `session_id` | Multi-tenant isolation for 9 parallel agents |
| WAL mode (already active) | Concurrent reads and writes |

**Schema additions:**

```sql
CREATE VIRTUAL TABLE vec_memories USING vec0(
    embedding float[384]
);

CREATE TABLE memory_facts (
    id            TEXT PRIMARY KEY,
    agent_id      TEXT NOT NULL,
    session_id    TEXT NOT NULL,
    user_id       TEXT NOT NULL,
    org_id        TEXT NOT NULL,
    fact_type     TEXT NOT NULL,  -- 'decision' | 'constraint' | 'preference' | 'pattern' | 'error' | 'entity'
    content       TEXT NOT NULL,
    embedding     BLOB,           -- 384-dim float array
    metadata      TEXT,           -- JSON: {file, function, stack, tags}
    confidence    REAL DEFAULT 0.5,
    access_count  INTEGER DEFAULT 0,
    last_accessed TEXT,
    created_at    TEXT NOT NULL
);

CREATE TABLE session_checkpoints (
    id            TEXT PRIMARY KEY,
    agent_id      TEXT NOT NULL,
    session_id    TEXT NOT NULL,
    turn_number   INTEGER NOT NULL,
    state_blob    BLOB NOT NULL,  -- serialized agent state
    summary       TEXT,           -- LLM-generated summary at checkpoint
    token_count   INTEGER,
    created_at    TEXT NOT NULL
);

-- Multi-scope identity model
CREATE INDEX idx_memories_agent ON memory_facts(agent_id);
CREATE INDEX idx_memories_session ON memory_facts(session_id);
CREATE INDEX idx_memories_org ON memory_facts(org_id);
CREATE INDEX idx_memories_type ON memory_facts(fact_type);
CREATE INDEX idx_checkpoints_session ON session_checkpoints(session_id, turn_number);
```

### 2.2 Component 2: Extraction Middleware

Runs **after every agent turn** (async, non-blocking background thread):

```
1. Agent produces output → PTY pipeline dispatches
2. Extraction hook receives: agent_id, session_id, message_text, message_role
3. Heuristic pass (free):
   - Scan for explicit decisions: "I'll use...", "We should...", "The pattern is..."
   - Capture exact values: port numbers, version pins, threshold constants
   - Detect constraints: "Never modify...", "Must use..."
4. If heuristic has ≥3 high-confidence candidates → store directly
5. Otherwise → lightweight extraction LLM call (reuse OpenRouter integration)
6. Store extracted facts as ADD-only rows in `memory_facts`
7. Update embedding via all-MiniLM-L6-v2 (local ONNX, 384-dim)

Circuit breaker: 5 consecutive failures → 2-minute cooldown (agent continues without memory during outage)
```

**Extraction template:**
```
Extract critical facts from this agent exchange. Output JSON:

{
  "facts": [
    {
      "type": "decision|constraint|preference|pattern|error|entity",
      "content": "...",
      "confidence": 0.0-1.0,
      "entities": ["function_name", "file_path", "library"]
    }
  ]
}
```

### 2.3 Component 3: Context Compressor

Per-agent 3-zone compression (port of Hermes 4-phase algorithm):

**Triggers:**
- **Agent compressor:** fires at **50%** of model's context window
- **Gateway hygiene:** fires at **85%** (safety net)

**4 phases:**

```
Phase 1: Prune old tool outputs (>200 chars) → replace with placeholders
Phase 2: Determine boundaries (protect head 3 messages + tail by token budget)
Phase 3: Generate structured LLM summary of middle messages
         (pass previous_summary for continuity across compression cycles)
Phase 4: Reassemble: head + summary_message + tail
         (sanitize tool_call/tool_result pair ordering)
```

**Structured summary template:**
```
- Current goal: [task description]
- Completed: [list of completed subtasks]
- In progress: [what agent is currently doing]
- Key decisions: [decisions made and their reasoning]
- Constraints: [hard constraints from earlier turns]
- Dependencies: [cross-task dependencies to preserve]
- Files touched: [list of files modified, with brief reason]
- Errors encountered: [errors and what was learned]
```

**Anti-thrashing lock:** If compression fires twice with <10% token savings → permanently disable for session until explicit reset.

**Write-before-compaction pattern:** Before Phase 3, extraction middleware fires to capture all facts from the middle messages being compressed. This prevents loss of exact values, hard constraints, decision reasoning, cross-task dependencies, and implicit preferences.

### 2.4 Component 4: Retrieval Engine

Multi-signal hybrid search executed at session start and on agent context queries:

```
1. Vector similarity search (cosine distance via sqlite-vec MATCH)
2. BM25 keyword search (exact term matching for code identifiers, file paths)
3. Entity matching (filter by function names, file paths, libraries, tags)
4. Score fusion: alpha * normalized_vector + (1-alpha) * normalized_bm25
5. Memory decay reranking: recency_factor [0.3x, 1.5x] based on last_accessed
6. Scope filtering: agent_id + org_id filter applied before ranking
7. Return top-k within token budget
```

**Integration hooks (Tauri commands):**

| Command | Trigger | Purpose |
|---------|---------|---------|
| `on_agent_message(agent_id, session_id, message)` | Every PTY message | Fire extraction middleware |
| `get_context(agent_id, session_id, query, budget)` | Session start, agent query | Retrieve + assemble context |
| `compress_context(agent_id, session_id)` | Token threshold reached | Trigger 3-zone compression |
| `on_session_start(agent_id, session_id)` | PTY session spawn | Load checkpoint, inject memories |
| `on_session_end(agent_id, session_id)` | PTY session close | Persist checkpoint, mark inactive |
| `memory_search(query, filters)` | User via Knowledge Panel | Cross-agent memory search |
| `memory_stats(agent_id, org_id)` | CLI inspection | Aggregation: facts, tokens, confidence |

### 2.5 Session Persistence (Checkpoint/Resume)

```
Session Start:
  1. Load latest checkpoint for (agent_id, session_id)
  2. If checkpoint exists → restore agent state
  3. Retrieve top-10 relevant memory facts via hybrid search
  4. Inject as preamble: "Prior knowledge: [fact_1, fact_2, ...]"
  5. Inject pending tasks from WIP checkpoints

Session End:
  1. Fire extraction on final exchanges
  2. Generate checkpoint summary (LLM, async)
  3. Persist (state_blob, summary, token_count)
  4. Release per-agent file locks
```

## 3. Integration Points with Existing ACC Modules

| Existing Module | Integration |
|----------------|------------|
| **PTY Pipeline** (pty.rs) | Extraction hook inserted after dispatch; context compressor intercepts before xterm render |
| **Knowledge Compounder** (knowledge.rs) | Memory facts feed into Compounder as additional Pass 1 sources; Compounder outputs stored as `memory_facts` with type='pattern' |
| **Agent Runner** (agentStore.ts) | Per-agent memory injection on spawn; compression status indicator in agent panel header |
| **Knowledge Panel** (Knowledge.tsx) | New tab: "Memory" showing fact timeline, search, filter by type/agent/confidence |
| **Session Replay** (Replay.tsx) | Memory events on timeline: `fact_extracted`, `context_compressed`, `checkpoint_saved` |
| **Token Budget** (budget.rs) | Compressor reads current token count from budget tracker; budget planner accounts for injection tokens |
| **Settings** (Settings.tsx) | Configure: compression threshold %, embedding model, extraction model, circuit breaker params |

## 4. UI Components

### 4.1 Memory Panel (in Knowledge page)
- **Fact timeline**: chronological list of extracted facts with type badges
- **Search bar**: hybrid search across all memory facts
- **Filter chips**: by agent, type, confidence, recency
- **Fact card**: type icon + content + entities + confidence bar + "View source session" link

### 4.2 Memory Stats (in Outcomes page)
- Facts per agent chart
- Average confidence trend
- Extraction success rate
- Token savings from compression

### 4.3 Compression Status Indicator (Runner header)
- Green dot: context <30%
- Yellow dot: context 30-50%
- Orange pulsing: compression imminent
- Red: compression active or anti-thrashing locked

## 5. Performance Targets

| Metric | Target |
|--------|--------|
| Fact extraction latency | <200ms (heuristic), <2s (LLM), async non-blocking |
| Vector similarity search | <10ms for 10K facts |
| Context compression | <3s for 128K token context |
| Memory injection at session start | <500ms |
| SQLite WAL write contention | 0% blocking (partitioned by agent_id) |
| Per-project storage overhead | <50MB for 100K facts + embeddings |

## 6. Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| sqlite-vec | latest | In-process vector search |
| all-MiniLM-L6-v2 | latest | Local embedding model (ONNX Runtime) |
| tree-sitter (existing) | latest | Code entity extraction for fact metadata |
| OpenRouter (existing) | — | LLM-based fact extraction (reuse existing integration) |

## 7. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| sqlite-vec pre-v1 instability | Pin version; abstract behind trait for swap-out |
| Extraction LLM cost exceeds savings | Measure token ratio monthly; cap at 5% of session tokens |
| 9-agent concurrent SQLite writes | WAL mode; per-agent partition; write queue |
| Compression loses critical constraints | Write-before-compaction hook; dual-threshold safety net |
| Embedding model quality for code | Start with all-MiniLM; benchmark; upgrade to Voyage Code 2 if gap |

## 8. Phase Alignment

This module spans across ACC roadmap phases:

| Sub-component | Aligns with | Effort |
|--------------|------------|--------|
| Context Compressor | Phase 9++ (Token Budget) — compressor needs token tracking | 3 days |
| Extraction Middleware | Phase 9+ (Knowledge Layer) — extends Compounder to real-time | 2 days |
| Session Checkpointing | Phase 9++ (WIP Capture) — checkpoints complement WIP files | 2 days |
| Storage Engine + Retrieval | New Phase 10 (Memory Layer) — dedicated phase | 8 days |
| Cross-agent Synthesis | Phase 10+ (Control Sessions) — multi-thread coordination | 5 days |

**Total: ~20 days (4 weeks)** spread across existing and new phases.

## 9. Research Basis

Full research: `docs/research/advanced-memory-layer-for-ai-agents.md`

Key influences:
- **MemGPT/Letta**: OS-inspired hierarchical memory; virtual context management
- **Mem0**: Multi-signal retrieval; ADD-only extraction; memory decay; circuit breaker
- **Hermes**: 4-phase 3-zone compression; write-before-compaction; anti-thrashing lock
- **sqlite-vec**: Zero-dependency in-process vector search (Mozilla-sponsored)
- **LangGraph**: Checkpoint/resume pattern for session persistence
