# SourceForge (Agent Control Center) - UI/UX Flow Test Plan

**Version:** 1.0  
**Date:** 2026-01-14  
**Scope:** 100% use case and user story coverage  
**Perspective:** Developer Experience (DX)  
**Standard:** Production-level quality

---

## Executive Summary

This test plan provides comprehensive coverage of SourceForge's UI/UX flows, business logic, and state management. The application orchestrates 9 AI coding agents with wave-based execution, knowledge compounder, and multi-integration support.

**Test Coverage Areas:**
- 15 Pages (Runner, Orchestrate, Knowledge, Settings, Integrations, Assets, Playbooks, CostAggregation, Replay, Scheduler, Outcomes, Handoffs, Messages, Route, Placeholder)
- 17 Zustand Stores (state management)
- Core Components (Sidebar, Terminal, AgentGrid, etc.)
- Business Logic (wave orchestration, knowledge extraction, budget tracking)
- Integration Flows (Supabase, GitHub, Chat platforms)

---

## 1. Agent Runner Page (`/runner`)

### User Story 1.1: Spawn and Manage Agent Sessions
**As a** developer  
**I want to** spawn multiple AI agents in parallel  
**So that** I can work on complex tasks simultaneously

**Acceptance Criteria:**
- AC1.1.1: User can select from 9 supported agents (Claude, OpenCode, Aider, Goose, Cline, Cursor, Gemini, Qwen, Codex)
- AC1.1.2: Each agent spawns in isolated PTY session with unique session ID
- AC1.1.3: Agent status updates in real-time (idle, thinking, writing, running tests, done, failed, stalled)
- AC1.1.4: Output buffer caps at 1000 lines per agent (FIFO eviction)
- AC1.1.5: Failed spawn removes agent from state and shows error
- AC1.1.6: User can kill agent and clean up session
- AC1.1.7: User can write input to active agent session

**Test Scenarios:**
```gherkin
Scenario: Spawn Claude Code agent
  Given user is on Runner page
  When user clicks "Add Agent" and selects "Claude Code"
  Then agent appears in grid with status "idle"
  And session ID is generated (UUID format)
  And PTY session is created via Tauri invoke

Scenario: Agent output buffer overflow
  Given agent has 1000 lines in output buffer
  When new output line arrives
  Then oldest line is removed
  And buffer remains at 1000 lines
  And newest line is at end

Scenario: Agent spawn failure recovery
  Given agent binary is not installed
  When user attempts to spawn agent
  Then AgentNotInstalledError is thrown
  And agent is removed from state
  And install hint is displayed

Scenario: Kill active agent
  Given agent is running with status "thinking"
  When user clicks kill button
  Then Tauri kill_agent is invoked
  And agent is removed from state
  And PTY session is terminated
```

### User Story 1.2: Project Context Switching
**As a** developer  
**I want to** switch between projects  
**So that** agents work in correct directory context

**Acceptance Criteria:**
- AC1.2.1: Project selector shows recent projects (max 10)
- AC1.2.2: Switching project detects tech stack automatically
- AC1.2.3: Stack detection identifies: language, framework, package manager, test framework
- AC1.2.4: Failed detection returns fallback profile with empty arrays
- AC1.2.5: Recent paths persist across sessions

**Test Scenarios:**
```gherkin
Scenario: Switch to React project
  Given user selects "/projects/my-react-app"
  When detect_stack is invoked
  Then profile returns stack: ["typescript", "react", "vite"]
  And package_manager: "npm"
  And test_framework: "vitest"

Scenario: Project detection failure
  Given path does not exist or has no config files
  When detect_stack is invoked
  Then fallback profile is returned
  And stack array is empty
  And name is extracted from path
```

### User Story 1.3: Control Mode (Multi-Thread Orchestration)
**As a** developer  
**I want to** promote agents to control sessions  
**So that** I can manage file ownership conflicts across threads

**Acceptance Criteria:**
- AC1.3.1: Control mode toggle enables per-panel control sessions
- AC1.3.2: User can promote agent panel to control session
- AC1.3.3: Control session states: promoted → active → paused → completed
- AC1.3.4: File ownership conflicts are detected and displayed
- AC1.3.5: Deferred notice shows when control action is pending
- AC1.3.6: Refresh button reloads control sessions and conflicts

**Test Scenarios:**
```gherkin
Scenario: Promote agent to control session
  Given control mode is active
  When user clicks "Promote" on agent panel
  Then control session is created with state "promoted"
  And docs_dir is assigned
  And Promote button is replaced with Start button

Scenario: File ownership conflict detection
  Given two agents claim same file
  When loadConflicts is invoked
  Then conflict report is displayed
  And shows file path, claimant, and requester
```

### User Story 1.4: Preset Command Execution
**As a** developer  
**I want to** save and execute preset commands  
**So that** I can quickly run common agent tasks

**Acceptance Criteria:**
- AC1.4.1: Presets are loaded from store
- AC1.4.2: User can execute preset on first active agent
- AC1.4.3: "+ New" button is visible for creating presets
- AC1.4.4: Presets display label and tags

**Test Scenarios:**
```gherkin
Scenario: Execute preset command
  Given presets are loaded
  When user clicks preset button
  Then executePreset is called with preset ID
  And command is sent to first active agent
```

---

## 2. Wave Orchestrator Page (`/orchestrate`)

### User Story 2.1: Create and Manage Wave Plans
**As a** developer  
**I want to** create dependency-aware wave plans  
**So that** agents execute in correct order with proper handoffs

**Acceptance Criteria:**
- AC2.1.1: User can create wave plan with slug and project ID
- AC2.1.2: Plan appears in plan list with selection badge
- AC2.1.3: User can add agents to specific waves
- AC2.1.4: Agents can specify dependencies (depends_on)
- AC2.1.5: Wave groups display with collapsible UI
- AC2.1.6: Each wave shows progress (done/total, failed, running)
- AC2.1.7: Empty state shows when no plans exist

**Test Scenarios:**
```gherkin
Scenario: Create wave plan
  Given user is on Orchestrate page
  When user enters slug "add-dark-mode" and project "acc-main"
  And clicks "Create Plan"
  Then plan is created via create_wave_plan_cmd
  And plan appears in plan list
  And plan is auto-selected

Scenario: Add agent to wave with dependency
  Given plan is selected
  When user adds agent "claude" with task "Setup UI" in wave 1
  And adds agent "opencode" with task "Write tests" in wave 2
  And sets depends_on to "claude"
  Then agents are grouped by wave number
  And wave 2 shows dependency indicator

Scenario: Wave group collapse/expand
  Given wave group has 3 agents
  When user clicks wave header
  Then agent cards are hidden
  And chevron icon changes direction
```

### User Story 2.2: Agent Status Management
**As a** developer  
**I want to** track and update agent execution status  
**So that** I can monitor wave progress

