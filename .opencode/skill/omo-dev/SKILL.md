---
name: omo-dev
description: oh-my-opencode plugin development. Use when adding hooks, tools, agents, or features to oh-my-opencode. Covers Antigravity auth, Claude Code compatibility, and plugin architecture.
---

# oh-my-opencode Development

## Project Structure

```
src/
├── agents/        # AI agents (Sisyphus, oracle, librarian, etc.)
├── hooks/         # Lifecycle hooks (21 hooks)
├── tools/         # LSP, AST-Grep, Glob, Grep, etc.
├── mcp/           # MCP servers (context7, websearch_exa, grep_app)
├── features/      # Claude Code compatibility loaders
├── auth/antigravity/  # Google OAuth for multi-model access
├── config/        # Zod schema
└── shared/        # Utilities
```

## Adding Components

### Add Hook
1. Create `src/hooks/<name>/` with `index.ts`, `constants.ts`, `types.ts`
2. Export from `src/hooks/index.ts`
3. Instantiate in `src/index.ts` with `isHookEnabled()` check
4. Add to `HookName` in `src/config/schema.ts`

### Add Tool
1. Create `src/tools/<name>/` with `index.ts`, `tools.ts`, `types.ts`, `constants.ts`
2. Export from `src/tools/index.ts`
3. Add to `builtinTools` array in `src/tools/index.ts`

### Add Agent
1. Create `src/agents/<name>.ts`
2. Export from `src/agents/index.ts`
3. Add to `builtinAgents` in `src/agents/index.ts`
4. Add type to `src/agents/types.ts`

## Antigravity Auth

Google OAuth plugin for multi-account Claude/Gemini access:
- `fetch.ts` - Request interceptor, retry logic, endpoint fallback
- `response.ts` - Response transformation, SSE streaming, signature extraction
- `thinking.ts` - Extended thinking block handling
- `message-converter.ts` - OpenAI ↔ Gemini format conversion
- `project.ts` - GCP project ID resolution, tier detection

Key patterns:
- Thinking blocks must come FIRST in assistant message parts
- Signatures wrapped in `providerMetadata.anthropic.signature`
- 429 errors trigger retry with exponential backoff

## Build Commands

```bash
bun run build          # ESM + declarations + schema
bun run typecheck      # Type check only
bun test               # Run tests
bun run build:schema   # Regenerate JSON schema
```

## Conventions

- Bun only (never npm/yarn)
- bun-types (never @types/node)
- Barrel exports in index.ts
- kebab-case directories
- createXXXHook() pattern for hooks
- BDD comments: #given, #when, #then
