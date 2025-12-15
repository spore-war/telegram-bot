#!/bin/bash

# Simple Telegram Bot API helper
# Usage:
#   ./scripts/telegram-debug.sh info      # getWebhookInfo
#   ./scripts/telegram-debug.sh delete    # deleteWebhook
#   ./scripts/telegram-debug.sh updates   # getUpdates (works only when webhook is removed)
#   ./scripts/telegram-debug.sh ack       # fetches and then acknowledges (drops) all pending updates
#
# BOT_TOKEN is read from .env if present, or from the environment.

set -euo pipefail

# Load .env if available
if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  source .env
fi

if [[ -z "${BOT_TOKEN:-}" ]]; then
  echo "BOT_TOKEN is not set. Add it to .env or export BOT_TOKEN."
  exit 1
fi

API_BASE="https://api.telegram.org/bot${BOT_TOKEN}"
CMD="${1:-info}"

case "$CMD" in
  info)
    echo "👉 getWebhookInfo"
    curl -s "${API_BASE}/getWebhookInfo" | jq .
    ;;
  delete)
    echo "👉 deleteWebhook"
    curl -s -X POST "${API_BASE}/deleteWebhook" | jq .
    ;;
  updates)
    echo "👉 getUpdates (requires webhook deleted)"
    curl -s "${API_BASE}/getUpdates" | jq .
    ;;
  ack)
    echo "👉 getUpdates (to inspect) and acknowledge (drop) all pending updates"
    RAW=$(curl -s "${API_BASE}/getUpdates")
    echo "$RAW" | jq .
    MAX_ID=$(echo "$RAW" | jq '.result | [.[].update_id] | max // empty')
    if [ -z "$MAX_ID" ] || [ "$MAX_ID" = "null" ]; then
      echo "No updates to acknowledge."
      exit 0
    fi
    NEXT=$((MAX_ID + 1))
    echo "Acknowledging up to update_id=$MAX_ID (offset=$NEXT)..."
    curl -s "${API_BASE}/getUpdates?offset=${NEXT}" >/dev/null
    echo "Done. Pending updates should now be cleared."
    ;;
  *)
    echo "Unknown command: $CMD"
    echo "Usage: $0 [info|delete|updates|ack]"
    exit 1
    ;;
esac

