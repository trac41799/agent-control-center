# Codebase Exploration — User Testing Guide

---

## 🧪 Test 1: Repo Map on Agent Spawn

1. Open a medium-to-large project in ACC (500+ files)
2. Launch any agent
3. **Expected:** The agent's initial context includes a **repo map** — a compact listing of files with key function/class signatures. It should look like:
   ```
   src/models/user.py:
   │class User(BaseModel):
   │    id: str
   │    email: str
   │    def authenticate(password: str) -> bool
   ```
4. The repo map should be **~2,000 tokens** — not the entire codebase
5. **Failure mode:** If the agent starts with no code structure info or if it starts reading files one-by-one, the repo map injection failed.

---

## 🧪 Test 2: Hybrid Code Search

1. In the **Knowledge page → Codebase tab**, type a semantic query: _"where do we handle user logins"_
2. **Expected:** Results show chunks from files like `auth.ts`, `login.tsx`, `user-service.js` — ranked by relevance
3. Now search an exact function name: `getAuthenticate`
4. **Expected:** Exact match should rank #1 (BM25 catches exact identifiers that vector might miss)
5. Each result shows: file path, symbol name, line range, relevance score, and a snippet of the code
6. **Failure mode:** If exact name searches fail or rank below irrelevant results, the BM25+vector fusion needs tuning.

---

## 🧪 Test 3: Signature Ladder (Progressive Detail)

1. In the Codebase tab, browse a file
2. **Expected:** You see the file at **L1 (signatures)** — just function/class names with signatures — not the full implementation
3. Click a function name → it expands to **L2 (annotated)** — adds docstrings and one-line body summaries
4. Click again → **L3 (full body)** — shows the complete implementation
5. **Expected:** The agent context only loads L1 by default. L2 and L3 are loaded only on explicit request, saving tokens.
6. **Failure mode:** If every file loads at L3 by default, the signature ladder isn't working. Context will waste tokens.

---

## 🧪 Test 4: Exploration Coverage

1. Open the **Codebase tab**
2. Look for a **coverage stats** section — should show something like: _"327 files mapped, 143 summarized, 38 analyzed, 92 unexplored"_
3. **Expected:** Files are color-coded by coverage level (unexplored=muted, mapped=blue, summarized=green, analyzed=bright)
4. Click on an "unexplored" directory — it should show a gap warning
5. **Failure mode:** If all files show the same status or coverage never changes, the coverage tracking isn't connected to agent exploration activities.

---

## 🧪 Test 5: Just-in-Time Dependency Resolution

1. Give an agent a task involving a specific file: _"refactor the calculateTotal function in src/billing.ts"_
2. Watch the agent's terminal output
3. **Expected:** The agent reads `src/billing.ts` (L3), then automatically loads signatures of its imported dependencies (L1), but does NOT load full bodies of those dependencies unless needed
4. The agent should not waste tokens loading `lodash` internals or unrelated utility files
5. **Failure mode:** If the agent loads every import at full depth, the dependency graph expansion is too aggressive.
