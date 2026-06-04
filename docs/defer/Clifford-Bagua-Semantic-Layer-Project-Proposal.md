# Clifford/Bagua Semantic Layer — Separate Project Proposal

**Date:** 2026-06-04  
**Status:** Deferred to separate project  
**Working Title:** `ga-semantics` (Geometric Algebra Semantic Layer)  
**Research Basis:** `docs/research/clifford-bagua-semantic-layer.md`  
**Target Consumer:** ACC memory layer (initially); any agent/KG system (long-term)

---

## 1. Project Identity

### 1.1 Name
**ga-semantics** — A lightweight Rust crate combining Clifford (Geometric) Algebra Cl(3) with Bagua-tagged semantic relationship modeling.

### 1.2 One-Line Description
An open-source Rust library that represents semantic relationships as geometric algebra operations, with I-Ching Bagua categories providing an interpretable relationship taxonomy.

### 1.3 Why a Separate Project?

| Reason | Detail |
|--------|--------|
| **Zero ACC-specific coupling** | Pure mathematical library; no dependency on PTY, Tauri, SQLite, or any ACC infrastructure |
| **Novel research contribution** | The Cl(3)↔Bagua isomorphism is (to our knowledge) a novel observation; deserves its own identity and community |
| **Broader applicability** | Any knowledge graph, embedding system, or agent framework could use this — not just ACC |
| **Independent versioning** | Can evolve its API, benchmarks, and Bagua mappings without ACC release cycles |
| **Community potential** | Rust crate on crates.io; Python bindings via PyO3; academic paper potential |
| **Low cost of separation** | ~1-2 weeks to build; ACC consumes it as a git dependency or crates.io package |

### 1.4 Relationship to ACC
ACC consumes `ga-semantics` as a dependency. The integration point is in the knowledge graph layer: `knowledge_relations` edges get an optional `trigram_tag` column referencing a Bagua category, and geometric operations (analogy, relation composition, contradiction detection) are computed via the library.

---

## 2. Mathematical Foundation

### 2.1 The Isomorphism

Cl(3) — the Clifford algebra of 3D Euclidean space — has dimension 2³ = 8. Its basis blades:

| Grade | Basis Blades | Count | Bagua Trigram | Semantic Interpretation |
|-------|-------------|:-----:|---------------|------------------------|
| 0 | `1` (scalar) | 1 | ☷ Kūn (Earth) | Ground state, receptive, undifferentiated |
| 1 | `e₁, e₂, e₃` (vectors) | 3 | ☳ Zhèn, ☵ Kǎn, ☶ Gèn | Directed action, flow, boundedness |
| 2 | `e₁₂, e₂₃, e₃₁` (bivectors) | 3 | ☲ Lí, ☴ Xùn, ☱ Duì | Transformation planes, rotation, reflection |
| 3 | `e₁₂₃` (trivector) | 1 | ☰ Qián (Heaven) | All-encompassing, creative principle |

**Total: 8 basis blades ⟷ 8 trigrams.** Both systems independently discovered a complete 8-element relational algebra. The geometric product naturally encodes the transformation rules between trigrams.

### 2.2 Core Operations

| Operation | GA Expression | Semantic Meaning |
|-----------|--------------|------------------|
| Geometric product | `ab = a·b + a∧b` | Complete relational signature between concepts |
| Inner product | `⟨a, b⟩` | Degree of alignment/similarity |
| Wedge product | `a∧b` | Degree of orthogonality/difference |
| Rotor application | `a' = R a R̃` | Semantic transformation (analogy) |
| Grade projection | `⟨A⟩ₖ` | Extract specific relationship dimension |
| Inverse | `A⁻¹` | Reverse relationship direction |
| Dualization | `A * e₁₂₃` | Complement/flip (yin⟷yang transformation) |

### 2.3 Why GA Over Vectors

