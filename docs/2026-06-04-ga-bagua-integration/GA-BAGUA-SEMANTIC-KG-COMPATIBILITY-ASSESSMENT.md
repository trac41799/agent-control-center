# GA-Bagua Semantic KG — ACC Compatibility & Integration Assessment

**Date:** 2026-06-08  
**Source Repo:** https://github.com/trac41799/ga-bagua-semantic-kg  
**Version:** v0.1.6 (28 commits, crates.io published)  
**Status:** Fully compatible. Two integration paths identified.

---

## 1. Compatibility Matrix

### 1.1 Language & Runtime

| Factor | ACC | ga-semantics-core | Compatible? |
|--------|-----|-------------------|:----------:|
| Language | Rust (edition 2021) | Rust (edition 2021) | ✅ |
| Rust MSRV | Not specified (Tauri v2 = 1.70+) | 1.78.0 | ✅ |
| Async runtime | tokio 1 (full) | None (sync crate) | ✅ |
| Build tool | Cargo | Cargo | ✅ |

### 1.2 Dependency Conflict Analysis

| Dependency | ACC Version | ga-semantics-core | Conflict? |
|-----------|-------------|-------------------|:---------:|
| `serde` | 1 (derive) | 1 (derive, optional) | ✅ Compatible |
| `serde_json` | 1 | 1 (optional) | ✅ Compatible |
| `thiserror` | Not used | 2 | ✅ New dep, no conflict |
| `uuid` | 1 | Not used | ✅ No overlap |
| `chrono` | 0.4 | Not used | ✅ No overlap |
| `rusqlite` | 0.32 (bundled) | Not used | ✅ No overlap |
| `tokio` | 1 (full) | Not used | ✅ No overlap |

**Total new transitive deps from adding `ga-semantics-core`:** 1 crate (`thiserror 2`). That's it. The crate is impressively minimal.

### 1.3 Platform Compatibility

| Platform | ACC Target | ga-semantics-core | Compatible? |
|----------|:---:|:---:|:---:|
| Windows (x64) | ✅ | ✅ (releases include `.zip`) | ✅ |
| macOS (ARM) | ✅ | ✅ (releases include `.tar.gz`) | ✅ |
| macOS (Intel) | ✅ | ✅ | ✅ |
| Linux (x64) | ✅ | ✅ (releases include `.tar.gz`) | ✅ |
| WASM | N/A | Not tested | — |

### 1.4 Crate Publishing

| Crate | Registry | Status |
|-------|----------|--------|
| `ga-semantics-core` | crates.io | ✅ Published v0.1.0 |
| `ga-semantics-mcp` | crates.io | ✅ Published v0.1.0 |
| `ga-semantics-cli` | crates.io | ✅ Published v0.1.0 |
| `ga-semantics-mcp` | npm | ✅ Published |

---

## 2. Integration Path A — Direct Rust Crate Dependency (Deep Integration)

### 2.1 What This Enables

Integrate `ga-semantics-core` directly into ACC's Rust backend. The crate provides:

| API | Signature | Use in ACC |
|-----|-----------|-----------|
| `llm_encode()` | `&[f64; 8] → Multivector` | Convert knowledge item embeddings to multivectors |
| `multivector_describe()` | `&Multivector → RoleDescription` | Get dominant trigram + semantic role for an item |
| `RelationType::from_pair()` | `(&Multivector, &Multivector) → (RelationType, f64)` | Classify KG edge type via WuXing cycle |
| `dominant_similarity()` | `(&Multivector, &Multivector) → f64` | Compute semantic overlap (0.0-1.0) |
| `analogy()` | `(&Multivector, &Multivector, &Multivector) → Multivector` | "A is to B as C is to D" reasoning |
| Store (feature `store`) | `add()`, `query()`, `list()` | In-memory semantic KG store (backed by the crate) |

### 2.2 Cargo.toml Addition

```toml
# Add to src-tauri/Cargo.toml [dependencies]
ga-semantics-core = { version = "0.1", features = ["store"] }
```

New dependency footprint: 1 crate (`thiserror`), 0 conflicts.

### 2.3 Integration Points in ACC

| ACC Module | Integration | What Changes |
|-----------|-------------|-------------|
| `kg_core.rs` | Classify `knowledge_relations` edges | After creating a relation, call `RelationType::from_pair()` to auto-tag with Bagua trigram category. Store `relation_multivector` as BLOB. |
| `kg_queries.rs` | Semantic similarity search | Use `dominant_similarity()` alongside existing vector cosine distance for multi-signal scoring. Bagua similarity captures asymmetric relationships that cosine misses. |
| `kg_extraction.rs` | Entity encoding | When extracting entities, pass through `llm_encode()` to get a multivector representation. Store alongside embedding. |
| `memory.rs` | Memory fact classification | Tag memory facts with dominant trigram. "This is a constraining fact" (☶ Gèn) vs "this is a generative fact" (☰ Qián). |
| `knowledge.rs` | Contradiction detection | Use `from_pair()` with opposite-type items. If WuXing cycle says "controlling" and items have opposite polarities → contradiction. |

