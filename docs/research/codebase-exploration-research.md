# Efficient Codebase Exploration & Content Navigation Without Overloading Model Context

## Research Document for Agent Control Center — June 2026

> **Objective:** Survey practical, implementable approaches for enabling LLM-based coding agents to efficiently explore, understand, and navigate large codebases while staying within token budget constraints.

---

## Table of Contents

1. [Code-Aware Retrieval and Exploration Techniques](#1-code-aware-retrieval-and-exploration-techniques)
2. [Advanced Context Window Strategies](#2-advanced-context-window-strategies)
3. [Papers and Implementations](#3-papers-and-implementations)
4. [Context-Efficient Content Representation](#4-context-efficient-content-representation)
5. [Multi-Agent Codebase Exploration](#5-multi-agent-codebase-exploration)
6. [Synthesis: Recommended Architecture for Agent Control Center](#6-synthesis-recommended-architecture)
7. [Bibliography](#7-bibliography)

---

## 1. Code-Aware Retrieval and Exploration Techniques

### 1.1 Code Splitting / Chunking Strategies

Effective chunking is the foundation of code-aware retrieval. Unlike natural language text, code has high structural density and strict dependency relationships, making naive token-window or paragraph-based splitting ineffective.

#### 1.1.1 AST-Aware Chunking (Tree-Sitter)

The most widely adopted approach uses **tree-sitter** — an incremental parsing library that produces concrete syntax trees (CST) for 40+ languages. Instead of splitting on arbitrary boundaries, AST-aware chunking preserves syntactic units.

**How it works:**
1. Parse source files into ASTs using tree-sitter language grammars
2. Traverse the AST to identify logical boundaries: function definitions, class definitions, method definitions, import blocks
3. Chunk at these syntactic boundaries, ensuring each chunk is a complete, compilable unit
4. For very large functions, further split at major control-flow boundaries (if-else blocks, loops) while tracking parent context

**Key implementation details (from Aider's approach):**
- Uses `py-tree-sitter-languages` for Python-installable binary wheels
- Extracts symbol definitions using language-specific `tags.scm` query files
- Identifies both definitions and cross-references within the AST
- Produces chunks annotated with: file path, symbol name, type signature, line range

```python
# Conceptual example: tree-sitter-based chunking
def chunk_file_ast(file_path: str, tree: Tree) -> list[Chunk]:
    chunks = []
    for node in tree.root_node.children:
        if node.type in ('function_definition', 'class_definition',
                          'method_definition', 'import_statement'):
            chunks.append(Chunk(
                file=file_path,
                start_line=node.start_point[0],
                end_line=node.end_point[0],
                symbol_name=extract_symbol_name(node),
                type=node.type,
                code=node.text
            ))
    return chunks
```

#### 1.1.2 Semantic Chunking

Beyond syntactic boundaries, semantic chunking groups code by related functionality. This can be achieved through:

- **Control flow analysis**: Group functions called within the same control flow path
- **Affinity clustering**: Functions that share many caller/callee relationships
- **Embedding-based segmentation**: Compute cosine similarity between adjacent code sections; split where similarity drops

**Practical recommendation:** Layer AST-aware chunking as the primary method with semantic refinement for very large monoliths or highly interconnected modules.

#### 1.1.3 Function-Level vs. Class-Level vs. File-Level

| Granularity | Pros | Cons | Best For |
|---|---|---|---|
| **Function-level** | High precision, small context | Loses class/scope context | Targeted bug fixes, unit test generation |
| **Class-level** | Preserves OOP structure, methods stay together | Can be too large for monolithic classes | Refactoring, feature additions in OOP codebases |
| **File-level** | Complete context, no fragmentation | Wastes tokens on irrelevant code | Small files (<500 lines), simple modules |
| **Adaptive** | Optimal context per query | Implementation complexity | **Recommended for Agent Control Center** |

**Adaptive chunking strategy:** Start with coarse file-level chunks. When a file exceeds a threshold (e.g., 500 LOC), chunk at class boundaries. When a class exceeds threshold, chunk at method boundaries. Always include the parent class/function signature as prefix context in each chunk.

### 1.2 Repository Map / Code Sketch Generation

The **repository map** (or "repo map") approach, pioneered by Aider, provides an extremely compact yet information-dense representation of an entire codebase.

#### 1.2.1 Aider's Repo Map Architecture

As documented in Aider's [repo map blog post](https://aider.chat/2023/10/22/repomap.html), the map serves three key functions:

1. **Orientation**: Gives the LLM a high-level view of classes, functions, and type signatures across the repo
2. **Navigation**: Lets the LLM identify which files to read in detail by referencing entries in the map
3. **Integration**: Shows how existing abstractions should be used when writing new code

**Construction pipeline:**

```
Source Files → Tree-sitter Parse → Extract Symbol Definitions
                                      ↓
                              Build Dependency Graph
                          (files = nodes, imports = edges)
                                      ↓
                            PageRank-Style Graph Ranking
                        (identify most-referenced symbols)
                                      ↓
                          Token-Budget-Constrained Selection
                              (default: 1K token budget)
                                      ↓
                                  Compact Repo Map
```

**Graph ranking algorithm:**
- Each source file is a node; edges connect files with import/include dependencies
- A PageRank-like centrality algorithm identifies the most "important" symbols (most referenced across the codebase)
- The output is pruned to fit within a user-configurable token budget (`--map-tokens`, default 1K)
- The token budget dynamically expands when no files are in the chat context

**Output format example:**
```
src/models/user.py:
⋮...
│class User:
│    id: str
│    email: str
⋮...
│    def authenticate(self, password: str) -> bool:
⋮...
│    def get_permissions(self) -> list[str]:
⋮...

src/services/auth.py:
⋮...
│def login(email: str, password: str) -> Optional[User]:
⋮...
│def verify_token(token: str) -> User:
⋮...
```

#### 1.2.2 Implementation Guidelines for Agent Control Center

1. **Use tree-sitter** as the AST backend (language-agnostic, no external dependencies beyond pip-installable wheels)
2. **Implement PageRank or HITS centrality** on the import/dependency graph
3. **Cache the repo map** and incremental-update it when files change
4. **Allow user-configurable token budget** (500-5000 tokens depending on model context window)
5. **Annotate map entries with relevance hints** when the agent has a specific task (boost symbols matching the task description)

### 1.3 Code Graph Construction

Beyond the repo map, richer graph representations enable deeper codebase understanding.

#### 1.3.1 Call Graphs

A **call graph** maps which functions call which functions. This is essential for:
- Understanding the full impact of a change (ripple effect analysis)
- Identifying test coverage gaps
- Finding entry points and dead code

**Construction approaches:**
- **Static analysis**: Parse code and identify function call sites. Fast but misses dynamic dispatch.
- **Dynamic analysis**: Record actual call traces during execution. Accurate but requires running tests.
- **Hybrid**: Static analysis supplemented by type inference for dynamic dispatch in Python/JS.

**Recommended tools:**
- Python: `pydocstyle`/`pycallgraph2`, or tree-sitter-based custom extraction
- JavaScript/TypeScript: `dependency-cruiser`, `madge`
- Multi-language: tree-sitter with custom `call_references.scm` query files

#### 1.3.2 Import/Dependency Graphs

Maps which files/modules import from which other files. This is the foundation for:
- Aider's repo map graph ranking
- Finding downstream consumers of a changed API
- Identifying circular dependencies
- Determining build/test order

```python
# Example dependency graph construction
def build_dependency_graph(files: list[str]) -> nx.DiGraph:
    G = nx.DiGraph()
    for file in files:
        G.add_node(file)
        imports = extract_imports(file)  # tree-sitter parse
        for imp in imports:
            G.add_edge(file, imp)
    return G
```

#### 1.3.3 Type/Inheritance Graphs

For statically-typed or OOP-heavy codebases, inheritance and type graphs reveal:
- Class hierarchies (who extends what)
- Interface implementations
- Type compatibility chains

#### 1.3.4 Graph-Based Relevance Propagation

Once graphs are constructed, relevance can be propagated:
1. Start with a **seed set** of files/functions matching the task description (via grep, embedding search, or user specification)
2. Propagate relevance scores along graph edges (imports, calls, inheritance)
3. Apply a **decay factor** with distance from seeds
4. Select the top-k most relevant nodes within the token budget

This is effectively what Aider's PageRank-based selection achieves: symbols with high PageRank are those most likely to be relevant to any given change because they're heavily referenced.

### 1.4 Code Embeddings for Semantic Search

Vector embeddings enable conceptual search over code, finding semantically similar code even when keyword matching fails.

#### 1.4.1 Specialized Code Embedding Models

| Model | Provider | Dimensions | Key Feature |
|---|---|---|---|
| **Voyage Code 2** | Voyage AI | 1536 | Optimized for code retrieval; state-of-the-art on code search benchmarks |
| **CodeBERT** | Microsoft | 768 | BERT-based, pre-trained on code + NL pairs |
| **StarCoder Embeddings** | BigCode | Varies | Derived from StarCoder 15.5B, strong on code understanding |
| **Unixcoder** | Microsoft | 768 | Cross-modal (code ↔ natural language) |
| **OpenAI text-embedding-3** | OpenAI | Varies | General purpose, surprisingly good on code |
| **all-MiniLM-L6-v2** | Sentence-Transformers | 384 | Lightweight, fast, good for local embedding |

#### 1.4.2 Embedding Strategy for Codebases

**Indexing pipeline:**
```
Source Files → AST-Aware Chunking → Embed each chunk → Store in vector DB (ChromaDB/Qdrant)
```

**Retrieval pipeline:**
```
Task Description → Embed query → KNN in vector DB → Re-rank using structure-aware scoring
```

**Practical considerations:**
- **Re-rank after retrieval**: Use structure-aware features (file path similarity, call graph proximity, chunk type) to re-rank raw embedding results
- **Multi-representation indexing**: Embed both the code chunk AND its summary/docstring
- **Hierarchical retrieval**: Search at file-level first, then chunk-level within matched files
- **Hybrid search**: Combine BM25 (keyword) scores with embedding (semantic) scores

#### 1.4.3 BM25 as a Lightweight Baseline

SWE-bench's experiments showed strong results with simple BM25 retrieval. For many codebases, a well-tuned BM25 index over tokenized code is:
- Faster to build (no embedding computation)
- Simpler to deploy
- Surprisingly competitive with embedding-based approaches for exact symbol/name searches

**Recommendation**: Implement BM25 as the baseline retriever, with optional embedding-based upgrade for larger codebases where conceptual search is needed.

---

## 2. Advanced Context Window Strategies

### 2.1 Map-Reduce Over Codebase

The map-reduce pattern enables processing arbitrarily large codebases within fixed context windows.

#### 2.1.1 Standard Map-Reduce

**Map phase:** Process each file (or chunk) independently to extract summaries:
```
For each file in repo:
    Send to LLM: "Summarize the exports, key functions, and purpose of this file"
    Receive: Compact file summary
```

**Reduce phase:** Combine summaries to produce final understanding:
```
Send to LLM: [All file summaries] + "Based on these summaries, answer: [task question]"
```

**Limitation:** Map phase summaries are lossy; the reduce phase operates on summaries, not code.

#### 2.1.2 Iterative Map-Reduce with Refinement

A more sophisticated variant used by systems like RepoCoder:

```
Phase 1 (Map): Generate coarse summaries of all files
Phase 2 (Retrieve): Use summaries to identify promising files
Phase 3 (Refine): Re-process promising files with full detail
Phase 4 (Reduce): Combine detailed context for final answer
```

This allows the system to first survey the landscape, then zoom in on what matters.

#### 2.1.3 Map-Reduce with Retrieval (RepoCoder's Approach)

RepoCoder (arXiv:2303.12570) implements an **iterative retrieval-generation pipeline**:

1. **Initial retrieval**: Given the code to complete, use a similarity-based retriever (dense retrieval via UniXcoder embeddings) to find the top-k most relevant code snippets from the repository
2. **Generation with context**: Feed the retrieved snippets as context to a code LLM that generates the completion
3. **Iterative refinement**: Use the generated result to perform a second retrieval, finding code that is now more relevant given the partial completion
4. **Final generation**: Generate with the expanded context set

Key finding: RepoCoder improved in-file completion by **over 10%** across all granularity levels (line, API invocation, function body) compared to vanilla retrieval-augmented approaches.

### 2.2 Iterative Refinement with Progressive Context Expansion

Instead of loading all context at once, progressively expand context based on identified gaps.

#### 2.2.1 The Agent Loop Pattern

```
1. Agent receives task + repo map (compact, ~1K tokens)
2. Agent analyzes map, identifies candidate files
3. Agent requests specific file contents (reads 2-5 files)
4. Agent analyzes file contents, may discover gaps
5. Agent requests more files based on import/dependency analysis
6. Repeat steps 4-5 until agent has sufficient context
7. Agent produces solution
```

This is essentially the pattern used by SWE-agent, Aider, and all successful coding agents. The key insight: **the LLM itself is the best judge of what context it needs**.

#### 2.2.2 SWE-agent's Agent-Computer Interface (ACI)

SWE-agent introduced specialized commands (tools) for context-efficient exploration:
- `find_file`: Search for files by name
- `search_dir`: Search for patterns in files
- `search_file`: Search within a specific file
- `open`: Read a file (initially shows only first 100 lines with scroll capability)

This **incremental, scroll-based reading** prevents dumping entire files into context unnecessarily.

#### 2.2.3 Relevance-Guided Expansion

```
Given: Task T, initial context C_0
For iteration i:
    C_i = C_{i-1}
    Ask LLM: "Given context C_i, what additional information would help complete task T?"
    If LLM identifies needed files F:
        Add F to C_i
    Else:
        Break (context sufficient)
Generate solution with final context C_n
```

### 2.3 Information Density Optimization

Every token in the context window should carry maximum useful information for the task.

#### 2.3.1 Techniques for Maximizing Information Density

**1. Signature-first presentation:** Show function signatures before implementations. The LLM often only needs to know the API, not the internals.

**2. Stripped implementations:** For functions needed for context (but not for modification), strip away:
- Logging/debug statements
- Error handling boilerplate (when not relevant)
- Comments (when the code is self-documenting)
- Docstrings that duplicate the signature info

**3. Relevance-based compression:**
- **High relevance** (the code being modified): Full content
- **Medium relevance** (direct dependencies): Signatures + key implementation details
- **Low relevance** (indirect dependencies): Signatures only
- **Background** (everything else): Repo map entry only

**4. Token-efficient annotations:**
Instead of full comments, annotate code with concise hints:
```
# BEFORE (wastes tokens):
def calculate_price(base_price, tax_rate, discount_percentage, loyalty_discount,
                    volume_discount, seasonal_multiplier, region, currency,
                    exchange_rate, rounding_mode='nearest'):
    """
    Calculate the final price for a product after applying all applicable
    discounts and adjustments.

    Args:
        base_price: The starting price before any adjustments
        tax_rate: The tax rate as a decimal (e.g., 0.08 for 8%)
        ... 10 more lines of parameter docs
    """
    # 50 lines of implementation...

# AFTER (same information, fewer tokens):
def calculate_price(
    base_price,     # float
    tax_rate,       # float, e.g. 0.08
    discount,       # float
    **kwargs
) -> float:
    # Price calc with taxes, discounts, regional adjustments
```

#### 2.3.2 Token Budget Allocation Strategy

For a typical 128K context window model:

| Zone | Token Allocation | Content |
|---|---|---|
| System prompt | 2-4K | Agent instructions, tool definitions |
| Repo map | 1-5K | Compressed codebase overview |
| Task-specific context | 50-80K | Relevant files, code chunks |
| Conversation history | 20-40K | Prior turns, reasoning, decisions |
| Buffer/reserve | 10-20K | Room for tool outputs, generated code |

### 2.4 Relevance Scoring

Deciding what to include in context requires computable relevance scores.

#### 2.4.1 Multi-Factor Relevance Scoring

```python
def relevance_score(file: File, task: str) -> float:
    score = 0.0

    # 1. Semantic similarity (30% weight)
    score += 0.30 * embedding_similarity(task, file.summary)

    # 2. Keyword/BM25 match (25% weight)
    score += 0.25 * bm25_score(task, file.content)

    # 3. Graph centrality (20% weight)
    score += 0.20 * file.pagerank_score

    # 4. Edit recency (10% weight)
    score += 0.10 * recency_factor(file.last_modified)

    # 5. Task-specific signals (15% weight)
    if file.path matches expected patterns: score += 0.15
    if file was mentioned in conversation: score += 0.15

    return score
```

#### 2.4.2 SWE-bench's Retrieval Approach

SWE-bench provides pre-computed retrieval baselines at multiple context sizes:
- **BM25 retrieval at 13K tokens**: Uses BM25 over all repository files
- **BM25 retrieval at 27K tokens**: Larger context budget
- **BM25 retrieval at 40K tokens**: Larger still
- **"Oracle" retrieval**: Uses the actual files changed in the ground-truth patch (upper bound)

The fact that BM25 at 13K tokens performs competitively suggests that **simple retrieval methods work well when the problem description contains enough keywords to match relevant files**.

#### 2.4.3 Learning-to-Rank for Code Retrieval

For production systems, consider training a lightweight ranker:
```
Features: embedding similarity, BM25 score, file path depth, import count,
          reference count, file size, last modified date, test status
Labels: Binary (file was modified in the solution)
Model: Gradient-boosted trees (XGBoost/LightGBM) or small neural network
```

---

## 3. Papers and Implementations

### 3.1 Repo-Level Code Generation with Context

#### 3.1.1 RepoCoder (EMNLP 2023)

**Paper:** Zhang et al., "RepoCoder: Repository-Level Code Completion Through Iterative Retrieval and Generation" — [arXiv:2303.12570](https://arxiv.org/abs/2303.12570)  
**Code:** [github.com/microsoft/CodeT/tree/main/RepoCoder](https://github.com/microsoft/CodeT/tree/main/RepoCoder)

**Key contributions:**
- Framework combining similarity-based retrieval (UniXcoder embeddings) with a pre-trained code LM
- **Iterative retrieval-generation pipeline**: Generate → re-retrieve with partial output → regenerate
- **RepoEval benchmark**: Latest real-world repos with line/API/function completion scenarios
- **10%+ improvement** over in-file completion baselines

**Architecture:**
```
Phase 1: Given incomplete code, retrieve top-k similar snippets from repo
Phase 2: Generate completion using [retrieved context + incomplete code]
Phase 3: Use generated code to expand retrieval query, retrieve more context
Phase 4: Generate final completion with expanded context
```

**Practical takeaway for Agent Control Center:**
The iterative refinement pattern (retrieve → generate → re-retrieve → refine) is highly effective and can be adapted beyond code completion to general code understanding tasks.

#### 3.1.2 RepoFusion (FSE 2024)

**Paper:** Shrivastava et al., "RepoFusion: Training Code Models to Understand Your Repository" — [arXiv:2406.05502](https://arxiv.org/abs/2406.05502)

**Key contributions:**
- Trains code models to directly consume and reason over repository context
- **Fusion-in-Decoder architecture**: Multiple context chunks fed into the decoder via cross-attention
- Outperforms retrieval-augmented generation (RAG) approaches by directly encoding repo context during training
- Demonstrates that **context fusion at the model level** beats context concatenation

#### 3.1.3 CodePlan (2023)

**Paper:** Bairi et al., "CodePlan: Repository-level Coding using LLMs and Planning" — [arXiv:2309.12499](https://arxiv.org/abs/2309.12499)

**Key contributions:**
- Treats repository-level code changes as a **planning problem**
- Uses LLMs to generate a task graph (dependency graph of edits)
- Executes planned edits in topological order, respecting inter-file dependencies
- Handles **cross-file, multi-step edits** by planning before executing

**Architecture:**
```
Task Description → LLM generates code plan (DAG of edits)
                 → Topological sort of edit nodes
                 → Execute each edit with appropriate file context
                 → Validate each step before proceeding
```

### 3.2 SWE-bench Approaches for Codebase Exploration

#### 3.2.1 SWE-bench (ICLR 2024 Oral)

**Paper:** Jimenez et al., "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?" — [arXiv:2310.06770](https://arxiv.org/abs/2310.06770)

**Key findings relevant to code exploration:**
- 2,294 real GitHub issues from 12 Python repos
- Issues require understanding and coordinating changes across **multiple functions, classes, and files**
- Best models (at time of paper) solved only 1.96% of issues
- Retrieval matters enormously: Oracle retrieval (providing exact changed files) dramatically improves performance

**Retrieval baselines provided:**
- BM25 at 13K, 27K, 40K token contexts
- Pre-computed retrieval rankings available on HuggingFace

#### 3.2.2 SWE-agent

**Code:** [github.com/SWE-agent/SWE-agent](https://github.com/SWE-agent/SWE-agent)

**Key architecture decisions for exploration:**
- **Agent-Computer Interface (ACI):** Specialized tools designed for efficient code interaction
- **LSM (Linter-Search-Map):** Custom tool that provides linter errors and search context
- **Scroll-based file reading:** Rather than loading entire files, the agent scrolls through files incrementally
- **Context-efficient prompts:** Commands return compact, actionable information rather than verbose output

#### 3.2.3 Key SWE-bench Leaderboard Insights

As of early 2025, top-performing systems on SWE-bench share these exploration patterns:
1. **Multi-pass strategy**: First pass reads broadly (many files, shallow), second pass reads deeply (few files, full context)
2. **Test-driven exploration**: Run existing tests first to understand expected behavior
3. **Error-guided navigation**: Use linter/test errors to identify which files need attention
4. **Repository map + targeted reading**: Like Aider, top agents start with a map and drill down

### 3.3 RAG for Code

#### 3.3.1 Code-Specific RAG Challenges

Standard RAG faces unique challenges with code:
- **Structural dependencies**: Code is not flat text; chunks have inter-dependencies
- **Name resolution**: Retrieving code that references `foo.bar()` is useless without the definition of `foo`
- **Granularity mismatch**: A retrieval may return a function body but miss its import statements
- **Order sensitivity**: The order of retrieved chunks matters for code context

#### 3.3.2 Code-Graph Enhanced RAG

Augment vector search with graph-aware re-ranking:

```python
def graph_enhanced_retrieve(query: str, vector_db: VectorDB, dep_graph: nx.DiGraph, k: int = 10):
    # Step 1: Dense retrieval
    candidates = vector_db.search(query, top_k=k*3)

    # Step 2: Expand with graph neighbors (import closure)
    expanded = set(candidates)
    for chunk in candidates:
        file = chunk.file_path
        # Add imports (dependencies of this file)
        expanded.update([c for c in chunks if c.file_path in dep_graph.predecessors(file)])
        # Add imports-by (files that depend on this file)
        expanded.update([c for c in chunks if c.file_path in dep_graph.successors(file)])

    # Step 3: Re-rank by combined score
    scored = [(chunk, rank_score(chunk, query, dep_graph)) for chunk in expanded]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [chunk for chunk, _ in scored[:k]]
```

#### 3.3.3 BM25 + Embedding Hybrid (Recommended Baseline)

The simplest effective approach, validated by SWE-bench:

```python
def hybrid_retrieve(query: str, bm25_index, vector_db, alpha: float = 0.7, k: int = 20):
    # Get BM25 results
    bm25_results = bm25_index.search(query, k=k)
    bm25_scores = {r.id: r.score for r in bm25_results}

    # Get embedding results
    emb_results = vector_db.search(query, k=k)
    emb_scores = {r.id: r.score for r in emb_results}

    # Normalize and combine
    all_ids = set(bm25_scores.keys()) | set(emb_scores.keys())
    combined = {}
    for id in all_ids:
        combined[id] = alpha * normalize(bm25_scores.get(id, 0)) + \
                       (1 - alpha) * normalize(emb_scores.get(id, 0))

    return sorted(combined.items(), key=lambda x: x[1], reverse=True)[:k]
```

#### 3.3.4 Evaluation: RAGAs for Code

RAGAs (Retrieval Augmented Generation Assessment) provides metrics for evaluating RAG quality:
- **Context precision**: What fraction of retrieved chunks is relevant?
- **Context recall**: What fraction of relevant chunks was retrieved?
- **Faithfulness**: Is the generated answer grounded in the retrieved context?
- **Answer relevance**: Does the answer address the question?

For code-specific evaluation, add:
- **Compilability**: Can the context alone (without the full repo) produce compilable code?
- **Dependency completeness**: Are all imports/symbols referenced in the retrieved context defined within it?

---

## 4. Context-Efficient Content Representation

### 4.1 Lossless vs. Lossy Compression for LLM Context

#### 4.1.1 Lossless Compression

**Techniques that preserve all information while reducing token count:**

- **Minification:** Remove whitespace, comments, and docstrings (with option to re-add specific ones)
- **Symbol shortening:** Replace long identifiers with shorter ones and provide a mapping table (effective for obfuscated or minified code)
- **Import consolidation:** Merge multiple imports from the same module, use wildcard imports in context only
- **Token-efficient formatting:** Use compact brace/indent styles

**Limitation:** Lossless techniques typically achieve only 10-30% compression for code.

#### 4.1.2 Lossy Compression

**Techniques that discard information while preserving essential structure:**

- **Function body summarization:** Replace function bodies with a one-line natural language summary (the LLM can request the full body if needed)
- **Signature-only representation:** For dependency files, show only function/class signatures, not implementations
- **Skeletonization:** Preserve the control flow structure but replace implementation details with placeholders
- **Dead code elimination:** Remove code paths that are not relevant to the current task

```python
# Original (lossy compressed):
def authenticate(user, password):
    """Verify credentials against database.
    Returns User object or raises AuthError."""
    # [body summarized: DB lookup, password hashing, session creation]

def get_user_permissions(user):
    """Return list of permission strings for user."""
    # [body summarized: DB query, RBAC resolution, caching]
```

**Risk:** Lossy compression can hide bugs or side effects that the LLM needs to know about. Always provide a mechanism for the LLM to request the full code.

### 4.2 Symbolic Code Representation (AST as Context)

Instead of representing code as text, represent it as a structured AST or symbol table.

#### 4.2.1 AST-Based Contexting

Provide the AST in a compact, LLM-readable format:

```json
{
  "file": "src/models/user.py",
  "symbols": [
    {
      "type": "class",
      "name": "User",
      "bases": ["BaseModel"],
      "methods": [
        {"name": "__init__", "params": ["id: str", "email: str"], "returns": "None"},
        {"name": "authenticate", "params": ["password: str"], "returns": "bool"},
        {"name": "get_permissions", "params": [], "returns": "list[str]"}
      ],
      "attributes": ["id", "email", "password_hash"]
    }
  ],
  "imports": ["from src.database import BaseModel"]
}
```

**Advantages:**
- **Extremely compact**: A full class hierarchy can be represented in <100 tokens
- **Precise**: No ambiguity about types, parameters, return values
- **Machine-parseable**: Can be programmatically composed and decomposed

**Disadvantages:**
- LLMs are trained on code-as-text, not code-as-AST-json
- Implementation details (algorithm, edge cases) are lost
- Some LLMs may struggle to reason about AST representations

#### 4.2.2 Type-Stripped Representations

For statically-typed languages, replacing concrete types with generic annotations saves tokens:

```python
# BEFORE (verbose types):
def process_dataframe(df: pandas.DataFrame, columns: list[str],
                       aggregator: Callable[[pandas.DataFrame, str], float]
                      ) -> dict[str, float]:

# AFTER (compact types, context-dependent):
def process_dataframe(df, columns, aggregator) -> dict:
```

### 4.3 Skeleton/Signature-First Approaches

#### 4.3.1 The Signature Ladder

Present code at increasing levels of detail:

| Level | Content | Tokens per file |
|---|---|---|
| **L0: Skeleton** | File name + exported symbol names only | ~10-50 |
| **L1: Signatures** | + function/class signatures (params, return types) | ~100-500 |
| **L2: Annotated** | + docstrings or one-line summaries of bodies | ~300-2000 |
| **L3: Full body** | + complete implementations | Full file size |
| **L4: Expanded** | + all dependencies fully expanded | Very large |

The agent starts at L1 (repo map), requests specific files at L2, and drills to L3 only for files it needs to modify.

#### 4.3.2 Skeleton-Based Code Understanding

```python
# L1: File skeleton
# src/services/payment.py
#   class PaymentProcessor
#     def charge(amount, source, currency='USD')
#     def refund(transaction_id, amount=None)
#     def get_transaction(transaction_id)
#   class PaymentError(Exception)
#   def validate_card(card_number)

# L2: With signatures
# src/services/payment.py
#   class PaymentProcessor:
#     def __init__(self, api_key: str, sandbox: bool = False)
#     def charge(self, amount: Decimal, source: str, currency: str = 'USD') -> Transaction
#     def refund(self, transaction_id: str, amount: Decimal | None = None) -> Transaction
#     def get_transaction(self, transaction_id: str) -> Transaction
#   class PaymentError(Exception): pass
#   def validate_card(card_number: str) -> bool

# L3: Full implementation
#   [Complete file content]
```

### 4.4 Incremental Context Loading Based on Relevance

#### 4.4.1 Just-in-Time Dependency Resolution

```
1. Agent needs to understand function F in file A
2. Load F's full body
3. Scan F for all external symbol references
4. For each referenced symbol S:
   a. If S is defined in the repo map, note its signature
   b. If S seems critical (called with non-trivial args or in a conditional), load its full body
   c. Otherwise, keep signature only
5. Recursively apply step 3-4 for loaded bodies
```

#### 4.4.2 Context Cache with LRU Eviction

Maintain a sliding window of loaded context with intelligent eviction:

```python
class ContextCache:
    def __init__(self, max_tokens: int):
        self.cache: OrderedDict[str, Chunk] = OrderedDict()
        self.max_tokens = max_tokens
        self.current_tokens = 0

    def add(self, chunk: Chunk):
        if chunk.key in self.cache:
            self.cache.move_to_end(chunk.key)
        else:
            self.cache[chunk.key] = chunk
            self.current_tokens += len(chunk.tokens)

        while self.current_tokens > self.max_tokens:
            oldest = self.cache.popitem(last=False)
            self.current_tokens -= len(oldest.tokens)

    def get(self, key: str) -> Optional[Chunk]:
        if key in self.cache:
            self.cache.move_to_end(key)  # Mark as recently used
            return self.cache[key]
        return None
```

---

## 5. Multi-Agent Codebase Exploration

### 5.1 Divide-and-Conquer Across the Codebase

#### 5.1.1 Directory-Based Partitioning

The simplest approach: assign each agent a directory subtree of the repository.

```
Agent 1: src/models/       (data models, schemas)
Agent 2: src/services/     (business logic, APIs)
Agent 3: src/utils/        (utilities, helpers)
Agent 4: tests/            (test suite)
```

**Coordination pattern:**
1. **Master agent** distributes exploration tasks to specialized agents
2. Each agent produces a **module report**: summary of its subtree's purpose, key exports, dependencies
3. Master agent combines reports into a unified understanding
4. When cross-module interaction is needed, master agent facilitates inter-agent communication

#### 5.1.2 Concern-Based Partitioning

For more sophisticated exploration, partition by concern rather than directory:

```
Agent 1: Authentication/Authorization subsystem
Agent 2: Data persistence layer
Agent 3: API routing and middleware
Agent 4: Error handling and logging infrastructure
```

This requires pre-processing to identify concern boundaries (can use clustering on the dependency graph).

#### 5.1.3 Adaptive Partitioning

Start with coarse partitioning and split as needed:

```python
def explore_directory(agent_pool, directory, depth=0):
    if file_count(directory) < THRESHOLD or depth > MAX_DEPTH:
        return single_agent_explore(directory)

    subdirs = list_subdirectories(directory)
    results = parallel_map(
        lambda subdir: explore_directory(agent_pool, subdir, depth+1),
        subdirs
    )
    return merge_reports(results)
```

### 5.2 Agent Specialization

#### 5.2.1 Explorer Agent

**Role:** Navigate the codebase, identify key structures, produce maps and summaries.

**Key capabilities:**
- AST parsing and symbol extraction
- Dependency graph construction
- Codebase-wide search and pattern matching
- Generating module-level summaries and repo maps

**Tools:**
- `grep`, `glob` for file finding
- tree-sitter for AST analysis
- Embedding search for semantic queries

**Output:** Structured summaries, annotated repo maps, relevance rankings

#### 5.2.2 Summarizer Agent

**Role:** Produce compact, information-dense representations of code.

**Key capabilities:**
- Generate hierarchical summaries (file → module → subsystem → repo)
- Identify the "essence" of a code unit (purpose, inputs, outputs, side effects)
- Produce signature-only views and body summaries
- Maintain a **knowledge graph** of what the system knows

**Output format:**
```json
{
  "file": "src/services/auth.py",
  "purpose": "Handles user authentication via JWT tokens and OAuth providers",
  "key_exports": ["login", "logout", "refresh_token", "verify_session"],
  "dependencies": ["src/models/user.py", "src/utils/crypto.py"],
  "consumers": ["src/api/auth_routes.py", "src/middleware/auth_middleware.py"],
  "summary_tokens": 150
}
```

#### 5.2.3 Planner Agent

**Role:** Determine what needs to be explored and in what order.

**Key capabilities:**
- Parse task descriptions into exploration requirements
- Generate exploration plans (which modules to read, in what order)
- Prioritize exploration based on likely relevance
- Manage the overall exploration budget (tokens, time)

#### 5.2.4 Code Understanding Agent

**Role:** Deep understanding of specific code sections, reasoning about behavior.

**Key capabilities:**
- Trace control flow through complex functions
- Reason about state changes and side effects
- Identify edge cases and error conditions
- Compare implementations across similar modules

### 5.3 Information Aggregation Strategies

#### 5.3.1 Hierarchical Summarization

```
Leaf-level: Individual file summaries (by Explorer agents)
Module-level: Aggregated module understanding (by Summarizer agent)
Repo-level: Unified codebase understanding (by Master agent)
```

Each level combines summaries from the level below, applying **progressive compression**:
- Leaf → Module: Keep all signatures, summarize bodies, note cross-module dependencies
- Module → Repo: Keep only most-referenced signatures, purpose summaries, dependency graph

#### 5.3.2 Conflict Resolution Between Agents

When multiple agents explore overlapping code and produce inconsistent understanding:

1. **Version the understanding**: Each agent's observations are timestamped and attributed
2. **Majority voting**: If 3/4 agents agree on a file's purpose, accept it
3. **Escalation**: Conflicting observations are flagged for master agent review
4. **Source of truth**: When in doubt, re-read the actual source code

#### 5.3.3 Shared Knowledge Graph

Maintain a centralized knowledge graph that all agents can read and write:

```python
class CodebaseKnowledgeGraph:
    """
    Shared graph structure accumulating exploration results.
    """
    nodes: dict[str, Symbol]     # symbol_name → Symbol record
    edges: list[Edge]             # dependency relationships
    file_summaries: dict[str, FileSummary]
    exploration_coverage: dict[str, ExplorationStatus]
    lock: threading.Lock          # concurrent access protection

    def merge_agent_report(self, report: AgentReport):
        """Atomically merge one agent's findings into the shared graph."""
        with self.lock:
            for symbol in report.discovered_symbols:
                self.nodes.setdefault(symbol.name, symbol).merge(symbol)
            self.edges.extend(report.discovered_edges)
            self.exploration_coverage.update(report.coverage)
```

---

## 6. Synthesis: Recommended Architecture for Agent Control Center

### 6.1 Three-Layer Context Architecture

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: TASK-SPECIFIC CONTEXT (50-80K tokens)         │
│  - Full files being edited                               │
│  - Direct dependency source code                          │
│  - Relevant test files                                    │
│  - Error messages, logs, runtime output                   │
├─────────────────────────────────────────────────────────┤
│  LAYER 2: MODULE CONTEXT (10-20K tokens)                 │
│  - Signature-level view of related modules                │
│  - Docstrings and purpose summaries                       │
│  - Call graph neighborhood (1-2 hops)                     │
│  - Hybrid retrieval (BM25 + embeddings) results           │
├─────────────────────────────────────────────────────────┤
│  LAYER 1: REPO MAP (1-5K tokens)                         │
│  - Tree-sitter extracted symbol table                     │
│  - PageRank-filtered key symbols                          │
│  - File dependency graph (compact)                        │
│  - Always in context, updated incrementally               │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Exploration Pipeline

```
┌──────────┐    ┌─────────────┐    ┌──────────────┐    ┌──────────┐
│ User     │    │ Agent        │    │ Retrieval    │    │ Context  │
│ Request  │───▶│ Orchestrator │───▶│ Engine       │───▶│ Assembly │
└──────────┘    └─────────────┘    └──────────────┘    └──────────┘
                      │                    │                   │
                      ▼                    ▼                   ▼
               ┌─────────────┐    ┌──────────────┐    ┌──────────┐
               │ Task Parser │    │ BM25 + Emb   │    │ L1: Map  │
               │ & Planner   │    │ Retrieval    │    │ L2: Sigs │
               └─────────────┘    └──────────────┘    │ L3: Full │
                      │                    │          └──────────┘
                      ▼                    ▼                   │
               ┌─────────────┐    ┌──────────────┐            │
               │ Sub-agent   │    │ Graph-Rank   │◄───────────┘
               │ Dispatcher  │    │ Re-ranking   │
               └─────────────┘    └──────────────┘
```

### 6.3 Build vs. Buy Decision Matrix

| Component | Build | Rationale |
|---|---|---|
| **AST parsing / Repo map** | Build (leverage tree-sitter) | Core differentiator; must be language-aware and token-efficient |
| **BM25 index** | Build (trivial, ~100 LOC) | Well-understood algorithm; no external dependency needed |
| **Embedding search** | Buy (Voyage AI / OpenAI embeddings) + Build (vector store) | Embedding model is expensive to train; vector store is straightforward |
| **Graph ranking** | Build (NetworkX + PageRank) | Simple algorithm; must work with custom code graph |
| **Agent orchestration** | Build (custom framework) | Core system logic; need full control over context management |
| **Context caching** | Build (LRU + graph-aware eviction) | Simple data structure; graph-awareness is custom |
| **Multi-agent coordination** | Build (asyncio + message passing) | Must integrate with agent control center's existing architecture |

### 6.4 Implementation Phases

**Phase 1 - Foundation (Week 1-2):**
1. Install tree-sitter + language grammars for target languages
2. Implement AST-based symbol extraction and tagging
3. Build BM25 index over all source files
4. Construct dependency graph from import statements
5. Generate basic repo map (no ranking yet)

**Phase 2 - Retrieval (Week 3-4):**
6. Add embedding-based search (Voyage Code 2 or OpenAI embeddings)
7. Implement hybrid BM25 + embedding retrieval
8. Add graph-aware re-ranking
9. Build context cache with LRU eviction

**Phase 3 - Intelligence (Week 5-6):**
10. Implement PageRank-based repo map optimization
11. Add progressive context loading (signature ladder)
12. Build task-specific relevance scoring
13. Implement iterative refinement (retrieve → analyze → re-retrieve)

**Phase 4 - Multi-agent (Week 7-8):**
14. Implement agent specialization (Explorer, Summarizer)
15. Build shared knowledge graph
16. Add hierarchical summarization pipeline
17. Implement parallel exploration with result aggregation

### 6.5 Key Design Principles

1. **The LLM is the best relevance judge.** Provide it with tools to explore, not a static context dump.
2. **Start compact, expand on demand.** Always send the repo map first; let the agent request more.
3. **Cache aggressively.** Re-parsing and re-embedding is expensive; invalidate only changed files.
4. **Structure over text.** Use AST, graphs, and structured summaries when possible.
5. **BM25 first, embeddings second.** BM25 is simpler and often sufficient; embed when you need semantic understanding.
6. **Measure context efficiency.** Track tokens-per-task and relevance-precision to optimize over time.

---

## 7. Bibliography

### Papers

1. Zhang, F. et al. (2023). "RepoCoder: Repository-Level Code Completion Through Iterative Retrieval and Generation." EMNLP 2023. arXiv:2303.12570.

2. Jimenez, C.E. et al. (2024). "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?" ICLR 2024 (Oral). arXiv:2310.06770.

3. Li, R. et al. (2023). "StarCoder: may the source be with you!" arXiv:2305.06161.

4. Rozière, B. et al. (2024). "Code Llama: Open Foundation Models for Code." arXiv:2308.12950.

5. Shrivastava, D. et al. (2024). "RepoFusion: Training Code Models to Understand Your Repository." FSE 2024. arXiv:2406.05502.

6. Bairi, R. et al. (2023). "CodePlan: Repository-level Coding using LLMs and Planning." arXiv:2309.12499.

7. Wei, J. et al. (2022). "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models." NeurIPS 2022. arXiv:2201.11903.

### Tools and Implementations

8. Aider. "Building a Better Repository Map with Tree Sitter." https://aider.chat/2023/10/22/repomap.html

9. Aider. "Repository Map Documentation." https://aider.chat/docs/repomap.html

10. SWE-agent. "Agent-Computer Interface (ACI) Design." https://github.com/SWE-agent/SWE-agent

11. Tree-sitter. "Incremental Parsing Library." https://tree-sitter.github.io/tree-sitter/

12. Voyage AI. "Voyage Code Embeddings." https://www.voyageai.com/

13. Microsoft. "CodeBERT: A Pre-Trained Model for Programming and Natural Languages." https://github.com/microsoft/CodeBERT

### Benchmarks and Datasets

14. SWE-bench. "Repository-level Coding Benchmark." https://www.swebench.com

15. RepoEval. "Repository-Level Code Completion Benchmark." Part of RepoCoder. https://github.com/microsoft/CodeT/tree/main/RepoCoder

---

*Document compiled for the Agent Control Center project. Last updated: June 2026.*