| Property | Vector Space | Geometric Algebra |
|----------|-------------|-------------------|
| Invertible operations | No (dot product loses info) | Yes (geometric product supports division) |
| Asymmetric relations | Needs complex numbers | Natural (geometric product is non-commutative) |
| Multi-grade structure | Separate tensor objects | Unified multivector (8 coefficients) |
| Cyclical relationships | Difficult | Natural (rotors in bivector planes) |
| Compositionality | Tensor product | Geometric product + grade projection |
| Storage cost | 8 floats (8-dim vector) | 8 floats (identical) |

The key advantage: GA provides richer operations at identical storage cost.

### 2.4 Bagua as Interpretable Taxonomy

Instead of opaque relation names ("r_42", "dep_7"), bagua-tagging provides an interpretable 8-category relationship taxonomy:

| Trigram | KG Relation Type | When to Use |
|---------|-----------------|-------------|
| ☰ Qián | `creative` (introduces, generates) | New pattern introduced; innovation |
| ☷ Kūn | `receptive` (accepts, follows) | Convention adopted; dependency accepted |
| ☳ Zhèn | `initiating` (triggers, starts) | Causal relationship: A triggers B |
| ☵ Kǎn | `flowing` (transmits, channels) | Data flow; pipe/stream patterns |
| ☶ Gèn | `bounding` (limits, constrains) | Constraint; boundary; "don't cross this" |
| ☴ Xùn | `penetrating` (influences, pervades) | Gradual influence; convention spreading |
| ☲ Lí | `illuminating` (clarifies, reveals) | Clarification; dependency revelation |
| ☱ Duì | `reflecting` (mirrors, balances) | Symmetric relationship; mutual dependency |

The 64 hexagrams (combinations of two trigrams) provide compound relationship types — e.g., ☰ over ☷ = "Creative acting upon Receptive" = a _generative dependency_.

---

## 3. Architecture

### 3.1 Crate Structure

```
ga-semantics/
├── Cargo.toml
├── src/
│   ├── lib.rs              # Public API, re-exports
│   ├── multivector.rs      # Cl(3) Multivector type + operations
│   ├── blades.rs           # Basis blade constants, grade helpers
│   ├── rotor.rs            # Rotor construction, application, composition
│   ├── bagua.rs            # Trigram enum, hexagram, mapping to blades
│   ├── wuxing.rs           # Five-phase transformation cycles
│   ├── semantics.rs        # High-level semantic operations
│   ├── serde.rs            # Serialization (serde feature)
│   └── python.rs           # PyO3 bindings (python feature)
├── benches/
│   ├── product_bench.rs    # Geometric product performance
│   └── rotor_bench.rs      # Rotor composition benchmarks
├── tests/
│   ├── algebra_tests.rs    # Mathematical correctness tests
│   ├── bagua_tests.rs      # Bagua mapping validation
│   └── analogy_tests.rs    # Analogical reasoning tests
├── examples/
│   ├── analogy.rs          # "king - man + woman = queen" in GA
│   ├── relation_compose.rs # Composing KG relations as rotors
│   └── cycle_demo.rs       # Wuxing cycles as rotor sequences
└── README.md
```

### 3.2 Core API

```rust
use ga_semantics::prelude::*;

// Construct a multivector from coefficients
let a = Multivector::new([1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]); // scalar

// Or from blade + coefficient
let v = Multivector::from_blade(Blade::E1, 0.8);   // 0.8 * e₁ (Thunder trigram)

// Geometric product
let c = a.geo_product(&v);  // 0.8 * e₁

// Grade projection
let scalar_part = c.grade(0);     // 0.0
let vector_part = c.grade(1);     // 0.8 * e₁

// Inverse
let v_inv = v.inverse().unwrap();

// Rotor: rotate by θ in the e₁₂ (Fire) plane
let r = Rotor::new(std::f64::consts::PI / 4.0, Bivector::E12);

// Apply rotation via sandwich product
let rotated = r.apply(&v);

// Bagua tagging
let trigram = v.dominant_trigram();        // Trigrams::Zhen (Thunder)
let hexagram = a.relationship_to(&v);      // (Trigrams::Kun, Trigrams::Zhen)
let cycle = trigram.wuxing_phase();        // WuXing::Wood
let next = cycle.generate();               // WuXing::Fire (generating cycle)

// Semantic operations
let similarity = a.semantic_similarity(&v);     // [-1, 1], via scalar part
let orthogonality = a.semantic_difference(&v);   // [0, 1], via bivector magnitude
let relation_type = a.semantic_relation(&v);     // Trigrams category
```