**Acceptance Criteria:**
- AC2.2.1: Agent card shows status badge (queued, running, done, failed, blocked)
- AC2.2.2: Status colors match design system
- AC2.2.3: Queued agents show "Start" button
- AC2.2.4: Running agents show "Done" and "Fail" buttons
- AC2.2.5: Failed agents show "Retry" button (resets to queued)
- AC2.2.6: Done agents show checkmark icon
- AC2.2.7: Retry count badge shows when retry_count > 0

**Test Scenarios:**
```gherkin
Scenario: Start queued agent
  Given agent status is "queued"
  When user clicks "Start" button
  Then updatePlanAgentStatus is called with "running"
  And button changes to "Done" and "Fail"

Scenario: Mark agent as done
  Given agent status is "running"
  When user clicks "Done" button
  Then status updates to "done"
  And checkmark icon appears
  And wave summary updates

Scenario: Retry failed agent
  Given agent status is "failed"
  When user clicks "Retry" button
  Then status resets to "queued"
  And retry_count increments
  And retry badge appears
```

### User Story 2.3: Correction Loop Management
**As a** developer  
**I want to** view and manage correction documents  
**So that** I can track agent retries and fixes

**Acceptance Criteria:**
- AC2.3.1: Corrections section shows when corrections exist
- AC2.3.2: Each correction shows: agent_ref, retry_number, bug_desc, root_cause, fix_required
- AC2.3.3: Resolved corrections show "Resolved" badge and reduced opacity
- AC2.3.4: Unresolved corrections have red border
- AC2.3.5: Corrections are loaded when plan is selected

**Test Scenarios:**
```gherkin
Scenario: Display unresolved correction
  Given correction exists with resolved=false
  When corrections are loaded
  Then correction card shows red border
  And shows retry number badge
  And displays bug description and fix required

Scenario: Display resolved correction
  Given correction exists with resolved=true
  When corrections are loaded
  Then "Resolved" badge appears
  And card has reduced opacity
```

### User Story 2.4: Tab Navigation (Plan/Handoffs/Messages)
**As a** developer  
**I want to** navigate between orchestration views  
**So that** I can access handoffs and messages

**Acceptance Criteria:**
- AC2.4.1: Three tabs: Wave Plan, Handoffs, Messages
- AC2.4.2: Active tab has indigo bottom border
- AC2.4.3: Tab changes update URL path
- AC2.4.4: Handoffs tab shows HandoffPanel component
- AC2.4.5: Messages tab shows MessagePanel component

**Test Scenarios:**
```gherkin
Scenario: Navigate to Handoffs tab
  Given user is on Wave Plan tab
  When user clicks "Handoffs" tab
  Then URL changes to /orchestrate/handoffs
  And HandoffPanel component renders
  And tab has active styling

Scenario: Navigate to Messages tab
  Given user is on Wave Plan tab
  When user clicks "Messages" tab
  Then URL changes to /orchestrate/messages
  And MessagePanel component renders
```

---

## 3. Knowledge Compounder Page (`/knowledge`)

### User Story 3.1: Browse and Filter Knowledge Items
**As a** developer  
**I want to** browse extracted knowledge items  
**So that** I can review patterns and decisions

**Acceptance Criteria:**
- AC3.1.1: Items load on mount via loadItems()
- AC3.1.2: Stats load on mount via loadStats()
- AC3.1.3: Search input filters by title and content (debounced 250ms)
- AC3.1.4: Category filter filters by type (context, pattern, antipattern, convention, tooling, insight, fact, handoff, correction)
- AC3.1.5: Stack filter filters by stack_tags
- AC3.1.6: Agent filter filters by agent_tags
- AC3.1.7: Status filter filters by status (confirmed, pending, stale, revoked, active)
- AC3.1.8: Confidence slider filters by minimum confidence (0-100%)
- AC3.1.9: Empty state shows when no items match filters
- AC3.1.10: Items display with type badge, confidence, and content preview

**Test Scenarios:**
```gherkin
Scenario: Search knowledge items
  Given 10 knowledge items exist
  When user types "react" in search
  Then items are filtered by title/content match
  And filtering is debounced by 250ms

Scenario: Filter by category
  Given items of types: pattern, antipattern, convention
  When user selects "pattern" from category dropdown
  Then only pattern items are shown
  And count updates

Scenario: Filter by confidence threshold
  Given items with confidence: 0.3, 0.6, 0.9
  When user sets confidence slider to 50%
  Then only items with confidence >= 0.5 are shown
```

### User Story 3.2: Add and Delete Knowledge Items
**As a** developer  
**I want to** manually add and remove knowledge items  
**So that** I can curate the knowledge base

**Acceptance Criteria:**
- AC3.2.1: "Add Item" button opens dialog
- AC3.2.2: Dialog has fields: text, category, stack tags
- AC3.2.3: Submit calls addKnowledgeItem
- AC3.2.4: Success notification shows "Knowledge item added"
- AC3.2.5: Error notification shows "Add failed: {error}"
- AC3.2.6: Delete button on each item calls deleteItem
- AC3.2.7: Success notification shows "Item removed"
- AC3.2.8: Stats reload after add/delete

**Test Scenarios:**
```gherkin
Scenario: Add knowledge item
  Given user clicks "Add Item" button
  When user enters text "Use React.memo for expensive components"
  And selects category "pattern"
  And enters stack tags "react,performance"
  And clicks submit
  Then addKnowledgeItem is called
  And notification shows success message
  And dialog closes
  And stats reload

Scenario: Delete knowledge item
  Given knowledge item exists
  When user clicks delete button
  Then deleteItem is called with item ID
  And notification shows "Item removed"
  And stats reload
```

### User Story 3.3: Manage Knowledge Relations
**As a** developer  
**I want to** create relations between knowledge items  
**So that** I can build a knowledge graph

**Acceptance Criteria:**
- AC3.3.1: "Open Relations" button on each item opens dialog
- AC3.3.2: Dialog shows existing relations for item
- AC3.3.3: User can select target item and relation type
- AC3.3.4: Relation types: extends, confirms, contradicts
- AC3.3.5: Add relation calls addRelation
- AC3.3.6: Success notification shows "Relation added"

**Test Scenarios:**
```gherkin
Scenario: Create extends relation
  Given two knowledge items exist
  When user opens relations dialog for item A
  And selects item B as target
  And selects "extends" relation type
  And clicks add
  Then addRelation is called with (A, B, "extends")
  And notification shows success
```

### User Story 3.4: Run Knowledge Compounder
**As a** developer  
**I want to** extract knowledge from session transcripts  
**So that** patterns are automatically discovered

**Acceptance Criteria:**
- AC3.4.1: "Run Compounder" button opens dialog
- AC3.4.2: Dialog allows session ID selection
- AC3.4.3: Compounder runs asynchronously
- AC3.4.4: Button shows "Compounding..." while running
- AC3.4.5: Success notification shows item count
- AC3.4.6: Empty result shows "no actionable patterns"
- AC3.4.7: Error notification shows compounder error
- AC3.4.8: Compounder status shows health, total items, total runs

