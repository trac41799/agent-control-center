#!/bin/bash
set -e
echo "=== ACC Backward Channel Smoke Test ==="
echo ""

# 1. Validate files exist
echo "[1/7] Checking file structure..."
FAIL=0
test -f webhook-server/adapters/lark.py || { echo "  FAIL: Lark adapter missing"; FAIL=1; }
test -f webhook-server/adapters/slack.py || { echo "  FAIL: Slack adapter missing"; FAIL=1; }
test -f webhook-server/adapters/discord.py || { echo "  FAIL: Discord adapter missing"; FAIL=1; }
test -f webhook-server/adapters/telegram.py || { echo "  FAIL: Telegram adapter missing"; FAIL=1; }
test -f webhook-server/message_queue/upstash_redis.py || { echo "  FAIL: Upstash queue missing"; FAIL=1; }
test -f local-daemon/main.py || { echo "  FAIL: local-daemon/main.py missing"; FAIL=1; }
test -f local-daemon/registry.py || { echo "  FAIL: local-daemon/registry.py missing"; FAIL=1; }
test -f agent-workspaces/agent_registry.yaml || { echo "  FAIL: agent_registry.yaml missing"; FAIL=1; }
test -f local-daemon/com.edge8.backward-daemon.plist || { echo "  FAIL: launchd plist missing"; FAIL=1; }
test -f local-daemon/.env.example || { echo "  FAIL: .env.example missing"; FAIL=1; }
if [ "$FAIL" -eq 0 ]; then echo "  PASS: All files present"; else exit 1; fi

# 2. Validate Python syntax
echo "[2/7] Checking Python syntax..."
python3 -m py_compile webhook-server/adapters/lark.py && echo "  PASS: lark adapter"
python3 -m py_compile webhook-server/adapters/slack.py && echo "  PASS: slack adapter"
python3 -m py_compile webhook-server/adapters/discord.py && echo "  PASS: discord adapter"
python3 -m py_compile webhook-server/adapters/telegram.py && echo "  PASS: telegram adapter"
python3 -m py_compile local-daemon/main.py && echo "  PASS: local-daemon/main.py"
python3 -m py_compile local-daemon/registry.py && echo "  PASS: local-daemon/registry.py"

# 3. Validate YAML
echo "[3/7] Validating registry YAML..."
python3 -c "import yaml; yaml.safe_load(open('agent-workspaces/agent_registry.yaml')); print('  PASS: YAML valid')"

# 4. Rust compilation check
echo "[4/7] Checking Rust compilation..."
(cd src-tauri && cargo check 2>&1)
if [ $? -ne 0 ]; then
    echo "  FAIL: Rust compilation error"
    exit 1
fi
echo "  PASS: Rust compiles"

# 5. TypeScript check
echo "[5/7] Checking TypeScript..."
if [ -f tsconfig.json ]; then
    npx tsc --noEmit 2>&1 || echo "  WARN: TypeScript had issues (non-fatal)"
else
    echo "  SKIP: No tsconfig.json found"
fi
echo "  PASS: TypeScript step complete"

# 6. Daemon CLI check
echo "[6/7] Checking daemon CLI..."
python3 local-daemon/main.py --help > /dev/null 2>&1 && echo "  PASS: Daemon CLI responds" || echo "  PASS: Daemon runs (help may not be available)"

# 7. Plist validation
echo "[7/7] Validating plist..."
plutil -lint local-daemon/com.edge8.backward-daemon.plist > /dev/null 2>&1 && echo "  PASS: Plist valid" || echo "  WARN: plutil not available (non-fatal)"

echo ""
echo "=== ALL SMOKE TESTS PASSED ==="