### 3.3 Dependencies

| Crate | Purpose | Notes |
|-------|---------|-------|
| `serde` (optional) | Serialization | For storing multivectors as JSON/Bincode |
| `pyo3` (optional) | Python bindings | For use in Python ML/AI pipelines |
| `ndarray` (optional) | Batch operations | If we need to process many multivectors |
| None required | — | Core algebra has zero external dependencies |

### 3.4 Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Geometric product | O(1) | 64 multiplications, 56 additions (constant for Cl(3)) |
| Inverse | O(1) | Closed-form for Cl(3) via reverse + norm |
| Rotor application | O(1) | Three geometric products (sandwich) |
| Dominant trigram | O(1) | Find max among 8 coefficients |
| Storage per multivector | 64 bytes | 8 × f64 |
| Batch product (N multivectors) | O(N) | Embarrassingly parallel |

---

## 4. Validation Strategy

### 4.1 Mathematical Correctness

- **Basis blade multiplication table** — verify against known Cl(3) Cayley table
- **Inverse property** — `A * A⁻¹ = 1` for all non-degenerate multivectors
- **Rotor property** — `R * R̃ = 1` (rotors are unit even-grade elements)
- **Grade consistency** — geometric product of grade-m blade and grade-n blade yields grades |m-n| through m+n
- **Dualization** — `A * e₁₂₃ * e₁₂₃ = -A` (pseudoscalar squares to -1 in Cl(3))

### 4.2 Semantic Benchmarks

**Benchmark 1: Relation Classification**
- Given 100 entity pairs with known relationships (from standard KG benchmarks)
- Classify each into a Bagua trigram category via dominant blade of their geometric product
- Compare accuracy vs. random baseline, standard embedding similarity

**Benchmark 2: Analogical Reasoning**
- Adapt Google word analogy test: "A is to B as C is to D"
- Compute rotor `R = A⁻¹B`, apply to C, measure distance to true D
- Compare vs. standard vector arithmetic (`B - A + C`)

**Benchmark 3: KG Link Prediction**
- Reproduce GeomE (Xu et al., COLING 2020) benchmark conditions
- Use Bagua-tagged multivectors instead of untagged multivectors
- Measure: MRR, Hits@1, Hits@3, Hits@10
- Hypothesis: Bagua tagging adds interpretability without hurting accuracy

**Benchmark 4: Contradiction Detection**
- Given pairs of knowledge items known to be contradictory
- Measure: does the geometric product's bivector magnitude predict contradiction?
- Compare vs. cosine similarity baseline

### 4.3 Decision Gate

| Benchmark Result | Action |
|-----------------|--------|
| Accuracy > baseline + 5% on 2+ benchmarks | Promote to production; integrate into ACC KG |
| Accuracy within ±5% of baseline | Marginal value; maintain as research project; optional ACC integration |
| Accuracy < baseline - 5% | Document findings; publish negative result; shelve |

---

## 5. Development Plan

### Phase 1: Core Algebra (Week 1-2)

