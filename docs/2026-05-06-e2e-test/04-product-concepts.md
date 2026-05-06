# 04 — Product Concepts for SDLC Walkthrough

Three concepts were generated for the E2E test: two from Edge8's internal Lark context and one from market research.

---

## Concept A: PromptVault (Market-Researched, Net-New)

### Source
Market research — no existing tool addresses this gap.

### One-Line Pitch
Collaborative prompt engineering platform for AI coding agents. Teams create, version-control, A/B test, and share effective prompts for specific coding tasks.

### Problem
Every team using AI coding agents (Claude Code, OpenCode, Cursor, etc.) struggles with prompt quality. The difference between a $200 agent session and a $20 session is often just the prompt. Yet no dedicated tool exists for:
- Version-controlling prompts
- A/B testing prompt effectiveness
- Sharing proven prompts across teams
- Measuring prompt ROI against agent outcomes

### Market Validation
- AI coding agent adoption exploded in 2025-2026 (Claude Code, OpenCode, Cursor, Cline, Codex)
- "Prompt engineer" is a growing job title
- Teams report 10x cost variance between good and bad prompts
- GitHub repos for prompt collections get thousands of stars
- Enterprise teams building internal prompt libraries with no tooling

### Core Features
1. **Prompt Library**: Create, edit, tag, and organize prompts by task type (refactor, test, debug, implement, document)
2. **Version Control**: Git-style version history with diffs between prompt versions
3. **A/B Testing**: Run the same task with two prompts, compare agent outcomes (success rate, tokens used, time)
4. **Effectiveness Scoring**: Auto-score prompts based on agent outcome data (success/fail/revised rate)
5. **Team Sharing**: Share prompt collections as packages, import from GitHub gists
6. **Agent Integration**: One-click export to CLAUDE.md, AGENTS.md, .aider.conf.yml, etc.
7. **Template Variables**: Parameterized prompts with project-specific variable injection
8. **Analytics Dashboard**: Per-prompt, per-task-type, per-agent success metrics

### Target Users
- AI-forward development teams (primary — same as ACC Persona 1)
- AI consulting teams managing multiple client projects
- Solo developers wanting to systematize their prompt workflow

### Business Model
Freemium — free for individual use (local-only), team plan for shared libraries and analytics.

---

## Concept B: Client Sprint Reporter (Edge8 Internal, Lark-Sourced)

### Source
Edge8's daily operations — requirements come from Lark, agents do the work, reports go back manually.

### One-Line Pitch
Automated sprint report compiler that scans all agent sessions, generates structured Lark Doc reports, and posts to client channels.

### Problem
Edge8 consultants spend 1-2 hours per client per sprint manually compiling:
- What was built (scanning git history, session logs)
- Agent performance stats (which agent did what, success rates)
- Bug fixes and test results
- Next sprint priorities

This is a bottleneck in the agentic loop — the agent does the work, but the human does the reporting.

### Core Features
1. **Session Aggregator**: Pulls all agent sessions from a project's SQLite event log
2. **Sprint Report Generator**: Compiles structured report with sections: Executive Summary, Deliverables, Agent Performance, Bug Fixes, Test Results, Next Sprint
3. **Lark Doc Publisher**: Generates formatted Lark Doc and posts to configured client channel
4. **Sprint Cadence Config**: Weekly/biweekly sprint boundaries, auto-trigger on sprint end
5. **Client Approval Gate**: Draft → human review → approved → published workflow

---

## Concept C: Agent On-Call Rotator (Edge8 Internal, Lark-Sourced)

### Source
Edge8 manages multiple client Lark channels. When clients message, a human must read, interpret, and relay to the right AI agent.

### One-Line Pitch
AI agent shift management system — routes incoming client Lark messages to the on-call AI agent, auto-classifies urgency, proposes responses, and awaits human approval.

### Problem
Client Lark channels are monitored manually. When a client asks "can you add export to CSV?", someone must:
1. Read the message
2. Determine which project/agent this belongs to
3. Open ACC and spawn the right agent
4. Type the request into the terminal
5. Wait for the agent to complete
6. Copy the result back to Lark

This is the exact relay ACC was designed to eliminate (Problem 5).

### Core Features
1. **On-Call Schedule**: Assign AI agents to time-based shifts per client project
2. **Message Classifier**: Auto-classify incoming Lark messages (bug report, feature request, question, urgent)
3. **Context Router**: Match message to correct project, agent, and model based on project profile
4. **Response Drafter**: Generate proposed response/action plan for human approval
5. **Approval Gate**: Human approves → ACC spawns agent → result posted back to Lark
6. **Escalation Rules**: Urgent messages bypass approval gate with configurable thresholds
