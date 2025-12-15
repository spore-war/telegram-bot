#!/bin/bash

# Script to set up webhook with Cloudflare Tunnel
# This script will:
# 1. Start the webhook server
# 2. Create a Cloudflare tunnel
# 3. Get the HTTPS URL
# 4. Configure the Telegram webhook

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Telegram Bot Webhook with Cloudflare Tunnel${NC}\n"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Please create it first.${NC}"
    exit 1
fi

# Load environment variables
source .env

if [ -z "$BOT_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  BOT_TOKEN not set in .env file${NC}"
    exit 1
fi

# Set default values
WEBHOOK_PORT=${WEBHOOK_PORT:-3000}

# Export so child processes (npm/node) see them
export BOT_TOKEN WEBHOOK_PORT GAME_DOCS_URL

echo -e "${GREEN}📦 Building TypeScript...${NC}"
# Clean logs for a fresh run
: > webhook.log
: > tunnel.log
npm run build

echo -e "\n${GREEN}🌐 Starting webhook server on port ${WEBHOOK_PORT}...${NC}"
echo -e "${YELLOW}   (This will run in the background)${NC}\n"

# Start webhook server in background (fresh log)
npm run webhook:build > webhook.log 2>&1 &
WEBHOOK_PID=$!
echo -e "${BLUE}Webhook server PID:${NC} ${WEBHOOK_PID}"

# Wait for server to start (retry health)
HEALTH_OK=false
for i in {1..5}; do
  if curl -s http://localhost:${WEBHOOK_PORT}/health > /dev/null; then
    HEALTH_OK=true
    break
  fi
  echo -e "${YELLOW}Webhook server not ready yet (attempt ${i}/5). Retrying in 3s...${NC}"
  sleep 3
done

if [ "${HEALTH_OK}" != "true" ]; then
  echo -e "${YELLOW}⚠️  Webhook server failed to start after retries. Check webhook.log${NC}"
  kill $WEBHOOK_PID 2>/dev/null || true
  exit 1
fi

echo -e "${GREEN}✅ Webhook server is running${NC}\n"

echo -e "${BLUE}🔗 Creating Cloudflare Tunnel...${NC}"
echo -e "${YELLOW}   (Will auto-detect the HTTPS URL and set the webhook)${NC}\n"

# Start cloudflared tunnel and log output (fresh log)
TUNNEL_LOG="tunnel.log"
cloudflared tunnel --url http://localhost:${WEBHOOK_PORT} > "${TUNNEL_LOG}" 2>&1 &
TUNNEL_PID=$!
echo -e "${BLUE}Cloudflare tunnel PID:${NC} ${TUNNEL_PID}"

# Wait for tunnel URL to appear in the log
TUNNEL_URL=""
for i in {1..30}; do
  TUNNEL_URL=$(grep -Eo "https://[a-zA-Z0-9.-]+\\.trycloudflare\\.com" "${TUNNEL_LOG}" | head -n1 || true)
  if [ -n "$TUNNEL_URL" ]; then
    break
  fi
  sleep 1
done

if [ -z "$TUNNEL_URL" ]; then
  echo -e "${YELLOW}⚠️  Could not detect tunnel URL. Check ${TUNNEL_LOG} for details.${NC}"
  kill $WEBHOOK_PID $TUNNEL_PID 2>/dev/null || true
  exit 1
fi

echo -e "\n${GREEN}✅ Tunnel is running!${NC}"
echo -e "${YELLOW}🌐 Tunnel URL (will be used for setWebhook): ${TUNNEL_URL}${NC}\n"

# Verify tunnel is reachable before setting webhook
echo -e "${BLUE}🔍 Checking tunnel health via ${TUNNEL_URL}/health ...${NC}"
HEALTH_OK=false
for i in {1..5}; do
  if curl -fsSL --max-time 10 "${TUNNEL_URL}/health" > /dev/null 2>&1; then
    HEALTH_OK=true
    echo -e "${GREEN}Tunnel health check passed (attempt ${i}).${NC}\n"
    break
  fi
  echo -e "${YELLOW}Tunnel not reachable yet (attempt ${i}). Retrying in 5s...${NC}"
  sleep 5
done

if [ "${HEALTH_OK}" != "true" ]; then
  echo -e "${YELLOW}⚠️  Tunnel did not become reachable. Not setting webhook. Check tunnel.log and retry.${NC}"
  kill $WEBHOOK_PID $TUNNEL_PID 2>/dev/null || true
  exit 1
fi

echo -e "${BLUE}📡 Setting Telegram webhook with the detected URL...${NC}"
WEBHOOK_CMD="curl -s -X POST \"https://api.telegram.org/bot${BOT_TOKEN}/setWebhook\" -d \"url=${TUNNEL_URL}/webhook\""
echo -e "${YELLOW}Webhook command:${NC} ${WEBHOOK_CMD}\n"

SET_WEBHOOK_RESPONSE=""
for i in {1..5}; do
  SET_WEBHOOK_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
    -d "url=${TUNNEL_URL}/webhook")
  echo -e "${GREEN}Webhook response (attempt ${i}):${NC} ${SET_WEBHOOK_RESPONSE}\n"
  if echo "${SET_WEBHOOK_RESPONSE}" | grep -q '"ok":true'; then
    break
  fi
  echo -e "${YELLOW}Retrying setWebhook in 5 seconds...${NC}"
  sleep 5
done

echo -e "${BLUE}To stop the services, press Ctrl+C${NC}"
echo -e "${YELLOW}   (Or run: kill $WEBHOOK_PID $TUNNEL_PID)${NC}\n"

# Wait for user interrupt; ensure cleanup on any exit
cleanup() {
  echo -e '\n'"${YELLOW}Stopping services...${NC}"
  kill $WEBHOOK_PID $TUNNEL_PID 2>/dev/null || true
}

trap "cleanup; exit" INT TERM
trap "cleanup" EXIT

wait

