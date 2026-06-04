# Memory Layer — User Testing Guide

*Walk through these steps as a normal user. Each step tells you what to do and what you should see.*

---

## 🧪 Test 1: Session Persistence (Checkpoint/Resume)

1. **Open ACC**, launch an agent (e.g., OpenCode)
2. Give it a task: _"set up a basic Express server with a health endpoint"_
3. Let it run for 30-60 seconds, let it write some code
4. **Close the agent session** (kill the PTY)
5. **Reopen the same agent** in the same project
6. **Expected:** The agent's first message includes "Prior knowledge:" with a summary of what it was doing before. You should see something like: _"I see you were working on an Express server setup. Continuing from previous session."_
7. **If this doesn't happen:** The checkpoint save/load isn't wired. Check terminal output for "session checkpoint" errors.

---

## 🧪 Test 2: Context Compression

1. Launch an agent and give it a long, multi-step task: _"read all files in src/, summarize each, then write a report"_
2. Watch the agent panel header — you should see a **status dot** (green → yellow → orange → red) as context fills
3. When the dot turns **orange**, compression is imminent
4. **Expected:** The agent continues working seamlessly. You should NOT see any error about context limits. The terminal output should have a brief pause during compression.
5. After compression, check the **Memory Panel** (Knowledge page, "Memory" tab) — you should see extracted facts from the compressed middle messages
6. **Failure mode:** If you see context limit errors from the agent, the compressor isn't firing. If you see repeated compression loops (orange → red → orange → red), the anti-thrashing lock may be failing.

---

## 🧪 Test 3: Hybrid Memory Retrieval

1. After running a few sessions with different agents, go to the **Knowledge page → Memory tab**
2. The page shows a **fact timeline** — chronologically listed extracted facts with type badges (decision, constraint, pattern, error, entity)
3. Type a search query in the search bar — try something specific: _"Express port"_ or _"auth middleware"_
4. **Expected:** Search returns both:
   - Exact keyword matches (BM25) — "express" matches "Express server"
   - Semantic matches (vector) — "web framework" also matches "Express server"
5. Use filter chips to narrow by type, agent, or confidence level
6. Click on a fact card — it should expand to show full content, confidence bar, source session link, and entity tags

---

## 🧪 Test 4: Multi-Agent Memory Isolation

1. Launch Agent A (e.g., OpenCode) and give it a task: _"configure dotenv in package.json"_
2. Launch Agent B (e.g., Claude Code) — do NOT tell it about dotenv
3. Give Agent B a task: _"read the database config and explain what's missing"_
4. **Expected:** Agent B does NOT know about the dotenv configuration Agent A added (memory is scoped per-agent by default)
5. Now go to **Memory Panel** and check the org-level filter (shared scope)
6. **Expected:** Both agents' discoveries appear under the org scope, attributed to their respective agents

---

## 🧪 Test 5: Cross-Agent Fact Sharing (Phase 10c)

1. Launch two agents simultaneously in the same project
2. Give Agent A a task: _"find the database connection string pattern"_
3. After Agent A makes a discovery, immediately check Agent B's context
4. **Expected:** Within ~5 seconds, Agent B's session should show a "Recent discovery" banner mentioning what Agent A found
5. If this doesn't work, check that both agents share the same `org_id` — cross-agent surfacing requires scoping
