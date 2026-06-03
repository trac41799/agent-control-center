#!/bin/bash
set -e
echo "=== ACC Project Smoke Test ==="
echo ""

PASS=0
FAIL=0
SKIP=0

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }
skip() { echo "  SKIP: $1"; SKIP=$((SKIP + 1)); }

# ============================================================
# 1. File Structure: Rust Modules
# ============================================================
echo "[1/8] Checking Rust modules..."
MODULES=(acb assets backward_channel budget commands control db events integrations intelligence knowledge orchestrator playbook pty routing scheduler skillbridge)
for m in "${MODULES[@]}"; do
  if [ -f "src-tauri/src/${m}.rs" ]; then
    pass "${m}.rs exists"
  else
    fail "${m}.rs missing"
  fi
done
if [ -f "src-tauri/src/lib.rs" ]; then pass "lib.rs exists"; else fail "lib.rs missing"; fi
if [ -f "src-tauri/src/main.rs" ]; then pass "main.rs exists"; else fail "main.rs missing"; fi

# ============================================================
# 2. File Structure: Migration Files
# ============================================================
echo "[2/8] Checking migration files..."
for m in 001 002 003 004 008; do
  if [ -f "src-tauri/migrations/${m}_*.sql" ]; then
    # shellcheck disable=SC2086
    f=$(ls src-tauri/migrations/${m}_*.sql 2>/dev/null | head -1)
    pass "$(basename "$f") exists"
  else
    fail "Migration ${m} missing"
  fi
done

# ============================================================
# 3. File Structure: Frontend
# ============================================================
echo "[3/8] Checking frontend files..."
if [ -f "src/main.tsx" ]; then pass "src/main.tsx"; else fail "src/main.tsx missing"; fi
if [ -f "src/App.tsx" ]; then pass "src/App.tsx"; else fail "src/App.tsx missing"; fi
if [ -f "tsconfig.json" ]; then pass "tsconfig.json"; else fail "tsconfig.json missing"; fi
if [ -f "vite.config.ts" ]; then pass "vite.config.ts"; else fail "vite.config.ts missing"; fi
if [ -f "package.json" ]; then pass "package.json"; else fail "package.json missing"; fi

# ============================================================
# 4. Rust Source Check (non-compiling grep check)
# ============================================================
echo "[4/8] Verifying Rust source sanity..."
if grep -q "fn main" src-tauri/src/main.rs 2>/dev/null; then
  pass "main.rs has fn main"
else
  fail "main.rs missing fn main"
fi
if grep -q "fn run" src-tauri/src/lib.rs 2>/dev/null; then
  pass "lib.rs has fn run"
else
  fail "lib.rs missing fn run"
fi

# ============================================================
# 5. Backward Channel Checks (legacy)
# ============================================================
echo "[5/8] Checking backward channel files..."
test -f webhook-server/adapters/lark.py && pass "Lark adapter" || fail "Lark adapter missing"
test -f webhook-server/adapters/slack.py && pass "Slack adapter" || fail "Slack adapter missing"
test -f webhook-server/adapters/discord.py && pass "Discord adapter" || fail "Discord adapter missing"
test -f webhook-server/adapters/telegram.py && pass "Telegram adapter" || fail "Telegram adapter missing"
test -f webhook-server/message_queue/upstash_redis.py && pass "Upstash queue" || fail "Upstash queue missing"
test -f local-daemon/main.py && pass "local-daemon/main.py" || fail "local-daemon/main.py missing"
test -f local-daemon/registry.py && pass "local-daemon/registry.py" || fail "local-daemon/registry.py missing"
test -f agent-workspaces/agent_registry.yaml && pass "agent_registry.yaml" || fail "agent_registry.yaml missing"
test -f local-daemon/.env.example && pass ".env.example" || fail ".env.example missing"

# ============================================================
# 6. Python Syntax Check
# ============================================================
echo "[6/8] Checking Python syntax..."
if command -v python3 &> /dev/null; then
  python3 -m py_compile webhook-server/adapters/lark.py 2>/dev/null && pass "lark.py syntax" || fail "lark.py syntax"
  python3 -m py_compile webhook-server/adapters/slack.py 2>/dev/null && pass "slack.py syntax" || fail "slack.py syntax"
  python3 -m py_compile webhook-server/adapters/discord.py 2>/dev/null && pass "discord.py syntax" || fail "discord.py syntax"
  python3 -m py_compile webhook-server/adapters/telegram.py 2>/dev/null && pass "telegram.py syntax" || fail "telegram.py syntax"
  python3 -m py_compile local-daemon/main.py 2>/dev/null && pass "main.py syntax" || fail "main.py syntax"
  python3 -m py_compile local-daemon/registry.py 2>/dev/null && pass "registry.py syntax" || fail "registry.py syntax"
else
  skip "python3 not available"
fi

# ============================================================
# 7. npm Lint
# ============================================================
echo "[7/8] Running npm lint..."
if [ -f "package.json" ]; then
  if grep -q '"lint"' package.json 2>/dev/null; then
    if npm run lint --silent 2>&1; then
      pass "npm run lint"
    else
      fail "npm run lint had issues"
    fi
  else
    skip "No lint script in package.json"
  fi
else
  skip "No package.json"
fi

# ============================================================
# 8. npm Build
# ============================================================
echo "[8/8] Running npm build..."
if [ -f "package.json" ]; then
  if npm run build --silent 2>&1; then
    pass "npm run build"
  else
    fail "npm run build failed"
  fi
else
  skip "No package.json"
fi

# ============================================================
# 9. Frontend Unit Tests (vitest)
# ============================================================
echo "[9/9] Running frontend unit tests..."
if [ -f "package.json" ]; then
  if grep -q '"test"' package.json 2>/dev/null; then
    if npm test 2>&1; then
      pass "npm test"
    else
      fail "npm test had failures"
    fi
  else
    skip "No test script in package.json"
  fi
else
  skip "No package.json"
fi

# ============================================================
echo ""
echo "=== Smoke Test Summary ==="
echo "  PASS: ${PASS}"
echo "  FAIL: ${FAIL}"
echo "  SKIP: ${SKIP}"
if [ "${FAIL}" -gt 0 ]; then
  echo "  STATUS: SOME CHECKS FAILED"
  exit 1
else
  echo "  STATUS: ALL CHECKS PASSED"
fi
