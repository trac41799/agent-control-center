# ACC Robust Knowledge Graph — Feature Specification

**Date:** 2026-06-04  
**Status:** Accepted for ACC build-in  
**Source Research:** `docs/research/knowledge-graph-research.md`  
**Integration Target:** Evolution of Phase 9 (Knowledge Layer) into a full KG subsystem

---

## 1. Problem Statement

ACC has a functional but basic knowledge system:

- `knowledge_items` + `knowledge_relations` SQLite tables with 4 relation types
- Heuristic-based extraction from session events (file counts, edit churn)
- Jaccard similarity deduplication (keyword-level, misses semantic duplicates)
- Simple confidence model (weighted average, no source credibility)
- **No graph traversal** — relations exist but can't be queried as paths
- **No visualization** — knowledge exists only as a list
- **No code integration** — knowledge items aren't linked to specific code entities
- **No community structure** — no clustering of related knowledge

This means: knowledge accumulates but is hard to explore, query, visualize, or verify.

## 2. Proposed Solution

Evolve the existing knowledge base into a **GraphRAG-inspired, vector-enabled knowledge graph** with visualization, bridging structural code knowledge and experiential agent knowledge.

### 2.1 Architecture Evolution

```
CURRENT                          →  EVOLVED
─────────────────────────────────────────────────────
SQLite flat tables               →  SQLite + sqlite-vec + in-memory graph
Heuristic extraction only        →  Heuristic + LLM extraction pipeline
Jaccard text dedup               →  Embedding + LLM-assisted merge resolution
4 relation types                 →  12+ relation types with typed semantics
No graph queries                 →  BFS expansion + recursive CTE multi-hop
No visualization                 →  Cytoscape.js force-directed interactive graph
No code linkage                  →  tree-sitter code entities + bridge table
No community structure           →  Leiden community detection + summaries
No temporal dimension            →  valid_from/until, versioned knowledge nodes
Simple confidence                →  Multi-factor: source + corroboration + recency + tier
```

### 2.2 Component 1: Enhanced Storage Schema

**Migration from current schema:**

```sql
-- Add embeddings (sqlite-vec)
ALTER TABLE knowledge_items ADD COLUMN embedding BLOB;

-- Add canonical name for entity resolution
ALTER TABLE knowledge_items ADD COLUMN canonical_name TEXT;

-- Add temporal validity
ALTER TABLE knowledge_items ADD COLUMN valid_from TEXT;
ALTER TABLE knowledge_items ADD COLUMN valid_until TEXT;
ALTER TABLE knowledge_items ADD COLUMN applicable_versions TEXT;
ALTER TABLE knowledge_items ADD COLUMN superseded_by TEXT;

-- Add context tags for disambiguation
ALTER TABLE knowledge_items ADD COLUMN context_tags TEXT;

-- Provenance tracking (replaces session_ids string)
CREATE TABLE knowledge_provenance (
    item_id       TEXT REFERENCES knowledge_items(id) ON DELETE CASCADE,
    source_type   TEXT NOT NULL,  -- 'session_event' | 'agent_claim' | 'manual' | 'compounder'
    source_id     TEXT NOT NULL,
    excerpt       TEXT,
    attributed_at TEXT NOT NULL,
    confidence_contribution REAL DEFAULT 1.0,
    PRIMARY KEY (item_id, source_id)
);

-- Community detection results
CREATE TABLE knowledge_communities (
    item_id       TEXT REFERENCES knowledge_items(id) ON DELETE CASCADE,
    community_id  TEXT NOT NULL,
    level         INTEGER NOT NULL DEFAULT 0,  -- 0=local, 1=mid, 2=global
    assigned_at   TEXT NOT NULL,
    PRIMARY KEY (item_id, level)
);

-- Community summaries (GraphRAG-style)
CREATE TABLE community_summaries (
    community_id  TEXT PRIMARY KEY,
    level         INTEGER NOT NULL,
    title         TEXT NOT NULL,
    summary       TEXT NOT NULL,
    item_count    INTEGER DEFAULT 0,
    embedding     BLOB,
    generated_at  TEXT NOT NULL
);

-- First-class contradictions
CREATE TABLE knowledge_contradictions (
    id              TEXT PRIMARY KEY,
    item_a_id       TEXT REFERENCES knowledge_items(id) ON DELETE CASCADE,
    item_b_id       TEXT REFERENCES knowledge_items(id) ON DELETE CASCADE,
    conflict_type   TEXT,  -- 'direct' | 'contextual' | 'temporal'
    description     TEXT,
    resolution      TEXT DEFAULT 'unresolved',
    resolved_by     TEXT,
    resolved_at     TEXT,
    created_at      TEXT NOT NULL
);

-- Code entities (from tree-sitter)
CREATE TABLE code_entities (
    id              TEXT PRIMARY KEY,
    project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
    entity_type     TEXT NOT NULL,  -- 'file' | 'function' | 'class' | 'module'
    name            TEXT NOT NULL,
    qualified_path  TEXT,           -- "src/auth.ts::login"
    language        TEXT,
    source_file     TEXT NOT NULL,
    line_start      INTEGER,
    line_end        INTEGER,
    signature       TEXT,
    embedding       BLOB,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

-- Bridge: code entities ↔ knowledge items
CREATE TABLE code_to_knowledge (
    code_entity_id  TEXT REFERENCES code_entities(id) ON DELETE CASCADE,
    knowledge_id    TEXT REFERENCES knowledge_items(id) ON DELETE CASCADE,
    relation_type   TEXT NOT NULL,  -- 'applies_to' | 'exemplifies' | 'violates' | 'derived_from'
    confidence      REAL DEFAULT 1.0,
    created_at      TEXT NOT NULL,
    PRIMARY KEY (code_entity_id, knowledge_id, relation_type)
);

-- Git co-change patterns
CREATE TABLE git_cochange_relations (
    file_a          TEXT NOT NULL,
    file_b          TEXT NOT NULL,
    project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
    jaccard_score   REAL NOT NULL,
    cochange_count  INTEGER NOT NULL,
    last_observed   TEXT NOT NULL,
    PRIMARY KEY (file_a, file_b, project_id)
);
```