| Task | Effort |
|------|--------|
| Implement `Multivector` type with 8 f64 coefficients | 1 day |
| Implement geometric product via coefficient multiplication table | 1 day |
| Implement grade projection, inner/outer product, reverse, norm | 1 day |
| Implement inverse, dualization, rotor construction/application | 1 day |
| Implement `Blade` enum and basis blade constants | 0.5 day |
| Write algebra correctness tests (Cayley table, inverse, rotor properties) | 1 day |
| Add `serde` support for serialization | 0.5 day |
| Write benchmarks | 0.5 day |
| **Subtotal** | **~6.5 days** |

### Phase 2: Bagua Mapping (Week 2-3)

| Task | Effort |
|------|--------|
| Implement `Trigrams` enum with blade mapping, binary encoding, Chinese names | 1 day |
| Implement `Hexagram` type (upper/lower trigram, 64 named states) | 1 day |
| Implement `WuXing` enum with generating/controlling cycles | 0.5 day |
| Implement trigram transformation rules (line-change operations) | 1 day |
| Implement `dominant_trigram()`, `relationship_to()`, `wuxing_phase()` | 0.5 day |
| Write Bagua mapping tests (verify 8 trigrams ↔ 8 basis blades) | 0.5 day |
| **Subtotal** | **~4.5 days** |

### Phase 3: Semantic Operations (Week 3)

| Task | Effort |
|------|--------|
| Implement `semantic_similarity()` (scalar part of geometric product) | 0.5 day |
| Implement `semantic_difference()` (bivector magnitude) | 0.5 day |
| Implement `semantic_relation()` (trigram classification of relationship) | 0.5 day |
| Implement analogy computation: `analogy(a, b, c) = (a⁻¹b) * c` | 0.5 day |
| Implement relation composition: `compose(r1, r2) = r2 * r1` (rotor multiplication) | 0.5 day |
| Write analogical reasoning examples | 0.5 day |
| **Subtotal** | **~3 days** |

### Phase 4: Benchmarks (Week 4)

| Task | Effort |
|------|--------|
| Set up relation classification benchmark | 1 day |
| Set up analogical reasoning benchmark (Google word analogy test adaptation) | 1 day |
| Set up KG link prediction benchmark (GeomE reproduction) | 2 days |
| Run benchmarks; collect results; write analysis | 2 days |
| **Subtotal** | **~6 days** |

### Phase 5: Bindings & Publishing (Week 5)

| Task | Effort |
|------|--------|
| Python bindings via PyO3 (optional feature) | 2 days |
| Documentation: API docs, examples, README, mathematical background | 2 days |
| Publish to crates.io | 0.5 day |
| Publish to PyPI (if Python bindings exist) | 0.5 day |
| Write blog post / preprint explaining the Cl(3)↔Bagua isomorphism | 1 day |
| **Subtotal** | **~6 days** |

**Total: ~5 weeks (26 days)**

---

## 6. Integration Path with ACC

Once `ga-semantics` is published and benchmarked (and passes the decision gate):

### 6.1 ACC Schema Addition

```sql
-- Add trigram tag to knowledge relations
ALTER TABLE knowledge_relations ADD COLUMN trigram_tag TEXT;
-- Values: 'qian' | 'kun' | 'zhen' | 'kan' | 'gen' | 'xun' | 'li' | 'dui'

-- Optionally store multivector representation of relation
ALTER TABLE knowledge_relations ADD COLUMN relation_multivector BLOB;
-- 8 × f64 = 64 bytes
```

### 6.2 ACC Integration Points

| ACC Component | Integration |
|--------------|-------------|
| Knowledge Compounder | When extracting relations, classify them into trigram categories |
| Knowledge Relations | Store `trigram_tag` + `relation_multivector` on each edge |
| Contradiction Detection | Use geometric product bivector magnitude as additional contradiction signal |
| KG Queries | Compose multi-hop relations via rotor multiplication |
| KG Visualization | Color-code edges by trigram category (8 distinct colors) |

### 6.3 ACC Cargo.toml

```toml
[dependencies]
ga-semantics = "0.1"
```

