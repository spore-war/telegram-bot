import { Telegraf, Context } from 'telegraf';
import * as dotenv from 'dotenv';
import express, { Request, Response } from 'express';

// Load environment variables
dotenv.config();

// Validate required environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_PORT = parseInt(process.env.WEBHOOK_PORT || '3000');

if (!BOT_TOKEN) {
  console.error('Error: BOT_TOKEN is not set in environment variables');
  process.exit(1);
}

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);

// Game URLs
const GAME_CLIENT_URL = 'https://warspore-saga.xyz';
const GAME_DOCS_URL = process.env.GAME_DOCS_URL || 'https://warspore-saga.xyz/docs';

// In-memory storage for verified users (data-free service - resets on restart)
const verifiedUsers = new Set<number>();
const pendingVerifications = new Map<number, { chatId: number; messageId: number; timestamp: number }>();

// Verification timeout (30 seconds)
const VERIFICATION_TIMEOUT = 30 * 1000;
const VERIFICATION_TIMEOUT_SECONDS = VERIFICATION_TIMEOUT / 1000;

// Clean up expired verifications periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of pendingVerifications.entries()) {
    if (now - data.timestamp > VERIFICATION_TIMEOUT) {
      pendingVerifications.delete(userId);
      console.log(`Removed expired verification for user ${userId}`);
    }
  }
}, 5 * 1000); // Check every 5 seconds

// Verification message template
const getVerificationMessage = (firstName: string): string => {
  return `👋 Welcome to WarSpore～Saga, ${firstName}!\n\n` +
    `🛡️ <b>Verification Required</b>\n\n` +
    `To ensure you're a real person and not a bot, please click the verification button below.\n\n` +
    `This helps us keep the community safe from automated accounts.\n\n` +
    `⏰ <i>Verification expires in ${VERIFICATION_TIMEOUT_SECONDS} seconds if not completed.</i>`;
};

// Greeting message template (shown after verification)
const getGreetingMessage = (firstName: string): string => {
  return `✅ <b>Verification Complete!</b>\n\n` +
    `👋 Welcome to WarSpore～Saga, ${firstName}!\n\n` +
    `🎮 Ready to dive into the game? Use the buttons below to access the game client or check out the documentation.\n\n` +
    `Have fun and enjoy your adventure! 🚀`;
};

// Create verification keyboard
const createVerificationKeyboard = (userId: number) => {
  return {
    inline_keyboard: [
      [
        {
          text: '✅ I am Human - Verify Me',
          callback_data: `verify_${userId}`
        }
      ]
    ]
  };
};

// Create inline keyboard with buttons (shown after verification)
const createMainKeyboard = () => {
  return {
    inline_keyboard: [
      [
        {
          text: '🎮 Play Now',
          url: GAME_CLIENT_URL
        }
      ],
      [
        {
          text: '📚 Documentations',
          url: GAME_DOCS_URL
        }
      ]
    ]
  };
};

// Handle new members joining the group
bot.on('new_chat_members', async (ctx: Context) => {
  try {
    const newMembers = ctx.message && 'new_chat_members' in ctx.message 
      ? ctx.message.new_chat_members 
      : [];

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const chatType = ctx.chat?.type;
    const chatTitle = 'title' in (ctx.chat || {}) ? (ctx.chat as any).title : undefined;
    const messageThreadId = ctx.message && 'message_thread_id' in ctx.message ? ctx.message.message_thread_id : undefined;

    for (const member of newMembers) {
      // Skip if the new member is the bot itself
      if (member.id === ctx.botInfo?.id) {
        continue;
      }

      // Skip if the new member is a Telegram bot
      if (member.is_bot) {
        continue;
      }

      const userId = member.id;
      const firstName = member.first_name || 'there';
      const username = member.username || 'N/A';
      const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'N/A';

      // Check if user is already verified (in current session)
      if (verifiedUsers.has(userId)) {
        console.log(`[NEW_MEMBER] User ${userId} (@${username}, "${fullName}") verified → greeting sent | Chat: ${chatId} (${chatType}${chatTitle ? ` "${chatTitle}"` : ''}${messageThreadId ? `, topic=${messageThreadId}` : ''})`);
        // User already verified, send full greeting
        const greeting = getGreetingMessage(firstName);
        const keyboard = createMainKeyboard();
        await ctx.reply(greeting, {
          reply_markup: keyboard,
          parse_mode: 'HTML'
        });
        continue;
      }

      // Send verification message
      const verificationMsg = getVerificationMessage(firstName);
      const verificationKeyboard = createVerificationKeyboard(userId);
      
      const sentMessage = await ctx.reply(verificationMsg, {
        reply_markup: verificationKeyboard,
        parse_mode: 'HTML'
      });

      // Store pending verification
      if (sentMessage && 'message_id' in sentMessage) {
        pendingVerifications.set(userId, {
          chatId: chatId,
          messageId: sentMessage.message_id,
          timestamp: Date.now()
        });
        console.log(`[NEW_MEMBER] User ${userId} (@${username}, "${fullName}") needs verification | Chat: ${chatId} (${chatType}${chatTitle ? ` "${chatTitle}"` : ''}${messageThreadId ? `, topic=${messageThreadId}` : ''}), msg=${sentMessage.message_id}`);
      }
    }
  } catch (error) {
    console.error('[NEW_MEMBER] Error handling new member:', error);
  }
});

