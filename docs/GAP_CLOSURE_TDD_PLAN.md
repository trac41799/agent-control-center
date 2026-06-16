# Gap Closure Plan: Build, Integration, Smoke Test

**Date:** 2026-06-15  
**Goal:** Close the 3 remaining gaps to reach 9/10 production readiness  
**Methodology:** TDD (Red → Green → Refactor)

---

## Executive Summary

The code is production-quality but unverified. Three critical gaps remain:

1. **Build environment broken** - App can't compile or launch
2. **No integration tests** - Components never verified working together
3. **No smoke test** - App never tested from user perspective

This plan closes all 3 gaps with TDD methodology.

---

## Gap 1: Build Environment

### Problem
- `cargo build --release` fails with `dlltool.exe: program not found`
- Multiple binaries defined but no `default-run` specified
- App cannot launch in dev mode

### Root Cause
- Windows build environment missing MinGW toolchain
- `src-tauri/src/bin/dogfood.rs` creates second binary
- No `default-run` in `Cargo.toml`

### TDD Plan

#### Step 1.1: Fix Binary Configuration (RED)

**Test:** App should have exactly one binary and build successfully

**Acceptance Criteria:**
- [ ] `cargo build --bin sourceforge` succeeds
- [ ] `cargo build --release` succeeds
- [ ] `npm run tauri dev` launches the app

#### Step 1.2: Fix Build Environment (GREEN)

**Implementation:**
1. Add `default-run = "sourceforge"` to `Cargo.toml`
2. Verify `dlltool.exe` is available or switch to MSVC toolchain
3. Test build in both debug and release modes

**Acceptance Criteria:**
- [ ] Build completes without errors
- [ ] Binary is created at `src-tauri/target/release/sourceforge.exe`
- [ ] App launches and shows main window

---

## Gap 2: Integration Tests

### Problem
- Unit tests exist but components never tested together
- No verification that adapters + persistence + events work as a system
- No test that wave executor actually uses adapters

### TDD Plan

#### Step 2.1: Adapter Registry Integration Test (RED)

**Test File:** `src-tauri/src/agent_adapters/integration_tests.rs`

**Tests:**
1. Registry returns correct adapter by name
2. Mock adapter can spawn and kill
3. OpenCode adapter parses cost correctly
4. Adapter registry contains all expected adapters

**Acceptance Criteria:**
- [ ] 4 new integration tests pass
- [ ] Tests verify adapter lifecycle (spawn → run → kill)

#### Step 2.2: Wave Persistence Integration Test (RED)

**Test File:** `src-tauri/src/wave_persistence_integration.rs`

**Tests:**
1. Save and load wave state round-trip
2. Resume wave returns correct state
3. Multiple waves can be saved independently
4. Wave state survives process restart (simulated)

**Acceptance Criteria:**
- [ ] 4 new integration tests pass
- [ ] Tests verify persistence lifecycle

#### Step 2.3: Wave Executor Integration Test (RED)

**Test File:** `src-tauri/src/wave_executor_integration.rs`

**Tests:**
1. Execute wave with mock adapter creates worktrees
2. Wave state is saved before execution
3. Resume wave uses saved state
4. Wave report contains correct agent executions

**Acceptance Criteria:**
- [ ] 4 new integration tests pass
- [ ] Tests verify full wave lifecycle

#### Step 2.4: Event System Integration Test (RED)

**Test File:** `src-tauri/src/agent_events_integration.rs`

**Tests:**
1. Create output event has correct fields
2. Create status event has correct fields
3. Create cost event has correct fields
4. Events have valid timestamps

**Acceptance Criteria:**
- [ ] 4 new integration tests pass
- [ ] Tests verify event structure

---

## Gap 3: Smoke Test

### Problem
- App never launched from user perspective
- No verification that UI renders correctly
- No end-to-end workflow tested

### TDD Plan

#### Step 3.1: App Launch Smoke Test (RED)

**Test:** App should launch and show main window

**Acceptance Criteria:**
- [ ] `npm run tauri dev` launches without errors
- [ ] Main window appears
- [ ] No console errors
- [ ] App is responsive

#### Step 3.2: Navigation Smoke Test (RED)

**Test:** User can navigate between pages

**Acceptance Criteria:**
- [ ] Can navigate to Runner page
- [ ] Can navigate to Orchestrate page
- [ ] Can navigate to Knowledge page
- [ ] Can navigate to Settings page
- [ ] No console errors

#### Step 3.3: Agent Spawn Smoke Test (RED)

**Test:** User can spawn an agent

**Acceptance Criteria:**
- [ ] Can click "Add Agent" button
- [ ] Agent appears in list
- [ ] No console errors

#### Step 3.4: Wave Execution Smoke Test (RED)

**Test:** User can create and execute a wave

**Acceptance Criteria:**
- [ ] Can create wave plan
- [ ] Can add agents to wave
- [ ] Can execute wave
- [ ] Wave status updates correctly
- [ ] No console errors

---

## Execution Order

1. **Gap 1: Build Environment** (30 min)
   - Fix Cargo.toml
   - Verify build works
   - Launch app successfully

2. **Gap 2: Integration Tests** (60 min)
   - Write adapter integration tests
   - Write persistence integration tests
   - Write executor integration tests
   - Write event integration tests

3. **Gap 3: Smoke Test** (30 min)
   - Launch app
   - Navigate pages
   - Spawn agent
   - Execute wave

**Total:** ~2 hours

---

## Success Criteria

### Hard Gates (Must Pass)

- [ ] App builds successfully in release mode
- [ ] App launches without errors
- [ ] All 16 new integration tests pass
- [ ] All 4 smoke tests pass
- [ ] No console errors in dev mode

### Score Projection

| Category | Before | After |
|----------|--------|-------|
| Build Environment | 3/10 | 9/10 |
| Integration Testing | 2/10 | 8/10 |
| User Verification | 3/10 | 8/10 |
| **Overall** | **6.5/10** | **9/10** |

---

## Risk Mitigation

### Risk 1: Build Environment Issues

- **Risk:** `dlltool.exe` not available
- **Mitigation:** Use MSVC toolchain instead of MinGW
- **Rollback:** Revert Cargo.toml changes

### Risk 2: Integration Test Failures

- **Risk:** Components don't integrate correctly
- **Mitigation:** Fix integration issues as they arise
- **Rollback:** Mark tests as `#[ignore]` with TODO comments

### Risk 3: Smoke Test Failures

- **Risk:** App crashes on launch
- **Mitigation:** Debug and fix crash
- **Rollback:** Document issues for future fix

---

## Sign-Off

- [ ] Gap 1: Build environment fixed
- [ ] Gap 2: Integration tests written and passing
- [ ] Gap 3: Smoke tests completed
- [ ] All tests pass
- [ ] App launches successfully
- [ ] Production readiness score: 9/10

**Approved By:** _________________  
**Date:** _________________
