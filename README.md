# Spore War Telegram Bot

A Telegram bot that automatically greets new members in your group and provides quick access buttons to the game client and documentation.

## Features

- 🤖 Automatic greeting for new group members
- 🛡️ **Verification System** - Prevents automated/spam accounts by requiring human verification
- 🚫 Automatically filters out Telegram bot users
- 🎮 Direct link to game client (after verification)
- 📚 Direct link to game documentation (after verification)
- 💬 Commands: `/start` and `/help`
- ✅ Works with Telegram groups and topics

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

**Production:**

```bash
npm start
```

**Development (with auto-reload):**

```bash
npm run dev
```

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

- `/start` - Shows welcome message with game links
- `/help` - Shows help information

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

## Alternative Approaches

The current implementation uses the `new_chat_members` event, which is the standard way to detect new members. However, there are alternative approaches:

1. **Webhook-based (for production)**: Instead of polling, you can set up webhooks for better performance and scalability
2. **Welcome message with bot commands**: You can configure a group welcome message that mentions the bot
3. **Custom welcome messages per topic**: If you have multiple topics, you could customize greetings per topic

If you'd like to explore any of these alternatives, let me know!

## Troubleshooting

- **Bot not greeting members**: Make sure the bot is an admin or has permission to send messages
- **Bot not responding**: Check that the BOT_TOKEN in `.env` is correct
- **Buttons not working**: Verify the URLs in the code are correct and accessible
- **Verification button not working**: Make sure the bot has permission to edit messages
- **Users not seeing game links**: They need to complete verification first by clicking the verification button

## License

ISC