// Handle /game command (for direct messages or when users interact with bot)
bot.command('game', async (ctx: Context) => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const firstName = ctx.from?.first_name || 'there';
    const username = ctx.from?.username || 'N/A';
    const fullName = `${ctx.from?.first_name || ''} ${ctx.from?.last_name || ''}`.trim() || 'N/A';
    const chatId = ctx.chat?.id;
    const chatType = ctx.chat?.type;
    const chatTitle = 'title' in (ctx.chat || {}) ? (ctx.chat as any).title : undefined;
    const messageThreadId = ctx.message && 'message_thread_id' in ctx.message ? ctx.message.message_thread_id : undefined;
    const isVerified = verifiedUsers.has(userId);

    // Check if user is verified (for group context)
    if (ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup') {
      if (!verifiedUsers.has(userId)) {
        // User not verified, send verification message
        const verificationMsg = getVerificationMessage(firstName);
        const verificationKeyboard = createVerificationKeyboard(userId);
        
        const sentMessage = await ctx.reply(verificationMsg, {
          reply_markup: verificationKeyboard,
          parse_mode: 'HTML'
        });

        // Store pending verification
        if (sentMessage && 'message_id' in sentMessage && ctx.chat?.id) {
          pendingVerifications.set(userId, {
            chatId: ctx.chat.id,
            messageId: sentMessage.message_id,
            timestamp: Date.now()
          });
        }
        console.log(`[CMD /start] User ${userId} (@${username}, "${fullName}") not verified → verification sent | Chat: ${chatId} (${chatType}${chatTitle ? ` "${chatTitle}"` : ''}${messageThreadId ? `, topic=${messageThreadId}` : ''})`);
        return;
      }
    }

    // User is verified or in private chat - show full greeting
    const greeting = getGreetingMessage(firstName);
    const keyboard = createMainKeyboard();

    await ctx.reply(greeting, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
    console.log(`[CMD /start] User ${userId} (@${username}, "${fullName}") verified=${isVerified} → greeting sent | Chat: ${chatId} (${chatType}${chatTitle ? ` "${chatTitle}"` : ''}${messageThreadId ? `, topic=${messageThreadId}` : ''})`);
  } catch (error) {
    console.error('[CMD /start] Error:', error);
  }
});

