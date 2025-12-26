---
name: omo-dev
description: oh-my-opencode plugin development. Use when adding hooks, tools, agents, or features to oh-my-opencode. Covers Antigravity auth, Claude Code compatibility, and plugin architecture.
---

# oh-my-opencode Fork Development

## Fork Context

This is kenzo's fork of oh-my-opencode at `/home/kenzo/dev/oh-my-opencode-fork`.

### Fork-Specific Enhancements
- **Memory hooks**: memory-capture (stores) + memory-injector (auto-injects context)
- **Antigravity tracking**: All `google/*` models tracked, not just Claude
- **Sisyphus improvements**: Async mastery, skill awareness, direct intervention
- **Context notifications**: 20/40/60/80% milestones with contextual messages
- **UX fixes**: Compaction toast says "Send any message to continue"

### Key Files Modified from Upstream
- `src/hooks/preemptive-compaction/index.ts` - Context tracking, notifications
- `src/hooks/context-window-monitor.ts` - Antigravity provider support
- `src/hooks/memory-capture/index.ts` - Semantic memory storage
- `src/hooks/memory-injector/index.ts` - Auto context injection
- `src/agents/sisyphus.ts` - Orchestrator enhancements
- `src/agents/frontend-ui-ux-engineer.ts` - MiniMax M2.1 model

## Git Workflow

### Syncing with Upstream
```bash
# Add upstream if not present
git remote add upstream https://github.com/code-yeongyu/oh-my-opencode.git

# Fetch and rebase (preserve fork patches)
git fetch upstream
git rebase upstream/master

# Resolve conflicts, keeping fork-specific changes
# Key files to preserve: memory hooks, sisyphus enhancements, antigravity tracking
```

### Before Rebasing
1. Commit all local changes
2. Note fork-specific files that may conflict
3. Review upstream changelog for breaking changes

### After Rebasing
1. Run `bun run typecheck`
2. Run `bun test`
3. Run `bun run build`
4. Test in OpenCode

## Known Issues & Fixes

### Antigravity Thinking Block Errors
**Error**: `Expected thinking block at start of message`
**Cause**: Message reordering not putting thinking blocks first
**Fix**: `reorderThinkingBlocksFirst` function in antigravity fetch.ts

### Claude Opus Tool/Text Interleaving
**Error**: `toolUse and text blocks cannot be interleaved`
**Cause**: Anthropic API strict ordering requirement
**Fix**: Use `reorderTextAndToolBlocks` before sending

### Memory Hooks Not Running
**Check**:
1. Ollama running: `curl localhost:11434/api/tags`
2. Model installed: `ollama pull mxbai-embed-large`
3. Hook enabled: Not in `disabled_hooks` array
4. CLI exists: `~/.config/opencode/lib/memory-cli.ts`

## Adding New Features

### New Hook Pattern
```typescript
// src/hooks/my-hook/index.ts
export function createMyHook() {
  return {
    "chat.message": async (input, output) => { /* ... */ },
    "tool.execute.after": async (input, output) => { /* ... */ },
    event: async ({ event }) => { /* ... */ },
  }
}
```

### New Agent Pattern
```typescript
// src/agents/my-agent.ts
export function createMyAgent(model: string = DEFAULT_MODEL): AgentConfig {
  return {
    description: "...",
    mode: "subagent",
    model,
    tools: { background_task: true },
    prompt: `...`,
  }
}
```

## Commands

```bash
bun run typecheck      # Type check
bun run build          # Full build
bun test               # All tests
bun test path/file.test.ts  # Single test
```

## Deployment

**NEVER** run `bun publish` directly. Use GitHub Actions:
```bash
gh workflow run publish -f bump=patch
```