### 2.3 Component 2: Enhanced Relation Types

**Current:** `contradicts`, `extends`, `requires`, `confirmed_by`
**Evolved:** Full typed relation vocabulary

| Relation | Type | Meaning | Example |
|----------|------|---------|---------|
| `contradicts` | Conflict | A and B cannot both be true | Anti-pattern contradicts convention |
| `extends` | Hierarchical | A is a specialization of B | Pattern extends broader principle |
| `requires` | Dependency | A depends on B being true/applied | Convention requires library version |
| `confirmed_by` | Corroboration | A is supported by evidence B | Pattern confirmed by session outcome |
| `caused_by` | Causal | A was caused by B | Error caused by antipattern |
| `fixed_by` | Resolution | A was resolved by action B | Bug fixed by specific change |
| `similar_to` | Semantic | A and B are semantically close | Two patterns describe same concept |
| `precedes` | Temporal | A must happen before B | Setup precedes configuration |
| `supersedes` | Versioning | A replaces/updates B | Newer version of same knowledge |
| `applies_to` | Code bridging | Knowledge applies to code entity | Pattern applies to specific function |
| `derived_from` | Source | Knowledge was derived from code analysis | Antipattern derived from file analysis |
| `exemplifies` | Example | Code entity is an example of pattern | Function exemplifies a convention |

### 2.4 Component 3: LLM-Driven Extraction Pipeline

Replaces/augments the current heuristic-only Pass 1:

```
Session Events + Code Diffs
    │
    ├──► Heuristic Pass (existing): file touch counts, error signatures, command frequency
    │
    ├──► LLM Extraction Pass (new):
    │    - Feed session event stream + code diffs to extraction LLM
    │    - Extract: entities, relations, patterns, decisions, errors
    │    - Structured JSON output with confidence per extraction
    │
    └──► Code Analysis Pass (new):
         - tree-sitter parse of modified files
         - Extract: function definitions, imports, type references
         - Detect: API changes, breaking changes, introduced patterns
```

**Extraction prompt template:**
```
Extract entities and relationships from this coding session.
Output JSON:
{
  "entities": [
    {"name": "...", "type": "file|function|pattern|error|decision|library",
     "description": "...", "confidence": 0.0-1.0}
  ],
  "relationships": [
    {"source": "entity_name", "target": "entity_name",
     "type": "caused_by|fixed_by|extends|requires|contradicts|similar_to",
     "evidence": "...", "confidence": 0.0-1.0}
  ]
}
```

### 2.5 Component 4: GraphRAG-Style Queries

**Local Search (entity-focused):**
```
Input: seed entity IDs + query
1. BFS graph expansion from seeds, max_depth=2
2. Collect all knowledge items in visited subgraph
3. Retrieve relevant community summaries at matching level
4. Rank by confidence + graph distance from seeds
5. Return top-k within token budget as LLM context
```

**Global Search (community-based):**
```
Input: high-level query
1. Embed query, find top-3 matching community summaries
2. For each matched community:
   - Return summary + top-5 member items by confidence
3. Combine into structured response
```

