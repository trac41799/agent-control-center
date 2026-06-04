# Robust Knowledge Graph Construction, Storage, and Exploration for AI Agents

**Research Document for Agent Control Center (ACC)**  
**Date:** 2026-06-04  
**Scope:** Evolving ACC's SQLite-based `knowledge_items` + `knowledge_relations` schema into a production-grade agent knowledge graph  

---

## Table of Contents

1. [Knowledge Graph Architectures for LLM Agents](#1-knowledge-graph-architectures-for-llm-agents)
2. [KG Construction from Agent Interactions](#2-kg-construction-from-agent-interactions)
3. [Knowledge Graph Exploration](#3-knowledge-graph-exploration)
4. [Visualization of Knowledge Graphs](#4-visualization-of-knowledge-graphs)
5. [KG for Code Understanding](#5-kg-for-code-understanding)
6. [Evolution Path for ACC](#6-evolution-path-for-acc)

---

## 1. Knowledge Graph Architectures for LLM Agents

### 1.1 Property Graphs vs. RDF/OWL

| Dimension | Property Graph (LPG - Labeled Property Graph) | RDF/OWL (Semantic Web) |
|-----------|-----------------------------------------------|------------------------|
| **Data Model** | Nodes with labels + key-value properties; typed edges with properties | (Subject, Predicate, Object) triples; OWL ontologies for reasoning |
| **Query Language** | Cypher (Neo4j), Gremlin (TinkerPop), GQL | SPARQL |
| **Schema** | Optional/schema-flexible; labels define entity types | OWL/RDFS schemas with formal semantics (subClassOf, domain, range) |
| **Reasoning** | Limited; typically done in application code | Built-in: subsumption, transitivity, consistency checking via reasoners (Pellet, HermiT) |
| **Ecosystem** | Neo4j, Amazon Neptune, JanusGraph, Memgraph | GraphDB, Stardog, Apache Jena, MarkLogic |
| **Best For** | Operational graphs, path-based queries, real-time traversal | Data integration, metadata management, enterprise ontologies, regulatory compliance |
| **LLM Integration** | Neo4j GraphRAG Python package, LangChain GraphCypherQAChain, LlamaIndex KnowledgeGraphIndex | SPARQL generation via LLMs; slower adoption for GenAI |

**Key insight for ACC**: Property graphs are far more natural for a coding-agent system. You get typed relationships like `(Codebase) -[:CONTAINS]-> (Module)`, schemas flex as the agent ecosystem evolves, and Cypher's PATH syntax (`(a)-[*1..3]->(b)`) enables the multi-hop reasoning agent agents need. RDF/OWL adds overhead (ontology maintenance, SPARQL complexity) without proportionate benefit for a code-agent KG. The exception: if ACC ever needs to federate across multiple external knowledge sources with semantic interop, consider RDF as a secondary serialization layer (via Neo4j Neosemantics / rdflib-neo4j).

### 1.2 GraphRAG (Microsoft)

GraphRAG (arxiv:2404.16130) is Microsoft's structured approach to RAG that addresses a critical weakness of naive vector-search RAG: answering **global sensemaking questions** about an entire corpus.

**Two-phase architecture:**

#### Phase 1: Indexing
1. **Source Documents → TextUnits**: Slice corpus into analyzable chunks with fine-grained references.
2. **Entity & Relation Extraction**: LLM extracts entities (people, places, concepts) and relationships from each TextUnit.
3. **Community Detection**: Hierarchical clustering via **Leiden algorithm** (arxiv:1810.08473). Entities are grouped into nested communities.
4. **Community Summarization**: LLM generates bottom-up summaries for each community. Higher-level communities receive summaries built from sub-community summaries. This creates a **hierarchical summary tree**.

#### Phase 2: Querying (Two Modes)

| Mode | How It Works | Best For |
|------|-------------|----------|
| **Local Search** | From a set of seed entities, fan out to neighbors and associated concepts via graph traversal. Combines structured knowledge with raw text chunks. | Specific entity-focused questions: "What does the codebase say about authentication?" |
| **Global Search** | Map-reduce over community summaries. Each relevant community summary generates a partial answer; all partials are summarized into final response. | Holistic questions: "What are the main themes?" "What patterns connect across modules?" |
| **DRIFT Search** | Combines local fan-out with community context. Hybrid. | Questions requiring both local precision and global context. |
| **Basic Search** | Fallback to standard top-k vector similarity. | Simple keyword/semantic lookup. |

**Key architectural decisions:**
- The knowledge graph is **LLM-generated** - entities and relationships are extracted via prompt, not hand-curated.
- Community detection via Leiden provides **multi-scale summarization** (local neighbors, mid-level communities, global themes).
- The graph is the **index structure**, not just a data store.

**Relevance to ACC**: ACC can implement GraphRAG patterns in two contexts:
1. **Within-session**: Index a single coding session's events as a KG, detect communities of related edits, generate summaries of "what changed and why."
2. **Cross-session**: Build a persistent entity KG across all sessions, use community detection to group related knowledge items, and enable both local ("what patterns apply to this file?") and global ("what anti-patterns recur across the project?") queries.

### 1.3 Neo4j + LLM Integration Patterns

Neo4j has invested heavily in LLM integration. The primary patterns:

#### Pattern A: Text-to-Cypher (Natural Language → Graph Query)
```
User: "Which files were modified in session X and what errors occurred?"
LLM generates: MATCH (s:Session {id: "X"})-[:HAD_EVENT]->(e:Event)-[:MODIFIED]->(f:File)
               MATCH (s)-[:HAD_ERROR]->(err:Error)
               RETURN f.path, err.message
```
- Works for structured queries when the schema is well-defined.
- Risk: LLM can generate invalid Cypher; requires validation and retry loops.

#### Pattern B: GraphRAG (Hybrid Vector + Graph)
- **Neo4j GraphRAG Python** package (`neo4j-graphrag`): VectorRetriever for similarity search over embedded nodes + GraphRetriever for structured traversal.
- **Knowledge Graph Builder** (Neo4j Labs): End-to-end tool that extracts entities/relations from text via LLM, builds a lexical graph (Documents → Chunks) + entity graph, stores both with embeddings.

#### Pattern C: Agent Knowledge Graph (KG as Agent Memory)
- Node types: `Agent`, `Task`, `Codebase`, `Pattern`, `Decision`, `Error`, `Learning`.
- As the agent operates, it writes to the KG (not just a flat log).
- At query time, the KG provides **structured recall** - the agent retrieves relevant past decisions, discovered patterns, and known errors.

#### Pattern D: Neo4j as Vector Store
- Neo4j supports native **vector indexes** (since v5.11 with ANN search).
- Nodes with `embedding` properties can be queried via cosine/euclidean similarity.
- Enables **embedded knowledge graphs**: each node has a vector embedding; you can search by similarity AND traverse relationships in the same query.

```cypher
CALL db.index.vector.queryNodes('knowledge-embeddings', 5, $queryEmbedding)
YIELD node, score
MATCH (node)-[r]->(related)
RETURN node, score, related, type(r)
```

### 1.4 Embedded Knowledge Graphs (Vector + Graph Hybrid)

This is the most relevant approach for ACC's current trajectory. The idea:

- Each `knowledge_items` row already has text content (`title`, `content`).
- Add an **embedding column** (vector of 384-1536 floats) to `knowledge_items`.
- Build a **vector index** (Neo4j native, or pgvector for Postgres, or sqlite-vss for SQLite).
- Query becomes: "Find the 10 most similar knowledge items to this query, then traverse their relations to pull in related context."
- This combines **semantic recall** (find relevant items even with different wording) with **structural recall** (follow the graph of relationships).

**SQLite options for vector search:**
- `sqlite-vss` (from asg017, uses Faiss)
- `sqlite-vec` (newer, zero-dependency, pure SQLite extension with vec0 virtual tables)
- External: store a numpy/PyTorch embedding index in-memory, lazily synced from SQLite

### 1.5 Graph Databases vs. In-Process Solutions

| Criteria | Neo4j (External Graph DB) | SQLite (In-Process) | DuckDB (In-Process OLAP) |
|----------|---------------------------|---------------------|---------------------------|
| **Setup** | Docker/service install | Zero-config file-based | Zero-config, file or memory |
| **Graph Queries** | Native Cypher, PATH, shortest path, centrality | Manual SQL recursion, no path algebra | Recursive CTEs, no native graph |
| **Vector Search** | Native ANN vector indexes | sqlite-vss / sqlite-vec extensions | Array type + list_distance (not ANN) |
| **Performance** | Optimized for graph traversal (index-free adjacency) | Fast for key-value, slow for deep traversal | Fast for analytical queries, not traversal |
| **Embedding** | Client-server; needs network | Direct file access; no network | Direct file access; no network |
| **Relevance to ACC** | Best if KG grows to 100K+ nodes with complex traversal | **Best for current ACC** (<50K nodes) | Not suitable for graph workloads |

**Recommendation for ACC**: Stay with SQLite for the core storage, but layer graph capabilities through application code. Consider:
1. **Sqlite-vec** for vector similarity over knowledge items.
2. **In-memory adjacency list** for fast graph traversal during query time (load relations into a Rust HashMap, do BFS/DFS in application code).
3. Migrate to **Neo4j** only if ACC reaches 100K+ knowledge items with complex n-hop traversal requirements.

---

## 2. KG Construction from Agent Interactions

### 2.1 Entity and Relation Extraction from Agent Conversations

ACC's current approach (pass1_local_prepass in `knowledge.rs:839`) uses **heuristic extraction** based on event statistics (file counts, edit churn, recurring errors). This is a good start but misses semantic richness.

**Production-grade extraction pipeline:**

```
Agent Session Events
    │
    ├──► Heuristic Pass (existing): file touch counts, error signatures, command frequency
    │
    ├──► LLM Extraction Pass (new):
    │    - Feed session event stream + code diffs to an LLM
    │    - Extract: Entities (files, functions, errors, patterns, decisions)
    │    - Extract: Relations (CAUSED_BY, FIXES, DEPENDS_ON, INTRODUCES)
    │    - Confidence scoring per extraction
    │
    └──► Code Analysis Pass (new):
         - Parse modified files via tree-sitter
         - Extract: function definitions, imports, type references
         - Detect: API changes, breaking changes, new patterns
```

**Prompt template for LLM extraction (based on GraphRAG & Neo4j LLM Graph Builder patterns):**

```
You are a knowledge graph extraction engine for a coding agent system.

Given the following session event log, extract entities and relationships.

Entities (with type):
- File: source code files
- Function: functions/methods
- Pattern: coding patterns observed
- Error: errors encountered
- Decision: architectural or implementation decisions
- Library: external dependencies

Relationships (with type):
- MODIFIES (Agent -> File)
- INTRODUCES (Agent -> Pattern)
- CAUSES (Decision -> Error / Pattern)
- DEPENDS_ON (File -> File / File -> Library)
- FIXES (Change -> Error)
- CONTRADICTS (Pattern -> Pattern)

Output a JSON object:
{
  "entities": [
    {"name": "...", "type": "...", "description": "...", "confidence": 0.0-1.0}
  ],
  "relationships": [
    {"source": "entity name", "target": "entity name", "type": "...", "evidence": "...", "confidence": 0.0-1.0}
  ]
}
```

### 2.2 Incremental KG Construction

ACC's `compound_knowledge` function already merges items with keyword overlap. Evolution:

1. **Upsert with LLM dedup**: Instead of keyword-based Jaccard merging, use embeddings + LLM to decide: "Is this new knowledge item the same as an existing one, a refinement, or a contradiction?"
2. **Incremental Leiden clustering**: As new nodes/edges are added, incrementally update community assignments rather than re-running on the full graph. Use streaming community detection (label propagation is amenable to incremental updates).
3. **Versioned nodes**: Add `version` and `superseded_by` columns. When knowledge evolves (a pattern is proven wrong), deprecate the old node rather than delete it.
4. **Event sourcing**: Treat every insertion/update as an immutable event. The KG at any point in time is the materialized view of all events up to that point. This enables time-travel queries and audit trails.

**Proposed schema addition:**

```sql
-- Knowledge item versions (immutable event log)
CREATE TABLE knowledge_versions (
    id            TEXT PRIMARY KEY,
    item_id       TEXT REFERENCES knowledge_items(id),
    version       INTEGER NOT NULL,
    title         TEXT NOT NULL,
    content       TEXT NOT NULL,
    confidence    REAL,
    source_event  TEXT,  -- reference to event/session that triggered this version
    created_at    TEXT NOT NULL,
    UNIQUE(item_id, version)
);

-- Incremental community memberships
CREATE TABLE knowledge_communities (
    item_id       TEXT REFERENCES knowledge_items(id),
    community_id  TEXT NOT NULL,
    level         INTEGER NOT NULL,  -- 0=local, 1=mid, 2=global (hierarchical)
    assigned_at   TEXT NOT NULL,
    PRIMARY KEY (item_id, level)
);

-- Community summaries (GraphRAG-style)
CREATE TABLE community_summaries (
    community_id  TEXT PRIMARY KEY,
    level         INTEGER NOT NULL,
    title         TEXT NOT NULL,
    summary       TEXT NOT NULL,
    item_count    INTEGER,
    generated_at  TEXT NOT NULL,
    embedding     BLOB  -- for semantic search over community summaries
);
```

### 2.3 Confidence Scoring and Provenance Tracking

ACC's current confidence model (`weighted_confidence` in `knowledge.rs:833`) is a simple weighted average. For a robust system:

**Multi-factor confidence model:**

```
confidence = α * source_credibility + β * corroboration + γ * recency + δ * agent_tier

Where:
- source_credibility: Based on agent tier (Tier 4 > Tier 1), session outcome (success > failure)
- corroboration: Number of independent confirmations (confirmation_count), with diminishing returns
- recency: Exponential decay on older confirmations
- agent_tier: Higher-tier agents (more capable models) get higher base confidence
```

**Provenance tracking:** Every knowledge item should link back to its source(s):

```sql
-- Replace string session_ids with a proper provenance table
CREATE TABLE knowledge_provenance (
    item_id       TEXT REFERENCES knowledge_items(id),
    source_type   TEXT NOT NULL,  -- 'session_event', 'agent_claim', 'manual', 'compounder'
    source_id     TEXT NOT NULL,  -- session_id, event_id, etc.
    excerpt       TEXT,           -- relevant snippet from source
    attributed_at TEXT NOT NULL,
    confidence_contribution REAL, -- how much this source contributed to final confidence
    PRIMARY KEY (item_id, source_id)
);
```

### 2.4 Contradiction Detection and Resolution

ACC already has `detect_and_record_contradictions` (`knowledge.rs:997`) with a basic keyword-based approach. Evolution:

1. **Embedding-based contradiction detection**: Compute cosine similarity between new items and existing items of opposite polarity (pattern vs. antipattern, convention vs. correction). High similarity between opposite types = candidate contradiction.
2. **Contradiction as a first-class entity**: Rather than just recording a `contradicts` edge, create a `Contradiction` node that captures the conflicting items, the detected conflict, and a resolution status.

```sql
CREATE TABLE knowledge_contradictions (
    id              TEXT PRIMARY KEY,
    item_a_id       TEXT REFERENCES knowledge_items(id),
    item_b_id       TEXT REFERENCES knowledge_items(id),
    conflict_type   TEXT,  -- 'direct', 'contextual', 'temporal'
    description     TEXT,  -- LLM-generated description of the conflict
    resolution      TEXT,  -- 'unresolved', 'item_a_supersedes', 'item_b_supersedes', 'both_valid_in_context'
    resolved_by     TEXT,  -- agent_id or 'human'
    resolved_at     TEXT,
    created_at      TEXT NOT NULL
);
```

3. **Context-dependent resolution**: Some contradictions aren't real - "Use React Context for global state" vs. "Avoid React Context for frequently-updated state" are both valid depending on context. Add a `context_tags` column to knowledge items to disambiguate.

### 2.5 Temporal Knowledge Graphs

Coding knowledge often has a temporal dimension: "In React 18, use `createRoot`. In React 17, use `ReactDOM.render`."

**Temporal schema addition:**

```sql
-- Optional temporal validity on knowledge items
ALTER TABLE knowledge_items ADD COLUMN valid_from TEXT;  -- ISO date
ALTER TABLE knowledge_items ADD COLUMN valid_until TEXT; -- NULL = still valid
ALTER TABLE knowledge_items ADD COLUMN applicable_versions TEXT; -- e.g., ">=react@18.0.0"
ALTER TABLE knowledge_items ADD COLUMN superseded_by TEXT; -- reference to newer knowledge item
```

This enables queries like: "Show me all active conventions for React 18" (filter by `applicable_versions` containing `react@18` and `valid_until IS NULL`).

---

## 3. Knowledge Graph Exploration

### 3.1 Graph Traversal Algorithms for QA

For an agent asking "how do I fix this error?", the retrieval pipeline:

```
1. Semantic search: Find knowledge items similar to error description (k=10)
2. Graph expansion: From those seed nodes, traverse:
   - (KnowledgeItem)-[:EXTENDS]->(KnowledgeItem)  -- broader principles
   - (KnowledgeItem)-[:REQUIRES]->(KnowledgeItem) -- prerequisites
   - (KnowledgeItem)-[:CONFIRMED_BY]->(Session)   -- what sessions validated this
   - (KnowledgeItem)-[:CONTRADICTS]->(KnowledgeItem) -- watch out for counter-evidence
3. Path ranking: Score each path by relevance + confidence
4. Context assembly: Concatenate top N results into LLM context window
```

**BFS graph expansion (pseudocode for ACC):**

```rust
fn expand_subgraph(
    seeds: &[KnowledgeItem],
    relations: &HashMap<String, Vec<KnowledgeRelation>>,
    max_depth: u32,
    max_nodes: usize,
) -> Vec<KnowledgeItem> {
    let mut visited: HashSet<String> = seeds.iter().map(|s| s.id.clone()).collect();
    let mut frontier: VecDeque<(String, u32)> = seeds.iter().map(|s| (s.id.clone(), 0)).collect();
    let mut result: Vec<KnowledgeItem> = seeds.to_vec();

    while let Some((current_id, depth)) = frontier.pop_front() {
        if depth >= max_depth || result.len() >= max_nodes {
            break;
        }
        if let Some(rels) = relations.get(&current_id) {
            for rel in rels {
                if !visited.contains(&rel.to_id) {
                    visited.insert(rel.to_id.clone());
                    if let Some(item) = items_by_id.get(&rel.to_id) {
                        result.push(item.clone());
                        frontier.push_back((rel.to_id.clone(), depth + 1));
                    }
                }
            }
        }
    }
    result
}
```

### 3.2 Multi-Hop Reasoning over KGs

Multi-hop reasoning is essential for agent knowledge: "Why did the last 3 attempts at adding auth fail?"

**Path-based query pattern:**

```cypher
-- Pseudo-cypher for ACC's SQLite KG
-- Find paths from error patterns to their root causes
MATCH (e:KnowledgeItem {type: 'error'})
      -[:CAUSED_BY*1..3]->
      (c:KnowledgeItem {type: 'antipattern'})
WHERE e.session_ids IN ('session1', 'session2', 'session3')
RETURN e, c, path
```

**Implementation in SQLite (recursive CTE for multi-hop):**

```sql
WITH RECURSIVE traverse(id, target_id, relation_type, depth, path) AS (
    -- Base: start from seed items
    SELECT from_id, to_id, relation_type, 1,
           from_id || '->' || to_id
    FROM knowledge_relations
    WHERE from_id IN (SELECT id FROM knowledge_items WHERE type = 'error')
    
    UNION ALL
    
    -- Recursive: follow relations
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

### 3.3 Subgraph Extraction for Context Windows

LLM context windows are growing (128K+ tokens) but precision matters more than volume. The subgraph extraction problem:

**Goal**: Given a query Q and a knowledge graph G, extract a subgraph SG that maximizes information gain for Q while fitting within budget B tokens.

**Approaches:**

| Method | Description | Token Efficiency |
|--------|-------------|------------------|
| **k-hop Neighborhood** | Expand k hops from seed nodes | Low - explodes combinatorially |
| **Personalized PageRank** | Rank nodes by relevance to seeds, take top-N | High - prioritizes relevant nodes |
| **Shortest Path Tree** | Build tree of shortest paths from seeds to all nodes within depth limit | Medium - captures structural context |
| **Steiner Tree** | Find minimal tree connecting all seed nodes + top relevant nodes | High - compact but NP-hard (use heuristics) |
| **Community Retrieval** (GraphRAG) | Retrieve pre-computed community summaries instead of individual nodes | Highest - constant cost per community |

**Recommendation for ACC:** Two-tier approach:
1. **Pre-computed**: Community summaries (GraphRAG-style) for high-level context.
2. **Query-time**: Personalized PageRank expansion from seed nodes, pruned to budget.

### 3.4 Path-Based Reasoning (PRA, TransE, RotatE)

These are knowledge graph embedding (KGE) techniques traditionally used for link prediction and fact completion in large KGs (Freebase, Wikidata). Their applicability to ACC:

| Technique | What It Does | Relevance to ACC |
|-----------|-------------|------------------|
| **PRA (Path Ranking Algorithm)** | Learns which relation paths are predictive. E.g., `(X, FIXES, Y) ∧ (Y, CAUSED_BY, Z) → (X, ADDRESSES, Z)` | Potentially useful for automatic relation inference from session data |
| **TransE** | Embeddings: `head + relation ≈ tail`. Simple but struggles with 1-to-N relations | Too simple for nuanced code knowledge |
| **RotatE** | Embeddings in complex space; `head ∘ relation = tail`. Better symmetry handling | Handles symmetric relations (SIMILAR_TO) and inverse (CONTRADICTS) |
| **ComplEx** | Complex-valued embeddings; handles antisymmetry well | Good for hierarchical relations (EXTENDS, SUBCLASS_OF) |

**For ACC**: Full KGE training is overkill at current scale (<100K items). But lightweight PRA-style path inference is valuable: automatically discover that `(session_outcome: failed) ∧ (event_type: error) ∧ (error_contains: "type mismatch") → (relevant_pattern: "TypeScript strict mode gotcha")`.

### 3.5 Relevance Scoring in Graphs

**PageRank variants for ACC's KG:**

```
Standard PageRank: PR(u) = (1-d)/N + d * Σ(PR(v)/outDegree(v))
Personalized PageRank: Replace (1-d)/N with teleport vector biased toward query-relevant nodes
```

For ACC:
1. **Confidence-weighted PageRank**: Edge weight = confidence of the relationship. High-confidence relations propagate more influence.
2. **Recency-weighted PageRank**: More recent confirmations boost node rank.
3. **Type-weighted PageRank**: Relations like `CONFIRMED_BY` and `EXTENDS` propagate more rank than `CONTRADICTS`.

**Implementation consideration**: PageRank is an iterative algorithm. For SQLite, compute it in application code (Rust) on an in-memory graph representation. Cache results; recompute on significant updates (new items >10% of total).

---

## 4. Visualization of Knowledge Graphs

### 4.1 Force-Directed Layouts

**Library comparison for ACC's React frontend:**

| Library | Size | Graph Algorithms | Layouts | Customization | Dependencies |
|---------|------|------------------|---------|--------------|--------------|
| **Cytoscape.js** | ~400KB | BFS, DFS, PageRank, Dijkstra, Kruskal, k-means | CoSE, CoSE-Bilkent, fCoSE, Cola, Dagre, Breadthfirst, Concentric, Circle | Extensive: style sheets, events, custom shapes | Zero |
| **D3.js Force Layout** | ~250KB (d3-force) | None built in | Force simulation only (d3-force) | Full SVG/CSS control | D3.js core |
| **vis-network** | ~350KB | Clustering, physics | Force-directed (Barnes-Hut), hierarchical | Moderate | vis-data |
| **AntV G6** | ~500KB | BFS, DFS, topo sort, shortest path | Force, Dagre, Radial, Circular, Combo | Very high | Canvas-based |
| **Sigma.js** | ~100KB | Layout algorithms | ForceAtlas2, random | Modular plugin architecture | graphology |

**Recommendation: Cytoscape.js** for ACC because:
1. Zero dependencies - works anywhere the frontend runs (Tauri WebView).
2. Built-in graph algorithms (PageRank, BFS/DFS) - reuse in visualization layer.
3. CoSE-Bilkent and fCoSE layouts handle compound nodes (a parent node containing children) - useful for showing projects/files/modules hierarchies.
4. Mature extension ecosystem (edge handles for human-in-the-loop curation, cxtmenu for context menus, popper for tooltips).
5. MIT license, used by Meta, Amazon, Microsoft - battle-tested.

### 4.2 Incremental/Dynamic Graph Visualization

The KG grows over time. Static visualization is insufficient.

**Requirements:**
- Nodes/edges added without full re-layout (layout animation).
- Nodes change color/opacity/node-size based on recency, confidence, type.
- Auto-clustering reduces visual noise (collapse sub-communities).

**Cytoscape.js approach:**

```javascript
// Add nodes incrementally
cy.add({
  group: 'nodes',
  data: { id: 'new-item', label: 'New Pattern', confidence: 0.8 },
  position: { x: 100, y: 100 } // initial position before layout
});

// Run layout only on new nodes + neighbors (not full graph)
const layout = cy.elements().layout({
  name: 'fcose',
  animate: true,
  animationDuration: 500,
  fit: false, // don't zoom to fit
  randomize: false // keep existing positions stable
});
layout.run();
```

**Stability considerations:**
- Pin nodes that the user has manually positioned.
- Layout only the subgraph around new nodes (k-hop neighborhood).
- Use `layout.stop()` + `layout.run()` for progressive refinement.

### 4.3 Subgraph Highlighting and Exploration

**Interaction patterns for ACC's KG explorer:**

1. **Click-to-expand**: Click a node to load and display its neighbors (lazy loading).
2. **Type-based filtering**: Toggle visibility by knowledge type (pattern, antipattern, error, convention).
3. **Confidence threshold slider**: Filter nodes by minimum confidence.
4. **Temporal scrubber**: Show KG state at a historical point in time.
5. **Path highlighting**: Select two nodes, highlight shortest paths between them.
6. **Community coloring**: Use Leiden-detected communities as color groups - visually distinct clusters.

**Implementation sketch (Cytoscape.js):**

```javascript
// Highlight subgraph from seed node
function highlightSubgraph(seedId, depth) {
  const seed = cy.getElementById(seedId);
  const subgraph = seed.closedNeighborhood(depth); // includes seed + edges

  // Dim everything not in subgraph
  cy.elements().difference(subgraph).style({
    'opacity': 0.15,
    'background-color': '#aaa'
  });

  // Highlight the subgraph
  subgraph.style({
    'opacity': 1,
    'border-width': 2,
    'border-color': '#4A90D9'
  });
}
```

### 4.4 Human-in-the-Loop KG Curation Interfaces

The KG benefits from human review. ACC should provide:

1. **Inline editing**: Double-click node label to edit title/content directly in the graph.
2. **Edge creation**: Drag from one node to another to create a relation, select type from a dropdown.
3. **Confirmation/Rejection**: "Review pending" items shown with thumbs-up/down controls.
4. **Merge suggestions**: When two nodes are detected as potentially the same (high cosine sim), show a "merge?" prompt.
5. **Contradiction resolution panel**: Side panel listing all unresolved contradictions with "Resolve" action -> "A supersedes B", "Both valid", "Neither".

**Cytoscape.js extensions for this:**
- `cytoscape-edgehandles` for drag-to-create edges
- `cytoscape-cxtmenu` for right-click context menus
- `cytoscape-popper` + Tippy.js for rich tooltips/editing popovers

---

## 5. KG for Code Understanding

### 5.1 Code Knowledge Graphs

A code KG captures structural relationships within a codebase:

**Node types:**
- `Module` / `Package` - top-level organization
- `File` - source files
- `Class` / `Interface` - type definitions
- `Function` / `Method` - callable units
- `Variable` / `Constant` - data holders
- `Import` / `Export` - module boundaries
- `Type` - type definitions and aliases

**Edge types:**
- `CONTAINS` - parent/child (Module → File, File → Class, Class → Method)
- `IMPORTS` / `EXPORTS` - module boundary crossing
- `CALLS` - function invocation
- `EXTENDS` / `IMPLEMENTS` - inheritance
- `REFERENCES` - variable/type references
- `DEPENDS_ON` - external dependency

**Extraction tools:**
- **tree-sitter** (Rust/C library): Parse source into concrete syntax trees, traverse for node/relation extraction. Language-agnostic.
- **Language servers** (LSP): Provide semantic information (references, definitions, diagnostics).
- **static-analysis tools**: ESLint, Pylint, Clippy - their rules can feed into the anti-pattern detection in ACC's KG.

### 5.2 Combining Code Graph + Knowledge Graph

This is where ACC's unique value lies. The system bridges:

```
┌─────────────────────────┐     ┌──────────────────────────────┐
│   CODE GRAPH             │     │   KNOWLEDGE GRAPH             │
│   (structural)            │◄───►│   (experiential)              │
│                           │     │                               │
│  - Functions              │     │  - Patterns learned           │
│  - Dependencies           │     │  - Anti-patterns observed     │
│  - Types                   │     │  - Errors encountered         │
│  - Imports                │     │  - Conventions established    │
│  - Call graphs            │     │  - Session outcomes           │
└─────────────────────────┘     └──────────────────────────────┘
         │                                  │
         └──────────┬───────────────────────┘
                    │
         ┌──────────▼────────────────┐
         │   BRIDGING RELATIONS       │
         │                           │
         │  APPLIES_TO (Code→Knowledge)│
         │  DERIVED_FROM (Code→Know.) │
         │  VIOLATES (Code→Antipattern)│
         │  EXEMPLIFIES (Code→Pattern)│
         └───────────────────────────┘
```

**Example query**: "File `auth.ts` has been modified 47 times across 12 sessions. It's associated with 3 antipatterns and 1 confirmed bug pattern. Preflight warning!"

This gets translated into:
```sql
SELECT 
    f.file_path,
    COUNT(DISTINCT s.id) as session_count,
    GROUP_CONCAT(DISTINCT ap.title) as antipatterns
FROM code_files f
JOIN code_knowledge_bridge ckb ON ckb.code_entity_id = f.id
JOIN knowledge_items ap ON ap.id = ckb.knowledge_id AND ap.type = 'antipattern'
JOIN session_file_links sfl ON sfl.file_path = f.file_path
JOIN sessions s ON s.id = sfl.session_id
WHERE f.file_path = 'src/auth.ts'
GROUP BY f.file_path;
```

### 5.3 Mining Patterns from Git History into KG

Git history is a goldmine for behavioral patterns:

**What to mine:**
1. **File hotspots**: Files that change together frequently → `CO_CHANGES_WITH` relation.
2. **Bug-fix patterns**: Commits with "fix bug X" → linking error-to-fix knowledge.
3. **Refactor events**: Large structural changes → pattern churn.
4. **Author expertise**: Who typically touches which files → agent capability mapping.

**Implementation approach:**
```rust
// Pseudo: mine git log for co-change patterns
fn mine_cochange_patterns(repo_path: &str) -> Vec<(String, String, f64)> {
    let mut cochange_counts: HashMap<(String, String), u64> = HashMap::new();
    let mut single_counts: HashMap<String, u64> = HashMap::new();

    // Iterate through commits
    for commit in git2::Repository::open(repo_path)?.revwalk()? {
        let files: Vec<String> = commit.files_changed();
        for f in &files {
            *single_counts.entry(f.clone()).or_default() += 1;
        }
        for i in 0..files.len() {
            for j in i+1..files.len() {
                let pair = (files[i].clone(), files[j].clone());
                *cochange_counts.entry(pair).or_default() += 1;
            }
        }
    }

    // Compute Jaccard similarity for each pair
    cochange_counts.into_iter()
        .filter_map(|((a, b), co)| {
            let sa = *single_counts.get(&a)? as f64;
            let sb = *single_counts.get(&b)? as f64;
            let jaccard = co as f64 / (sa + sb - co as f64);
            if jaccard > 0.3 { Some((a, b, jaccard)) } else { None }
        })
        .collect()
}
```

---

## 6. Evolution Path for ACC

### Current State Assessment

ACC has a solid foundation:
- `knowledge_items` table with type, title, content, tags, confidence, confirmation_count, provenance (session_ids, plan_ids).
- `knowledge_relations` table supporting `contradicts`, `extends`, `requires`, `confirmed_by`.
- Basic confidence model (0.5 base, weighted average on merge).
- Jaccard-based dedup at 0.7 threshold.
- Heuristic-based extraction from session events (file counts, edit churn, error signatures).
- Compound cycle (compound_knowledge) that merges related items.

### Phase 1: Incremental Improvements (Weeks 1-2)

**Low-risk, high-impact changes to the existing SQLite schema:**

1. **Add embedding support**: Add a `BLOB` column `embedding` to `knowledge_items`. Use a lightweight embedding model (e.g., `all-MiniLM-L6-v2`, 384-dim). Compute embeddings on creation, store as binary.
2. **Add sqlite-vec**: Use `sqlite-vec` extension for approximate nearest neighbor search over embeddings.
3. **Improve relation types**: Add `caused_by`, `fixed_by`, `similar_to`, `precedes` to the existing relation vocabulary.
4. **Add community detection**: Run Leiden clustering on the in-memory graph representation. Store results in `knowledge_communities` table.
5. **Add entity normalization**: A `canonical_name` column that normalizes entity references (e.g., "React Context", "react-context", "react context API" all map to "react_context").
6. **Add temporal validity columns**: `valid_from`, `valid_until`, `applicable_versions`.

### Phase 2: GraphRAG-inspired Queries (Weeks 3-4)

1. **Local Search**: Implement BFS-based subgraph expansion from seed items. Query pattern: "Given this error message, expand 2 hops to find related patterns, then return the subgraph as context."
2. **Global Search**: Generate community summaries periodically (via LLM). For high-level questions ("What's the health of this project?"), retrieve top-k community summaries rather than individual items.
3. **Preflight enhancement**: Extend preflight to not just return antipatterns, but also patterns that `require` certain conditions, conventions that `extend` each other, etc.

### Phase 3: Full KG Engine (Weeks 5-8)

1. **LLM-driven extraction pipeline**: Replace heuristic prepass with LLM extraction of entities and relations from session event streams.
2. **Contradiction resolution engine**: First-class contradiction nodes with LLM-assisted resolution suggestions.
3. **Code graph integration**: Add tree-sitter-based code analysis to extract structural nodes (files, functions, classes). Bridge code graph nodes to knowledge graph nodes.
4. **Git history mining**: Add `CO_CHANGES_WITH` and `BUG_FIX_PATTERN` relations mined from git history.

### Phase 4: Visualization & Curation (Weeks 9-12)

1. **Cytoscape.js KG Explorer**: Interactive force-directed graph visualization in ACC's frontend.
2. **Human-in-the-loop curation**: Inline editing, edge creation, merge suggestion, contradiction resolution.
3. **Temporal exploration**: Scrubber to view KG state at different points in time.

### Schema Migration Path

```sql
-- Migration 0XX: knowledge graph v2

-- Add embedding support
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

-- Provenance tracking (replaces session_ids string column)
CREATE TABLE knowledge_provenance (
    item_id       TEXT REFERENCES knowledge_items(id) ON DELETE CASCADE,
    source_type   TEXT NOT NULL,
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
    level         INTEGER NOT NULL DEFAULT 0,
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
    conflict_type   TEXT,
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
    entity_type     TEXT NOT NULL,  -- 'file', 'function', 'class', 'module', etc.
    name            TEXT NOT NULL,
    qualified_path  TEXT,           -- e.g., "src/auth.ts::login"
    language        TEXT,
    source_file     TEXT NOT NULL,
    line_start      INTEGER,
    line_end        INTEGER,
    signature       TEXT,           -- function signature or type definition
    embedding       BLOB,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

-- Bridge: code entities ↔ knowledge items
CREATE TABLE code_to_knowledge (
    code_entity_id  TEXT REFERENCES code_entities(id) ON DELETE CASCADE,
    knowledge_id    TEXT REFERENCES knowledge_items(id) ON DELETE CASCADE,
    relation_type   TEXT NOT NULL,  -- 'applies_to', 'exemplifies', 'violates', 'derived_from'
    confidence      REAL DEFAULT 1.0,
    created_at      TEXT NOT NULL,
    PRIMARY KEY (code_entity_id, knowledge_id, relation_type)
);

-- Git-derived relations
CREATE TABLE git_cochange_relations (
    file_a          TEXT NOT NULL,
    file_b          TEXT NOT NULL,
    project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
    jaccard_score   REAL NOT NULL,
    cochange_count  INTEGER NOT NULL,
    last_observed   TEXT NOT NULL,
    PRIMARY KEY (file_a, file_b, project_id)
);

-- Additional indexes
CREATE INDEX idx_knowledge_canonical ON knowledge_items(canonical_name);
CREATE INDEX idx_knowledge_embedding ON knowledge_items(id); -- sqlite-vec virtual index
CREATE INDEX idx_code_entities_project ON code_entities(project_id, entity_type);
CREATE INDEX idx_code_entities_name ON code_entities(project_id, name);
CREATE INDEX idx_git_cochange_project ON git_cochange_relations(project_id);
```

### Summary of Recommendations

| Dimension | Current ACC | Recommended Evolution |
|-----------|------------|----------------------|
| **Storage** | SQLite, flat tables | SQLite + sqlite-vec extension, denormalized community tables |
| **Extraction** | Heuristic (file counts, churn) | Heuristic + LLM extraction pipeline |
| **Dedup** | Jaccard similarity on text | Embedding-based similarity + LLM-assisted merge resolution |
| **Confidence** | Weighted average (simple) | Multi-factor: source credibility + corroboration + recency + agent tier |
| **Relations** | contradicts, extends, requires, confirmed_by | Add: caused_by, fixed_by, similar_to, precedes, applies_to, derived_from |
| **Query** | SQL LIKE + tag filtering | + Semantic search (vector), + BFS graph expansion, + Community summaries |
| **Temporal** | first_seen, last_confirmed | Add: valid_from, valid_until, applicable_versions, superseded_by |
| **Visualization** | None | Cytoscape.js force-directed graph with human-in-the-loop curation |
| **Code Integration** | None | tree-sitter code entity extraction + code↔knowledge bridge |
| **Scale Target** | ~1K items per project | 50K+ items per project with sub-second query performance |

### Key References

1. **GraphRAG**: Edge et al., "From Local to Global: A Graph RAG Approach to Query-Focused Summarization" (arXiv:2404.16130). Microsoft Research, 2024.
2. **Neo4j GraphRAG Python**: https://neo4j.com/docs/neo4j-graphrag-python/current/
3. **Neo4j LLM Knowledge Graph Builder**: https://neo4j.com/labs/genai-ecosystem/llm-graph-builder/
4. **Leiden Community Detection**: Traag et al., "From Louvain to Leiden: guaranteeing well-connected communities" (arXiv:1810.08473).
5. **Cytoscape.js**: https://js.cytoscape.org/ - Graph theory library for visualization and analysis.
6. **sqlite-vec**: https://github.com/asg017/sqlite-vec - Vector search for SQLite.
7. **LLM Agent Survey**: Wang et al., "A Survey on Large Language Model based Autonomous Agents" (arXiv:2308.11432).
8. **Property Graph vs RDF**: https://neo4j.com/blog/rdf-vs-property-graphs-knowledge-graphs/
9. **tree-sitter**: https://tree-sitter.github.io/tree-sitter/ - Parser generator for code analysis.
10. **RotatE**: Sun et al., "RotatE: Knowledge Graph Embedding by Relational Rotation in Complex Space" (ICLR 2019).
