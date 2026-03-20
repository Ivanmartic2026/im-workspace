#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PAPERCLIP_DIR="/home/user/paperclip"

# Clone Paperclip if not already present
if [ ! -d "$PAPERCLIP_DIR" ]; then
  echo "Cloning Paperclip repository..."
  git clone https://github.com/paperclipai/paperclip.git "$PAPERCLIP_DIR"
fi

# Install Paperclip dependencies (pnpm install leverages cache)
echo "Installing Paperclip dependencies..."
cd "$PAPERCLIP_DIR"
pnpm install

# Install im-workspace dependencies
echo "Installing im-workspace dependencies..."
cd "${CLAUDE_PROJECT_DIR:-/home/user/im-workspace}"
npm install