---

## 7. Competitive Landscape

| System | Approach | Interpretability | Asymmetric | Cyclical |
|--------|----------|:---:|:---:|:---:|
| Vector embeddings (word2vec, BERT) | Dot product similarity | Low | No | No |
| Complex embeddings (ComplEx, RotatE) | Complex-valued vectors | Low | Partial | Partial |
| Geometric Algebra (GeomE, 2020) | Multivector + geometric product | Low | Yes | Yes |
| **ga-semantics (this project)** | **Multivector + Bagua taxonomy** | **High** | **Yes** | **Yes** |

The unique contribution: GeomE proved GA works for KGs but provides no interpretability. Bagua tagging adds a human-readable 8-category taxonomy on top of the algebraic structure. This makes the system usable not just as a black-box embedder but as a tool for understanding *what kind* of relationship exists between concepts.

---

## 8. Risks and Open Questions

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Benchmarks show no improvement over GeomE/baseline | High | High | Bagua tagging adds interpretability alone — still valuable even if accuracy is flat |
| Community doesn't understand the Bagua connection | Medium | Medium | Focus marketing on "interpretable GA embeddings"; Bagua as optional taxonomy overlay |
| Rust ecosystem for GA is sparse | Medium | Low | We're building the crate; Cl(3) is small enough to implement from scratch |
| Academic community dismisses Bagua as mysticism | Medium | Low | Lead with the Cl(3) math (rigorous); present Bagua as an interesting isomorphic taxonomy, not a belief system |
| Practical value for agent reasoning unproven | High | Medium | Separate project structure means failure costs only ~5 weeks; no ACC dependency |
| No existing benchmarks for "interpretable algebraic relations" | High | Medium | Adapt standard KG benchmarks; add interpretability metrics (human agreement on trigram classification) |

### Open Questions

1. **Can Bagua trigram categories be learned automatically?** Instead of the fixed mapping in this proposal, could we learn which blade maps to which trigram from data?
2. **Does higher-dimensional Cl(n) provide more expressive power?** Cl(4) has 16 basis blades — but loses the elegant 8-fold Bagua mapping. Worth exploring if 8 categories prove insufficient.
3. **Can the Wuxing generating/controlling cycles be validated empirically?** Do KG relationships in real datasets follow the five-phase cycle patterns?
4. **How does this compare to hyperbolic embeddings for hierarchy?** Hyperbolic space captures tree-like structures well; GA captures transformational relationships. Complementary or competitive?

---

## 9. Success Criteria

The project is successful if:

1. **Mathematical correctness verified** — all algebraic operations pass property-based tests
2. **Benchmarks published** — head-to-head comparison with GeomE and standard embedding approaches
3. **ACC integration demo** — knowledge_relations edges tagged with trigram categories, visualized in Cytoscape.js
4. **Crate published** — on crates.io with ≥80% documentation coverage
5. **Preprint or blog post** — explaining the Cl(3)↔Bagua isomorphism to the AI/ML community

Failure mode: Benchmarks show no advantage. In that case:
- Document negative result honestly
- Keep crate available for the interpretability value alone
- ACC integration remains optional (not gating any feature)

---

## 10. References

See `docs/research/clifford-bagua-semantic-layer.md` for the full research document with 491 lines of analysis, mathematical foundations, bibliography, and evidence assessment.

Key citations:
- Xu et al. (2020). "Knowledge Graph Embeddings in Geometric Algebras." COLING 2020.
- Pustejovsky, J. (2026). "Toward a Functional Geometric Algebra for Natural Language Semantics." arXiv:2604.25902.
- Coecke, Sadrzadeh, Clark (2010). "Mathematical Foundations for a Compositional Distributional Model of Meaning."
- Hestenes, D. (1966-2003). Foundational works on geometric algebra.
- Wilhelm, R. & Baynes, C.F. (1967). "The I Ching or Book of Changes."
