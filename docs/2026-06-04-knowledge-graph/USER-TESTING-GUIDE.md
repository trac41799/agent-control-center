# Knowledge Graph v2 — User Testing Guide

---

## 🧪 Test 1: Knowledge Items with Embeddings

1. Complete a feature wave or several agent sessions
2. Go to **Knowledge page**
3. **Expected:** Knowledge items now show **confidence bars** that fill based on a multi-factor score (source credibility + corroboration count + recency + agent tier)
4. Click a knowledge item → the **detail view** shows:
   - Full markdown content
   - Source sessions (clickable links)
   - Relation list: _"extends: X", "contradicts: Y", "confirmed_by: Session Z"_
   - Provenance: which source type contributed (manual / compounder / agent_claim)
5. **Failure mode:** If items have no relations, no provenance, or show "confidence: 0.5" for everything, the new confidence model isn't active.

---

## 🧪 Test 2: GraphRAG Local Search

1. In the Knowledge page, type a specific question: _"why does the auth module keep failing?"_
2. **Expected:** The search returns a **subgraph** — a set of related knowledge items expanded from seed matches. You should see:
   - The matching item (e.g., "JWT token expires")
   - Related items 1-2 hops away (e.g., "Auth refresh logic", "Token storage convention")
   - Paths showing how they connect (e.g., "JWT token expires ← caused_by ← missing refresh")
3. Each result shows relevance score, confidence, and graph distance from seed
4. **Failure mode:** If search returns individual items with no relationships, the BFS subgraph expansion isn't firing.

---

## 🧪 Test 3: GraphRAG Global Search

1. Type a high-level question: _"what's the overall health of this project?"_ or _"what patterns keep recurring?"_
2. **Expected:** Instead of individual items, you get a **synthesized answer** generated from community summaries. It should be 2-3 paragraphs with key themes, recurring patterns, and anti-patterns.
3. Below the answer, see which **communities** were matched (community title + summary)
4. Click a community name → drill into its member items
5. **Failure mode:** If you only get individual items or an empty result, the community summaries weren't generated or the global search query isn't matching.

---

## 🧪 Test 4: KG Visualization (Cytoscape.js)

1. Click the new **"KG Explorer"** tab in the Knowledge page
2. **Expected:** An interactive force-directed graph with:
   - **Nodes** color-coded by type (decision=blue, pattern=green, antipattern=red, error=orange)
   - **Node size** proportional to confidence
   - **Edges** labeled with relation type
   - Community-colored node clusters (same hue = same community)
3. Interact:
   - Click a node → its **neighbors expand** (lazy loading)
   - Drag a node → physics layout adjusts
   - **Scroll** to zoom, **drag background** to pan
4. Hover a node → tooltip with title, type, confidence
5. **Failure mode:** Graph doesn't render, or renders as a blank canvas. Check console for Cytoscape.js errors.

---

## 🧪 Test 5: Human-in-the-Loop Curation

1. In the KG Explorer:
   - **Double-click a node** → inline editor opens, you can edit title and content
   - **Drag from one node to another** → relation creation dialog: select type (extends, contradicts, etc.)
   - **Right-click a node** → context menu: "View details", "Merge with...", "Delete", "Flag"
2. Go to the **Contradictions panel** (tab next to KG Explorer)
3. **Expected:** A list of unresolved contradictions with both conflicting items shown side-by-side
4. Click "Resolve" → options: "A supersedes B", "B supersedes A", "Both valid in context", "Neither"
5. After resolving, the contradiction moves to "Resolved" and the `contradiction.resolution` field updates
6. **Failure mode:** Edits don't persist after refresh, or contradiction resolution doesn't update the graph.

---

## 🧪 Test 6: Code ↔ Knowledge Bridge

1. Open the **Code Bridge** tab
2. Enter a file path: `src/auth.ts`
3. **Expected:** A panel showing:
   ```
   Patterns applying to src/auth.ts:
   - "JWT token refresh" (pattern, confidence: 0.87)
     → applies_to: src/auth.ts::refresh_token (line 120-145)
   - "Direct password comparison" (antipattern, confidence: 0.72)
     → applies_to: src/auth.ts::login (line 45-67)
   - "Rate limit login attempts" (convention, confidence: 0.64)
     → suggested_for: src/auth.ts::login
   ```
4. Click any knowledge item link → should navigate to the item in the Knowledge tab
5. **Failure mode:** "No knowledge items found for this file" even though you know patterns exist. The code↔knowledge bridge table may be empty.

---

## 🧪 Test 7: Git Co-Change Warnings

1. Start modifying a file in a project with git history
2. **Expected:** A toast notification or in-panel warning:
   _"src/services/auth.ts co-changes with src/models/user.ts (Jaccard: 0.42). Did you need to update both?"_
3. This warning should appear when the Jaccard score > 0.3
4. **Failure mode:** No warning appears even for files that clearly change together in git history. The git mining job may not have run, or the cochange table is empty.

---

## 🧪 Test 8: Community Detection

1. Open the **Communities** panel
2. **Expected:** A list of detected communities with:
   - Community title and summary (LLM-generated)
   - Number of member items
   - Confidence level
   - Hierarchical levels (local → mid → global)
3. Click a community → drill into member items
4. **Expected:** Members should be topically related — they wouldn't be in the same community by accident
5. **Failure mode:** All items are in one community, or communities are nonsensical. The Leiden algorithm parameters may need tuning.