// Handle verification button callback
bot.action(/^verify_(\d+)$/, async (ctx: Context) => {
  try {
    // Extract match from callback query
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) return;

    const data = callbackQuery.data;
    const match = data.match(/^verify_(\d+)$/);
    if (!match || !match[1]) return;

    const userId = parseInt(match[1]);
    const callerId = ctx.from?.id;

    // Verify that the button clicker is the same user who needs verification
    if (callerId !== userId) {
      await ctx.answerCbQuery('❌ This verification is not for you!', { show_alert: true });
      return;
    }

    // Check if verification is still pending
    const pendingVerification = pendingVerifications.get(userId);
    if (!pendingVerification) {
      // User might already be verified or verification expired
      if (verifiedUsers.has(userId)) {
        await ctx.answerCbQuery('✅ You are already verified!', { show_alert: true });
      } else {
        await ctx.answerCbQuery('⏰ Verification expired. Please contact an admin.', { show_alert: true });
      }
      return;
    }

    // Mark user as verified (in-memory only, will reset on restart)
    verifiedUsers.add(userId);
    pendingVerifications.delete(userId);

    // Update the verification message
    const firstName = ctx.from?.first_name || 'there';
    const greeting = getGreetingMessage(firstName);
    const keyboard = createMainKeyboard();

    const username = ctx.from?.username || 'N/A';
    const fullName = `${ctx.from?.first_name || ''} ${ctx.from?.last_name || ''}`.trim() || 'N/A';
    const chatId = ctx.chat?.id;
    const chatType = ctx.chat?.type;
    const chatTitle = 'title' in (ctx.chat || {}) ? (ctx.chat as any).title : undefined;

    try {
      await ctx.editMessageText(greeting, {
        reply_markup: keyboard,
        parse_mode: 'HTML'
      });
      await ctx.answerCbQuery('✅ Verification successful!');
      console.log(`[VERIFY] User ${userId} (@${username}, "${fullName}") verified → greeting sent | Chat: ${chatId} (${chatType}${chatTitle ? ` "${chatTitle}"` : ''})`);
    } catch (editError) {
      // If editing fails, send a new message
      await ctx.reply(greeting, {
        reply_markup: keyboard,
        parse_mode: 'HTML'
      });
      await ctx.answerCbQuery('✅ Verification successful!');
      console.log(`[VERIFY] User ${userId} (@${username}, "${fullName}") verified → greeting sent (new msg) | Chat: ${chatId} (${chatType}${chatTitle ? ` "${chatTitle}"` : ''})`);
    }
  } catch (error) {
    console.error('Error handling verification:', error);
    await ctx.answerCbQuery('❌ An error occurred. Please try again.', { show_alert: true });
  }
});

// Handle /help command
bot.command('help', async (ctx: Context) => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const username = ctx.from?.username || 'N/A';
    const fullName = `${ctx.from?.first_name || ''} ${ctx.from?.last_name || ''}`.trim() || 'N/A';
    const chatId = ctx.chat?.id;
    const chatType = ctx.chat?.type;
    const chatTitle = 'title' in (ctx.chat || {}) ? (ctx.chat as any).title : undefined;
    const messageThreadId = ctx.message && 'message_thread_id' in ctx.message ? ctx.message.message_thread_id : undefined;

    const helpMessage = 
      `🤖 <b>WarSpore～Saga Bot Commands</b>\n\n` +
      `/game - Show welcome message with game links\n` +
      `/help - Show this help message\n\n` +
      `The bot will automatically greet new members when they join the group!\n\n` +
      `🛡️ <b>Verification System</b>\n` +
      `New members must complete verification to access game links. This helps prevent automated accounts.\n\n` +
      `ℹ️ <b>Note:</b> This is a data-free service. Verification status resets when the bot restarts.`;

    await ctx.reply(helpMessage, {
      parse_mode: 'HTML'
    });
    console.log(`[CMD /help] User ${userId} (@${username}, "${fullName}") → help sent | Chat: ${chatId} (${chatType}${chatTitle ? ` "${chatTitle}"` : ''}${messageThreadId ? `, topic=${messageThreadId}` : ''})`);
  } catch (error) {
    console.error('[CMD /help] Error:', error);
  }
});

// Handle errors
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

// Create Express app for webhook
const app = express();
app.use(express.json());

// Basic request logging to aid debugging
app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`
    );
  });
  next();
});

// Webhook endpoint (no secret for simplicity)
app.use(bot.webhookCallback(`/webhook`));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start webhook server
const server = app.listen(WEBHOOK_PORT, () => {
  console.log(`🌐 Webhook server listening on port ${WEBHOOK_PORT}`);
  console.log(`📡 Webhook endpoint: /webhook`);
  console.log(`💚 Health check: http://localhost:${WEBHOOK_PORT}/health`);
  console.log(`\n⚠️  Now run cloudflared tunnel to expose this server via HTTPS`);
  console.log(`   Command: cloudflared tunnel --url http://localhost:${WEBHOOK_PORT}`);
});

// Enable graceful stop (webhook mode: bot isn't launched via polling)
const gracefulStop = async () => {
  console.log('\nShutting down gracefully...');
  try {
    // In webhook mode, bot isn't launched with polling; stopping is optional
    await bot.stop();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Bot stop warning (ignored):', msg);
  }
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.once('SIGINT', gracefulStop);
process.once('SIGTERM', gracefulStop);

// Guard against unexpected promise rejections (e.g., network timeouts) so the server doesn't crash
process.on('unhandledRejection', (reason) => {
  console.warn('Unhandled promise rejection (continuing):', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (continuing):', err);
});

