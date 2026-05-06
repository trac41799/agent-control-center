# Backward Channel Deployment Guide

## Overview

The backward channel enables chat platforms (Lark, Slack, Discord, Telegram) to send messages to your local LLM agents and receive replies — all through ACC.

Architecture: `Chat Platform → Webhook Server → Queue → Local Daemon → Coding Agent → Reply`

## Prerequisites

- Python 3.11+
- Rust toolchain (cargo, rustc)
- Node.js 20+
- A queue provider (Upstash Redis free tier recommended)

## 1. Webhook Server Deployment

Deploy the webhook server to receive incoming chat messages:

### Option A: Fly.io

```bash
cd webhook-server
fly launch --name acc-webhook
fly secrets set LARK_APP_ID=xxx LARK_APP_SECRET=xxx UPSTASH_REDIS_URL=xxx UPSTASH_REDIS_TOKEN=xxx
fly deploy
```

### Option B: Railway

```bash
cd webhook-server
# Set root directory to webhook-server in Railway dashboard
# Add environment variables in Railway dashboard
```

Copy the deployed URL once running. You'll need it for platform webhook configuration.

## 2. Queue Setup

### Upstash Redis (Recommended Free Tier)

1. Create an account at [upstash.com](https://upstash.com)
2. Create a Redis database
3. Copy `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN`
4. Configure the queue provider: `QUEUE_PROVIDER=upstash`

### Alternative: PostgreSQL

Set `QUEUE_PROVIDER=postgres` and configure `POSTGRES_URL`.

## 3. Platform Webhook Configuration

### Lark / Feishu

1. Create a bot app in [Feishu Developer Console](https://open.feishu.cn)
2. Enable `im:message:receive` and `im:message:send` permissions
3. Set the webhook URL: `https://your-deployed-url/webhook/lark`
4. Copy `LARK_APP_ID`, `LARK_APP_SECRET`, and `LARK_VERIFY_TOKEN`

### Slack

1. Create an app at [api.slack.com](https://api.slack.com)
2. Enable Event Subscriptions and set URL: `https://your-deployed-url/webhook/slack`
3. Subscribe to `message.channels`, `message.groups`, `message.im` events
4. Install to workspace and copy `SLACK_SIGNING_SECRET` and `SLACK_BOT_TOKEN`

### Discord

1. Create an app at [discord.com/developers](https://discord.com/developers)
2. Set Interactions Endpoint URL: `https://your-deployed-url/webhook/discord`
3. Copy `DISCORD_PUBLIC_KEY` and `DISCORD_BOT_TOKEN`

### Telegram

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Set webhook: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-deployed-url/webhook/telegram`
3. Copy `TELEGRAM_BOT_TOKEN`

## 4. Daemon Configuration

### Environment Variables

Copy and configure `local-daemon/.env.example` → `local-daemon/.env`:

```bash
QUEUE_PROVIDER=upstash
UPSTASH_REDIS_URL=https://your-instance.upstash.io
UPSTASH_REDIS_TOKEN=your-token-here
LARK_APP_ID=cli_xxxxxxxxxxxx
LARK_APP_SECRET=your-app-secret
```

### Agent Registry

Configure `agent-workspaces/agent_registry.yaml` with your platforms and agent mappings.

### macOS Launch Agent (Auto-Start)

1. Edit `local-daemon/com.edge8.backward-daemon.plist` — replace `REPLACE_USER` and `path/to/agent-control-center`
2. Install: `cp local-daemon/com.edge8.backward-daemon.plist ~/Library/LaunchAgents/`
3. Load: `launchctl load ~/Library/LaunchAgents/com.edge8.backward-daemon.plist`

### Manual Start

```bash
python3 local-daemon/main.py --config agent-workspaces/agent_registry.yaml
```

## 5. ACC UI Setup

1. Build and run the Tauri app: `npm run tauri dev`
2. Navigate to the Chat tab (if using feature flag, enable: `VITE_ENABLE_BACKWARD_CHANNEL=true`)
3. Configure chat platform connections in the UI
4. Start/stop the daemon from the UI

## 6. Verification

Run the smoke test:

```bash
bash smoke-test.sh
```

All 7 steps should pass before proceeding to production.

## 7. Production Checklist

- [ ] Webhook server deployed and publicly accessible
- [ ] SSL/TLS configured for webhook endpoint
- [ ] Queue provider healthy and accessible
- [ ] Platform webhooks configured and verified
- [ ] Daemon running with `launchctl` or supervisor
- [ ] Environment variables set (no defaults in production)
- [ ] Agent registry configured for all target platforms
- [ ] Log rotation configured for `/tmp/acc-backward-daemon.log`
- [ ] Monitoring set up for daemon health / queue depth
- [ ] Rollback plan documented for each component