**Test Scenarios:**
```gherkin
Scenario: Run compounder successfully
  Given compounder dialog is open
  When user selects session ID and clicks run
  Then runCompounder is called
  And button shows "Compounding..."
  And notification shows "Compounder produced X item(s)"
  And stats reload

Scenario: Compounder finds no patterns
  Given compounder runs on session with no patterns
  When compounder completes
  Then notification shows "no actionable patterns"
  And dialog closes
```

### User Story 3.5: View Knowledge Statistics
**As a** developer  
**I want to** see knowledge base statistics  
**So that** I can understand knowledge growth

**Acceptance Criteria:**
- AC3.5.1: Stats tab shows 4 cards: Total Items, Avg Confidence, Active Items, Top Confirmed
- AC3.5.2: Avg Confidence color: green (>=0.7), yellow (>=0.4), red (<0.4)
- AC3.5.3: "By Type" section shows bar chart of item counts per type
- AC3.5.4: "By Stack Tag" section shows badges with counts
- AC3.5.5: Compounder timeline shows last run, total items, sessions processed
- AC3.5.6: Flywheel metrics show: sessions processed, knowledge items created, avg confidence, contradictions

**Test Scenarios:**
```gherkin
Scenario: Display knowledge statistics
  Given 50 knowledge items exist
  When user navigates to Stats tab
  Then Total Items shows 50
  And Avg Confidence shows calculated average
  And Active Items shows count of active/confirmed items
  And Top Confirmed shows item with highest confirmation_count
```

### User Story 3.6: Preflight Anti-Pattern Warnings
**As a** developer  
**I want to** see anti-pattern warnings for my stack  
**So that** I can avoid common mistakes

**Acceptance Criteria:**
- AC3.6.1: Preflight tab shows stack input field
- AC3.6.2: User can enter stack tags (e.g., "react,rust,tauri")
- AC3.6.3: "Load" button calls loadPreflight with stack
- AC3.6.4: Warnings display with description and severity
- AC3.6.5: Empty state shows when no warnings exist
- AC3.6.6: Preflight tab badge shows warning count

**Test Scenarios:**
```gherkin
Scenario: Load preflight warnings
  Given user enters stack "react,typescript"
  When user clicks "Load"
  Then loadPreflight is called
  And warnings are displayed
  And tab badge shows count
```

### User Story 3.7: Codebase Exploration
**As a** developer  
**I want to** explore codebase structure and coverage  
**So that** I can understand project architecture

**Acceptance Criteria:**
- AC3.7.1: Codebase tab shows "Build Repo Map" button
- AC3.7.2: "Coverage" button shows coverage statistics
- AC3.7.3: Search input filters codebase (min 3 chars)
- AC3.7.4: Repo map shows files with symbols (functions, classes, interfaces)
- AC3.7.5: Symbol types have different colors (function=yellow, class=purple, interface=blue)
- AC3.7.6: Coverage shows: total files, mapped, summarized, analyzed, unexplored, coverage %
- AC3.7.7: Search results show file path, symbol, relevance score, content preview

**Test Scenarios:**
```gherkin
Scenario: Build repo map
  Given user is on Codebase tab
  When user clicks "Build Repo Map"
  Then buildRepoMap is called with project ID and path
  And repo map displays files and symbols
  And loading state shows "Indexing..."

Scenario: Search codebase
  Given repo map is built
  When user types "useEffect" in search
  Then searchCodebase is called
  And results show matching chunks
  And relevance scores are displayed
```

### User Story 3.8: Knowledge Graph Explorer
**As a** developer  
**I want to** visualize knowledge relationships  
**So that** I can understand knowledge connections

**Acceptance Criteria:**
- AC3.8.1: KG Explorer tab shows Cytoscape graph
- AC3.8.2: "Load Top 20" button loads subgraph
- AC3.8.3: User can enter comma-separated item IDs
- AC3.8.4: Nodes are colored by type (decision=blue, pattern=green, antipattern=red, error=orange, convention=purple)
- AC3.8.5: Edges show relation labels
- AC3.8.6: Bagua trigram filter toggles edge visibility
- AC3.8.7: Edge tooltips show trigram, hexagram, wuxing cycle, confidence
- AC3.8.8: Legend shows trigram symbols and meanings
- AC3.8.9: Node/edge counts display

**Test Scenarios:**
```gherkin
Scenario: Load knowledge graph
  Given knowledge items exist
  When user clicks "Load Top 20"
  Then kgGetSubgraph is called with item IDs
  And Cytoscape graph renders
  And nodes and edges are displayed

Scenario: Filter by trigram
  Given graph is loaded with edges
  When user clicks trigram filter button
  Then edges with that trigram are hidden
  And button shows "hidden" state
```

### User Story 3.9: Contradictions and Co-change Analysis
**As a** developer  
**I want to** identify knowledge contradictions  
**So that** I can resolve conflicting information

**Acceptance Criteria:**
- AC3.9.1: Contradictions sub-tab shows contradiction list
- AC3.9.2: Each contradiction shows: item_a, item_b, conflict_type, description, resolution
- AC3.9.3: Co-change sub-tab shows file co-change warnings
- AC3.9.4: Warnings show: file_a, file_b, jaccard_score, cochange_count

**Test Scenarios:**
```gherkin
Scenario: View contradictions
  Given contradictions exist
  When user navigates to Contradictions sub-tab
  Then contradiction cards are displayed
  And resolution status is shown
```

### User Story 3.10: Memory Panel Integration
**As a** developer  
**I want to** access memory facts from knowledge page  
**So that** I can view agent-learned facts

**Acceptance Criteria:**
- AC3.10.1: Memory tab shows MemoryPanel component
- AC3.10.2: Panel displays memory facts with search and filters
- AC3.10.3: Facts show: content, agent_id, confidence, access_count

**Test Scenarios:**
```gherkin
Scenario: View memory facts
  Given memory facts exist
  When user navigates to Memory tab
  Then MemoryPanel component renders
  And facts are displayed
```

---

## 4. Settings Page (`/settings`)

### User Story 4.1: Appearance Configuration
**As a** developer  
**I want to** customize application appearance  
**So that** I can work comfortably

**Acceptance Criteria:**
- AC4.1.1: Theme selector: Dark, Light, System
- AC4.1.2: Theme change applies immediately
- AC4.1.3: Font size selector: Small, Medium, Large
- AC4.1.4: Selected theme has primary border and background

**Test Scenarios:**
```gherkin
Scenario: Change theme to light
  Given current theme is dark
  When user selects "Light" theme
  Then setTheme is called with "light"
  And theme applies immediately
  And radio button shows selected state
```

