# Cloudflare Tunnel Setup for Testing

This guide shows you how to set up a temporary HTTPS tunnel using Cloudflare Tunnel (cloudflared) for testing your Telegram bot webhook.

## Quick Start

### Option 1: Automated Script (Recommended)

```bash
./tunnel/setup-webhook.sh
```

This script will:

1. Build the TypeScript code
2. Start the webhook server
3. Create a Cloudflare tunnel
4. Show you the HTTPS URL to use

### Option 2: Manual Setup

#### Step 1: Install Dependencies

```bash
npm install
```

#### Step 2: Build the Project

```bash
npm run build
```

#### Step 3: Start Webhook Server

In one terminal:

```bash
npm run webhook:build
# Or for development:
npm run webhook
```

The server will start on `http://localhost:3000` (or the port specified in `WEBHOOK_PORT` env var).

#### Step 4: Create Cloudflare Tunnel

In another terminal:

```bash
npm run tunnel
# Or directly:
cloudflared tunnel --url http://localhost:3000
```

You'll see output like:

```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://random-words-1234.trycloudflare.com                                               |
+--------------------------------------------------------------------------------------------+
```

#### Step 5: Configure Telegram Webhook

Copy the HTTPS URL from above and set up the webhook:

```bash
# Replace YOUR_TUNNEL_URL with the URL from cloudflared
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://YOUR_TUNNEL_URL/webhook"
```

Example:

```bash
curl -X POST "https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz/setWebhook" \
  -d "url=https://random-words-1234.trycloudflare.com/webhook"
```

#### Step 6: Verify Webhook

Check if webhook is set correctly:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

## Environment Variables

Add these to your `.env` file:

```env
BOT_TOKEN=your_bot_token_here
WEBHOOK_PORT=3000
GAME_DOCS_URL=http://warspore-saga.xyz/docs
```

## Important Notes

1. **Temporary URLs**: Cloudflare Tunnel provides temporary URLs that change each time you restart the tunnel. For production, consider using a permanent tunnel or your own domain.

2. **Port**: Default port is 3000. Make sure it's not already in use, or change `WEBHOOK_PORT` in `.env`.

3. **Testing**: Once the webhook is set up, test it by:
   - Sending a message to your bot
   - Adding the bot to a test group
   - Checking the webhook server logs

## Stopping the Services

- Press `Ctrl+C` in the terminal running the webhook server
- Press `Ctrl+C` in the terminal running cloudflared
- Or use the automated script which handles cleanup

## Troubleshooting

- **Webhook not receiving updates**: Check that the tunnel URL is correct and accessible
- **Server not starting**: Check if port 3000 is already in use
- **Tunnel connection issues**: Make sure cloudflared is installed and up to date
- **Bot not responding**: Verify the webhook is set correctly using `getWebhookInfo`
- **Log files**: Log files (`webhook.log`, `tunnel.log`) are stored in the `tunnel/` directory

## Switching Back to Polling

To switch back to polling mode (no webhook):

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
```

Then use the original bot file:

```bash
npm start
```
