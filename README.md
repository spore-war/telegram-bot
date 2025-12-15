# WarSpore ～ Saga Telegram Bot

A Telegram bot that automatically greets new members in your group and provides quick access buttons to the game client and documentation.

## Features

- 🤖 Automatic greeting for new group members
- 🛡️ **Verification System** - Prevents automated/spam accounts by requiring human verification
- 🚫 Automatically filters out Telegram bot users
- 🎮 Direct link to game client (after verification)
- 📚 Direct link to game documentation (after verification)
- 💬 Commands: `/game` and `/help`
- ✅ Works with Telegram groups and topics
- 🌐 Webhook-based for production deployment

## Setup Instructions

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow the instructions to name your bot
4. Copy the bot token you receive (looks like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Configure the Bot

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your bot token:
   ```
   BOT_TOKEN=your_actual_bot_token_here
   GAME_DOCS_URL=http://warspore-saga.xyz/docs
   ```

### 3. Install Dependencies

```bash
npm install
```

### 4. Build the Project

```bash
npm run build
```

### 5. Run the Bot

**Webhook Mode (Recommended for Production):**

The bot uses webhook mode for better performance and scalability. You have two options:

**Option A: Quick Start (Local Testing with Cloudflare Tunnel)**

```bash
./tunnel/setup-webhook.sh
```

This script will:

- Build the TypeScript code
- Start the webhook server
- Create a Cloudflare Tunnel for HTTPS access
- Automatically configure the Telegram webhook

**Option B: Manual Webhook Setup**

1. Start the webhook server:

```bash
./scripts/start-webhook.sh
```

This script will:

- Kill any existing process on the configured port
- Build the TypeScript code
- Start the webhook server in the background
- Log output to `webhook.log`

2. Set up HTTPS access (required for Telegram webhooks):

   - Use Cloudflare Tunnel: `cloudflared tunnel --url http://localhost:3000`
   - Or use your own domain with SSL certificate

3. Configure the Telegram webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://your-domain.com/webhook"
```

**Development Mode (Polling):**

For local development without webhook setup:

```bash
npm run dev
```

> **Note:** Webhook mode is recommended for production. Make sure to disable Privacy Mode in BotFather (`/mybots` → Bot Settings → Group Privacy → Turn off`) so the bot can see all messages in groups.

## Adding Bot to Your Group

1. Add the bot to your Telegram group as an administrator
2. Give the bot permission to send messages
3. The bot will automatically greet new members when they join

### For Groups with Topics

If your group uses topics (threads), make sure the bot has permission to:

- Send messages in all topics
- Read messages (to detect new members)

You may need to add the bot to each topic manually, or ensure it has admin permissions to access all topics.

## Bot Commands

- `/game` - Shows welcome message with game links (requires verification in groups)
- `/help` - Shows help information

> **Note:** In groups, users must complete verification before accessing game links. In private chats, verification is not required.

## How It Works

The bot listens for `new_chat_members` events. When a new member joins the group, it:

1. Detects the new member
2. **Filters out Telegram bot users** - Telegram bots are automatically skipped
3. **Sends verification request** - New members must click a verification button to prove they're human
4. **After verification** - Once verified, the bot sends:
   - A personalized welcome message
   - Inline keyboard buttons for:
     - Game Client portal
     - Game Documentation portal

### Verification System

The verification system helps prevent automated accounts and spam:

- New members receive a verification message with a button
- They must click "✅ I am Human - Verify Me" to proceed
- Only after verification do they see the game links
- Verification expires after 30 minutes if not completed
- **Data-Free Service**: Verification status is stored in-memory only and resets when the bot restarts
  - This means users may need to verify again after a bot restart
  - No user data is persisted to disk or external storage
  - Privacy-friendly approach with no data retention

This simple interaction helps filter out program-controlled accounts that can't easily click buttons.

## Scripts

The project includes several utility scripts:

- `./scripts/start-webhook.sh` - Start webhook server (kills existing process, builds, and runs in background)
- `./scripts/telegram-debug.sh` - Debug Telegram API interactions
  - `info` - Get webhook info
  - `delete` - Delete webhook
  - `updates` - Get pending updates
  - `ack` - Acknowledge and clear pending updates
- `./tunnel/setup-webhook.sh` - Full webhook setup with Cloudflare Tunnel (for testing)

## Project Structure

```
telegram-bot/
├── src/
│   └── webhook-server.ts    # Main bot logic and webhook server
├── scripts/
│   ├── start-webhook.sh     # Start webhook server script
│   └── telegram-debug.sh    # Telegram API debugging tool
├── tunnel/
│   ├── setup-webhook.sh      # Full webhook setup with tunnel
│   └── TUNNEL_SETUP.md      # Tunnel setup documentation
├── .env                      # Environment variables (create from .env.example)
├── webhook.log               # Webhook server logs
└── package.json              # Dependencies and scripts
```

## Troubleshooting

- **Bot not greeting members**:
  - Make sure the bot is an admin or has permission to send messages
  - Disable Privacy Mode in BotFather (`/mybots` → Bot Settings → Group Privacy → Turn off`)
- **Bot not responding to commands in groups**:
  - Privacy Mode must be disabled for the bot to see `@botname /game` commands
  - Check webhook logs: `tail -f webhook.log`
- **Webhook not receiving updates**:
  - Verify webhook is set: `./scripts/telegram-debug.sh info`
  - Check webhook URL is accessible via HTTPS
  - Check webhook server is running: `./scripts/start-webhook.sh`
- **Port already in use**:
  - The `start-webhook.sh` script automatically kills processes on the configured port
  - Or manually: `lsof -ti:3000 | xargs kill`
- **Bot not responding**:
  - Check that BOT_TOKEN in `.env` is correct
  - Verify webhook server is running and receiving updates
- **Buttons not working**:
  - Verify the URLs in the code are correct and accessible
  - Check `GAME_DOCS_URL` in `.env`
- **Verification button not working**:
  - Make sure the bot has permission to edit messages
  - Check webhook logs for errors
- **Users not seeing game links**:
  - They need to complete verification first by clicking the verification button
  - Verification status resets when the bot restarts (data-free service)
- **Webhook server crashes**:
  - Check `webhook.log` for error details
  - Network timeouts to Telegram API are handled gracefully and won't crash the server

## License

ISC
