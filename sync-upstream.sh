#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== oh-my-opencode sync ==="

echo "1. Fetching upstream (code-yeongyu/oh-my-opencode)..."
git fetch upstream

echo "2. Rebasing kenzo/patches on upstream/main..."
git checkout kenzo/patches
git rebase upstream/main

echo "3. Building..."
bun install
bun run build

echo "4. Deploying to OpenCode cache..."
cp dist/index.js ~/.cache/opencode/node_modules/oh-my-opencode/dist/index.js

echo "5. Pushing to origin (codewithkenzo/oh-my-opencode)..."
git push origin kenzo/patches --force-with-lease

echo ""
echo "✅ Done! Restart OpenCode to apply changes."