**Multi-hop reasoning (via recursive CTE):**
```sql
WITH RECURSIVE traverse(id, target_id, relation_type, depth, path) AS (
    SELECT from_id, to_id, relation_type, 1,
           from_id || '->' || to_id
    FROM knowledge_relations
    WHERE from_id IN (SELECT id FROM knowledge_items WHERE type = 'error')

    UNION ALL

    SELECT r.from_id, r.to_id, r.relation_type, t.depth + 1,
           t.path || '->' || r.to_id
    FROM knowledge_relations r
    JOIN traverse t ON r.from_id = t.to_id
    WHERE t.depth < 3
)
SELECT DISTINCT t.target_id, k.title, k.content, t.depth, t.path
FROM traverse t
JOIN knowledge_items k ON k.id = t.target_id
WHERE k.type = 'antipattern'
ORDER BY t.depth;
```

### 2.6 Component 5: Community Detection (Leiden Algorithm)

Run periodically (on significant graph change):

1. Build in-memory graph from `knowledge_items` + `knowledge_relations`
2. Run Leiden community detection (hierarchical, 3 levels)
3. Store results in `knowledge_communities`
4. For each community at each level → generate LLM summary
5. Store summaries in `community_summaries` with embeddings
6. Re-run incrementally when >10% new items added

**Community summary prompt:**
```
Summarize the following knowledge items that form a community.
They share common themes or relationships.

Items: [list of item titles and content snippets]

Output:
{
  "title": "Community theme (5-10 words)",
  "summary": "2-3 paragraph synthesis of what this community represents",
  "key_patterns": ["pattern_1", "pattern_2"],
  "confidence": 0.0-1.0
}
```

### 2.7 Component 6: Multi-Factor Confidence Model

Replaces current simple weighted average:

```
confidence = α * source_credibility + β * corroboration + γ * recency + δ * agent_tier

Where:
- source_credibility (α=0.3): Based on source type
  - manual > compounder (LLM-confirmed) > agent_claim > heuristic
- corroboration (β=0.35): log(confirmation_count + 1) / log(max_confirmations + 1)
  - Diminishing returns after ~8 confirmations
- recency (γ=0.2): exp(-λ * days_since_last_confirmation), λ = 0.01
- agent_tier (δ=0.15): Tier 1 agent (capable model) = 0.9; Tier 2 = 0.6
```

**Confidence tiers:**
- **Low (0.0-0.3):** Emerging pattern — surfaced in Knowledge Panel, not injected
- **Medium (0.3-0.6):** Moderate confidence — context suggestion, guideline generation
- **High (0.6-1.0):** Established knowledge — auto-injected into session preamble

### 2.8 Component 7: Visualization (Cytoscape.js)

Interactive force-directed graph in ACC's React frontend:

**Layout:** CoSE-Bilkent (compound node support for file→class→method nesting)

**Interaction patterns:**
- Click node → expand neighbors (lazy loading)
- Type-based color coding (decision=blue, pattern=green, antipattern=red, error=orange)
- Confidence-based node size (larger = higher confidence)
- Community coloring: nodes in same community share hue
- Path highlighting: select two nodes → highlight shortest path(s)
- Temporal scrubber: slider to view KG state at different points in time
- Filter bar: toggle by type, confidence threshold, agent, recency

**Human-in-the-loop curation:**
- Double-click → inline edit title/content
- Drag between nodes → create relation (dropdown for type selection)
- "Merge?" prompt when two nodes have high cosine similarity
- "Resolve" button on contradiction edges → resolution panel
- "Confirm" / "Flag" controls on low-confidence items

**Libraries:**
- Cytoscape.js (core, zero-dependency, WebView-compatible)
- cytoscape-fcose (CoSE-Bilkent layout)
- cytoscape-edgehandles (drag-to-create edges)
- cytoscape-cxtmenu (right-click context menus)
- cytoscape-popper + Tippy.js (rich tooltips)

### 2.9 Component 8: Code ↔ Knowledge Bridge

Connects structural code understanding with experiential agent knowledge:

```
Query: "What patterns apply to src/auth.ts?"

Response:
  - Anti-pattern: "Direct password comparison" (confidence: 0.87)
    → applies_to src/auth.ts::login (line 45-67)
  - Pattern: "JWT token refresh" (confidence: 0.72)
    → applies_to src/auth.ts::refresh_token (line 120-145)
  - Convention: "Rate limit login attempts" (confidence: 0.64)
    → suggested_for src/auth.ts::login
```