### 2.4 Code Example

```rust
use ga_semantics_core::prelude::*;

// In kg_core.rs — auto-tag relation types
fn classify_relation(item_a: &KnowledgeItem, item_b: &KnowledgeItem) -> (RelationType, f64, Trigrams) {
    let mv_a = llm_encode(&item_a.coefficients);
    let mv_b = llm_encode(&item_b.coefficients);
    let (rel_type, confidence) = RelationType::from_pair(&mv_a, &mv_b);
    let hex = classify_hexagram(&mv_a, &mv_b);
    (rel_type, confidence, hex.lower) // dominant trigram of the relationship
}

// In kg_queries.rs — bagua-aware similarity scoring
fn bagua_similarity(query_mv: &Multivector, item_mv: &Multivector) -> f64 {
    let cosine_sim = cosine_similarity(query_coeffs, item_coeffs);
    let bagua_sim = dominant_similarity(query_mv, item_mv);
    0.6 * cosine_sim + 0.4 * bagua_sim  // fused score
}
```

### 2.5 Schema Changes

```sql
-- Add Bagua tagging to knowledge_items
ALTER TABLE knowledge_items ADD COLUMN coefficients TEXT;
-- JSON array of 8 floats: [receptive, causal, transmissive, constraining, clarifying, influential, balancing, generative]

ALTER TABLE knowledge_items ADD COLUMN dominant_trigram TEXT;
-- One of: 'kun', 'gen', 'kan', 'xun', 'zhen', 'li', 'dui', 'qian'

ALTER TABLE knowledge_items ADD COLUMN dominant_role TEXT;
-- One of: 'receptive', 'causal', 'transmissive', 'constraining', 'clarifying', 'influential', 'balancing', 'generative'

-- Add Bagua tagging to knowledge_relations
ALTER TABLE knowledge_relations ADD COLUMN trigram_tag TEXT;
ALTER TABLE knowledge_relations ADD COLUMN hexagram_tag TEXT;
ALTER TABLE knowledge_relations ADD COLUMN wuxing_cycle TEXT;
-- 'generate' or 'control' — from WuXing cycle classification
```

---

## 3. Integration Path B — MCP Server Registration (Agent-Facing)

### 3.1 What This Enables

Register `ga-semantics-mcp` as a managed MCP entry in ACC's MCP Registry, making 29 tools available to all 9 agents:

| Tool Category | Examples | Agent Use Case |
|--------------|----------|---------------|
| Encoding | `llm_encode`, `batch_encode`, `normalize_vector` | Agent converts concept descriptions to 8-dimensional Bagua vectors |
| Classification | `classify_relationship`, `classify_hexagram` | Agent determines what kind of relationship two concepts have |
| Similarity | `dominant_similarity`, `cosine_similarity` | Agent measures semantic overlap between concepts |
| Analogy | `solve_analogy`, `predict_cycle` | Agent solves "A:B :: C:?" reasoning problems |
| Store | `store_add`, `store_query`, `store_list`, `store_export` | Agent manages a semantic knowledge store |
| Exploration | `list_trigrams`, `trigram_info`, `wuxing_cycle` | Agent explores the Bagua taxonomy interactively |

### 3.2 How ACC Already Supports This

ACC's MCP Registry (Module 2 — Asset Manager) already:

1. Reads MCP configs from all agent config files (JSON/YAML)
2. Writes toggles — enable/disable per agent
3. Tests connections — health indicator (green/grey/red)
4. Auto-injects MCP tools as agent context on PTY spawn

**Just add this MCP entry:**

```json
{
  "mcpServers": {
    "ga-bagua-semantic-kg": {
      "command": "ga-semantics-mcp"
    }
  }
}
```

### 3.3 User Installation Flow (Simplified)

```
User opens ACC
  → ACC detects ga-semantics-mcp is NOT installed
  → "Suggested MCP" badge appears in MCP Registry
  → User clicks "Install" → ACC runs: npm install -g ga-semantics-mcp
  → User toggles ON for Claude Code, OpenCode, etc.
  → MCP tools available to agents immediately
```

### 3.4 SkillBridge Integration

The `SKILL.md` file in the repo is in OpenClaw/Claude skill format — directly compatible with ACC's Skills Library:

```
ACC Skills Library
  → Add custom skill path or auto-detect
  → bagua-encoder/SKILL.md appears in Skills list
  → Agent injected: "You have the bagua-encoder skill available..."
```

