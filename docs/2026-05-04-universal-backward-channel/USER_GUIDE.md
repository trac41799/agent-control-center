# Connect ACC to Your Chat App

Pick your chat app below. Each takes about 10 minutes.

---

## Before You Start (one-time, 5 min)

You need two things running in the cloud. Do these once:

### A. Get a webhook URL

The webhook server catches messages from your chat app. Deploy it to Vercel (free):

```bash
cd webhook-server
vercel --prod
```

First time? Run `npm i -g vercel` then `vercel login`.

You'll get a URL like `https://acc-webhook.vercel.app`. Copy it — you'll need it in every step below.

### B. Get a message queue

This holds messages while your computer processes them. Sign up at [upstash.com](https://upstash.com) (free), create a Redis database, copy the **REST URL** and **token**.

---

## Connect a Chat App

Pick one:

- [Lark / Feishu](#lark--feishu)
- [Slack](#slack)
- [Discord](#discord)
- [Telegram](#telegram)

---

## Lark / Feishu

1. Go to [Lark Developer Console](https://open.larksuite.com/app), create an app
2. Under **Security** → copy the **App Secret** and **Verification Token**
3. Under **Event Subscriptions**, set your webhook URL:
   ```
   https://acc-webhook.vercel.app/webhook/lark/YOUR_APP_ID
   ```
   Subscribe to `im.message.receive_v1`
4. Under **Permissions**, add `im:message` and `im:message:readonly`, then publish

**In ACC:**
1. Switch to the **Chat** tab
2. Pick **Lark**, paste your App ID and App Secret
3. Click **Save**, then **Test Connection**

Done. Try typing `@bot hello` in a Lark group.

---

## Slack

1. Go to [api.slack.com/apps](https://api.slack.com/apps), create an app from scratch
2. Under **Basic Information** → copy the **Signing Secret**
3. Under **OAuth & Permissions**, add these bot token scopes:
   - `chat:write`
   - `channels:history`
   - `groups:history`
   - `im:history`
4. Install to your workspace, copy the **Bot User OAuth Token** (`xoxb-...`)
5. Under **Event Subscriptions**, turn it on, set your webhook URL:
   ```
   https://acc-webhook.vercel.app/webhook/slack/TEAM_ID
   ```
   Subscribe to `message.channels`, `message.groups`, `message.im`
6. Invite the bot to any channel you want it to watch

**In ACC:**
1. Switch to the **Chat** tab
2. Pick **Slack**, paste Signing Secret and Bot Token
3. Click **Save**, then **Test Connection**

Done. `@bot do something` in any channel with the bot.

---

## Discord

1. Go to [discord.com/developers](https://discord.com/developers), create an application → add a bot
2. Under **General Information** → copy the **Public Key**
3. Under **Bot** → copy the **Token**, enable Message Content Intent
4. Under **Interactions Endpoint URL**, paste:
   ```
   https://acc-webhook.vercel.app/webhook/discord/SERVER_ID
   ```
5. Use the OAuth2 URL generator to invite the bot to your server (scopes: `bot`, `applications.commands`)

**In ACC:**
1. Switch to the **Chat** tab
2. Pick **Discord**, paste Public Key and Bot Token
3. Click **Save**, then **Test Connection**

Done. Type `/` to see your bot's slash commands, or @mention it in a channel.

---

## Telegram

The simplest option. No webhook URL needed if you use polling mode.

1. Open Telegram, chat with [@BotFather](https://t.me/BotFather)
2. Send `/newbot`, follow the prompts, copy the token

**In ACC:**
1. Switch to the **Chat** tab
2. Pick **Telegram**, paste the bot token
3. Set Queue to **File** (for polling mode — no cloud needed)
4. Click **Save**

Done. Message your bot directly on Telegram.

---

## Start the Daemon

The daemon is what actually runs on your computer — it picks up messages and runs your AI agents.

1. In ACC, go to the **Chat** tab
2. Look for the **Daemon** card at the top
3. Click **Start Daemon**
4. You should see the status turn green with a PID

To have it start automatically when your computer boots:
```bash
cp local-daemon/com.edge8.backward-daemon.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.edge8.backward-daemon.plist
```

---

## Pick Which Agent Responds

By default, messages go to the **Assistant** agent. To add your own:

1. Open `agent-workspaces/agent_registry.yaml`
2. Under your platform's section, add a new agent:
   ```yaml
   agents:
     - id: deployer
       display_name: "Deployer"
       description: "Handles deployment to staging and production"
   ```
3. Create a folder: `agent-workspaces/deployer/`
4. Write instructions in `agent-workspaces/deployer/SYSTEM.md`
5. Restart the daemon

Now when someone says "deploy staging", ACC routes to your deployer agent.

---

## Troubleshooting

**Messages aren't coming through:**
- Is the daemon running? Check the Chat tab status indicator.
- Did you deploy the webhook server? Visit `https://acc-webhook.vercel.app/health` — should say `{"status":"ok"}`.
- Did you set the webhook URL in your chat app correctly? The URL must match your app exactly.

**Agent doesn't reply:**
- Check the daemon logs: click **View Logs** in the Chat tab.
- Does the agent have a `SYSTEM.md` file? It needs instructions.
- Is the agent's coding tool installed? (`claude`, `opencode`, etc. must be on your PATH.)

**Connection test fails:**
- For Lark: make sure the app is published (not just created).
- For Slack: did you install the app to your workspace?
- For Discord: is the Interactions Endpoint URL verified (you'll see a checkmark)?