**Bridge query:**
```sql
SELECT k.title, k.type, k.confidence, ce.name, ce.qualified_path, ck.relation_type
FROM code_to_knowledge ck
JOIN knowledge_items k ON k.id = ck.knowledge_id
JOIN code_entities ce ON ce.id = ck.code_entity_id
WHERE ce.source_file = 'src/auth.ts'
  AND k.status = 'active'
ORDER BY k.confidence DESC;
```

### 2.10 Component 9: Git History Mining

Mine co-change patterns from git history:

```
For each pair of files (A, B) in the repo:
  cochange_count = number of commits modifying both A and B
  jaccard = cochange_count / (commits_touching_A + commits_touching_B - cochange_count)
  if jaccard > 0.3: store in git_cochange_relations

Use: When file A is modified, surface warning:
  "src/services/auth.py co-changes with src/models/user.py (Jaccard: 0.42).
   Did you need to update both?"
```

## 3. Integration Points

| Existing Module | Integration |
|----------------|------------|
| **Knowledge Compounder** (knowledge.rs) | Extraction pipeline feeds from Compounder's Pass 1 candidates; enhanced Pass 2 uses LLM extraction |
| **Knowledge Panel** (Knowledge.tsx) | New KG Explorer tab with Cytoscape.js; community view; code bridge |
| **Memory Layer** (new) | Memory facts feed into KG as knowledge items; KG relations enrich memory retrieval |
| **Codebase Exploration** (new) | tree-sitter code entities populate `code_entities` table; bridge connects to knowledge |
| **Preflight** (Guideline Generator) | Anti-patterns linked to code entities; community summaries provide project health overview |
| **Session Replay** (Replay.tsx) | KG events on timeline: item_created, item_confirmed, contradiction_detected |

## 4. Tauri Commands

| Command | Purpose |
|---------|---------|
| `kg_search(query, filters)` | Hybrid search over knowledge items + communities |
| `kg_local_search(seed_ids, depth)` | BFS subgraph expansion from seed items |
| `kg_global_search(query)` | Community summary-based search |
| `kg_get_community(community_id, level)` | Get community details + member items |
| `kg_get_subgraph(item_ids, depth)` | Return subgraph as JSON for Cytoscape.js |
| `kg_get_code_knowledge(file_path)` | Get all knowledge items linked to a code file |
| `kg_get_contradictions(filter)` | List unresolved contradictions |
| `kg_resolve_contradiction(id, resolution)` | Mark contradiction as resolved |
| `kg_merge_items(item_a, item_b)` | Merge two knowledge items (human-initiated) |
| `kg_run_community_detection(project_id)` | Trigger Leiden clustering |

## 5. Performance Targets

| Metric | Target |
|--------|--------|
| BFS subgraph expansion (depth=2, 10K nodes) | <100ms |
| Community detection (Leiden, 50K nodes) | <2 seconds |
| Community summary generation (LLM) | <5 seconds per community (async) |
| Cytoscape.js render (1K nodes, 2K edges) | <1 second |
| Multi-hop CTE query (depth=3) | <50ms |
| Code-to-knowledge bridge query | <10ms |

## 6. Dependencies

| Dependency | Purpose |
|-----------|---------|
| sqlite-vec | Vector similarity over knowledge items and community summaries |
| tree-sitter | Code entity extraction (shared with Codebase Exploration module) |
| Cytoscape.js + extensions | Interactive graph visualization |
| OpenRouter (existing) | LLM-based extraction, community summarization, merge resolution |
| all-MiniLM-L6-v2 | Knowledge item embeddings (shared with Memory Layer) |

## 7. Risks

| Risk | Mitigation |
|------|-----------|
| KG grows too large for in-memory graph ops | Partition by project; lazy-load subgraphs; cap at 50K nodes per project before Neo4j migration |
| LLM extraction quality degrades at scale | Confidence gating; human review for low-confidence items; heuristic fallback |
| Community detection too slow for real-time updates | Run as async background task; incremental update on <10% changes |
| Cytoscape.js performance with large graphs | Lazy render; virtualized nodes; filter-to-visible pattern |

## 8. Research Basis

Full research: `docs/research/knowledge-graph-research.md`

Key influences:
- **GraphRAG (Microsoft)**: Leiden community detection; local/global/DRIFT search; hierarchical community summaries
- **Neo4j + LLM Integration**: Text-to-Cypher; GraphRAG hybrid; embedded knowledge graphs with vector indexes
- **GeomE**: Knowledge graph embeddings in geometric algebra (relevant to Clifford/Bagua research)
- **Cytoscape.js**: Battle-tested graph visualization (Meta, Amazon, Microsoft)
- **Leiden Algorithm**: Guarantees well-connected communities; outperforms Louvain