---

## 4. Recommended Integration Architecture

**Both paths simultaneously — they serve different purposes:**

```
┌─────────────────────────────────────────────────────────────────┐
│                        ACC APPLICATION                           │
│                                                                  │
│  ┌──────────────────────┐    ┌───────────────────────────────┐  │
│  │  RUST BACKEND         │    │  AGENT PTY SESSIONS           │  │
│  │                       │    │                               │  │
│  │  ga-semantics-core ──►│    │  ga-semantics-mcp ◄──────┐   │  │
│  │  (direct crate dep)  │    │  (MCP server, 29 tools)   │   │  │
│  │                       │    │                           │   │  │
│  │  Uses:                │    │  Agent calls:             │   │  │
│  │  - llm_encode()       │    │  - llm_encode             │   │  │
│  │  - from_pair()        │    │  - classify_relationship  │   │  │
│  │  - dominant_similarity│    │  - solve_analogy          │   │  │
│  │  - classify_hexagram()│    │  - store_add / store_query│   │  │
│  │                       │    │                           │   │  │
│  │  For:                 │    │  For:                     │   │  │
│  │  - KG edge tagging    │    │  - Concept encoding       │   │  │
│  │  - Similarity scoring │    │  - Relation classification│   │  │
│  │  - Contradiction det. │    │  - Semantic exploration   │   │  │
│  │  - Auto-classification│    │  - Interactive reasoning  │   │  │
│  └──────────────────────┘    └───────────────────────────┘   │  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ACC MCP REGISTRY                                         │   │
│  │  - ga-bagua-semantic-kg MCP entry (managed)               │   │
│  │  - Per-agent toggle (enable/disable)                      │   │
│  │  - Connection health check                                │   │
│  │  - Auto-install prompt on first detection                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ACC SKILLS LIBRARY                                       │   │
│  │  - bagua-encoder/SKILL.md (LLM encoding protocol)         │   │
│  │  - Injects into agent context on spawn                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Plan (Phased)

### Phase 1: Core Crate Integration (Days 1-3)

**Goal:** ACC backend classifies and scores knowledge with Bagua semantics.

| Task | Effort | Files |
|------|--------|-------|
| Add `ga-semantics-core = { version = "0.1", features = ["store"] }` to Cargo.toml | 5 min | `Cargo.toml` |
| Add migration for `coefficients`, `dominant_trigram`, `dominant_role`, `trigram_tag`, `hexagram_tag`, `wuxing_cycle` columns | 30 min | New migration SQL |
| Modify `kg_extraction.rs` — after LLM extraction, encode entities via `llm_encode()` | 2 hrs | `kg_extraction.rs` |
| Modify `kg_core.rs` — auto-classify `knowledge_relations` edges via `RelationType::from_pair()` | 3 hrs | `kg_core.rs` |
| Modify `kg_queries.rs` — fuse `dominant_similarity()` into multi-signal retrieval | 2 hrs | `kg_queries.rs` |
| Modify `knowledge.rs` — use WuXing controlling-cycle for contradiction detection | 2 hrs | `knowledge.rs` |
| Add Tauri commands: `kg_encode_concept`, `kg_classify_relation`, `kg_bagua_similarity`, `kg_analogy` | 2 hrs | `commands.rs`, `lib.rs` |
| Write tests: encoding round-trip, relation classification accuracy, similarity vs cosine | 3 hrs | `kg_core.rs` tests |
| **Phase 1 Total** | **~2.5 days** | |

### Phase 2: MCP Server Registration (Days 4-5)

**Goal:** All 9 agents can access Bagua semantic tools via MCP.

| Task | Effort | Files |
|------|--------|-------|
| Add `ga-bagua-semantic-kg` as a pre-configured MCP entry in ACC's built-in MCP list | 1 hr | `assets.rs`, MCP config templates |
| Add auto-detection: check if `ga-semantics-mcp` binary is on PATH | 1 hr | `assets.rs` |
| Add install suggestion: "Install ga-semantics-mcp? npm install -g ga-semantics-mcp" | 1 hr | `assets.rs`, UI in Assets page |
| Add connection health check — ping the MCP server | 1 hr | `commands.rs` |
| Test: spawn each of 9 agents with `ga-bagua-semantic-kg` MCP enabled → verify tools listed | 3 hrs | Manual QA |
| **Phase 2 Total** | **~1.5 days** | |

### Phase 3: Skill Integration (Day 6)

**Goal:** LLMs can encode concepts using the bagua-encoder skill.

| Task | Effort | Files |
|------|--------|-------|
| Download `SKILL.md` from repo and bundle with ACC | 0.5 hr | `src-tauri/skills/bagua-encoder/SKILL.md` |
| Add to Skills Library auto-detection path | 0.5 hr | `assets.rs` |
| Test: agent encodes a concept using the skill → gets valid 8-float output | 1 hr | Manual QA |
| **Phase 3 Total** | **~0.5 day** | |

### Phase 4: KG Explorer Visualization (Days 7-8)

**Goal:** Cytoscape.js KG Explorer shows Bagua-colored edges and trigram information.

| Task | Effort | Files |
|------|--------|-------|
| Add `trigramTag` and `hexagramTag` to `KnowledgeRelation` type in frontend | 0.5 hr | `lib/types.ts` |
| Update KG Explorer edge styling: color edges by trigram category (8 distinct colors) | 2 hrs | `pages/Knowledge.tsx` |
| Add tooltip on edge hover: "☲ Li — clarifying relationship (WuXing: generate cycle)" | 1 hr | `pages/Knowledge.tsx` |
| Add Bagua legend panel: 8 trigrams with colors and meanings | 1 hr | `pages/Knowledge.tsx` |
| Add trigram filter to KG Explorer: filter edges by Bagua category | 1 hr | `pages/Knowledge.tsx` |
| **Phase 4 Total** | **~1.5 days** | |

**Total Integration Effort: ~6 days**

---

## 6. Benchmark: What Bagua Adds Beyond Cosine

| Operation | Cosine (current) | Bagua (with ga-semantics-core) | Improvement |
|-----------|:---:|:---:|:---:|
| Asymmetric relations | ❌ Cosine is symmetric (`cos(A,B) = cos(B,A)`) | ✅ WuXing cycles encode direction (A→B ≠ B→A) | Catches "controls" vs "is-controlled-by" |
| Cyclical relationships | ❌ Cosine defines a linear order | ✅ 5-phase generating/controlling cycles | "A>B>C>A" is impossible with vectors, natural with cycles |
| Relation classification | — | ✅ 8 trigram categories × 5 phases = structured taxonomy | Interpretable edge labels instead of opaque vector similarity |
| Contradiction detection | Partial (cosine > threshold → similar) | ✅ Controlling-cycle relationship + opposite polarity = contradiction | Higher precision |
| Analogy reasoning | ❌ `B - A + C` approximates D | ✅ `analogy(A, B, C)` via rotor composition | Higher accuracy on relational analogies |
| Storage per item | 384 floats (MiniLM embedding) | +8 floats (multivector coefficients) | 2% overhead for structured semantics |

### Published Benchmarks (from ga-bagua-semantic-kg docs)

| Metric | Score | Notes |
|--------|:-----:|-------|
| Relation classification | 100% | WuXing cycle lookup — deterministic, no ML |
| Role classification | 100% | Dominant trigram — deterministic |
| P@K retrieval | 73.3% | Top-1 accuracy on semantic search |
| MRR | 0.878 | Mean reciprocal rank |
| Analogy accuracy | 80% | On standard analogy test set |
| Encoding speed | 34ns | llm_encode — pure coefficient mapping |
| Similarity speed | 320μs | dominant_similarity |
| Reasoning error | 0% | Deterministic algebra — no accumulated error |

---

## 7. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|:---:|:---:|------|
| `ga-semantics-core` API instability (pre-1.0) | Low | Low | Pin to `"0.1"`; API is small (6-8 functions); breaking changes unlikely |
| Users don't have `ga-semantics-mcp` installed | High | Low | Auto-detect + install prompt; core crate path works without MCP |
| Bagua categorization conflicts with human intuition | Medium | Low | Bagua tagging is additive — doesn't replace existing relations, enriches them |
| KG Explorer visual complexity increases | Low | Low | Bagua coloring is optional; toggleable filter; legend panel educates users |
| Frontend bundle size impact | None | — | `ga-semantics-core` is backend-only (Rust), no JS bundle impact |

---

## 8. Decision

**Integrate via Path A (core crate) + Path B (MCP server) + Skill bundle.**

| Factor | Verdict |
|--------|---------|
| Compatibility | ✅ Zero dependency conflicts. Same Rust edition, same async runtime, no transitive hell. |
| Effort | ~6 days total across 4 phases |
| Risk | Low. Core crate is deterministic math (no ML, no training). MCP registration reuses existing ACC infrastructure. |
| Value | High. Adds interpretable semantic taxonomy to the KG, asymmetric relation detection, and analogy reasoning — all features ACC's competitors lack. |
| User experience | Additive only. Bagua tagging enriches existing relations without replacing anything. Users who don't care about trigrams can ignore them. |

The project delivered exactly what we specced in `docs/defer/Clifford-Bagua-Semantic-Layer-Project-Proposal.md` — and it's ready to plug in.