### User Story 4.2: Default Configuration
**As a** developer  
**I want to** set default project, agent, and model  
**So that** I can quickly start working

**Acceptance Criteria:**
- AC4.2.1: Default project path input
- AC4.2.2: Default agent selector: OpenCode, Claude Code, Windsurf, Custom
- AC4.2.3: Default model selector: Auto, Claude Sonnet 4, Claude Opus 4, GPT-4o, DeepSeek V4
- AC4.2.4: "Save Defaults" button persists to localStorage
- AC4.2.5: Success state shows "Saved" with checkmark
- AC4.2.6: "Reset All" button restores defaults

**Test Scenarios:**
```gherkin
Scenario: Save default settings
  Given user changes default agent to "claude"
  When user clicks "Save Defaults"
  Then saveSettings is called
  And localStorage is updated
  And button shows "Saved" state
  And state resets after 2 seconds

Scenario: Reset to defaults
  Given user has custom defaults
  When user clicks "Reset All"
  Then resetDefaults is called
  And localStorage is cleared
  And defaults are restored
```

### User Story 4.3: Integration Status
**As a** developer  
**I want to** see integration connection status  
**So that** I can verify connectivity

**Acceptance Criteria:**
- AC4.3.1: Integrations section shows: SkillBridge, Supabase, GitHub
- AC4.3.2: Each integration shows: name, description, status badge, icon
- AC4.3.3: Status badges: Connected (green), Not Configured (gray), Error (red)
- AC4.3.4: Status icons: CheckCircle, XCircle, AlertCircle

**Test Scenarios:**
```gherkin
Scenario: Display integration status
  Given integrations are configured
  When settings page loads
  Then each integration shows status badge
  And icons match status
```

### User Story 4.4: Onboarding Management
**As a** developer  
**I want to** re-run onboarding wizard  
**So that** I can reconfigure agents and projects

**Acceptance Criteria:**
- AC4.4.1: "Re-run Onboarding" button resets onboarding state
- AC4.4.2: Button calls resetOnboarding
- AC4.4.3: onboardingCompleted is set to false
- AC4.4.4: forceShowOnboarding is set to true

**Test Scenarios:**
```gherkin
Scenario: Re-run onboarding
  Given onboarding is completed
  When user clicks "Re-run Onboarding"
  Then resetOnboarding is called
  And onboardingCompleted is false
  And forceShowOnboarding is true
```

### User Story 4.5: About Information
**As a** developer  
**I want to** see application version and build info  
**So that** I can verify installation

**Acceptance Criteria:**
- AC4.5.1: About section shows: Application (SourceForge), Version (0.9.0), Build Date, Environment
- AC4.5.2: Build date is current date
- AC4.5.3: Environment shows "Development"

**Test Scenarios:**
```gherkin
Scenario: Display about information
  When settings page loads
  Then About section shows version 0.9.0
  And build date is today's date
  And environment is "Development"
```

---

## 5. Integrations Page (`/integrations`)

### User Story 5.1: Supabase Integration
**As a** developer  
**I want to** configure Supabase connection  
**So that** I can access database and storage

**Acceptance Criteria:**
- AC5.1.1: Auto-detection checks for supabase/config.toml
- AC5.1.2: Detection status shows project ref or "not detected"
- AC5.1.3: Connection form: Supabase URL, Anon Key, Service Role Key
- AC5.1.4: Keys are password fields (masked)
- AC5.1.5: Read-only mode is enforced (toggle disabled)
- AC5.1.6: "Save Configuration" persists config
- AC5.1.7: Feature groups: Documentation, Database, Storage, Debugging, Edge Functions (unlocked); Branching, Development, Account (locked)
- AC5.1.8: Feature toggles update config
- AC5.1.9: Saved configs display with project ref, URL, created date

**Test Scenarios:**
```gherkin
Scenario: Detect Supabase project
  Given project path contains supabase/config.toml
  When detectSupabase is called
  Then project ref is returned
  And detection status shows "Connected"

Scenario: Save Supabase config
  Given user enters URL and keys
  When user clicks "Save Configuration"
  Then saveSupabaseConfig is called
  And config is persisted
  And saved config appears in list

Scenario: Toggle feature group
  Given Supabase config exists
  When user toggles "Database" feature
  Then toggleSupabaseFeature is called
  And config is updated
```

### User Story 5.2: GitHub Integration
**As a** developer  
**I want to** configure GitHub connection  
**So that** I can manage repositories and PRs

**Acceptance Criteria:**
- AC5.2.1: GitHub token input (password field)
- AC5.2.2: Auto-detection checks .git/config for GitHub remote
- AC5.2.3: Detection shows owner/repo and visibility (public/private)
- AC5.2.4: Lockdown mode toggle with warning banner
- AC5.2.5: "Save Repository Config" persists config
- AC5.2.6: Feature groups: Repositories, Issues, Pull Requests, Actions (unlocked); Code Security, Projects, Notifications (locked)
- AC5.2.7: PR creation form: Title, Body (markdown), Head branch, Base branch
- AC5.2.8: PR creation requires token, title, head branch
- AC5.2.9: PR success shows link with external icon
- AC5.2.10: CI/CD status scans workflows
- AC5.2.11: Issue browser: filter by open/closed/all, fetch issues, trigger wave

**Test Scenarios:**
```gherkin
Scenario: Detect GitHub repository
  Given project has .git/config with GitHub remote
  When detectGitHub is called
  Then owner and repo are extracted
  And visibility is checked

Scenario: Create pull request
  Given GitHub token is entered
  When user fills PR form and clicks "Open PR"
  Then createPullRequest is called
  And PR URL is returned
  And success link is displayed

Scenario: Enable lockdown mode
  Given lockdown toggle is off
  When user enables lockdown
  Then warning banner appears
  And enableLockdown is called
```

### User Story 5.3: Migration Safety
**As a** developer  
**I want to** check migration safety  
**So that** I can avoid breaking changes

**Acceptance Criteria:**
- AC5.3.1: Migration tab shows "Check Migrations" button
- AC5.3.2: Migration watcher starts on tab mount
- AC5.3.3: Migrations detected shows badge count
- AC5.3.4: Safety check flags destructive operations

**Test Scenarios:**
```gherkin
Scenario: Check migration safety
  When user clicks "Check Migrations"
  Then checkMigrationSafety is called
  And migrations are analyzed
  And flagged migrations are shown
```

### User Story 5.4: Chat Platform Integration
**As a** developer  
**I want to** connect chat platforms  
**So that** I can receive agent updates

