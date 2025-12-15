#!/bin/bash

# Script to start webhook server
# This script will:
# 1. Find and kill any process using the configured port
# 2. Start the webhook server in the background
# 3. Redirect logs to webhook.log

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the project root directory (one level up from scripts)
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# Change to project root
cd "${PROJECT_ROOT}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Webhook Server${NC}\n"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}⚠️  .env file not found. Please create it first.${NC}"
    exit 1
fi

# Load environment variables
source .env

# Set default port
WEBHOOK_PORT=${WEBHOOK_PORT:-3000}

if [ -z "$BOT_TOKEN" ]; then
    echo -e "${RED}⚠️  BOT_TOKEN not set in .env file${NC}"
    exit 1
fi

# Export so child processes (npm/node) see them
export BOT_TOKEN WEBHOOK_PORT GAME_DOCS_URL

echo -e "${BLUE}🔍 Checking for process on port ${WEBHOOK_PORT}...${NC}"

# Find process using the port (works on macOS and Linux)
PID=""
if command -v lsof > /dev/null 2>&1; then
    PID=$(lsof -ti:${WEBHOOK_PORT} 2>/dev/null || true)
elif command -v netstat > /dev/null 2>&1; then
    # Alternative for systems without lsof
    PID=$(netstat -tuln 2>/dev/null | grep ":${WEBHOOK_PORT}" | awk '{print $NF}' | head -n1 | cut -d'/' -f1 || true)
fi

if [ -n "$PID" ]; then
    echo -e "${YELLOW}⚠️  Found process ${PID} using port ${WEBHOOK_PORT}${NC}"
    echo -e "${BLUE}🛑 Killing process ${PID}...${NC}"
    kill $PID 2>/dev/null || true
    # Wait a moment for the process to terminate
    sleep 1
    # Force kill if still running
    if kill -0 $PID 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Process still running, force killing...${NC}"
        kill -9 $PID 2>/dev/null || true
        sleep 1
    fi
    echo -e "${GREEN}✅ Process ${PID} terminated${NC}\n"
else
    echo -e "${GREEN}✅ No process found on port ${WEBHOOK_PORT}${NC}\n"
fi

echo -e "${BLUE}📦 Building TypeScript...${NC}"
npm run build

echo -e "\n${BLUE}🌐 Starting webhook server on port ${WEBHOOK_PORT}...${NC}"
echo -e "${YELLOW}   (Running in background, logs in webhook.log)${NC}\n"

# Clean log file for fresh run
: > webhook.log

# Start webhook server in background
npm run webhook:build > webhook.log 2>&1 &
WEBHOOK_PID=$!

echo -e "${GREEN}✅ Webhook server started${NC}"
echo -e "${BLUE}📝 PID: ${WEBHOOK_PID}${NC}"
echo -e "${BLUE}📄 Logs: webhook.log${NC}"
echo -e "${BLUE}🌐 Port: ${WEBHOOK_PORT}${NC}\n"

# Wait a moment and check if process is still running
sleep 2
if ! kill -0 $WEBHOOK_PID 2>/dev/null; then
    echo -e "${RED}❌ Webhook server failed to start. Check webhook.log for details.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Webhook server is running successfully${NC}"
echo -e "${YELLOW}💡 To stop: kill ${WEBHOOK_PID}${NC}"
echo -e "${YELLOW}💡 To view logs: tail -f webhook.log${NC}\n"