**Acceptance Criteria:**
- AC5.4.1: Chat tab shows platform selector: Lark, Slack, Discord, Telegram
- AC5.4.2: Each platform shows description
- AC5.4.3: Config form: Webhook URL, Routing Key, App Secret, Signing Secret, Bot Token
- AC5.4.4: Routing key placeholder changes by platform
- AC5.4.5: Queue provider selector: Upstash, Postgres, Redis, File
- AC5.4.6: Reply mode selector: MCP Tool, Post Process, Inline
- AC5.4.7: "Save Config" persists config
- AC5.4.8: "Test Connection" validates config
- AC5.4.9: Daemon status: running/stopped, PID, uptime, queue depth, active platforms
- AC5.4.10: Daemon controls: Start, Stop, Logs
- AC5.4.11: Queue health: connected status, provider, depth, latency

**Test Scenarios:**
```gherkin
Scenario: Configure Lark platform
  Given user selects Lark platform
  When user enters webhook URL and app secret
  And clicks "Save Config"
  Then savePlatformConfig is called
  And config is persisted

Scenario: Start daemon
  Given daemon is stopped
  When user clicks "Start"
  Then startDaemon is called
  And daemon status updates to running

Scenario: Test platform connection
  Given platform config is saved
  When user clicks "Test Connection"
  Then testPlatformConnection is called
  And connection status is shown
```

---

## 6. Asset Manager Page (`/assets`)

### User Story 6.1: Skills Library
**As a** developer  
**I want to** browse and manage agent skills  
**So that** I can reuse common patterns

**Acceptance Criteria:**
- AC6.1.1: Skills tab scans skills from path
- AC6.1.2: Skills display: name, source badge, path, content preview
- AC6.1.3: Source badges: claude (gold), opencode (blue), gemini (purple), bundled (green)
- AC6.1.4: "Select" button marks skill as active
- AC6.1.5: "View" button opens content modal
- AC6.1.6: Search filters by name and source
- AC6.1.7: Scan path input and "Scan" button

**Test Scenarios:**
```gherkin
Scenario: Scan skills library
  Given scan path is set
  When user clicks "Scan"
  Then scanSkills is called
  And skills are displayed
  And source badges are shown

Scenario: View skill content
  Given skills are listed
  When user clicks "View" button
  Then readSkill is called
  And content modal opens
  And full content is displayed
```

### User Story 6.2: Memory Browser
**As a** developer  
**I want to** view and edit memory files  
**So that** I can manage agent context

**Acceptance Criteria:**
- AC6.2.1: Memory tab scans memory files from path
- AC6.2.2: Files display: name, agent badge, last modified, path, content preview
- AC6.2.3: Agent badges: claude (gold), opencode (blue), gemini (purple)
- AC6.2.4: "Edit" button opens editor modal
- AC6.2.5: Editor modal has textarea with full content
- AC6.2.6: "Save" button writes file
- AC6.2.7: "View" button selects file
- AC6.2.8: Search filters by name and agent

**Test Scenarios:**
```gherkin
Scenario: Edit memory file
  Given memory files are listed
  When user clicks "Edit" button
  Then editor modal opens
  And textarea shows file content

Scenario: Save memory file
  Given editor modal is open
  When user modifies content and clicks "Save"
  Then writeMemoryFile is called
  And modal closes
  And file is updated
```

### User Story 6.3: MCP Registry
**As a** developer  
**I want to** manage MCP server configurations  
**So that** I can extend agent capabilities

**Acceptance Criteria:**
- AC6.3.1: Built-in GA-Bagua Semantic KG MCP shows first
- AC6.3.2: Bagua MCP shows: install status, path, version, connection test
- AC6.3.3: "Detect" button checks installation
- AC6.3.4: "Install" button copies install command
- AC6.3.5: "Test" button tests connection
- AC6.3.6: MCP list loads from config path
- AC6.3.7: Each MCP shows: name, health badge, server command, env vars
- AC6.3.8: Toggle switch enables/disables MCP
- AC6.3.9: Search filters by name and server command

**Test Scenarios:**
```gherkin
Scenario: Detect Bagua MCP
  When user clicks "Detect"
  Then detectBaguaMcp is called
  And install status is shown

Scenario: Toggle MCP
  Given MCP is enabled
  When user clicks toggle
  Then toggleMcp is called
  And MCP is disabled
```

### User Story 6.4: Connector Vault
**As a** developer  
**I want to** store and manage secrets  
**So that** I can securely access credentials

**Acceptance Criteria:**
- AC6.4.1: Vault tab lists secrets
- AC6.4.2: Secrets display: key name, scope badge, agent ID, masked value, created date
- AC6.4.3: Scope badges: global (purple), agent (blue), project (green)
- AC6.4.4: "Add Secret" button opens form
- AC6.4.5: Form fields: Key Name, Scope, Value (password), Agent ID (optional)
- AC6.4.6: "Store Secret" saves secret
- AC6.4.7: "Reveal" button shows/hides value
- AC6.4.8: "Copy" button copies revealed value
- AC6.4.9: Search filters by key name and scope

**Test Scenarios:**
```gherkin
Scenario: Add secret
  Given user clicks "Add Secret"
  When user enters key, value, scope
  And clicks "Store Secret"
  Then storeSecret is called
  And secret appears in list

Scenario: Reveal secret value
  Given secret is masked
  When user clicks "Reveal"
  Then getSecretValue is called
  And value is displayed
  And icon changes to "hide"
```

### User Story 6.5: Plugin Manager
**As a** developer  
**I want to** view project profile and plugins  
**So that** I can understand project setup

**Acceptance Criteria:**
- AC6.5.1: Project profile shows: name, path, stack, test framework, package manager, active agents
- AC6.5.2: VS Code extensions list with icons
- AC6.5.3: "Generate Profile" button creates profile
- AC6.5.4: "Scan Plugins" button lists plugins
- AC6.5.5: Search filters plugins

**Test Scenarios:**
```gherkin
Scenario: Generate project profile
  When user clicks "Generate Profile"
  Then generateProfile is called
  And profile is displayed

Scenario: Scan plugins
  When user clicks "Scan Plugins"
  Then listPlugins is called
  And plugins are displayed in grid
```

---

## 7. Playbooks Page (`/playbooks`)

### User Story 7.1: Export Playbook
**As a** developer  
**I want to** export playbook manifest  
**So that** I can share project configuration

**Acceptance Criteria:**
- AC7.1.1: Playbook name input
- AC7.1.2: Include checkboxes: Skills Library, Memory Files, Preset Commands
- AC7.1.3: "Generate Manifest" button creates manifest
- AC7.1.4: Manifest displays as JSON
- AC7.1.5: "Copy" button copies manifest to clipboard
- AC7.1.6: Copy success shows checkmark icon

**Test Scenarios:**
```gherkin
Scenario: Export playbook
  Given user enters playbook name
  When user clicks "Generate Manifest"
  Then buildPlaybookManifest is called
  And manifest JSON is displayed
  And copy button is available
```

### User Story 7.2: Import Playbook
**As a** developer  
**I want to** import playbook file  
**So that** I can load shared configuration

**Acceptance Criteria:**
- AC7.2.1: Drop zone for .acc files
- AC7.2.2: "Select .acc File" button opens file picker
- AC7.2.3: File is parsed and imported

**Test Scenarios:**
```gherkin
Scenario: Import playbook file
  When user drops .acc file
  Then file is parsed
  And configuration is imported
```

### User Story 7.3: Reactive Memory
**As a** developer  
**I want to** review memory candidates  
**So that** I can approve learned patterns

**Acceptance Criteria:**
- AC7.3.1: Memory candidates list from PTY output
- AC7.3.2: Each candidate shows: content, status badge, source pattern
- AC7.3.3: "Add to Memory" button approves candidate
- AC7.3.4: "Skip" button dismisses candidate
- AC7.3.5: Empty state shows when no candidates

**Test Scenarios:**
```gherkin
Scenario: Approve memory candidate
  Given memory candidate exists
  When user clicks "Add to Memory"
  Then candidate is approved
  And added to knowledge base
```

### User Story 7.4: Feature Documentation
**As a** developer  
**I want to** generate feature documentation  
**So that** I can document completed work

**Acceptance Criteria:**
- AC7.4.1: Four doc types: EXECUTIVE_PLAN, CHANGELOG, QA_REPORT, TECHNICAL_PLAN
- AC7.4.2: Each button generates doc prompt
- AC7.4.3: Prompt is copied to clipboard

**Test Scenarios:**
```gherkin
Scenario: Generate changelog
  When user clicks "CHANGELOG" button
  Then buildFeatureDocPrompt is called
  And prompt is copied to clipboard
```

---

## 8. Cost Aggregation Page (`/costs`)

### User Story 8.1: Cost Overview
**As a** developer  
**I want to** see cost overview  
**So that** I can monitor spending

**Acceptance Criteria:**
- AC8.1.1: Four cards: Total Spend, Burn Rate, Projected Month-End, Active Budgets
- AC8.1.2: Total spend shows USD and token count
- AC8.1.3: Burn rate shows percentage and token usage
- AC8.1.4: Projected month-end calculates based on current rate
- AC8.1.5: Active budgets shows count and warning/critical count
- AC8.1.6: Threshold ladder shows 60%, 80%, 95%, 100% levels
- AC8.1.7: Per-agent cost breakdown shows top 8 agents
- AC8.1.8: Progress bars colored by state (active=gradient, warning=amber, critical=orange, exceeded=red)

**Test Scenarios:**
```gherkin
Scenario: Display cost overview
  Given cost data exists
  When overview tab loads
  Then cards show calculated metrics
  And threshold ladder shows current percentage
  And per-agent breakdown displays
```

### User Story 8.2: Budget Management
**As a** developer  
**I want to** manage agent budgets  
**So that** I can control token usage

**Acceptance Criteria:**
- AC8.2.1: Budget list shows all budgets
- AC8.2.2: Each budget shows: agent ID, model, task complexity, state badge
- AC8.2.3: Progress bar shows usage percentage with threshold markers
- AC8.2.4: "Capture WIP" button captures work-in-progress
- AC8.2.5: "Resume +100K" button extends exceeded budget
- AC8.2.6: Threshold events fire at 60%, 80%, 95%, 100%
- AC8.2.7: Notification shows when threshold fires

**Test Scenarios:**
```gherkin
Scenario: Capture WIP checkpoint
  Given budget is active
  When user clicks "Capture WIP"
  Then captureWip is called
  And WIP file is created
  And notification shows success

Scenario: Resume exceeded budget
  Given budget state is "exceeded"
  When user clicks "Resume +100K"
  Then resumeBudget is called with 100000 tokens
  And budget state resets
```

### User Story 8.3: WIP and Resumption
**As a** developer  
**I want to** view WIP checkpoints and resumption plans  
**So that** I can resume interrupted work

**Acceptance Criteria:**
- AC8.3.1: WIP checkpoints list with file paths
- AC8.3.2: "View" button previews WIP content
- AC8.3.3: Resumption plan shows: plan path, pending task, remaining tokens
- AC8.3.4: Agent lists: Completed, WIP'd, Pending
- AC8.3.5: "View Full Plan" button shows full resumption plan

**Test Scenarios:**
```gherkin
Scenario: Preview WIP checkpoint
  Given WIP checkpoints exist
  When user clicks "View"
  Then preview dialog opens
  And WIP content is displayed
```

### User Story 8.4: Cost Breakdown by Model/Project/Session
**As a** developer  
**I want to** see cost breakdown  
**So that** I can optimize spending

**Acceptance Criteria:**
- AC8.4.1: Models tab shows table: model, tokens in/out, sessions, est. cost
- AC8.4.2: Projects tab shows table: project, tokens in/out, sessions, est. cost
- AC8.4.3: Sessions tab shows table: session ID, agent, tokens in/out, est. cost
- AC8.4.4: Empty state shows when no data

**Test Scenarios:**
```gherkin
Scenario: View model costs
  When user navigates to Models tab
  Then table shows per-model costs
  And tokens are formatted (K, M)
```

---

## 9. Session Replay Page (`/replay`)

### User Story 9.1: Browse Sessions
**As a** developer  
**I want to** browse session history  
**So that** I can review past work

**Acceptance Criteria:**
- AC9.1.1: Session list shows all sessions
- AC9.1.2: Each session shows: ID (truncated), timestamp, event count, agents, outcome badge
- AC9.1.3: Outcome badges: done (green), failed (red)
- AC9.1.4: Search filters by session ID
- AC9.1.5: Selected session has accent border
- AC9.1.6: Empty state shows when no sessions

**Test Scenarios:**
```gherkin
Scenario: Search sessions
  Given sessions exist
  When user types session ID prefix
  Then sessions are filtered
  And matching sessions are shown
```

### User Story 9.2: Event Timeline
**As a** developer  
**I want to** view event timeline  
**So that** I can trace agent activity

**Acceptance Criteria:**
- AC9.2.1: Event type filters: read, edit, run, user_input, agent_output, error, handoff, correction
- AC9.2.2: Each filter has icon and color
- AC9.2.3: Timeline shows events vertically with dots
- AC9.2.4: Each event shows: type icon, label, timestamp, target file, lines added/removed, agent badge
- AC9.2.5: Selected event has accent background
- AC9.2.6: Empty state shows when no events

**Test Scenarios:**
```gherkin
Scenario: Filter event types
  Given events of multiple types exist
  When user unchecks "read" filter
  Then read events are hidden
  And other events remain visible
```

### User Story 9.3: Event Detail
**As a** developer  
**I want to** view event details  
**So that** I can inspect specific actions

**Acceptance Criteria:**
- AC9.3.1: Detail panel shows: type, timestamp, agent ID, target file, changes, exit code
- AC9.3.2: Target file has copy button
- AC9.3.3: Edit events show diff preview (green for additions, red for deletions)
- AC9.3.4: Other events show detail content
- AC9.3.5: Empty state shows when no event selected

**Test Scenarios:**
```gherkin
Scenario: View edit event detail
  Given edit event is selected
  When detail loads
  Then diff preview is shown
  And additions are green
  And deletions are red
```

---

## 10. Scheduler Page (`/scheduler`)

### User Story 10.1: Manage Cron Jobs
**As a** developer  
**I want to** schedule automated tasks  
**So that** work runs on schedule

**Acceptance Criteria:**
- AC10.1.1: Jobs tab shows job list
- AC10.1.2: Each job shows: name, enabled badge, auto-approve badge, description
- AC10.1.3: Job details: schedule (cron expression + human description), last run, next run, wave preset, max retries, task template
- AC10.1.4: "New Job" button opens create dialog
- AC10.1.5: Job actions: Enable/Disable, Run Now, Edit, Delete
- AC10.1.6: Delete requires confirmation
- AC10.1.7: Empty state shows when no jobs

**Test Scenarios:**
```gherkin
Scenario: Create cron job
  Given user clicks "New Job"
  When user fills form and clicks "Create Job"
  Then createJob is called
  And job appears in list
  And notification shows success

Scenario: Toggle job enabled state
  Given job is enabled
  When user clicks pause button
  Then toggleJob is called with false
  And badge changes to "Disabled"
```

### User Story 10.2: Cron Job Form
**As a** developer  
**I want to** configure cron job details  
**So that** tasks run correctly

**Acceptance Criteria:**
- AC10.2.1: Form fields: Name (required), Description, Schedule (cron, required), Task Template, Wave Preset, Escalation Policy (JSON), Max Retries, Auto-approve, Enabled
- AC10.2.2: Cron presets: Every minute, Every 5/15/30 min, Every hour, Every 6 hours, Daily 9am/midnight, Weekdays 9am, Weekly Mon 9am
- AC10.2.3: Cron description shows human-readable schedule
- AC10.2.4: Next 3 fire times are calculated and shown
- AC10.2.5: Save button disabled when name or schedule is empty
- AC10.2.6: Edit mode populates form with job data

**Test Scenarios:**
```gherkin
Scenario: Select cron preset
  Given cron job form is open
  When user clicks "Daily 9am" preset
  Then schedule input shows "0 9 * * *"
  And description shows "at 0 at 9"
  And next 3 fire times are calculated
```

### User Story 10.3: Execution History
**As a** developer  
**I want to** view execution history  
**So that** I can monitor job runs

**Acceptance Criteria:**
- AC10.3.1: History tab shows execution list
- AC10.3.2: Each execution shows: status badge, job name, started/completed timestamps, duration, escalation reason
- AC10.3.3: Status badges: running (blue), success/completed (green), failed (red), escalated (yellow), scheduled (gray)
- AC10.3.4: Filter by job ID input
- AC10.3.5: Filter by job selector dropdown
- AC10.3.6: "Refresh" button reloads executions
- AC10.3.7: Empty state shows when no executions

**Test Scenarios:**
```gherkin
Scenario: Filter execution history
  Given executions exist for multiple jobs
  When user selects job from dropdown
  Then only executions for that job are shown
```

### User Story 10.4: Escalation Management
**As a** developer  
**I want to** view escalated jobs  
**So that** I can fix failing jobs

**Acceptance Criteria:**
- AC10.4.1: Escalations tab shows jobs with 2+ failures in last hour
- AC10.4.2: Each escalation shows: name, schedule, "Latest" badge if most recent
- AC10.4.3: Latest escalation shows error message
- AC10.4.4: Actions: Edit, Disable
- AC10.4.5: Escalation banner shows at top when escalations exist
- AC10.4.6: Empty state shows when no escalations

**Test Scenarios:**
```gherkin
Scenario: Display escalation banner
  Given escalations exist
  When scheduler page loads
  Then yellow banner shows escalation count
  And lists first 3 escalations
  And "View" button navigates to escalations tab
```

### User Story 10.5: Real-time Notifications
**As a** developer  
**I want to** receive real-time notifications  
**So that** I can monitor job activity

**Acceptance Criteria:**
- AC10.5.1: Cron fired notification shows job ID and execution ID
- AC10.5.2: Escalation notification shows job ID and failure count
- AC10.5.3: Error notification shows error message
- AC10.5.4: Notifications auto-dismiss after 4.5 seconds
- AC10.5.5: Notification colors: ok (green), warn (yellow), err (red)

**Test Scenarios:**
```gherkin
Scenario: Receive cron fired notification
  Given event listener is attached
  When cron-fired event fires
  Then notification shows "Cron fired: job X → execution Y"
  And notification auto-dismisses after 4.5s
```

---

## 11. Outcome Tracker Page (`/outcomes`)

### User Story 11.1: View Outcome Statistics
**As a** developer  
**I want to** see outcome statistics  
**So that** I can measure agent performance

**Acceptance Criteria:**
- AC11.1.1: Four cards: Total Sessions, Successful, Failed, Success Rate
- AC11.1.2: Success rate color: green (>=70%), yellow (>=40%), red (<40%)
- AC11.1.3: Filter buttons: All, High Success, Problematic, Revised
- AC11.1.4: Table columns: Agent, Task Type, Total, Done, Failed, Revised, Rate
- AC11.1.5: Sortable columns: Agent, Task Type, Total, Rate
- AC11.1.6: Success bar shows percentage with color
- AC11.1.7: Empty state shows when no data

**Test Scenarios:**
```gherkin
Scenario: Filter high success outcomes
  Given outcomes with various success rates
  When user clicks "High Success" filter
  Then only outcomes with success_rate > 0.7 are shown
```

---

## 12. State Management (Zustand Stores)

### User Story 12.1: Agent Store
**As a** developer  
**I want** agent state to be managed correctly  
**So that** UI stays in sync

**Acceptance Criteria:**
- AC12.1.1: agents Map stores active sessions
- AC12.1.2: spawnAgent adds session and calls Tauri
- AC12.1.3: killAgent removes session and calls Tauri
- AC12.1.4: writeToAgent sends text to PTY
- AC12.1.5: updateStatus modifies session status
- AC12.1.6: appendOutput adds to buffer (max 1000 lines)
- AC12.1.7: checkAgentInstalled throws AgentNotInstalledError if not installed

**Test Scenarios:**
```gherkin
Scenario: Agent store state management
  Given agent store is initialized
  When spawnAgent is called
  Then agent is added to map
  And session has correct properties
```

### User Story 12.2: Orchestration Store
**As a** developer  
**I want** orchestration state to be managed  
**So that** wave plans work correctly

**Acceptance Criteria:**
- AC12.2.1: wavePlans array stores plans
- AC12.2.2: planAgents array stores agents for selected plan
- AC12.2.3: corrections array stores correction docs
- AC12.2.4: createWavePlan adds plan to array
- AC12.2.5: addPlanAgent calls Tauri command
- AC12.2.6: updatePlanAgentStatus updates status
- AC12.2.7: getCorrections loads corrections

**Test Scenarios:**
```gherkin
Scenario: Orchestration store operations
  Given orchestration store is initialized
  When createWavePlan is called
  Then plan is added to wavePlans array
```

### User Story 12.3: Knowledge Store
**As a** developer  
**I want** knowledge state to be managed  
**So that** knowledge compounder works

**Acceptance Criteria:**
- AC12.3.1: items array stores knowledge items
- AC12.3.2: relations object stores relations by item ID
- AC12.3.3: stats object stores statistics
- AC12.3.4: preflight array stores warnings
- AC12.3.5: loadItems fetches from backend
- AC12.3.6: addKnowledgeItem adds item
- AC12.3.7: deleteItem removes item
- AC12.3.8: runCompounder executes compounder

**Test Scenarios:**
```gherkin
Scenario: Knowledge store operations
  Given knowledge store is initialized
  When loadItems is called
  Then items array is populated
```

### User Story 12.4: Settings Store
**As a** developer  
**I want** settings to persist  
**So that** preferences are remembered

**Acceptance Criteria:**
- AC12.4.1: Settings stored in localStorage under "acc-settings"
- AC12.4.2: loadSettings reads from localStorage
- AC12.4.3: saveSettings writes to localStorage
- AC12.4.4: resetDefaults clears localStorage
- AC12.4.5: toggleSidebarGroup toggles group state
- AC12.4.6: onboarding state persists

**Test Scenarios:**
```gherkin
Scenario: Settings persistence
  Given settings are saved
  When page reloads
  Then loadSettings restores state
  And localStorage contains settings
```

---

## 13. Navigation and Routing

### User Story 13.1: Sidebar Navigation
**As a** developer  
**I want to** navigate between pages  
**So that** I can access all features

**Acceptance Criteria:**
- AC13.1.1: Sidebar shows all navigation items
- AC13.1.2: Active route is highlighted
- AC13.1.3: Keyboard navigation works (arrow keys, enter)
- AC13.1.4: Sidebar can be collapsed
- AC13.1.5: Route changes update active state

**Test Scenarios:**
```gherkin
Scenario: Navigate via sidebar
  Given user is on Runner page
  When user clicks "Knowledge" in sidebar
  Then URL changes to /knowledge
  And Knowledge page renders
  And sidebar highlights Knowledge
```

### User Story 13.2: Route Redirects
**As a** developer  
**I want** legacy routes to redirect  
**So that** bookmarks still work

**Acceptance Criteria:**
- AC13.2.1: "/" redirects to "/runner"
- AC13.2.2: "/handoffs" redirects to "/orchestrate/handoffs"
- AC13.2.3: "/messages" redirects to "/orchestrate/messages"
- AC13.2.4: "/connectors" redirects to "/integrations"
- AC13.2.5: Unknown routes show PlaceholderPage

**Test Scenarios:**
```gherkin
Scenario: Legacy route redirect
  Given user navigates to "/handoffs"
  Then redirect to "/orchestrate/handoffs" occurs
  And Orchestrate page renders with handoffs tab active
```

---

## 14. Error Handling and Edge Cases

### User Story 14.1: Error Notifications
**As a** developer  
**I want to** see error messages  
**So that** I can fix issues

**Acceptance Criteria:**
- AC14.1.1: Error notifications show in red
- AC14.1.2: Error messages are descriptive
- AC14.1.3: Dismiss button clears notification
- AC14.1.4: Notifications auto-dismiss after timeout

**Test Scenarios:**
```gherkin
Scenario: Display error notification
  Given operation fails
  When error is caught
  Then error notification appears
  And user can dismiss it
```

### User Story 14.2: Loading States
**As a** developer  
**I want to** see loading indicators  
**So that** I know work is in progress

**Acceptance Criteria:**
- AC14.2.1: Loading spinners show during async operations
- AC14.2.2: Buttons disable during loading
- AC14.2.3: Skeleton loaders show for lists
- AC14.2.4: "Loading..." text shows where appropriate

**Test Scenarios:**
```gherkin
Scenario: Show loading state
  Given async operation is in progress
  Then loading indicator is visible
  And user cannot trigger duplicate operations
```

---

## 15. Accessibility and UX

### User Story 15.1: Keyboard Navigation
**As a** developer  
**I want to** use keyboard shortcuts  
**So that** I can work efficiently

**Acceptance Criteria:**
- AC15.1.1: Tab navigation works for all interactive elements
- AC15.1.2: Enter/Space activates buttons
- AC15.1.3: Escape closes modals
- AC15.1.4: Arrow keys navigate lists

**Test Scenarios:**
```gherkin
Scenario: Keyboard navigation
  Given user is using keyboard
  When user presses Tab
  Then focus moves to next element
  And focus indicator is visible
```

### User Story 15.2: Responsive Design
**As a** developer  
**I want** UI to work on different screen sizes  
**So that** I can use on any device

**Acceptance Criteria:**
- AC15.2.1: Layout adapts to window resize
- AC15.2.2: Sidebar collapses on small screens
- AC15.2.3: Tables become scrollable
- AC15.2.4: Modals are centered and sized appropriately

**Test Scenarios:**
```gherkin
Scenario: Responsive layout
  Given window is resized to mobile width
  Then sidebar collapses
  And content remains accessible
```

---

## Test Execution Strategy

### Priority Levels
- **P0 (Critical):** Core flows (agent spawn, wave orchestration, knowledge extraction)
- **P1 (High):** Secondary flows (settings, integrations, cost tracking)
- **P2 (Medium):** Tertiary flows (scheduler, replay, outcomes)
- **P3 (Low):** Edge cases and nice-to-haves

### Test Types
1. **Unit Tests:** Store logic, utility functions, type guards
2. **Component Tests:** Individual component rendering and interactions
3. **Integration Tests:** Page flows, multi-component interactions
4. **E2E Tests:** Full user journeys (future, requires Playwright)

### Test Data
- Mock Tauri invoke responses
- Fixture data for agents, plans, knowledge items
- Simulated PTY output
- Mock localStorage

### Success Criteria
- 100% of P0 scenarios pass
- 95% of P1 scenarios pass
- 90% of P2 scenarios pass
- 80% of P3 scenarios pass
- Zero critical bugs in production flows

---

## Appendix: Test Environment

### Prerequisites
- Node.js 18+
- Rust toolchain (for Tauri)
- At least one AI agent CLI installed
- Test database (SQLite in-memory)

### Test Commands
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest src/__tests__/stores/agentStore.test.ts

# Watch mode
npm run test:watch
```

### Mock Strategy
- Tauri invoke: Mock all backend calls
- localStorage: Clear between tests
- crypto.randomUUID: Deterministic counter
- ResizeObserver: Stub implementation
- matchMedia: Mock for theme detection

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-14  
**Next Review:** After test execution
